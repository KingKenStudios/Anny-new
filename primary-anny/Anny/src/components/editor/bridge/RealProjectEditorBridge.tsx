import React, { useState, useEffect, useRef } from 'react';
import { WorkspaceManager } from '../../../core/workspaceManager';
import { RealProjectSourcePatcher } from '../services/RealProjectSourcePatcher';

export interface SelectedElementData {
  tagName: string;
  textContent: string;
  className: string;
  id: string;
  color: string;
  backgroundColor: string;
  fontSize: string;
  padding: string;
  margin: string;
  width: string;
  height: string;
  borderRadius: string;
  elementRef: HTMLElement | null;
  targetFile?: string;
  targetLine?: number;
  src?: string;
  objectFit?: string;
  objectPosition?: string;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  lineHeight?: string;
  letterSpacing?: string;
  textAlign?: string;
  textTransform?: string;
  textDecoration?: string;
}

interface RealProjectEditorBridgeProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  activeTool: string;
  activeSubTool: string;
  currentColor: string;
  onSelectElement: (data: SelectedElementData | null) => void;
  onAddHistory: (action: string) => void;
  onSampleColor?: (color: string) => void;
  onTriggerSave?: () => void;
  onZoomChange?: (newZoom: number) => void;
}

export const RealProjectEditorBridge: React.FC<RealProjectEditorBridgeProps> = ({
  canvasRef,
  zoom,
  activeTool,
  activeSubTool,
  currentColor,
  onSelectElement,
  onAddHistory,
  onSampleColor,
  onTriggerSave,
  onZoomChange
}) => {
  const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null);
  const [hoveredLabel, setHoveredLabel] = useState<string>('');
  const [selectedRect, setSelectedRect] = useState<DOMRect | null>(null);
  const [selectedEl, setSelectedEl] = useState<HTMLElement | null>(null);
  const [selectedMeta, setSelectedMeta] = useState<{ targetFile?: string; targetLine?: number }>({});

  // Move element dragging state
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [dragDelta, setDragDelta] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  // Handle resizing state
  const [isResizing, setIsResizing] = useState<string | null>(null); // 'se', 'sw', 'ne', 'nw'
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Brush / Pen drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<{ x: number; y: number }[]>([]);
  
  // Live Preview State for Shapes
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [shapePreview, setShapePreview] = useState<{ x: number, y: number, w: number, h: number } | null>(null);

  // Marquee selection state
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Hand panning state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getElementTagLabel = (el: HTMLElement): string => {
      const tag = el.tagName.toLowerCase();
      const cls = (el.className || '').toString().toLowerCase();
      if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4') return 'Heading';
      if (tag === 'button' || cls.includes('button')) return 'Button';
      if (tag === 'img' || tag === 'svg') return 'Image';
      if (tag === 'section' || cls.includes('section')) return 'Section';
      if (tag === 'nav' || tag === 'header' || tag === 'footer') return 'Navigation';
      if (cls.includes('card') || tag === 'article') return 'Card';
      if (tag === 'p') return 'Paragraph';
      if (tag === 'a') return 'Link';
      if (tag === 'input' || tag === 'textarea') return 'Input';
      return tag.toUpperCase();
    };

    const getSourceInfo = (el: HTMLElement) => {
      const targetFile = el.getAttribute('data-vfs-file') || el.closest('[data-vfs-file]')?.getAttribute('data-vfs-file') || undefined;
      const targetLineStr = el.getAttribute('data-vfs-line') || el.closest('[data-vfs-line]')?.getAttribute('data-vfs-line');
      const targetLine = targetLineStr ? parseInt(targetLineStr, 10) : undefined;
      return { targetFile, targetLine };
    };

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const canvasRect = canvas.getBoundingClientRect();
      const currentX = (e.clientX - canvasRect.left) / zoom;
      const currentY = (e.clientY - canvasRect.top) / zoom;

      // TOOL ISOLATION: Explicitly check activeTool and activeSubTool
      
      // 1. HAND TOOL (Viewport Panning)
      if (activeTool === 'hand' || activeSubTool === 'hand') {
        if (isPanning && panStart && canvas.parentElement) {
          const dx = e.clientX - panStart.x;
          const dy = e.clientY - panStart.y;
          canvas.parentElement.scrollLeft = panStart.scrollLeft - dx;
          canvas.parentElement.scrollTop = panStart.scrollTop - dy;
        }
        return;
      }

      // 2. MOVE TOOLS (Selection & Transform)
      if (activeTool === 'move' || activeTool === 'direct_select' || activeSubTool === 'move' || activeSubTool === 'direct_select') {
        // Handle Resizing
        if (isResizing && resizeStart && selectedEl) {
          const dx = currentX - resizeStart.x;
          const dy = currentY - resizeStart.y;
          const newW = Math.max(10, Math.round(resizeStart.w + (isResizing.includes('e') ? dx : -dx)));
          const newH = Math.max(10, Math.round(resizeStart.h + (isResizing.includes('s') ? dy : -dy)));

          selectedEl.style.width = `${newW}px`;
          selectedEl.style.height = `${newH}px`;

          const rect = selectedEl.getBoundingClientRect();
          setSelectedRect({
            top: (rect.top - canvasRect.top) / zoom,
            left: (rect.left - canvasRect.left) / zoom,
            width: newW,
            height: newH,
            bottom: (rect.bottom - canvasRect.top) / zoom,
            right: (rect.right - canvasRect.left) / zoom,
          } as DOMRect);
          return;
        }

        // Handle Dragging
        if (isDraggingElement && dragStartPos && selectedEl) {
          const dx = Math.round(currentX - dragStartPos.x);
          const dy = Math.round(currentY - dragStartPos.y);
          setDragDelta({ dx, dy });
          selectedEl.style.transform = `translate(${dx}px, ${dy}px)`;

          const rect = selectedEl.getBoundingClientRect();
          setSelectedRect({
            top: (rect.top - canvasRect.top) / zoom,
            left: (rect.left - canvasRect.left) / zoom,
            width: rect.width / zoom,
            height: rect.height / zoom,
            bottom: (rect.bottom - canvasRect.top) / zoom,
            right: (rect.right - canvasRect.left) / zoom,
          } as DOMRect);
          return;
        }

        // Hover Overlay
        if (!isDraggingElement && !isResizing && target && target !== canvas) {
          const rect = target.getBoundingClientRect();
          setHoveredRect({
            top: (rect.top - canvasRect.top) / zoom,
            left: (rect.left - canvasRect.left) / zoom,
            width: rect.width / zoom,
            height: rect.height / zoom,
          } as DOMRect);
          setHoveredLabel(getElementTagLabel(target));
        } else {
          setHoveredRect(null);
        }
        return;
      }

      // 3. PAINT TOOLS (Brush / Pencil / Pen)
      const paintTools = ['brush', 'pencil', 'pen', 'curvature_pen', 'mixer_brush'];
      if ((paintTools.includes(activeTool) || paintTools.includes(activeSubTool)) && isDrawing) {
        setDrawingPoints(prev => [...prev, { x: currentX, y: currentY }]);
        return;
      }

      // 4. MARQUEE / LASSO
      const marqueeTools = ['marquee', 'rectangle_marquee', 'ellipse_marquee', 'single_row', 'single_column', 'lasso', 'polygonal_lasso', 'magnetic_lasso'];
      if ((marqueeTools.includes(activeTool) || marqueeTools.includes(activeSubTool)) && marqueeStart) {
        const x = Math.min(marqueeStart.x, currentX);
        const y = Math.min(marqueeStart.y, currentY);
        const w = Math.abs(currentX - marqueeStart.x);
        const h = Math.abs(currentY - marqueeStart.y);
        setMarqueeRect({ x, y, w, h });
        return;
      }

      // 5. SHAPE DRAWING (With explicit geometry preview)
      const shapeTools = ['shape', 'rectangle', 'rounded_rectangle', 'ellipse', 'circle', 'triangle', 'polygon', 'star', 'line', 'arrow'];
      if ((shapeTools.includes(activeTool) || shapeTools.includes(activeSubTool)) && marqueeStart) {
        const x = Math.min(marqueeStart.x, currentX);
        const y = Math.min(marqueeStart.y, currentY);
        const w = Math.abs(currentX - marqueeStart.x);
        const h = Math.abs(currentY - marqueeStart.y);
        setMarqueeRect({ x, y, w, h });
        setShapePreview({ x, y, w, h });
        return;
      }

      // Default: Clear hover if not in move tool
      if (hoveredRect) setHoveredRect(null);
    };

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!canvas.contains(target)) return;

      const canvasRect = canvas.getBoundingClientRect();
      const x = (e.clientX - canvasRect.left) / zoom;
      const y = (e.clientY - canvasRect.top) / zoom;

      // 1. HAND TOOL
      if (activeTool === 'hand' || activeSubTool === 'hand') {
        setIsPanning(true);
        setPanStart({
          x: e.clientX,
          y: e.clientY,
          scrollLeft: canvas.parentElement?.scrollLeft || 0,
          scrollTop: canvas.parentElement?.scrollTop || 0
        });
        e.preventDefault();
        return;
      }

      // 2. MOVE TOOL
      if (activeTool === 'move' || activeTool === 'direct_select' || activeSubTool === 'move' || activeSubTool === 'direct_select') {
        if (selectedEl && (target === selectedEl || selectedEl.contains(target))) {
          setIsDraggingElement(true);
          setDragStartPos({ x, y });
          setDragDelta({ dx: 0, dy: 0 });
          e.preventDefault();
          return;
        }
      }

      // 3. DRAWING TOOLS
      const paintTools = ['brush', 'pencil', 'pen', 'curvature_pen', 'mixer_brush'];
      if (paintTools.includes(activeTool) || paintTools.includes(activeSubTool)) {
        setIsDrawing(true);
        setDrawingPoints([{ x, y }]);
        e.preventDefault();
        return;
      }

      // 4. SELECTION & SHAPE TOOLS
      const marqueeTools = ['marquee', 'rectangle_marquee', 'ellipse_marquee', 'single_row', 'single_column', 'lasso', 'polygonal_lasso', 'magnetic_lasso'];
      const shapeTools = ['shape', 'rectangle', 'rounded_rectangle', 'ellipse', 'circle', 'triangle', 'polygon', 'star', 'line', 'arrow'];
      
      if (marqueeTools.includes(activeTool) || marqueeTools.includes(activeSubTool) || shapeTools.includes(activeTool) || shapeTools.includes(activeSubTool)) {
        setMarqueeStart({ x, y });
        setMarqueeRect({ x, y, w: 0, h: 0 });
        if (shapeTools.includes(activeTool) || shapeTools.includes(activeSubTool)) {
          setIsDrawingShape(true);
        }
        e.preventDefault();
        return;
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      // Finish Panning
      if (isPanning) {
        setIsPanning(false);
        setPanStart(null);
      }

      // Finish Dragging
      if (isDraggingElement && selectedEl) {
        setIsDraggingElement(false);
        if (Math.abs(dragDelta.dx) > 1 || Math.abs(dragDelta.dy) > 1) {
          const transformVal = `translate(${dragDelta.dx}px, ${dragDelta.dy}px)`;
          RealProjectSourcePatcher.patchStyleProperty(selectedEl.innerText?.slice(0, 30) || '', 'transform', transformVal, selectedMeta);
          onAddHistory(`Moved <${selectedEl.tagName.toLowerCase()}> to (${dragDelta.dx}px, ${dragDelta.dy}px)`);
          onTriggerSave?.();
        }
        setDragStartPos(null);
        return;
      }

      // Finish Resizing
      if (isResizing && selectedEl && selectedRect) {
        const wStr = `${Math.round(selectedRect.width)}px`;
        const hStr = `${Math.round(selectedRect.height)}px`;
        RealProjectSourcePatcher.patchStyleProperty(selectedEl.innerText?.slice(0, 30) || '', 'width', wStr, selectedMeta);
        RealProjectSourcePatcher.patchStyleProperty(selectedEl.innerText?.slice(0, 30) || '', 'height', hStr, selectedMeta);
        onAddHistory(`Resized <${selectedEl.tagName.toLowerCase()}> to ${wStr} × ${hStr}`);
        onTriggerSave?.();
        setIsResizing(null);
        setResizeStart(null);
        return;
      }

      // Finish Drawing
      const paintTools = ['brush', 'pencil', 'pen', 'curvature_pen', 'mixer_brush'];
      if ((paintTools.includes(activeTool) || paintTools.includes(activeSubTool)) && isDrawing && drawingPoints.length > 1) {
        setIsDrawing(false);
        const pathData = drawingPoints.reduce((acc, pt, idx) => {
          return idx === 0 ? `M ${Math.round(pt.x)} ${Math.round(pt.y)}` : `${acc} L ${Math.round(pt.x)} ${Math.round(pt.y)}`;
        }, '');
        RealProjectSourcePatcher.insertVectorPath(pathData, currentColor, activeTool === 'pencil' || activeSubTool === 'pencil' ? 2 : 4, selectedMeta);
        onAddHistory(`Created ${activeSubTool} path in ${selectedMeta.targetFile || 'VFS'}`);
        onTriggerSave?.();
        setDrawingPoints([]);
        return;
      }

      // Finish Marquee / Shape Insertion
      const marqueeTools = ['marquee', 'rectangle_marquee', 'ellipse_marquee', 'single_row', 'single_column', 'lasso', 'polygonal_lasso', 'magnetic_lasso'];
      const shapeTools = ['shape', 'rectangle', 'rounded_rectangle', 'ellipse', 'circle', 'triangle', 'polygon', 'star', 'line', 'arrow'];

      if ((marqueeTools.includes(activeTool) || marqueeTools.includes(activeSubTool) || shapeTools.includes(activeTool) || shapeTools.includes(activeSubTool)) && marqueeRect) {
        if (shapeTools.includes(activeTool) || shapeTools.includes(activeSubTool)) {
          setIsDrawingShape(false);
          const shapeType = activeTool === 'shape' ? activeSubTool : activeTool;
          const rect = {
            x: marqueeRect.x,
            y: marqueeRect.y,
            width: Math.max(marqueeRect.w, 10),
            height: Math.max(marqueeRect.h, 10)
          };
          RealProjectSourcePatcher.insertShape(shapeType, currentColor, rect, selectedMeta);
          onAddHistory(`Inserted Shape: ${shapeType}`);
          onTriggerSave?.();
          setShapePreview(null);
        } else {
          onAddHistory(`Marquee selection completed`);
        }
        setMarqueeStart(null);
        setMarqueeRect(null);
        return;
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!canvas.contains(target)) return;
      
      const canvasRect = canvas.getBoundingClientRect();
      const isCanvasBg = target === canvas;
      const sourceInfo = getSourceInfo(target);
      setSelectedMeta(sourceInfo);

      // 1. ZOOM TOOL
      if (activeTool === 'zoom') {
        e.stopPropagation();
        const factor = activeSubTool === 'zoom_out' || e.altKey ? -0.15 : 0.15;
        onZoomChange?.(Math.min(3, Math.max(0.1, zoom + factor)));
        return;
      }

      // 2. EYEDROPPER
      if (activeTool === 'eyedropper') {
        e.stopPropagation();
        const sampled = window.getComputedStyle(target).color || '#8B5CF6';
        onSampleColor?.(sampled);
        onAddHistory(`Sampled color: ${sampled}`);
        return;
      }

      // 3. SHAPE TOOLS (FLYOUT & PRIMARY) - Handled by mouseUp for drag-to-create
      const shapeTools = ['rectangle', 'rounded_rectangle', 'ellipse', 'circle', 'triangle', 'polygon', 'star', 'line', 'arrow', 'custom_shape'];
      if (activeTool === 'shape' || shapeTools.includes(activeTool) || shapeTools.includes(activeSubTool)) {
        const shapeType = activeTool === 'shape' ? activeSubTool : activeTool;
        if (shapeTools.includes(shapeType)) {
          e.stopPropagation();
          return;
        }
      }

      // 4. TEXT TOOL
      if (activeTool === 'text' || activeTool === 'horizontal_type' || activeTool === 'vertical_type') {
        e.stopPropagation();
        if (!isCanvasBg && target && ['H1', 'H2', 'H3', 'H4', 'P', 'SPAN', 'BUTTON', 'A', 'DIV'].includes(target.tagName)) {
          // Inline edit logic
          const oldText = target.innerText;
          target.contentEditable = 'true';
          target.focus();
          const handleBlur = () => {
            target.contentEditable = 'false';
            target.removeEventListener('blur', handleBlur);
            if (oldText !== target.innerText) {
              RealProjectSourcePatcher.patchTextContent(oldText, target.innerText, sourceInfo);
              onAddHistory(`Edited Text: "${target.innerText.slice(0, 20)}..."`);
              onTriggerSave?.();
            }
          };
          target.addEventListener('blur', handleBlur);
        } else {
          RealProjectSourcePatcher.insertTextElement('New Text', currentColor, sourceInfo);
          onAddHistory(`Inserted Text Element`);
          onTriggerSave?.();
        }
        return;
      }

      // 5. ERASER
      if (activeTool === 'eraser') {
        if (isCanvasBg) return;
        e.stopPropagation();
        RealProjectSourcePatcher.deleteElementFromProject(target.innerText?.slice(0, 30) || target.tagName, sourceInfo);
        onAddHistory(`Erased element <${target.tagName.toLowerCase()}>`);
        onTriggerSave?.();
        return;
      }

      // 6. GRADIENT / PAINT BUCKET
      if (activeTool === 'gradient' || activeTool === 'paint_bucket' || activeSubTool === 'paint_bucket') {
        if (isCanvasBg) return;
        e.stopPropagation();
        if (activeTool === 'paint_bucket' || activeSubTool === 'paint_bucket') {
          target.style.backgroundColor = currentColor;
          RealProjectSourcePatcher.patchStyleProperty(target.innerText?.slice(0, 30) || '', 'backgroundColor', currentColor, sourceInfo);
          onAddHistory(`Applied Fill: ${currentColor}`);
        } else {
          const grad = `linear-gradient(90deg, ${currentColor}, #EC4899)`;
          target.style.background = grad;
          RealProjectSourcePatcher.patchStyleProperty(target.innerText?.slice(0, 30) || '', 'background', grad, sourceInfo);
          onAddHistory(`Applied Gradient`);
        }
        onTriggerSave?.();
        return;
      }

      // 7. MOVE / SELECT (Lowest Priority Dispatch)
      if (activeTool === 'move' || activeTool === 'direct_select' || activeTool === 'quick_select') {
        if (isCanvasBg) {
          setSelectedEl(null);
          setSelectedRect(null);
          onSelectElement(null);
          return;
        }
        e.stopPropagation();
        setSelectedEl(target);
        const rect = target.getBoundingClientRect();
        const relRect = {
          top: (rect.top - canvasRect.top) / zoom,
          left: (rect.left - canvasRect.left) / zoom,
          width: rect.width / zoom,
          height: rect.height / zoom,
        } as DOMRect;
        setSelectedRect(relRect);

        const computed = window.getComputedStyle(target);
        onSelectElement({
          tagName: target.tagName,
          textContent: target.innerText?.slice(0, 50) || '',
          className: target.className || '',
          id: target.id || '',
          color: computed.color || '#ffffff',
          backgroundColor: computed.backgroundColor || 'transparent',
          fontSize: computed.fontSize || '16px',
          padding: computed.padding || '0px',
          margin: computed.margin || '0px',
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          borderRadius: computed.borderRadius || '0px',
          src: (target as HTMLImageElement).src || (target.getAttribute('src')) || undefined,
          objectFit: computed.objectFit,
          objectPosition: computed.objectPosition,
          fontFamily: computed.fontFamily,
          fontWeight: computed.fontWeight,
          fontStyle: computed.fontStyle,
          lineHeight: computed.lineHeight,
          letterSpacing: computed.letterSpacing,
          textAlign: computed.textAlign,
          textTransform: computed.textTransform,
          textDecoration: computed.textDecoration,
          elementRef: target,
          targetFile: sourceInfo.targetFile,
          targetLine: sourceInfo.targetLine
        });
        onAddHistory(`Selected ${target.tagName.toLowerCase()} in ${sourceInfo.targetFile || 'VFS'}`);
      }
    };

    const handleDblClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!canvas.contains(target) || target === canvas) return;

      if (['H1', 'H2', 'H3', 'H4', 'P', 'SPAN', 'BUTTON', 'A'].includes(target.tagName)) {
        const sourceInfo = getSourceInfo(target);
        const oldText = target.innerText;
        target.contentEditable = 'true';
        target.focus();
        const handleBlur = () => {
          target.contentEditable = 'false';
          target.removeEventListener('blur', handleBlur);
          const newText = target.innerText;
          if (oldText !== newText) {
            RealProjectSourcePatcher.patchTextContent(oldText, newText, sourceInfo);
            onAddHistory(`Edited text in ${sourceInfo.targetFile || 'VFS'}: "${oldText.slice(0, 20)}" -> "${newText.slice(0, 20)}"`);
            onTriggerSave?.();
          }
        };
        target.addEventListener('blur', handleBlur);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      const target = e.target as HTMLElement;
      if (canvas.contains(target) && (target.tagName === 'IMG' || target.tagName === 'svg')) {
        target.style.outline = '2px dashed #8B5CF6';
        target.style.outlineOffset = '2px';
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      target.style.outline = '';
      target.style.outlineOffset = '';
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      const target = e.target as HTMLElement;
      target.style.outline = '';
      
      // Handle dropping assets from Asset Library onto the canvas
      const assetPath = e.dataTransfer?.getData('assetPath');
      if (assetPath) {
        const rect = canvas.getBoundingClientRect();
        const dropX = (e.clientX - rect.left) / zoom;
        const dropY = (e.clientY - rect.top) / zoom;

        const webUrl = assetPath.replace(/^\/public/, '');
        const filename = assetPath.split('/').pop() || 'asset';
        let snippet = '';

        if (assetPath.includes('/images/')) {
          snippet = `<img src="${webUrl}" style={{ position: 'absolute', left: '${Math.round(dropX)}px', top: '${Math.round(dropY)}px', width: '200px' }} alt="${filename}" />`;
        } else if (assetPath.includes('/videos/')) {
          snippet = `<video src="${webUrl}" controls style={{ position: 'absolute', left: '${Math.round(dropX)}px', top: '${Math.round(dropY)}px', width: '320px' }} />`;
        } else if (assetPath.includes('/audio/')) {
          snippet = `<audio src="${webUrl}" controls style={{ position: 'absolute', left: '${Math.round(dropX)}px', top: '${Math.round(dropY)}px' }} />`;
        } else {
          snippet = `<a href="${webUrl}" download style={{ position: 'absolute', left: '${Math.round(dropX)}px', top: '${Math.round(dropY)}px', color: '#8B5CF6', textDecoration: 'underline' }}>Download ${filename}</a>`;
        }

        RealProjectSourcePatcher.insertElementIntoProject('Dropped Asset', snippet);
        onAddHistory(`Dropped and inserted asset: ${filename}`);
        onTriggerSave?.();
        return;
      }

      if (canvas.contains(target) && (target.tagName === 'IMG' || target.tagName === 'svg')) {
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
          const file = files[0];
          if (file.type.startsWith('image/')) {
            const sourceInfo = getSourceInfo(target);
            try {
              const oldSrc = (target as HTMLImageElement).src || target.getAttribute('src') || '';
              const localPath = await RealProjectSourcePatcher.uploadImageAsset(file);
              (target as HTMLImageElement).src = localPath;
              await RealProjectSourcePatcher.patchImageSource(target.innerText || '', localPath, {
                ...sourceInfo,
                oldSrc: oldSrc
              });
              onAddHistory(`Replaced image via drop: ${file.name}`);
              onTriggerSave?.();
            } catch (err) {
              console.error("Drop replace failed:", err);
            }
          }
        }
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('dblclick', handleDblClick);
    canvas.addEventListener('dragover', handleDragOver);
    canvas.addEventListener('dragleave', handleDragLeave);
    canvas.addEventListener('drop', handleDrop);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('dblclick', handleDblClick);
      canvas.removeEventListener('dragover', handleDragOver);
      canvas.removeEventListener('dragleave', handleDragLeave);
      canvas.removeEventListener('drop', handleDrop);
    };
  }, [canvasRef, zoom, activeTool, activeSubTool, currentColor, selectedEl, isDraggingElement, dragStartPos, dragDelta, isResizing, resizeStart, isDrawing, drawingPoints, marqueeStart, marqueeRect, isPanning, panStart]);

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Hover outline */}
      {hoveredRect && (activeTool === 'move' || activeTool === 'direct_select') && (
        <div
          className="absolute border-2 border-purple-400 bg-purple-500/10 pointer-events-none transition-all duration-75"
          style={{
            top: `${hoveredRect.top}px`,
            left: `${hoveredRect.left}px`,
            width: `${hoveredRect.width}px`,
            height: `${hoveredRect.height}px`,
          }}
        >
          <span className="absolute -top-5 left-0 bg-purple-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow uppercase">
            {hoveredLabel}
          </span>
        </div>
      )}

      {/* Selected Element Bounding Box */}
      {selectedRect && (
        <div
          className="absolute border-2 border-indigo-500 pointer-events-none"
          style={{
            top: `${selectedRect.top}px`,
            left: `${selectedRect.left}px`,
            width: `${selectedRect.width}px`,
            height: `${selectedRect.height}px`,
          }}
        >
          {/* Handles */}
          {(['nw', 'ne', 'se', 'sw'] as const).map(pos => {
            const isN = pos.includes('n');
            const isW = pos.includes('w');
            return (
              <div
                key={pos}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setIsResizing(pos);
                  setResizeStart({ x: e.clientX / zoom, y: e.clientY / zoom, w: selectedRect.width, h: selectedRect.height });
                }}
                className={`absolute w-2.5 h-2.5 bg-white border-2 border-indigo-600 rounded-sm pointer-events-auto cursor-${pos}-resize z-20 shadow`}
                style={{
                  top: isN ? '-5px' : 'calc(100% - 5px)',
                  left: isW ? '-5px' : 'calc(100% - 5px)',
                }}
              />
            );
          })}
        </div>
      )}

      {/* Marquee Overlay */}
      {marqueeRect && (
        <div
          className="absolute border border-dashed border-white bg-indigo-500/20 pointer-events-none"
          style={{
            left: `${marqueeRect.x}px`,
            top: `${marqueeRect.y}px`,
            width: `${marqueeRect.w}px`,
            height: `${marqueeRect.h}px`,
          }}
        />
      )}

      {/* Brush / Pen Path Drawing Overlay */}
      {isDrawing && drawingPoints.length > 1 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-30">
          <path
            d={drawingPoints.reduce((acc, pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`), '')}
            stroke={currentColor}
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {/* LIVE SHAPE PREVIEW OVERLAY */}
      {isDrawingShape && marqueeRect && (
        <div 
          className="absolute pointer-events-none z-50 flex items-center justify-center overflow-visible"
          style={{
            left: `${marqueeRect.x}px`,
            top: `${marqueeRect.y}px`,
            width: `${marqueeRect.w}px`,
            height: `${marqueeRect.h}px`,
          }}
        >
          {activeSubTool === 'rectangle' && (
            <div className="w-full h-full border-2 border-purple-500 bg-purple-500/10" />
          )}
          {activeSubTool === 'rounded_rectangle' && (
            <div className="w-full h-full border-2 border-purple-500 bg-purple-500/10 rounded-xl" />
          )}
          {(activeSubTool === 'ellipse' || activeSubTool === 'circle') && (
            <div className="w-full h-full border-2 border-purple-500 bg-purple-500/10 rounded-full" />
          )}
          {activeSubTool === 'triangle' && (
            <svg width="100%" height="100%" viewBox={`0 0 ${marqueeRect.w} ${marqueeRect.h}`} className="overflow-visible">
              <path 
                d={`M ${marqueeRect.w / 2} 0 L ${marqueeRect.w} ${marqueeRect.h} L 0 ${marqueeRect.h} Z`} 
                className="fill-purple-500/10 stroke-purple-500 stroke-2" 
              />
            </svg>
          )}
          {activeSubTool === 'star' && (
            <svg width="100%" height="100%" viewBox={`0 0 ${marqueeRect.w} ${marqueeRect.h}`} className="overflow-visible">
              <polygon 
                points={(() => {
                  const pts = [];
                  const w = marqueeRect.w;
                  const h = marqueeRect.h;
                  for (let i = 0; i < 10; i++) {
                    const r = i % 2 === 0 ? Math.min(w, h) / 2 : Math.min(w, h) / 4;
                    const angle = (Math.PI * i) / 5 - Math.PI / 2;
                    pts.push(`${w / 2 + r * Math.cos(angle)},${h / 2 + r * Math.sin(angle)}`);
                  }
                  return pts.join(' ');
                })()}
                className="fill-purple-500/10 stroke-purple-500 stroke-2" 
              />
            </svg>
          )}
          {activeSubTool === 'polygon' && (
            <div className="w-full h-full border-2 border-purple-500 bg-purple-500/10" style={{ clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)' }} />
          )}
          {activeSubTool === 'line' && (
            <div className="w-full h-[2px] bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
          )}
          {activeSubTool === 'arrow' && (
            <svg width="100%" height="100%" viewBox={`0 0 ${marqueeRect.w} ${marqueeRect.h}`} className="overflow-visible">
              <line x1="0" y1={marqueeRect.h / 2} x2={marqueeRect.w - 10} y2={marqueeRect.h / 2} className="stroke-purple-500 stroke-2" />
              <path d={`M ${marqueeRect.w - 10} ${marqueeRect.h / 2 - 5} L ${marqueeRect.w} ${marqueeRect.h / 2} L ${marqueeRect.w - 10} ${marqueeRect.h / 2 + 5} Z`} className="fill-purple-500" />
            </svg>
          )}
        </div>
      )}
    </div>
  );
};
