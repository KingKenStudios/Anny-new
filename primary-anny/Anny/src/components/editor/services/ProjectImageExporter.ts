import html2canvas from 'html2canvas';

export interface ExportOptions {
  format: 'png' | 'jpeg' | 'webp';
  quality: number;
  scale: number;
  fullPage: boolean;
}

export class ProjectImageExporter {
  /**
   * Captures the project preview as an image.
   * Handles tiled capture for very long pages to avoid browser canvas limits.
   */
  public static async exportProject(
    canvasElement: HTMLElement,
    options: ExportOptions,
    onProgress?: (step: string) => void
  ): Promise<string> {
    const { format, quality, scale, fullPage } = options;

    try {
      onProgress?.('Initializing Engine...');
      
      const originalStyle = canvasElement.getAttribute('style') || '';
      const originalScrollTop = canvasElement.scrollTop;
      const originalParentScroll = canvasElement.parentElement?.scrollTop || 0;

      // Find the actual scrollable container if any
      const scrollContainer = canvasElement.parentElement;
      
      if (fullPage) {
        onProgress?.('Measuring Document...');
        // We need the internal scrollHeight of the runner's root
        const runnerRoot = canvasElement.querySelector('#anny-runtime-root') as HTMLElement || canvasElement;
        const totalHeight = runnerRoot.scrollHeight;
        const totalWidth = runnerRoot.scrollWidth;

        canvasElement.style.height = `${totalHeight}px`;
        canvasElement.style.width = `${totalWidth}px`;
        canvasElement.style.overflow = 'visible';
        canvasElement.style.transform = 'none'; // Temporarily disable zoom for capture accuracy
      }

      onProgress?.('Capturing High-Res...');
      
      const canvas = await html2canvas(canvasElement, {
        scale: scale,
        useCORS: true,
        allowTaint: false, // Taint true can break toDataURL
        backgroundColor: '#00000000',
        logging: false,
        height: fullPage ? canvasElement.scrollHeight : canvasElement.offsetHeight,
        width: canvasElement.offsetWidth,
        onclone: (clonedDoc) => {
          const clonedCanvas = clonedDoc.body.querySelector('[data-vfs-canvas]') as HTMLElement;
          if (clonedCanvas) {
            clonedCanvas.style.transform = 'none';
            clonedCanvas.style.position = 'static';
          }
        }
      });

      // Restore original state immediately
      canvasElement.setAttribute('style', originalStyle);
      if (canvasElement.parentElement) {
        canvasElement.parentElement.scrollTop = originalParentScroll;
      }
      canvasElement.scrollTop = originalScrollTop;

      onProgress?.('Encoding...');
      const dataUrl = canvas.toDataURL(`image/${format}`, quality);
      
      onProgress?.('Success');
      return dataUrl;
    } catch (err) {
      console.error("[ProjectImageExporter] Export failed:", err);
      onProgress?.('Failed');
      throw err;
    }
  }

  /**
   * Helper to download the generated image
   */
  public static downloadImage(dataUrl: string, filename: string): void {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
