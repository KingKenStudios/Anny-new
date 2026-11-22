import React, { useState, useRef } from 'react';
import { ImageIcon, Upload, Link, Check, X } from 'lucide-react';
import { RealProjectSourcePatcher } from '../services/RealProjectSourcePatcher';
import { SelectedElementData } from '../bridge/RealProjectEditorBridge';

interface ImageControlsProps {
  selectedElement: SelectedElementData;
  onUpdate: (action: string) => void;
}

export const ImageControls: React.FC<ImageControlsProps> = ({ selectedElement, onUpdate }) => {
  const [urlInput, setUrlInput] = useState(selectedElement.src || '');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    window.dispatchEvent(new CustomEvent('anny_editor_success', { detail: { message: `Replacing image with ${file.name}...` } }));

    try {
      const localPath = await RealProjectSourcePatcher.uploadImageAsset(file);
      if (selectedElement.elementRef) {
        (selectedElement.elementRef as HTMLImageElement).src = localPath;
        const success = await RealProjectSourcePatcher.patchImageSource(selectedElement.textContent, localPath, {
          targetFile: selectedElement.targetFile,
          targetLine: selectedElement.targetLine,
          oldSrc: selectedElement.src
        });
        
        if (!success) {
          window.dispatchEvent(new CustomEvent('anny_editor_error', { 
            detail: { message: "IMAGE_TARGET_NOT_FOUND: Unable to locate the original image in the project source." } 
          }));
        } else {
          onUpdate(`Uploaded and replaced image: ${file.name}`);
          window.dispatchEvent(new CustomEvent('anny_editor_success', { 
            detail: { message: `Successfully replaced image with ${file.name}` } 
          }));
          window.dispatchEvent(new CustomEvent('anny_vfs_changed'));
        }
      }
    } catch (err: any) {
      console.error("Image upload failed:", err);
      window.dispatchEvent(new CustomEvent('anny_editor_error', { 
        detail: { message: `SOURCE_PATCH_FAILED: ${err.message || 'Error uploading image'}` } 
      }));
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset input to allow selecting same file again
      }
    }
  };

  const handleUrlApply = async () => {
    if (!urlInput) return;
    
    // Validate URL
    const isValidUrl = /^(https?:\/\/|\/|data:)/i.test(urlInput);
    if (!isValidUrl) {
      window.dispatchEvent(new CustomEvent('anny_editor_error', { 
        detail: { message: "INVALID_FILE: Invalid image URL format." } 
      }));
      return;
    }

    try {
      if (selectedElement.elementRef) {
        const oldSrc = selectedElement.src;
        (selectedElement.elementRef as HTMLImageElement).src = urlInput;
        const success = await RealProjectSourcePatcher.patchImageSource(selectedElement.textContent, urlInput, {
          targetFile: selectedElement.targetFile,
          targetLine: selectedElement.targetLine,
          oldSrc: oldSrc
        });
        
        if (!success) {
          window.dispatchEvent(new CustomEvent('anny_editor_error', { 
            detail: { message: "IMAGE_TARGET_NOT_FOUND: Unable to locate the original image in the project source." } 
          }));
        } else {
          onUpdate(`Replaced image source with URL: ${urlInput.slice(0, 30)}...`);
          window.dispatchEvent(new CustomEvent('anny_editor_success', { 
            detail: { message: "Successfully replaced image URL" } 
          }));
          window.dispatchEvent(new CustomEvent('anny_vfs_changed'));
          setShowUrlInput(false);
          setPreviewUrl(null);
        }
      }
    } catch (err: any) {
      console.error("URL source patch failed:", err);
      window.dispatchEvent(new CustomEvent('anny_editor_error', { 
        detail: { message: `SOURCE_PATCH_FAILED: ${err.message || 'Error patching image URL'}` } 
      }));
    }
  };

  return (
    <div className="flex flex-col gap-4 p-3 bg-white/5 border border-white/10 rounded-lg animate-in fade-in slide-in-from-right-4 duration-300">
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        className="hidden" 
        onChange={handleFileUpload} 
      />

      <div className="flex items-center gap-2 mb-1">
        <ImageIcon className="w-4 h-4 text-purple-400" />
        <span className="text-[11px] font-bold text-white uppercase tracking-wider">Image Source</span>
      </div>

      <div className="flex flex-col gap-3">
        {/* Preview Container */}
        <div className="relative aspect-video bg-black/40 rounded-lg overflow-hidden border border-white/10 group">
          <img 
            src={previewUrl || selectedElement.src} 
            className="w-full h-full object-contain" 
            alt="Preview"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://placehold.co/400x225/1a1c26/666?text=Invalid+Image+URL';
            }}
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 bg-purple-600 hover:bg-purple-500 rounded-full cursor-pointer shadow-lg transition-transform hover:scale-110"
            >
              <Upload className="w-4 h-4 text-white" />
            </button>
            <button 
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-full shadow-lg transition-transform hover:scale-110"
            >
              <Link className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {showUrlInput && (
          <div className="flex flex-col gap-2 p-2 bg-black/30 rounded-lg border border-white/5 animate-in slide-in-from-top-2 duration-200">
            <span className="text-[10px] text-slate-400">Image URL</span>
            <div className="flex gap-1.5">
              <input 
                type="text" 
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setPreviewUrl(e.target.value);
                }}
                placeholder="https://..."
                className="flex-1 bg-[#151828] border border-white/15 rounded px-2 py-1 text-[11px] text-slate-200 outline-none"
              />
              <button 
                onClick={handleUrlApply}
                className="p-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-white transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => {
                  setShowUrlInput(false);
                  setPreviewUrl(null);
                  setUrlInput(selectedElement.src || '');
                }}
                className="p-1.5 bg-red-600 hover:bg-red-500 rounded text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button 
            className="flex items-center justify-center gap-2 py-1.5 bg-white/5 border border-white/10 rounded hover:bg-white/10 text-[10px] text-slate-300 transition-colors relative overflow-hidden group"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload</span>
          </button>
          <button 
            className="flex items-center justify-center gap-2 py-1.5 bg-white/5 border border-white/10 rounded hover:bg-white/10 text-[10px] text-slate-300 transition-colors"
            onClick={() => setShowUrlInput(!showUrlInput)}
          >
            <Link className="w-3.5 h-3.5" />
            <span>From URL</span>
          </button>
        </div>

        <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
          <span className="text-[10px] text-slate-400">Object Fit</span>
          <div className="grid grid-cols-4 gap-1">
            {['contain', 'cover', 'fill', 'none'].map(fit => (
              <button 
                key={fit}
                onClick={() => {
                  if (selectedElement.elementRef) {
                    selectedElement.elementRef.style.objectFit = fit;
                    RealProjectSourcePatcher.patchStyleProperty(selectedElement.textContent, 'objectFit', fit, {
                      targetFile: selectedElement.targetFile,
                      targetLine: selectedElement.targetLine
                    });
                    onUpdate(`Updated Object Fit to ${fit}`);
                  }
                }}
                className={`py-1 rounded text-[9px] capitalize transition-all border ${selectedElement.objectFit === fit ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/20' : 'bg-black/20 border-white/5 text-slate-400 hover:border-white/20'}`}
              >
                {fit}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
