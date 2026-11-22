import { WorkspaceManager } from '../core/workspaceManager';
import { Asset } from '../types/assets';

export const AssetUploadService = {
  async uploadFile(file: File): Promise<Asset> {
    const wsManager = WorkspaceManager.getInstance();
    const vfs = wsManager.getVFS();

    // 1. Sanitize filename
    const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    
    // 2. Determine type
    const mimeType = file.type;
    const ext = file.name.split('.').pop()?.toLowerCase();
    let type: Asset['type'] = 'other';
    let folder = 'files';

    if (mimeType.startsWith('image/')) { type = 'image'; folder = 'images'; }
    else if (mimeType.startsWith('video/')) { type = 'video'; folder = 'videos'; }
    else if (mimeType.startsWith('audio/')) { type = 'audio'; folder = 'audio'; }
    else if (['pdf', 'doc', 'docx', 'txt', 'csv', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext || '')) { type = 'document'; folder = 'documents'; }
    else if (['woff', 'woff2', 'ttf', 'otf'].includes(ext || '')) { type = 'font'; folder = 'fonts'; }

    const path = `/public/assets/${folder}/${safeName}`;

    // 3. Convert to Base64
    const base64 = await this.fileToBase64(file);

    // 4. Save to VFS
    vfs._unsafe_writeFile(path, base64);
    vfs.saveToStorage();
    window.dispatchEvent(new CustomEvent('anny_vfs_changed'));

    return {
      id: Math.random().toString(36).substring(7),
      name: file.name,
      type,
      mimeType,
      size: file.size,
      path,
      createdAt: new Date().toISOString()
    };
  },

  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }
};
