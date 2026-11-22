import React, { useState, useMemo, useEffect } from 'react';
import { Asset } from '../../../types/assets';
import { AssetUploadService } from '../../../services/assetUploadService';
import { WorkspaceManager } from '../../../core/workspaceManager';
import { RealProjectSourcePatcher } from '../services/RealProjectSourcePatcher';
import { 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Trash2, 
  Type, 
  Folder, 
  Plus, 
  Replace, 
  Edit2, 
  Loader2 
} from 'lucide-react';

export const AssetLibrary: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filter, setFilter] = useState<'all' | Asset['type']>('all');
  const [uploading, setUploading] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');

  const refreshAssets = () => {
    try {
      const wsManager = WorkspaceManager.getInstance();
      const vfs = wsManager.getVFS();
      const files = vfs.getAllFiles();
      
      const loadedAssets: Asset[] = [];
      files.forEach(node => {
        if (node.path.startsWith('/public/assets/')) {
          if (node.path.endsWith('.keep')) return;

          const parts = node.path.split('/');
          const name = parts[parts.length - 1];
          const folder = parts[parts.length - 2];

          let type: Asset['type'] = 'other';
          if (folder === 'images') type = 'image';
          else if (folder === 'videos') type = 'video';
          else if (folder === 'audio') type = 'audio';
          else if (folder === 'documents') type = 'document';
          else if (folder === 'fonts') type = 'font';

          // Calculate approximate size
          const contentLen = node.content ? node.content.length : 0;
          const sizeBytes = Math.round(contentLen * 0.75);

          loadedAssets.push({
            id: node.path,
            name,
            type,
            mimeType: type === 'image' ? 'image/png' : 'application/octet-stream',
            size: sizeBytes,
            path: node.path,
            createdAt: new Date().toISOString()
          });
        }
      });
      // Sort assets by name
      loadedAssets.sort((a, b) => a.name.localeCompare(b.name));
      setAssets(loadedAssets);
    } catch (err) {
      console.error("[AssetLibrary] Error scanning VFS for assets:", err);
    }
  };

  useEffect(() => {
    refreshAssets();
    window.addEventListener('anny_vfs_changed', refreshAssets);
    return () => {
      window.removeEventListener('anny_vfs_changed', refreshAssets);
    };
  }, []);

  const filteredAssets = useMemo(() => {
    if (filter === 'all') return assets;
    return assets.filter(a => a.type === filter);
  }, [assets, filter]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    window.dispatchEvent(new CustomEvent('anny_editor_success', { 
      detail: { message: `Uploading ${files.length} asset(s) to Asset Library...` } 
    }));

    try {
      await Promise.all(Array.from(files).map(f => AssetUploadService.uploadFile(f)));
      refreshAssets();
      window.dispatchEvent(new CustomEvent('anny_vfs_changed'));
      window.dispatchEvent(new CustomEvent('anny_editor_success', { 
        detail: { message: "Assets uploaded successfully to VFS" } 
      }));
    } catch (err: any) {
      console.error("[AssetLibrary] Upload failed:", err);
      window.dispatchEvent(new CustomEvent('anny_editor_error', { 
        detail: { message: `UPLOAD_FAILED: ${err.message || 'Error uploading file'}` } 
      }));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = (filePath: string) => {
    try {
      const wsManager = WorkspaceManager.getInstance();
      const vfs = wsManager.getVFS();
      vfs._unsafe_remove(filePath);
      vfs.saveToStorage();
      window.dispatchEvent(new CustomEvent('anny_vfs_changed'));
      refreshAssets();
      window.dispatchEvent(new CustomEvent('anny_editor_success', { 
        detail: { message: "Asset successfully deleted from VFS" } 
      }));
    } catch (err: any) {
      console.error("[AssetLibrary] Error deleting file:", err);
      window.dispatchEvent(new CustomEvent('anny_editor_error', { 
        detail: { message: `VFS_WRITE_FAILED: Unable to delete asset.` } 
      }));
    }
  };

  const handleRenameAsset = (oldPath: string, oldName: string) => {
    setEditingAssetId(oldPath);
    setRenameInput(oldName);
  };

  const submitRename = (oldPath: string) => {
    if (!renameInput.trim() || renameInput === oldPath.split('/').pop()) {
      setEditingAssetId(null);
      return;
    }

    const cleanNewName = renameInput.replace(/[^a-z0-9._-]/gi, '_').toLowerCase();
    const parts = oldPath.split('/');
    parts[parts.length - 1] = cleanNewName;
    const newPath = parts.join('/');

    try {
      const wsManager = WorkspaceManager.getInstance();
      const vfs = wsManager.getVFS();
      
      if (vfs.exists(newPath)) {
        window.dispatchEvent(new CustomEvent('anny_editor_error', { 
          detail: { message: "A file with that name already exists!" } 
        }));
        return;
      }

      const content = vfs.readFile(oldPath);
      vfs._unsafe_writeFile(newPath, content);
      vfs._unsafe_remove(oldPath);
      vfs.saveToStorage();

      window.dispatchEvent(new CustomEvent('anny_editor_success', { 
        detail: { message: `Renamed asset to ${cleanNewName}` } 
      }));
      window.dispatchEvent(new CustomEvent('anny_vfs_changed'));
      refreshAssets();
      setEditingAssetId(null);
    } catch (err: any) {
      console.error("Asset rename failed:", err);
      window.dispatchEvent(new CustomEvent('anny_editor_error', { 
        detail: { message: `RENAME_FAILED: ${err.message || 'Error renaming file'}` } 
      }));
    }
  };

  const handleInsertAsset = async (asset: Asset) => {
    const cleanPath = asset.path.replace(/^\/public/, '');
    const filename = asset.name;
    let snippet = '';

    switch (asset.type) {
      case 'image':
        snippet = `<img src="${cleanPath}" alt="${filename}" style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px', display: 'block', margin: '16px auto' }} />`;
        break;
      case 'video':
        snippet = `<video controls src="${cleanPath}" style={{ maxWidth: '100%', borderRadius: '8px', display: 'block', margin: '16px auto' }} />`;
        break;
      case 'audio':
        snippet = `<div style={{ margin: '16px auto', maxWidth: '320px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>\n  <span style={{ fontSize: '11px', display: 'block', marginBottom: '8px', color: '#94a3b8' }}>${filename}</span>\n  <audio controls src="${cleanPath}" style={{ width: '100%' }} />\n</div>`;
        break;
      case 'document':
        snippet = `<div style={{ margin: '16px auto', display: 'flex', justifyContent: 'center' }}>\n  <a href="${cleanPath}" download="${filename}" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', backgroundColor: '#8b5cf6', color: '#ffffff', fontWeight: 'bold', fontSize: '13px', borderRadius: '8px', textDecoration: 'none', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8b5cf6'}>\n    <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>\n    Download ${filename}\n  </a>\n</div>`;
        break;
      case 'font':
        const fontName = filename.split('.')[0] || 'CustomFont';
        snippet = `<style>{\`@font-face { font-family: "${fontName}"; src: url("${cleanPath}") format("woff2"); }\`}</style>`;
        break;
      default:
        snippet = `<div style={{ margin: '16px auto', display: 'flex', justifyContent: 'center' }}>\n  <a href="${cleanPath}" download="${filename}" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', backgroundColor: '#4b5563', color: '#ffffff', fontWeight: 'bold', fontSize: '13px', borderRadius: '8px', textDecoration: 'none', transition: 'all 0.2s' }}>\n    Download ${filename}\n  </a>\n</div>`;
        break;
    }

    try {
      const success = RealProjectSourcePatcher.insertElementIntoProject(`Asset (${asset.type})`, snippet);
      if (success) {
        window.dispatchEvent(new CustomEvent('anny_editor_success', { 
          detail: { message: `Successfully inserted ${asset.type} asset "${filename}"` } 
        }));
        window.dispatchEvent(new CustomEvent('anny_vfs_changed'));
      } else {
        window.dispatchEvent(new CustomEvent('anny_editor_error', { 
          detail: { message: "Unable to insert element. Ensure target code file is healthy." } 
        }));
      }
    } catch (err: any) {
      console.error("Asset insertion failed:", err);
      window.dispatchEvent(new CustomEvent('anny_editor_error', { 
        detail: { message: `SOURCE_PATCH_FAILED: ${err.message || 'Error inserting asset'}` } 
      }));
    }
  };

  const handleReplaceSelected = (asset: Asset) => {
    window.dispatchEvent(new CustomEvent('anny_replace_selected_asset', { 
      detail: { assetPath: asset.path, assetType: asset.type } 
    }));
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getIcon = (type: Asset['type']) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-4 h-4 text-purple-400" />;
      case 'video': return <Video className="w-4 h-4 text-blue-400" />;
      case 'audio': return <Music className="w-4 h-4 text-emerald-400" />;
      case 'document': return <FileText className="w-4 h-4 text-amber-400" />;
      case 'font': return <Type className="w-4 h-4 text-pink-400" />;
      default: return <Folder className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0e17] text-slate-300 p-4 gap-4">
      <div className="flex justify-between items-center border-b border-white/5 pb-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-white">Assets Library</h2>
          <p className="text-[10px] text-slate-400 mt-0.5">Drag to Canvas or click actions</p>
        </div>
        <label className={`cursor-pointer p-2 bg-purple-600 hover:bg-purple-500 rounded transition-colors flex items-center gap-1.5 text-xs text-white font-medium ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          <span>{uploading ? 'Uploading...' : 'Upload'}</span>
          <input type="file" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 text-xs scrollbar-thin">
        {(['all', 'image', 'video', 'audio', 'document', 'font', 'other'] as const).map(f => (
          <button 
            key={f} 
            onClick={() => setFilter(f)} 
            className={`px-2.5 py-1 rounded-full capitalize shrink-0 transition-all border ${filter === f ? 'bg-purple-600 border-purple-400 text-white font-bold shadow-lg shadow-purple-600/20' : 'bg-white/5 hover:bg-white/10 border-transparent text-slate-400'}`}
          >
            {f}
          </button>
        ))}
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin" style={{ maxHeight: '350px' }}>
        {filteredAssets.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-500 italic bg-white/[0.01] rounded-lg border border-dashed border-white/5">
            No assets uploaded yet in this category.
          </div>
        ) : (
          filteredAssets.map(asset => {
            const isEditing = editingAssetId === asset.path;
            
            // Read actual base64 content if it is an image to show preview
            let imageSrc = '';
            if (asset.type === 'image') {
              try {
                const vfs = WorkspaceManager.getInstance().getVFS();
                imageSrc = vfs.readFile(asset.path) || '';
              } catch (e) {
                console.warn("Could not read image preview data");
              }
            }

            return (
              <div 
                key={asset.id} 
                className="flex flex-col p-2.5 bg-white/[0.02] border border-white/5 rounded-lg hover:bg-white/[0.05] hover:border-white/10 transition-all cursor-grab active:cursor-grabbing group" 
                draggable 
                onDragStart={(e) => {
                  e.dataTransfer.setData('assetPath', asset.path);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
              >
                <div className="flex items-center gap-2.5">
                  {/* Thumbnail / Icon preview */}
                  {asset.type === 'image' && imageSrc ? (
                    <div className="w-9 h-9 rounded bg-black/40 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                      <img src={imageSrc} className="w-full h-full object-cover" alt="" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded bg-white/5 border border-white/5 shrink-0 flex items-center justify-center">
                      {getIcon(asset.type)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex gap-1.5 mt-0.5">
                        <input 
                          type="text" 
                          value={renameInput}
                          onChange={(e) => setRenameInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') submitRename(asset.path);
                            if (e.key === 'Escape') setEditingAssetId(null);
                          }}
                          className="flex-1 bg-[#151828] border border-purple-500 rounded px-1.5 py-0.5 text-[11px] text-white outline-none"
                          autoFocus
                        />
                        <button 
                          onClick={() => submitRename(asset.path)}
                          className="px-1.5 py-0.5 bg-emerald-600 rounded text-[10px] text-white font-bold"
                        >
                          OK
                        </button>
                      </div>
                    ) : (
                      <h4 className="text-xs font-semibold truncate text-slate-200" title={asset.name}>{asset.name}</h4>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.25 bg-white/5 rounded text-slate-400">
                        {asset.type}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        {formatSize(asset.size)}
                      </span>
                    </div>
                  </div>

                  <button 
                    className="text-slate-500 hover:text-red-400 p-1.5 hover:bg-white/5 rounded shrink-0 transition-colors self-start" 
                    onClick={() => handleDelete(asset.path)}
                    title="Delete asset from VFS"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Inline Action Drawer on hover/focus */}
                <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-white/[0.04] opacity-80 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleInsertAsset(asset)}
                    className="flex-1 py-1 bg-purple-600/25 hover:bg-purple-600 text-purple-300 hover:text-white text-[9px] font-bold rounded transition-all flex items-center justify-center gap-1"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>Insert</span>
                  </button>
                  <button 
                    onClick={() => handleReplaceSelected(asset)}
                    className="flex-1 py-1 bg-blue-600/25 hover:bg-blue-600 text-blue-300 hover:text-white text-[9px] font-bold rounded transition-all flex items-center justify-center gap-1"
                  >
                    <Replace className="w-2.5 h-2.5" />
                    <span>Replace</span>
                  </button>
                  <button 
                    onClick={() => handleRenameAsset(asset.path, asset.name)}
                    className="py-1 px-2.5 bg-white/5 hover:bg-white/10 text-slate-300 text-[9px] font-bold rounded transition-all flex items-center justify-center"
                    title="Rename Asset"
                  >
                    <Edit2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
