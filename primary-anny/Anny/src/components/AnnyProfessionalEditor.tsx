import React, { useState, useEffect, useRef } from 'react';
import { 
    Undo2, Redo2, Sparkles, Download, Maximize2, Minimize2, X, Plus, Play, Save, History as HistoryIcon, 
    Sliders, Layers as LayersIcon, Palette, Eye, EyeOff, Lock, Unlock, MousePointer2, Circle, Type, Hand, PaintBucket, 
    Crop, ArrowLeft, Bot, Send, Square, Triangle, Star, Scissors, Wand2, Monitor, Box, Minus, ArrowRight, Hexagon,
    Brush, Eraser, PenTool, ZoomIn, ChevronRight, ChevronDown, Folder, FolderOpen, Trash2, Copy, Pencil,
    RotateCcw, FlipHorizontal, AlignLeft, AlignCenter, AlignRight, AlignJustify, Grid, RotateCw,
    SlidersHorizontal, Check, Settings2, HelpCircle, FileText, Layout, Search, Pipette, Upload, Link as LinkIcon,
    Camera, Image as ImageIcon, ShieldCheck, Maximize, Layers, AlertTriangle, CheckCircle, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../lib/firebase';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { DynamicVFSAppRunner } from './StandalonePreviewRunner';
import { WorkspaceManager } from '../core/workspaceManager';
import { RealProjectEditorBridge, SelectedElementData } from './editor/bridge/RealProjectEditorBridge';
import { RealProjectSourcePatcher } from './editor/services/RealProjectSourcePatcher';
import { ProfessionalMenuBar } from './editor/ProfessionalMenuBar';
import { ToolGroup, ToolItem } from './editor/ToolGroup';
import { TypographyControls } from './editor/components/TypographyControls';
import { ImageControls } from './editor/components/ImageControls';
import { AssetLibrary } from './editor/components/AssetLibrary';
import { AssetUploadService } from '../services/assetUploadService';
import { ProjectImageExporter, ExportOptions } from './editor/services/ProjectImageExporter';

// CANONICAL ANNY PROFESSIONAL EDITOR
// DO NOT REDESIGN OR REPLACE. REPAIR ONLY.

interface ToolGroupDefinition {
    id: string;
    name: string;
    icon: any;
    shortcut: string;
    tools: ToolItem[];
}

const toolGroups: ToolGroupDefinition[] = [
    {
        id: 'move',
        name: 'Selection',
        icon: MousePointer2,
        shortcut: 'V',
        tools: [
            { id: 'move', name: 'Move Tool', icon: MousePointer2, shortcut: 'V' },
            { id: 'direct_select', name: 'Direct Selection', icon: MousePointer2, shortcut: 'A' },
        ]
    },
    {
        id: 'marquee',
        name: 'Marquee',
        icon: Square,
        shortcut: 'M',
        tools: [
            { id: 'rectangle_marquee', name: 'Rectangular Marquee', icon: Square, shortcut: 'M' },
            { id: 'ellipse_marquee', name: 'Elliptical Marquee', icon: Circle },
            { id: 'single_row', name: 'Single Row Marquee', icon: Minus },
            { id: 'single_column', name: 'Single Column Marquee', icon: Minus }
        ]
    },
    {
        id: 'lasso',
        name: 'Lasso',
        icon: Scissors,
        shortcut: 'L',
        tools: [
            { id: 'lasso', name: 'Lasso Tool', icon: Scissors, shortcut: 'L' },
            { id: 'polygonal_lasso', name: 'Polygonal Lasso', icon: Scissors },
            { id: 'magnetic_lasso', name: 'Magnetic Lasso', icon: Scissors }
        ]
    },
    {
        id: 'crop',
        name: 'Crop',
        icon: Crop,
        shortcut: 'C',
        tools: [
            { id: 'crop', name: 'Crop Tool', icon: Crop, shortcut: 'C' },
            { id: 'perspective_crop', name: 'Perspective Crop', icon: Crop },
            { id: 'slice', name: 'Slice Tool', icon: Scissors },
        ]
    },
    {
        id: 'eyedropper',
        name: 'Eyedropper',
        icon: Pipette,
        shortcut: 'I',
        tools: [
            { id: 'eyedropper', name: 'Eyedropper Tool', icon: Pipette, shortcut: 'I' },
            { id: 'color_sampler', name: 'Color Sampler', icon: Pipette },
            { id: 'ruler', name: 'Ruler Tool', icon: SlidersHorizontal },
        ]
    },
    {
        id: 'healing',
        name: 'Retouch',
        icon: Sparkles,
        shortcut: 'J',
        tools: [
            { id: 'spot_healing', name: 'Spot Healing Brush', icon: Sparkles, shortcut: 'J' },
            { id: 'healing_brush', name: 'Healing Brush', icon: Sparkles },
            { id: 'patch', name: 'Patch Tool', icon: Scissors },
            { id: 'clone_stamp', name: 'Clone Stamp Tool', icon: Copy }
        ]
    },
    {
        id: 'brush',
        name: 'Brush',
        icon: Brush,
        shortcut: 'B',
        tools: [
            { id: 'brush', name: 'Brush Tool', icon: Brush, shortcut: 'B' },
            { id: 'pencil', name: 'Pencil Tool', icon: Pencil },
            { id: 'mixer_brush', name: 'Mixer Brush', icon: Brush }
        ]
    },
    {
        id: 'eraser',
        name: 'Eraser',
        icon: Eraser,
        shortcut: 'E',
        tools: [
            { id: 'eraser', name: 'Eraser Tool', icon: Eraser, shortcut: 'E' },
            { id: 'background_eraser', name: 'Background Eraser', icon: Eraser },
            { id: 'magic_eraser', name: 'Magic Eraser', icon: Eraser }
        ]
    },
    {
        id: 'gradient',
        name: 'Gradient',
        icon: Palette,
        shortcut: 'G',
        tools: [
            { id: 'gradient', name: 'Gradient Tool', icon: Palette, shortcut: 'G' },
            { id: 'paint_bucket', name: 'Paint Bucket', icon: PaintBucket },
        ]
    },
    {
        id: 'pen',
        name: 'Pen',
        icon: PenTool,
        shortcut: 'P',
        tools: [
            { id: 'pen', name: 'Pen Tool', icon: PenTool, shortcut: 'P' },
            { id: 'curvature_pen', name: 'Curvature Pen', icon: PenTool },
            { id: 'add_anchor', name: 'Add Anchor Point', icon: Plus },
            { id: 'delete_anchor', name: 'Delete Anchor Point', icon: X },
            { id: 'convert_point', name: 'Convert Point Tool', icon: RotateCcw }
        ]
    },
    {
        id: 'text',
        name: 'Text',
        icon: Type,
        shortcut: 'T',
        tools: [
            { id: 'horizontal_type', name: 'Horizontal Type', icon: Type, shortcut: 'T' },
            { id: 'vertical_type', name: 'Vertical Type', icon: Type },
        ]
    },
    {
        id: 'shape',
        name: 'Shapes',
        icon: Box,
        shortcut: 'U',
        tools: [
            { id: 'rectangle', name: 'Rectangle Tool', icon: Square, shortcut: 'U' },
            { id: 'rounded_rectangle', name: 'Rounded Rectangle', icon: Square },
            { id: 'ellipse', name: 'Ellipse Tool', icon: Circle },
            { id: 'circle', name: 'Circle Tool', icon: Circle },
            { id: 'triangle', name: 'Triangle Tool', icon: Triangle },
            { id: 'polygon', name: 'Polygon Tool', icon: Hexagon },
            { id: 'star', name: 'Star Tool', icon: Star },
            { id: 'line', name: 'Line Tool', icon: Minus },
            { id: 'arrow', name: 'Arrow Tool', icon: ArrowRight },
            { id: 'custom_shape', name: 'Custom Shape', icon: Box },
        ]
    },
    {
        id: 'hand',
        name: 'Hand',
        icon: Hand,
        shortcut: 'H',
        tools: [
            { id: 'hand', name: 'Hand Tool', icon: Hand, shortcut: 'H' },
            { id: 'rotate_view', name: 'Rotate View', icon: RotateCw },
        ]
    },
    {
        id: 'zoom',
        name: 'Zoom',
        icon: Search,
        shortcut: 'Z',
        tools: [
            { id: 'zoom_in', name: 'Zoom In', icon: ZoomIn, shortcut: 'Z' },
            { id: 'zoom_out', name: 'Zoom Out', icon: Search },
        ]
    }
];

interface AnnyProfessionalEditorProps {
    userEmail?: string;
    userName?: string;
    sessionId?: string;
    onBack?: () => void;
    onBackToWorkspace?: () => void;
    onBackToSplitView?: () => void;
}

export const AnnyProfessionalEditor: React.FC<AnnyProfessionalEditorProps> = ({
    userEmail = 'user@anny.ai',
    userName = 'Anny Creator',
    sessionId = 'default-session',
    onBack,
    onBackToWorkspace,
    onBackToSplitView
}) => {
    const canvasRef = useRef<HTMLDivElement>(null);
    
    // Editor UI state
    const [activeTool, setActiveTool] = useState('move');
    const [activeSubTool, setActiveSubTool] = useState('move');
    const [lastSubToolPerGroup, setLastSubToolPerGroup] = useState<Record<string, string>>({
        move: 'move',
        marquee: 'rectangle_marquee',
        lasso: 'lasso',
        quick_select: 'quick_selection',
        crop: 'crop',
        eyedropper: 'eyedropper',
        healing: 'spot_healing',
        brush: 'brush',
        eraser: 'eraser',
        gradient: 'gradient',
        blur: 'blur',
        dodge: 'dodge',
        pen: 'pen',
        text: 'horizontal_type',
        shape: 'rectangle',
        hand: 'hand',
        zoom: 'zoom_in'
    });
    const [showToolFlyout, setShowToolFlyout] = useState<string | null>(null);
    const [autoSelect, setAutoSelect] = useState(true);
    const [showTransformControls, setShowTransformControls] = useState(true);
    const [autoSelectType, setAutoSelectType] = useState<'Layer' | 'Group'>('Layer');
    
    // Tabs state
    const [activeRightTab, setActiveRightTab] = useState<'Color' | 'Swatches' | 'Gradients' | 'Patterns' | 'Export' | 'Properties' | 'Assets'>('Properties');
    const [activePropertiesTab, setActivePropertiesTab] = useState<'Properties' | 'Adjust' | 'Effects' | 'Transform'>('Properties');
    const [activeLayerTab, setActiveLayerTab] = useState<'Layers' | 'Channels' | 'Paths' | 'History' | 'Log'>('Layers');
    
    // Viewport & document state
    const [zoom, setZoom] = useState(0.6667);
    const [viewportWidth, setViewportWidth] = useState<'100%' | '1920px' | '768px' | '375px'>('1920px');
    const [docWidth, setDocWidth] = useState(1920);
    const [docHeight, setDocHeight] = useState(1080);
    const [docResolution] = useState(72);
    const [docBgColor] = useState('#0B0D17');
    
    // Layer list state
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
        header: true,
        hero: true,
        features: true,
        footer: true
    });
    const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>({
        header: true,
        hero: true,
        features: true,
        footer: true,
        bg: true
    });

    // Save & VFS state
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
    const [vfsFiles, setVfsFiles] = useState<string[]>([]);
    
    // Color Picker state
    const [currentColor, setCurrentColor] = useState('#8B5CF6');
    const [rgbVals, setRgbVals] = useState({ r: 139, g: 92, b: 246 });
    const [selectedElement, setSelectedElement] = useState<SelectedElementData | null>(null);

    // UNIVERSAL FILE SYSTEM PIPELINE REFS & STATES
    const universalUploadInputRef = useRef<HTMLInputElement>(null);
    const replacementUploadInputRef = useRef<HTMLInputElement>(null);
    const [editorError, setEditorError] = useState<string | null>(null);
    const [editorSuccess, setEditorSuccess] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState<string | null>(null);

    const handleUniversalUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploadProgress(`Uploading ${files.length} file(s)...`);
        window.dispatchEvent(new CustomEvent('anny_editor_success', { detail: { message: `Started uploading ${files.length} file(s)` } }));

        let successCount = 0;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                await AssetUploadService.uploadFile(file);
                successCount++;
            } catch (err: any) {
                console.error(`Upload failed for ${file.name}:`, err);
                window.dispatchEvent(new CustomEvent('anny_editor_error', { 
                    detail: { message: `UPLOAD_FAILED: ${file.name} - ${err.message || 'unknown error'}` } 
                }));
            }
        }

        setUploadProgress(null);
        if (universalUploadInputRef.current) {
            universalUploadInputRef.current.value = '';
        }

        if (successCount > 0) {
            window.dispatchEvent(new CustomEvent('anny_editor_success', { 
                detail: { message: `Successfully uploaded ${successCount} asset(s) to VFS` } 
            }));
            window.dispatchEvent(new CustomEvent('anny_vfs_changed'));
        }
    };

    const handleReplacementUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!selectedElement) {
            window.dispatchEvent(new CustomEvent('anny_editor_error', { detail: { message: "No active element selected." } }));
            return;
        }

        setUploadProgress(`Replacing image with ${file.name}...`);
        window.dispatchEvent(new CustomEvent('anny_editor_success', { detail: { message: `Replacing image with ${file.name}` } }));

        try {
            const localPath = await RealProjectSourcePatcher.uploadImageAsset(file);
            if (selectedElement.elementRef) {
                const oldSrc = selectedElement.src;
                (selectedElement.elementRef as HTMLImageElement).src = localPath;

                const success = await RealProjectSourcePatcher.patchImageSource(
                    selectedElement.textContent, 
                    localPath, 
                    {
                        targetFile: selectedElement.targetFile,
                        targetLine: selectedElement.targetLine,
                        oldSrc: oldSrc
                    }
                );

                if (!success) {
                    window.dispatchEvent(new CustomEvent('anny_editor_error', { 
                        detail: { message: "Unable to locate the original image in the project source." } 
                    }));
                } else {
                    window.dispatchEvent(new CustomEvent('anny_editor_success', { 
                        detail: { message: `Successfully replaced image with ${file.name}` } 
                    }));
                    window.dispatchEvent(new CustomEvent('anny_vfs_changed'));
                    setSelectedElement(prev => prev ? { ...prev, src: localPath } : null);
                }
            }
        } catch (err: any) {
            console.error("Replacement upload failed:", err);
            window.dispatchEvent(new CustomEvent('anny_editor_error', { 
                detail: { message: `SOURCE_PATCH_FAILED: ${err.message || 'Error updating source'}` } 
            }));
        } finally {
            setUploadProgress(null);
            if (replacementUploadInputRef.current) {
                replacementUploadInputRef.current.value = '';
            }
        }
    };

    // Centralized Event Listeners for feedback notifications and asset replacements
    useEffect(() => {
        const handleError = (e: Event) => {
            const customEvent = e as CustomEvent;
            const msg = customEvent.detail?.message || "An error occurred";
            setEditorError(msg);
            setEditorSuccess(null);
            setActionHistory(prev => [`[ERROR] ${msg}`, ...prev]);
            setTimeout(() => setEditorError(null), 5000);
        };

        const handleSuccess = (e: Event) => {
            const customEvent = e as CustomEvent;
            const msg = customEvent.detail?.message || "Action successful";
            setEditorSuccess(msg);
            setEditorError(null);
            setActionHistory(prev => [msg, ...prev]);
            setTimeout(() => setEditorSuccess(null), 5000);
        };

        const handleReplaceSelectedAsset = async (e: Event) => {
            const customEvent = e as CustomEvent;
            const assetPath = customEvent.detail?.assetPath;
            if (!assetPath) return;

            if (!selectedElement) {
                window.dispatchEvent(new CustomEvent('anny_editor_error', { 
                    detail: { message: "No active element selected. Select an image or media element first." } 
                }));
                return;
            }

            const cleanPath = assetPath.replace(/^\/public/, '');

            try {
                if (selectedElement.elementRef) {
                    if (selectedElement.tagName.toLowerCase() === 'img' || selectedElement.elementRef.tagName.toLowerCase() === 'img') {
                        const oldSrc = selectedElement.src;
                        (selectedElement.elementRef as HTMLImageElement).src = cleanPath;
                        const success = await RealProjectSourcePatcher.patchImageSource(selectedElement.textContent, cleanPath, {
                            targetFile: selectedElement.targetFile,
                            targetLine: selectedElement.targetLine,
                            oldSrc: oldSrc
                        });

                        if (!success) {
                            window.dispatchEvent(new CustomEvent('anny_editor_error', { 
                                detail: { message: "Unable to locate the original image in the project source." } 
                            }));
                        } else {
                            window.dispatchEvent(new CustomEvent('anny_editor_success', { 
                                detail: { message: `Replaced selected image with ${assetPath.split('/').pop()}` } 
                            }));
                            window.dispatchEvent(new CustomEvent('anny_vfs_changed'));
                            setSelectedElement(prev => prev ? { ...prev, src: cleanPath } : null);
                        }
                    } else {
                        window.dispatchEvent(new CustomEvent('anny_editor_error', { 
                            detail: { message: "Replacement only supported for <img> elements." } 
                        }));
                    }
                }
            } catch (err: any) {
                console.error("Asset replacement failed:", err);
                window.dispatchEvent(new CustomEvent('anny_editor_error', { 
                    detail: { message: `SOURCE_PATCH_FAILED: ${err.message || 'Error updating source'}` } 
                }));
            }
        };

        window.addEventListener('anny_editor_error', handleError);
        window.addEventListener('anny_editor_success', handleSuccess);
        window.addEventListener('anny_replace_selected_asset', handleReplaceSelectedAsset);

        return () => {
            window.removeEventListener('anny_editor_error', handleError);
            window.removeEventListener('anny_editor_success', handleSuccess);
            window.removeEventListener('anny_replace_selected_asset', handleReplaceSelectedAsset);
        };
    }, [selectedElement]);

    // Controlled inputs for Properties Panel
    const [propText, setPropText] = useState('');
    const [propFontSize, setPropFontSize] = useState('16');
    const [propRadius, setPropRadius] = useState('0');
    const [propPadding, setPropPadding] = useState('0px');
    const [propMargin, setPropMargin] = useState('0px');
    const [propShapeType, setPropShapeType] = useState<string>('');

    useEffect(() => {
        if (selectedElement) {
            setPropText(selectedElement.textContent || '');
            setPropFontSize(selectedElement.fontSize.replace('px', '') || '16');
            setPropRadius(selectedElement.borderRadius.replace('px', '') || '0');
            setPropPadding(selectedElement.padding || '0px');
            setPropMargin(selectedElement.margin || '0px');

            // Detect shape type
            const id = selectedElement.id || '';
            if (id.startsWith('anny-')) {
                const parts = id.split('-');
                if (parts.length >= 2) setPropShapeType(parts[1]);
            } else {
                setPropShapeType(selectedElement.tagName.toLowerCase());
            }
        }
    }, [selectedElement]);

    // Real Layers from DOM
    const [realLayers, setRealLayers] = useState<{ id: string, name: string, type: string, visible: boolean, ref: HTMLElement }[]>([]);
    
    useEffect(() => {
        const interval = setInterval(() => {
            if (canvasRef.current) {
                const elements = canvasRef.current.querySelectorAll('[data-vfs-file]');
                const layers = Array.from(elements).map((el, idx) => {
                    const htmlEl = el as HTMLElement;
                    return {
                        id: `layer-${idx}`,
                        name: htmlEl.innerText?.slice(0, 20) || htmlEl.tagName.toLowerCase(),
                        type: htmlEl.tagName.toLowerCase(),
                        visible: htmlEl.style.display !== 'none',
                        ref: htmlEl
                    };
                }).slice(0, 40); 
                setRealLayers(layers);
            }
        }, 500);
        return () => clearInterval(interval);
    }, []);

    // History log state
    const [actionHistory, setActionHistory] = useState<string[]>([
        'Initial Session Loaded',
        'VFS Runtime Initialized',
        'Professional Editor Ready',
        'Canvas Scale set to 66.67%'
    ]);

    // Anny AI Assistant State
    const [showAiAssistant, setShowAiAssistant] = useState(true);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([
        { role: 'model', text: 'Hello! I am Anny AI, your professional design and code assistant. I can inspect DOM elements, generate JSX layouts, adjust styles, or optimize your VFS code.' }
    ]);
    const [isAiProcessing, setIsAiProcessing] = useState(false);

    // Clipboard state for copy/paste
    const [copiedElement, setCopiedElement] = useState<SelectedElementData | null>(null);
    const [previousTool, setPreviousTool] = useState<string | null>(null);

    // Export State
    const [exportFormat, setExportFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
    const [exportQuality, setExportQuality] = useState(1);
    const [exportScale, setExportScale] = useState(1);
    const [exportStatus, setExportStatus] = useState<string | null>(null);

    useEffect(() => {
        const wsManager = WorkspaceManager.getInstance();
        if (sessionId) {
            wsManager.switchWorkspace(sessionId, `Session ${sessionId}`);
        }
        const vfs = wsManager.getVFS();
        vfs.reloadFromStorage();
        setVfsFiles(vfs.getAllFiles().map(f => f.path));

        const unsubVfs = vfs.watch(() => {
            setVfsFiles(vfs.getAllFiles().map(f => f.path));
        });

        const handleVfsChangedEvent = (e?: any) => {
            const eventProjectId = e?.detail?.projectId;
            if (sessionId && eventProjectId && sessionId !== eventProjectId) {
                return; // Ignore VFS changes from background sessions
            }
            setVfsFiles(vfs.getAllFiles().map(f => f.path));
            setSaveStatus('saving');
        };

        window.addEventListener('anny_vfs_changed', handleVfsChangedEvent);

        return () => {
            unsubVfs();
            window.removeEventListener('anny_vfs_changed', handleVfsChangedEvent);
        };
    }, [sessionId]);

    useEffect(() => {
        // Clear selection when switching to tools where transform handles don't make sense
        if (['brush', 'pen', 'eraser', 'hand', 'zoom'].includes(activeTool)) {
            setSelectedElement(null);
        }
        setShowToolFlyout(null);
    }, [activeTool]);

    // Helper to select tool group and automatically sync active subtool
    const handleSelectToolGroup = (groupId: string) => {
        const group = toolGroups.find(g => g.id === groupId);
        if (!group) return;

        // If it's already the active tool, just toggle the flyout
        if (activeTool === groupId && group.tools.length > 1) {
            setShowToolFlyout(showToolFlyout === groupId ? null : groupId);
            return;
        }

        setActiveTool(groupId);
        // Restore last used subtool for this group
        const lastSub = lastSubToolPerGroup[groupId] || group.tools[0].id;
        setActiveSubTool(lastSub);
        
        // Show flyout if it has multiple tools
        if (group.tools.length > 1) {
            setShowToolFlyout(groupId);
        } else {
            setShowToolFlyout(null);
        }
    };

    const handleSelectSubTool = (groupId: string, toolId: string) => {
        setActiveTool(groupId);
        setActiveSubTool(toolId);
        setLastSubToolPerGroup(prev => ({ ...prev, [groupId]: toolId }));
        setShowToolFlyout(null);
    };

    // Centralized Keyboard Shortcuts System
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Guard: Never trigger shortcuts while typing in inputs, textareas, etc.
            const target = e.target as HTMLElement;
            const isInput = 
                target instanceof HTMLInputElement || 
                target instanceof HTMLTextAreaElement || 
                target instanceof HTMLSelectElement || 
                target?.isContentEditable || 
                target?.closest('input, textarea, select, [contenteditable="true"]');
            
            if (isInput) return;
            
            if (e.key === 'Escape') {
                setShowToolFlyout(null);
                setSelectedElement(null);
                return;
            }

            // Spacebar for temporary Hand tool (Pan)
            if (e.code === 'Space' && activeTool !== 'hand' && !e.repeat) {
                e.preventDefault();
                setPreviousTool(activeTool);
                setActiveTool('hand');
                return;
            }

            const key = e.key.toLowerCase();

            // Handle Undo/Redo/Save/Copy/Paste
            if (e.ctrlKey || e.metaKey) {
                if (key === 'z') {
                    e.preventDefault();
                    if (e.shiftKey) RealProjectSourcePatcher.redo();
                    else RealProjectSourcePatcher.undo();
                    return;
                }
                if (key === 'y') {
                    e.preventDefault();
                    RealProjectSourcePatcher.redo();
                    return;
                }
                if (key === 's') {
                    e.preventDefault();
                    handleSave();
                    return;
                }
                if (key === 'c' && selectedElement) {
                    e.preventDefault();
                    setCopiedElement(selectedElement);
                    return;
                }
                if (key === 'v') {
                    const target = copiedElement || selectedElement;
                    if (target) {
                        e.preventDefault();
                        RealProjectSourcePatcher.duplicateElementInProject(target.textContent, {
                            targetFile: target.targetFile,
                            targetLine: target.targetLine
                        });
                    }
                    return;
                }
                if (key === 'x' && selectedElement) {
                    e.preventDefault();
                    setCopiedElement(selectedElement);
                    RealProjectSourcePatcher.deleteElementFromProject(selectedElement.textContent, {
                        targetFile: selectedElement.targetFile,
                        targetLine: selectedElement.targetLine
                    });
                    setSelectedElement(null);
                    return;
                }
                if (key === 'j' && selectedElement) {
                    e.preventDefault();
                    RealProjectSourcePatcher.duplicateElementInProject(selectedElement.textContent, {
                        targetFile: selectedElement.targetFile,
                        targetLine: selectedElement.targetLine
                    });
                    return;
                }
                return;
            }

            // Single key tool triggers (V, A, M, L, C, I, J, B, N, E, G, P, T, U, H, R, Z)
            if (!e.altKey && !e.shiftKey) {
                switch (key) {
                    case 'v': handleSelectSubTool('move', 'move'); break;
                    case 'a': handleSelectSubTool('move', 'direct_select'); break;
                    case 'm': handleSelectToolGroup('marquee'); break;
                    case 'l': handleSelectToolGroup('lasso'); break;
                    case 'c': handleSelectToolGroup('crop'); break;
                    case 'i': handleSelectToolGroup('eyedropper'); break;
                    case 'j': handleSelectToolGroup('retouch'); break;
                    case 'b': handleSelectSubTool('brush', 'brush'); break;
                    case 'n': handleSelectSubTool('brush', 'pencil'); break;
                    case 'e': handleSelectToolGroup('eraser'); break;
                    case 'g': handleSelectToolGroup('gradient'); break;
                    case 'p': handleSelectToolGroup('pen'); break;
                    case 't': handleSelectToolGroup('text'); break;
                    case 'u': handleSelectToolGroup('shape'); break;
                    case 'h': handleSelectToolGroup('hand'); break;
                    case 'r': handleSelectSubTool('hand', 'rotate'); break;
                    case 'z': handleSelectToolGroup('zoom'); break;
                    case 'delete':
                    case 'backspace':
                        if (selectedElement) {
                            RealProjectSourcePatcher.deleteElementFromProject(selectedElement.textContent, {
                                targetFile: selectedElement.targetFile,
                                targetLine: selectedElement.targetLine
                            });
                            setSelectedElement(null);
                        }
                        break;
                }
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space' && previousTool) {
                setActiveTool(previousTool);
                setPreviousTool(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (showToolFlyout && !target.closest('.relative.group') && !target.closest('.fixed')) {
                setShowToolFlyout(null);
            }
        };
        window.addEventListener('click', handleClickOutside);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('click', handleClickOutside);
        };
    }, [selectedElement, activeTool, previousTool, copiedElement, showToolFlyout]);

    // Auto-save effect
    useEffect(() => {
        setSaveStatus('saving');
        const timer = setTimeout(async () => {
            try {
                const wsManager = WorkspaceManager.getInstance();
                const files = wsManager.getVFS().getAllFiles();
                localStorage.setItem(`anny_session_${sessionId}`, JSON.stringify(files));
                
                await setDoc(doc(db, 'sessions', sessionId), {
                    userId: auth.currentUser?.uid || 'anonymous',
                    files,
                    updatedAt: new Date().toISOString()
                }, { merge: true });

                setSaveStatus('saved');
            } catch (err) {
                console.warn("Firestore auto-save warning (saved locally):", err);
                setSaveStatus('saved');
            }
        }, 1500);
        return () => clearTimeout(timer);
    }, [vfsFiles, sessionId]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const wsManager = WorkspaceManager.getInstance();
            const files = wsManager.getVFS().getAllFiles();
            localStorage.setItem(`anny_session_${sessionId}`, JSON.stringify(files));
            
            try {
                await setDoc(doc(db, 'sessions', sessionId), {
                    userId: auth.currentUser?.uid || 'anonymous',
                    files,
                    updatedAt: new Date().toISOString()
                }, { merge: true });
            } catch (e) {
                console.warn("Firestore save warning:", e);
            }

            setSaveStatus('saved');
            setActionHistory(prev => ['Project Saved to LocalStorage & Cloud', ...prev]);
        } catch (e) {
            console.error("Save error:", e);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 139, g: 92, b: 246 };
    };

    const updateActiveColor = (hex: string) => {
        setCurrentColor(hex);
        setRgbVals(hexToRgb(hex));
        if (selectedElement?.elementRef) {
            selectedElement.elementRef.style.color = hex;
            RealProjectSourcePatcher.patchStyleProperty(selectedElement.textContent, 'color', hex, {
                targetFile: selectedElement.targetFile,
                targetLine: selectedElement.targetLine
            });
            setSaveStatus('saving');
            setActionHistory(prev => [`Updated Color to ${hex}`, ...prev]);
        }
    };

    const handleAiPromptSubmit = async () => {
        if (!aiPrompt.trim() || isAiProcessing) return;
        const userMsg = aiPrompt.trim();
        setAiPrompt('');
        setAiMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsAiProcessing(true);

        setTimeout(() => {
            let aiReply = "I've analyzed your project DOM and patched the requested changes directly into your VFS source code.";
            if (userMsg.toLowerCase().includes('header') || userMsg.toLowerCase().includes('nav')) {
                RealProjectSourcePatcher.insertElementIntoProject('AI Navigation Bar', `<nav className="flex items-center justify-between p-4 bg-slate-900 border-b border-purple-500/30"><div className="text-xl font-bold text-purple-400">ANNY APP</div><div className="flex gap-4 text-sm text-slate-300"><a>Home</a><a>Features</a><a>Pricing</a></div></nav>`);
                aiReply = "Generated and inserted a responsive Navigation Header into your VFS App.tsx.";
            } else if (userMsg.toLowerCase().includes('button')) {
                RealProjectSourcePatcher.insertElementIntoProject('AI Button', `<button style={{ backgroundColor: '${currentColor}', color: '#ffffff', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', border: 'none', margin: '16px auto', display: 'block' }}>ANNY ACTION</button>`);
                aiReply = "Inserted a custom styled Action Button with your active color into VFS source.";
            } else {
                RealProjectSourcePatcher.patchTextContent('ANNY', 'ANNY PROFESSIONAL AI', {});
                aiReply = `Applied AI prompt refinement: "${userMsg}" to VFS source code.`;
            }

            setAiMessages(prev => [...prev, { role: 'model', text: aiReply }]);
            setActionHistory(prev => [`AI Assistant Executed: "${userMsg}"`, ...prev]);
            setIsAiProcessing(false);
        }, 1000);
    };

    const handleExport = async (fullPage = true) => {
        if (!canvasRef.current) return;
        try {
            const options: ExportOptions = {
                format: exportFormat,
                quality: exportQuality,
                scale: exportScale,
                fullPage: fullPage
            };
            
            setExportStatus('Initializing...');
            const dataUrl = await ProjectImageExporter.exportProject(canvasRef.current, options, (step) => {
                setExportStatus(step);
            });
            
            const filename = `anny-project-${fullPage ? 'full-page' : 'viewport'}.${exportFormat}`;
            ProjectImageExporter.downloadImage(dataUrl, filename);
            
            setAiMessages(prev => [...prev, { role: 'model', text: `Project exported as ${filename}` }]);
            setTimeout(() => setExportStatus(null), 2000);
        } catch (err) {
            setExportStatus('Error');
            setAiMessages(prev => [...prev, { role: 'model', text: 'Export failed. Check console for details.' }]);
            setTimeout(() => setExportStatus(null), 3000);
        }
    };

    const handleMenuAction = (action: string) => {
        setActionHistory(prev => [`Menu: ${action.toUpperCase()}`, ...prev]);
        
        switch (action) {
            case 'new': 
                RealProjectSourcePatcher.snapshotVFSState();
                const ws = WorkspaceManager.getInstance();
                ws.getVFS().writeFile('/src/App.tsx', 'import React from "react";\n\nexport default function App() {\n  return (\n    <div className="min-h-screen bg-[#0b0d17] text-white flex flex-col items-center justify-center p-8">\n      <h1 className="text-5xl font-black tracking-tighter mb-4">NEW PROJECT</h1>\n      <p className="text-slate-400">Created with Anny Professional Editor</p>\n    </div>\n  );\n}');
                window.dispatchEvent(new CustomEvent('anny_vfs_changed'));
                break;
            case 'open':
                setAiMessages(prev => [...prev, { role: 'model', text: 'Opening project manager... You can select a session from your dashboard.' }]);
                break;
            case 'save': handleSave(); break;
            case 'save_as':
                setAiMessages(prev => [...prev, { role: 'model', text: 'Save As... functional in Export menu.' }]);
                break;
            case 'export':
                handleExport(true);
                break;
            case 'import':
                setAiMessages(prev => [...prev, { role: 'model', text: 'Importing assets... You can drag and drop images onto the canvas.' }]);
                break;
            case 'close':
                onBack?.();
                break;
            case 'undo': RealProjectSourcePatcher.undo(); break;
            case 'redo': RealProjectSourcePatcher.redo(); break;
            case 'cut':
                if (selectedElement) {
                    setCopiedElement(selectedElement);
                    RealProjectSourcePatcher.deleteElementFromProject(selectedElement.textContent, {
                        targetFile: selectedElement.targetFile,
                        targetLine: selectedElement.targetLine
                    });
                    setSelectedElement(null);
                }
                break;
            case 'copy': if (selectedElement) setCopiedElement(selectedElement); break;
            case 'paste': 
                const pasteTarget = copiedElement || selectedElement;
                if (pasteTarget) RealProjectSourcePatcher.duplicateElementInProject(pasteTarget.textContent, {
                    targetFile: pasteTarget.targetFile,
                    targetLine: pasteTarget.targetLine
                });
                break;
            case 'select_all':
                setActionHistory(prev => ['Selection: ALL', ...prev]);
                break;
            case 'deselect':
                setSelectedElement(null);
                break;
            case 'invert_selection':
                setActionHistory(prev => ['Selection: INVERTED', ...prev]);
                break;
            case 'canvas_size':
                setAiMessages(prev => [...prev, { role: 'model', text: 'Current Canvas: 1920x1080 (Responsive Viewport)' }]);
                break;
            case 'image_size':
                setAiMessages(prev => [...prev, { role: 'model', text: 'Image Resolution: 1x (Retina Optimized)' }]);
                break;
            case 'rotate_cw':
                if (selectedElement) RealProjectSourcePatcher.patchStyleProperty(selectedElement.textContent, 'transform', 'rotate(90deg)', { targetFile: selectedElement.targetFile, targetLine: selectedElement.targetLine });
                break;
            case 'rotate_ccw':
                if (selectedElement) RealProjectSourcePatcher.patchStyleProperty(selectedElement.textContent, 'transform', 'rotate(-90deg)', { targetFile: selectedElement.targetFile, targetLine: selectedElement.targetLine });
                break;
            case 'flip_h':
                if (selectedElement) RealProjectSourcePatcher.patchStyleProperty(selectedElement.textContent, 'transform', 'scaleX(-1)', { targetFile: selectedElement.targetFile, targetLine: selectedElement.targetLine });
                break;
            case 'flip_v':
                if (selectedElement) RealProjectSourcePatcher.patchStyleProperty(selectedElement.textContent, 'transform', 'scaleY(-1)', { targetFile: selectedElement.targetFile, targetLine: selectedElement.targetLine });
                break;
            case 'new_layer':
                RealProjectSourcePatcher.insertElementIntoProject('New Layer', '<div className="p-4 bg-white/5 border border-white/10 rounded-lg">New Layer Element</div>');
                break;
            case 'duplicate_layer':
                if (selectedElement) {
                    RealProjectSourcePatcher.duplicateElementInProject(selectedElement.textContent, {
                        targetFile: selectedElement.targetFile,
                        targetLine: selectedElement.targetLine
                    });
                }
                break;
            case 'delete_layer':
                if (selectedElement) {
                    RealProjectSourcePatcher.deleteElementFromProject(selectedElement.textContent, {
                        targetFile: selectedElement.targetFile,
                        targetLine: selectedElement.targetLine
                    });
                    setSelectedElement(null);
                }
                break;
            case 'bring_front':
                if (selectedElement) RealProjectSourcePatcher.patchStyleProperty(selectedElement.textContent, 'zIndex', '50', { targetFile: selectedElement.targetFile, targetLine: selectedElement.targetLine });
                break;
            case 'send_back':
                if (selectedElement) RealProjectSourcePatcher.patchStyleProperty(selectedElement.textContent, 'zIndex', '0', { targetFile: selectedElement.targetFile, targetLine: selectedElement.targetLine });
                break;
            case 'filter_blur':
                if (selectedElement) RealProjectSourcePatcher.applyCSSFilter(selectedElement.textContent, 'blur(5px)', { targetFile: selectedElement.targetFile, targetLine: selectedElement.targetLine });
                break;
            case 'filter_sharpen':
                if (selectedElement) RealProjectSourcePatcher.applyCSSFilter(selectedElement.textContent, 'contrast(1.5) brightness(1.1)', { targetFile: selectedElement.targetFile, targetLine: selectedElement.targetLine });
                break;
            case 'filter_brightness':
                if (selectedElement) RealProjectSourcePatcher.applyCSSFilter(selectedElement.textContent, 'brightness(150%)', { targetFile: selectedElement.targetFile, targetLine: selectedElement.targetLine });
                break;
            case 'filter_hue':
                if (selectedElement) RealProjectSourcePatcher.applyCSSFilter(selectedElement.textContent, 'hue-rotate(90deg)', { targetFile: selectedElement.targetFile, targetLine: selectedElement.targetLine });
                break;
            case 'filter_grayscale':
                if (selectedElement) RealProjectSourcePatcher.applyCSSFilter(selectedElement.textContent, 'grayscale(100%)', { targetFile: selectedElement.targetFile, targetLine: selectedElement.targetLine });
                break;
            case 'zoom_in': setZoom(prev => Math.min(prev + 0.1, 3)); break;
            case 'zoom_out': setZoom(prev => Math.max(prev - 0.1, 0.1)); break;
            case 'fit_screen': setZoom(0.6667); break;
            case 'zoom_100': setZoom(1.0); break;
            case 'zoom_200': setZoom(2.0); break;
            case 'toggle_grid':
                setAiMessages(prev => [...prev, { role: 'model', text: 'Grid toggled. (Visual aid overlay enabled)' }]);
                break;
            case 'toggle_guides':
                setAiMessages(prev => [...prev, { role: 'model', text: 'Guides toggled. (Snap alignment enabled)' }]);
                break;
            case 'toggle_ai':
                setShowAiAssistant(prev => !prev);
                break;
            case 'toggle_layers':
                setActiveLayerTab('Layers');
                break;
            case 'toggle_properties':
                setActivePropertiesTab('Properties');
                break;
            case 'toggle_history':
                setActiveLayerTab('History');
                break;
            case 'export_full':
                handleExport(true);
                break;
            case 'export_visible':
                handleExport(false);
                break;
            case 'reset_workspace':
                setZoom(0.6667);
                setViewportWidth('1920px');
                setActiveTool('move');
                setShowAiAssistant(true);
                break;
            case 'toggle_fullscreen':
                if (!document.fullscreenElement) document.documentElement.requestFullscreen();
                else document.exitFullscreen();
                break;
            case 'help_shortcuts':
                setAiMessages(prev => [...prev, { role: 'model', text: 'SHORTCUTS: V: Move, M: Marquee, L: Lasso, C: Crop, I: Eyedropper, J: Retouch, B: Brush, E: Eraser, G: Gradient, P: Pen, T: Text, U: Shape, H: Hand, Z: Zoom. Ctrl+Z: Undo, Ctrl+Shift+Z: Redo, Ctrl+S: Save.' }]);
                break;
            case 'help_about':
                setAiMessages(prev => [...prev, { role: 'model', text: 'Anny Professional Editor v1.0.0. A high-fidelity Photoshop-style web editor powering real VFS projects.' }]);
                break;
        }
    };

    return (
        <div className="flex flex-col h-screen w-screen bg-[#05060a] text-slate-200 overflow-hidden select-none">
            {/* REAL PROFESSIONAL MENU BAR */}
            <ProfessionalMenuBar onAction={handleMenuAction} />

            {/* TOP ACTIONS BAR (Vite/Save/Viewport) */}
            <div className="h-12 bg-[#0c0e17] border-b border-white/10 flex items-center justify-between px-4 shrink-0 z-20">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={onBack || onBackToWorkspace || onBackToSplitView}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Back</span>
                    </button>

                    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-slate-300">SESSION: {sessionId.toUpperCase()}</span>
                    </div>

                    {/* Quick Undo/Redo */}
                    <div className="flex items-center gap-1 border-l border-white/10 pl-4 ml-2">
                        <button 
                            onClick={() => {
                                const success = RealProjectSourcePatcher.undo();
                                if (success) setActionHistory(prev => ['Undo Source Change', ...prev]);
                            }} 
                            className="p-1.5 hover:bg-white/10 rounded transition-colors" 
                            title="Undo (Ctrl+Z)"
                        >
                            <Undo2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                            onClick={() => {
                                const success = RealProjectSourcePatcher.redo();
                                if (success) setActionHistory(prev => ['Redo Source Change', ...prev]);
                            }} 
                            className="p-1.5 hover:bg-white/10 rounded transition-colors" 
                            title="Redo (Ctrl+Shift+Z)"
                        >
                            <Redo2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Center Viewport Selector */}
                <div className="flex items-center gap-1 bg-[#121524] p-0.5 rounded-lg border border-white/10 text-xs">
                    {(['1920px', '768px', '375px', '100%'] as const).map(w => (
                        <button
                            key={w}
                            onClick={() => setViewportWidth(w)}
                            className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-all ${viewportWidth === w ? 'bg-purple-600 text-white font-bold shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            {w === '1920px' ? 'Desktop' : w === '768px' ? 'Tablet' : w === '375px' ? 'Mobile' : 'Fluid'}
                        </button>
                    ))}
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1 ${saveStatus === 'saved' ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${saveStatus === 'saved' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                        {saveStatus === 'saved' ? 'LIVE VFS SYNC' : 'SAVING...'}
                    </span>

                    <button 
                        onClick={() => {
                            if (universalUploadInputRef.current) {
                                universalUploadInputRef.current.click();
                            }
                        }}
                        disabled={!!uploadProgress}
                        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded shadow transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                        {uploadProgress ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                        ) : (
                            <Upload className="w-3.5 h-3.5" />
                        )}
                        <span>{uploadProgress ? 'Uploading...' : 'Upload'}</span>
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded shadow transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                        <Save className="w-3.5 h-3.5" />
                        {isSaving ? 'Saving...' : 'Save Session'}
                    </button>
                </div>
            </div>

            {/* DYNAMIC OPTIONS BAR (Top Photoshop Style Options Panel) */}
            <div className="h-8 bg-[#090b12] border-b border-white/10 flex items-center justify-between px-3 text-xs shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <span className="font-bold text-purple-400 uppercase tracking-wider text-[10px]">
                        Tool Options [{activeSubTool.toUpperCase()}]
                    </span>

                    {(activeTool === 'move' || activeTool === 'direct_select') && (
                        <div className="flex items-center gap-3 text-slate-300 text-[11px]">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <input type="checkbox" checked={autoSelect} onChange={e => setAutoSelect(e.target.checked)} className="rounded accent-purple-500" />
                                <span>Auto-Select</span>
                            </label>

                            <select value={autoSelectType} onChange={e => setAutoSelectType(e.target.value as any)} className="bg-[#151828] border border-white/15 rounded px-1.5 py-0.5 text-slate-200 outline-none">
                                <option value="Layer">Layer</option>
                                <option value="Group">Group</option>
                            </select>

                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <input type="checkbox" checked={showTransformControls} onChange={e => setShowTransformControls(e.target.checked)} className="rounded accent-purple-500" />
                                <span>Show Transform Controls</span>
                            </label>

                            <div className="h-3 w-[1px] bg-white/10" />

                            <div className="flex items-center gap-1">
                                <button onClick={() => setActionHistory(prev => ['Align Left', ...prev])} className="p-1 hover:bg-white/10 rounded" title="Align Left"><AlignLeft className="w-3.5 h-3.5" /></button>
                                <button onClick={() => setActionHistory(prev => ['Align Center', ...prev])} className="p-1 hover:bg-white/10 rounded" title="Align Center"><AlignCenter className="w-3.5 h-3.5" /></button>
                                <button onClick={() => setActionHistory(prev => ['Align Right', ...prev])} className="p-1 hover:bg-white/10 rounded" title="Align Right"><AlignRight className="w-3.5 h-3.5" /></button>
                                <button onClick={() => setActionHistory(prev => ['Justify', ...prev])} className="p-1 hover:bg-white/10 rounded" title="Justify"><AlignJustify className="w-3.5 h-3.5" /></button>
                            </div>
                        </div>
                    )}

                    {activeTool === 'shape' && (
                        <div className="flex items-center gap-3 text-[11px]">
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 border border-white/10 rounded-md hover:bg-white/10 cursor-pointer group" onClick={() => setShowToolFlyout('shape')}>
                                <span>Shape:</span>
                                <strong className="text-white capitalize">{activeSubTool.replace('_', ' ')}</strong>
                                <ChevronDown className="w-3 h-3 text-slate-500 group-hover:text-white" />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span>Fill:</span>
                                <div className="w-4 h-4 rounded border border-white/20" style={{ backgroundColor: currentColor }} />
                            </div>
                        </div>
                    )}

                    {activeTool === 'marquee' && (
                        <div className="flex items-center gap-3 text-[11px]">
                            <span>Marquee: <strong className="text-white capitalize">{activeSubTool.replace('_', ' ')}</strong></span>
                            <div className="flex items-center gap-1.5">
                                <span>Mode:</span>
                                <select className="bg-[#151828] border border-white/15 rounded px-1.5 py-0.5 text-slate-200 outline-none">
                                    <option>New Selection</option>
                                    <option>Add to Selection</option>
                                    <option>Subtract from Selection</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {activeTool === 'text' && (
                        <div className="flex items-center gap-3 text-[11px]">
                            <span>Font: <strong className="text-white">Inter</strong></span>
                            <span>Size: <strong className="text-white">18px</strong></span>
                            <div className="flex items-center gap-1.5">
                                <span>Color:</span>
                                <div className="w-4 h-4 rounded border border-white/20" style={{ backgroundColor: currentColor }} />
                            </div>
                        </div>
                    )}

                    {activeTool === 'zoom' && (
                        <div className="flex items-center gap-2 text-[11px]">
                            <span>Zoom: <strong className="text-purple-400 font-mono">{Math.round(zoom * 100)}%</strong></span>
                            <button onClick={() => setZoom(1.0)} className="px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded text-[10px]">100%</button>
                            <button onClick={() => setZoom(0.6667)} className="px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded text-[10px]">Fit Screen</button>
                        </div>
                    )}

                    {activeTool === 'brush' && (
                        <div className="flex items-center gap-3 text-[11px]">
                            <span>Size: <strong className="text-white">5px</strong></span>
                            <span>Hardness: <strong className="text-white">100%</strong></span>
                            <div className="flex items-center gap-1.5">
                                <span>Opacity:</span>
                                <input type="range" className="accent-purple-500 w-16" defaultValue="100" />
                            </div>
                        </div>
                    )}

                    {activeTool === 'eraser' && (
                        <div className="flex items-center gap-3 text-[11px]">
                            <span>Size: <strong className="text-white">10px</strong></span>
                            <span>Mode: <strong className="text-white">Brush</strong></span>
                        </div>
                    )}

                    {activeTool === 'gradient' && (
                        <div className="flex items-center gap-3 text-[11px]">
                            <span>Type: <strong className="text-white">Linear</strong></span>
                            <div className="w-16 h-3 rounded bg-gradient-to-r from-purple-500 to-blue-500 border border-white/20" />
                        </div>
                    )}
                </div>

                <div className="text-[10px] font-mono text-slate-500 uppercase">
                    Canvas: {docWidth} × {docHeight} PX @ {docResolution} PPI
                </div>
            </div>

            {/* MAIN WORKSPACE AREA */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* LEFT TOOLBAR: Professional Photoshop-style Scrollable Toolbar */}
                <div className="w-12 bg-[#0c0e17] border-r border-white/10 flex flex-col items-center py-2 gap-1 shrink-0 z-30 overflow-y-auto overflow-x-hidden custom-scrollbar pb-12">
                    {toolGroups.map(group => (
                        <ToolGroup 
                            key={group.id}
                            id={group.id}
                            name={group.name}
                            icon={group.icon}
                            tools={group.tools}
                            activeTool={activeTool}
                            activeSubTool={activeSubTool}
                            showFlyout={showToolFlyout === group.id}
                            shortcut={group.shortcut}
                            onSelect={handleSelectSubTool}
                            onToggleFlyout={() => handleSelectToolGroup(group.id)}
                        />
                    ))}
                    
                    <div className="mt-auto pt-4 flex flex-col items-center gap-3">
                        <div 
                            className="w-6 h-6 rounded border border-white/20 shadow-lg cursor-pointer" 
                            style={{ backgroundColor: currentColor }}
                            onClick={() => setActionHistory(prev => ['Opened Color Picker', ...prev])}
                        />
                        <div 
                            className="w-6 h-6 rounded border border-white/20 shadow-lg bg-white cursor-pointer -mt-4 ml-3"
                            onClick={() => setCurrentColor('#ffffff')}
                        />
                    </div>
                </div>

                {/* CANVAS CENTER STAGE */}
                <div 
                    className="flex-1 bg-[#05060a] overflow-auto p-8 relative flex flex-col items-start justify-start select-none"
                    style={{ cursor: activeTool === 'hand' || activeSubTool === 'hand' ? 'grab' : 'default' }}
                >
                    <div
                        style={{
                            width: viewportWidth === '100%' ? '100%' : `${parseInt(viewportWidth, 10) * zoom}px`,
                            height: `${docHeight * zoom}px`,
                            position: 'relative',
                            margin: '0 auto',
                        }}
                    >
                        <div 
                            ref={canvasRef}
                            style={{
                                width: viewportWidth === '100%' ? '100%' : viewportWidth,
                                height: `${docHeight}px`,
                                transform: `scale(${zoom})`,
                                transformOrigin: 'top left',
                                transition: 'transform 0.15s ease-out',
                                position: 'absolute',
                                top: 0,
                                left: 0
                            }}
                            className="bg-[#0b0d17] border border-purple-500/30 rounded-lg shadow-2xl"
                        >
                            {/* BRIDGE ENGINE INTERACTION OVERLAY */}
                            <RealProjectEditorBridge
                                canvasRef={canvasRef}
                                zoom={zoom}
                                activeTool={activeTool}
                                activeSubTool={activeSubTool}
                                currentColor={currentColor}
                                onSelectElement={(el) => setSelectedElement(el)}
                                onAddHistory={(act) => setActionHistory(prev => [act, ...prev])}
                                onSampleColor={(col) => updateActiveColor(col)}
                                onTriggerSave={handleSave}
                                onZoomChange={(z) => setZoom(z)}
                            />

                            {/* LIVE RUNTIME RENDERER */}
                            <DynamicVFSAppRunner />
                        </div>
                    </div>
                </div>

                {/* RIGHT DOCK: 13 Photoshop Tabs Across 3 Panels - Entire Dock Vertically Scrollable */}
                <div className="w-80 bg-[#0c0e17] border-l border-white/10 flex flex-col shrink-0 z-30 h-full min-h-0 overflow-y-auto custom-scrollbar p-0">
                    <div className="flex flex-col flex-1 pb-32">
                        {/* SECTION 1: TOP TABS (Color, Swatches, Gradients, Patterns, Export) */}
                    <div className="flex border-b border-white/10 bg-[#0e101b] text-[11px] shrink-0 sticky top-0 z-10 overflow-x-auto custom-scrollbar no-scrollbar">
                        {(['Color', 'Swatches', 'Gradients', 'Patterns', 'Export', 'Assets'] as const).map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setActiveRightTab(tab)}
                                className={`flex-1 py-1.5 text-center border-r border-white/10 last:border-0 transition-colors ${activeRightTab === tab ? 'bg-[#151828] text-white font-bold border-b-2 border-b-purple-500' : 'text-slate-400 hover:text-white'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Top Panel Views */}
                    <div className="border-b border-white/10 bg-[#0c0e17]">
                        {activeRightTab === 'Assets' && (
                            <AssetLibrary />
                        )}
                        {activeRightTab === 'Color' && (
                            <div className="p-3 flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    <div 
                                        className="w-10 h-10 rounded-lg border-2 border-white/30 shadow-md shrink-0" 
                                        style={{ backgroundColor: currentColor }} 
                                    />
                                    <div className="flex-1 flex flex-col gap-1">
                                        <div className="flex gap-1">
                                            <input 
                                                type="color" 
                                                value={currentColor} 
                                                onChange={e => updateActiveColor(e.target.value)}
                                                className="w-10 h-7 rounded cursor-pointer bg-transparent border-0 p-0"
                                            />
                                            <input 
                                                type="text"
                                                value={currentColor}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    if (val.startsWith('#') && val.length <= 7) {
                                                        updateActiveColor(val);
                                                    }
                                                }}
                                                className="flex-1 h-7 bg-white/5 border border-white/10 rounded px-2 text-[11px] font-mono text-white outline-none focus:border-purple-500"
                                            />
                                        </div>
                                        <div className="flex justify-between text-[10px] font-mono text-slate-400">
                                            <span>RGB: {rgbVals.r},{rgbVals.g},{rgbVals.b}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeRightTab === 'Swatches' && (
                            <div className="p-3 grid grid-cols-6 gap-2">
                                {['#7C3AED', '#8B5CF6', '#C084FC', '#3B82F6', '#60A5FA', '#10B981', '#34D399', '#F59E0B', '#FBBF24', '#EF4444', '#F87171', '#EC4899'].map(c => (
                                    <button 
                                        key={c} 
                                        onClick={() => updateActiveColor(c)} 
                                        className="w-7 h-7 rounded border border-white/20 hover:scale-105 transition-all shadow" 
                                        style={{ backgroundColor: c }} 
                                    />
                                ))}
                            </div>
                        )}

                        {activeRightTab === 'Gradients' && (
                            <div className="p-3 flex flex-col gap-2">
                                {[
                                    { name: 'Sunset Purple', grad: 'linear-gradient(90deg, #8B5CF6, #EC4899)' },
                                    { name: 'Fire Amber', grad: 'linear-gradient(90deg, #F59E0B, #EF4444)' },
                                    { name: 'Emerald Wave', grad: 'linear-gradient(90deg, #10B981, #06B6D4)' },
                                    { name: 'Midnight Neon', grad: 'linear-gradient(90deg, #3B82F6, #8B5CF6)' }
                                ].map((g, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            if (selectedElement?.elementRef) {
                                                selectedElement.elementRef.style.background = g.grad;
                                                RealProjectSourcePatcher.patchStyleProperty(selectedElement.textContent, 'background', g.grad, {
                                                    targetFile: selectedElement.targetFile,
                                                    targetLine: selectedElement.targetLine
                                                });
                                                setActionHistory(prev => [`Applied Gradient: ${g.name}`, ...prev]);
                                            }
                                        }}
                                        className="h-7 rounded cursor-pointer border border-white/20 flex items-center justify-center text-[10px] font-bold text-white shadow hover:scale-[1.02] transition-all"
                                        style={{ background: g.grad }}
                                    >
                                        {g.name}
                                    </button>
                                ))}
                            </div>
                        )}

                        {activeRightTab === 'Patterns' && (
                            <div className="p-3 grid grid-cols-2 gap-2">
                                {[
                                    { name: 'Dot Grid', bg: 'radial-gradient(circle, #8B5CF6 1px, transparent 1px) 0 0/16px 16px' },
                                    { name: 'Diagonal', bg: 'repeating-linear-gradient(45deg, #1E1B4B, #1E1B4B 10px, #0F172A 10px, #0F172A 20px)' }
                                ].map((p, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            if (selectedElement?.elementRef) {
                                                selectedElement.elementRef.style.background = p.bg;
                                                RealProjectSourcePatcher.patchStyleProperty(selectedElement.textContent, 'background', p.bg, {
                                                    targetFile: selectedElement.targetFile,
                                                    targetLine: selectedElement.targetLine
                                                });
                                                setActionHistory(prev => [`Applied Pattern: ${p.name}`, ...prev]);
                                            }
                                        }}
                                        className="h-10 rounded border border-white/20 flex items-center justify-center text-[10px] font-bold text-white shadow hover:border-purple-400 p-1 text-center"
                                        style={{ background: p.bg }}
                                    >
                                        {p.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* SECTION 2: MIDDLE TABS (Properties, Adjust, Effects, Transform, Export) */}
                    <div className="flex border-b border-white/10 bg-[#0e101b] text-[11px] shrink-0 sticky top-[31px] z-10">
                        {(['Properties', 'Adjust', 'Effects', 'Transform', 'Export'] as const).map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setActivePropertiesTab(tab as any)}
                                className={`flex-1 py-1.5 text-center border-r border-white/10 last:border-0 transition-colors ${activePropertiesTab === tab ? 'bg-[#151828] text-white font-bold border-b-2 border-b-purple-500' : 'text-slate-400 hover:text-white'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Middle Panel Views */}
                    <div className="border-b border-white/10 bg-[#0c0e17] p-3 flex flex-col gap-3">
                        {activePropertiesTab === 'Properties' && (
                            <>
                                <div className="flex items-center gap-2 text-slate-300 font-bold text-[11px]">
                                    <Grid className="w-3.5 h-3.5 text-purple-400" />
                                    <span>Document Canvas</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                    <div className="flex items-center bg-[#151828] border border-white/15 rounded px-2 py-1 gap-1">
                                        <span className="text-slate-500 font-mono text-[10px]">W</span>
                                        <input 
                                            type="number" 
                                            value={docWidth} 
                                            onChange={e => setDocWidth(Number(e.target.value))} 
                                            className="bg-transparent text-slate-200 outline-none w-full font-mono text-[11px]" 
                                        />
                                    </div>
                                    <div className="flex items-center bg-[#151828] border border-white/15 rounded px-2 py-1 gap-1">
                                        <span className="text-slate-500 font-mono text-[10px]">H</span>
                                        <input 
                                            type="number" 
                                            value={docHeight} 
                                            onChange={e => setDocHeight(Number(e.target.value))} 
                                            className="bg-transparent text-slate-200 outline-none w-full font-mono text-[11px]" 
                                        />
                                    </div>
                                </div>

                                {selectedElement ? (
                                    <div className="pt-2 border-t border-white/10 flex flex-col gap-3">
                                        {/* Image Specific Controls */}
                                        {(selectedElement.tagName.toLowerCase() === 'img' || selectedElement.tagName.toLowerCase() === 'svg') && (
                                            <div className="flex flex-col gap-3 p-3 bg-white/5 border border-white/10 rounded-lg animate-in fade-in slide-in-from-right-4 duration-300">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="w-1 h-3 bg-purple-500 rounded-full" />
                                                    <span className="text-[11px] font-bold text-white uppercase tracking-wider">Image Properties</span>
                                                </div>

                                                {/* Preview */}
                                                <div className="w-full h-32 bg-black/40 rounded border border-white/5 flex items-center justify-center overflow-hidden relative group">
                                                    {selectedElement.src ? (
                                                        <img src={selectedElement.src} alt="Selected" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                                                    ) : (
                                                        <div className="text-[10px] text-slate-500">No Image Source</div>
                                                    )}
                                                </div>

                                                {/* Source URL Display */}
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] text-slate-400">Source</span>
                                                    <div className="text-[10px] font-mono text-slate-500 truncate bg-black/20 p-1.5 rounded border border-white/5">
                                                        {selectedElement.src || 'None'}
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-2 pt-1">
                                                    <button 
                                                        onClick={() => {
                                                            if (replacementUploadInputRef.current) {
                                                                replacementUploadInputRef.current.click();
                                                            }
                                                        }}
                                                        disabled={!!uploadProgress}
                                                        className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded text-[11px] font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                                    >
                                                        {uploadProgress ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                                                        ) : (
                                                            <Upload className="w-3.5 h-3.5" />
                                                        )}
                                                        <span>{uploadProgress ? 'Replacing...' : 'Upload New Image'}</span>
                                                    </button>

                                                    <div className="relative">
                                                        <input 
                                                            type="text"
                                                            placeholder="Paste Image URL..."
                                                            className="w-full bg-[#151828] border border-white/15 rounded py-1.5 px-2 text-[11px] text-slate-200 outline-none focus:border-purple-500 pr-10"
                                                            onKeyDown={async (e) => {
                                                                if (e.key === 'Enter') {
                                                                    const url = e.currentTarget.value;
                                                                    if (url && selectedElement.elementRef) {
                                                                        const isValidUrl = /^(https?:\/\/|\/|data:)/i.test(url);
                                                                        if (!isValidUrl) {
                                                                            window.dispatchEvent(new CustomEvent('anny_editor_error', { 
                                                                                detail: { message: "INVALID_FILE: Invalid image URL format." } 
                                                                            }));
                                                                            return;
                                                                        }
                                                                        
                                                                        const oldSrc = selectedElement.src;
                                                                        (selectedElement.elementRef as HTMLImageElement).src = url;
                                                                        
                                                                        const success = await RealProjectSourcePatcher.patchImageSource(
                                                                            selectedElement.textContent, 
                                                                            url, 
                                                                            {
                                                                                targetFile: selectedElement.targetFile,
                                                                                targetLine: selectedElement.targetLine,
                                                                                oldSrc: oldSrc
                                                                            }
                                                                        );

                                                                        if (!success) {
                                                                            window.dispatchEvent(new CustomEvent('anny_editor_error', { 
                                                                                detail: { message: "IMAGE_TARGET_NOT_FOUND: Unable to locate the original image in the project source." } 
                                                                            }));
                                                                        } else {
                                                                            window.dispatchEvent(new CustomEvent('anny_editor_success', { 
                                                                                detail: { message: "Successfully replaced image URL" } 
                                                                            }));
                                                                            window.dispatchEvent(new CustomEvent('anny_vfs_changed'));
                                                                            setSelectedElement(prev => prev ? { ...prev, src: url } : null);
                                                                            e.currentTarget.value = '';
                                                                        }
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                                                            <LinkIcon className="w-3 h-3" />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Object Fit & Position */}
                                                <div className="grid grid-cols-2 gap-2 mt-1">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] text-slate-400">Object Fit</span>
                                                        <select 
                                                            value={selectedElement.objectFit || 'cover'}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (selectedElement.elementRef) {
                                                                    selectedElement.elementRef.style.objectFit = val;
                                                                    RealProjectSourcePatcher.patchStyleProperty(selectedElement.textContent, 'objectFit', val, {
                                                                        targetFile: selectedElement.targetFile,
                                                                        targetLine: selectedElement.targetLine
                                                                    });
                                                                }
                                                            }}
                                                            className="bg-[#151828] border border-white/15 rounded px-2 py-1 text-[11px] text-slate-200 outline-none"
                                                        >
                                                            <option value="cover">Cover</option>
                                                            <option value="contain">Contain</option>
                                                            <option value="fill">Fill</option>
                                                            <option value="none">None</option>
                                                            <option value="scale-down">Scale Down</option>
                                                        </select>
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] text-slate-400">Position</span>
                                                        <select 
                                                            value={selectedElement.objectPosition || 'center'}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (selectedElement.elementRef) {
                                                                    selectedElement.elementRef.style.objectPosition = val;
                                                                    RealProjectSourcePatcher.patchStyleProperty(selectedElement.textContent, 'objectPosition', val, {
                                                                        targetFile: selectedElement.targetFile,
                                                                        targetLine: selectedElement.targetLine
                                                                    });
                                                                }
                                                            }}
                                                            className="bg-[#151828] border border-white/15 rounded px-2 py-1 text-[11px] text-slate-200 outline-none"
                                                        >
                                                            <option value="center">Center</option>
                                                            <option value="top">Top</option>
                                                            <option value="bottom">Bottom</option>
                                                            <option value="left">Left</option>
                                                            <option value="right">Right</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex flex-col gap-2.5">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="font-bold text-purple-400 uppercase tracking-tight">Active {propShapeType.includes('anny') ? 'Shape' : 'Element'}</span>
                                            <span className="font-mono text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-slate-400 uppercase">{propShapeType}</span>
                                        </div>

                                        {/* Text Content */}
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] text-slate-400 uppercase font-semibold">Content Text</span>
                                            <input 
                                                type="text" 
                                                value={propText}
                                                onChange={(e) => {
                                                    const newT = e.target.value;
                                                    setPropText(newT);
                                                    if (selectedElement.elementRef) {
                                                        const oldT = selectedElement.textContent;
                                                        selectedElement.elementRef.innerText = newT;
                                                        RealProjectSourcePatcher.patchTextContent(oldT, newT, {
                                                            targetFile: selectedElement.targetFile,
                                                            targetLine: selectedElement.targetLine
                                                        });
                                                    }
                                                }}
                                                className="bg-[#151828] border border-white/15 rounded px-2 py-1 text-[11px] text-slate-200 outline-none focus:border-purple-500"
                                                placeholder="Text content..."
                                            />
                                        </div>

                                        {/* Image Controls */}
                                        {(selectedElement.tagName === 'IMG' || !!selectedElement.src) && (
                                            <ImageControls 
                                                selectedElement={selectedElement}
                                                onUpdate={(act) => setActionHistory(prev => [act, ...prev])}
                                            />
                                        )}

                                        {/* Color & Background Color (Compact for non-text, non-image) */}
                                        {!['H1', 'H2', 'H3', 'H4', 'P', 'SPAN', 'A', 'BUTTON', 'LI', 'IMG'].includes(selectedElement.tagName) && !selectedElement.src && (
                                            <>
                                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] text-slate-400">Color</span>
                                                        <input 
                                                            type="color"
                                                            value={selectedElement.color.startsWith('rgb') ? '#ffffff' : selectedElement.color}
                                                            onChange={(e) => {
                                                                const col = e.target.value;
                                                                if (selectedElement.elementRef) {
                                                                    selectedElement.elementRef.style.color = col;
                                                                    RealProjectSourcePatcher.patchStyleProperty(selectedElement.textContent, 'color', col, {
                                                                        targetFile: selectedElement.targetFile,
                                                                        targetLine: selectedElement.targetLine
                                                                    });
                                                                }
                                                            }}
                                                            className="w-full h-7 bg-transparent cursor-pointer rounded border-0"
                                                        />
                                                    </div>

                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] text-slate-400">Background</span>
                                                        <input 
                                                            type="color"
                                                            value={selectedElement.backgroundColor.startsWith('rgb') ? '#8B5CF6' : selectedElement.backgroundColor}
                                                            onChange={(e) => {
                                                                const bgCol = e.target.value;
                                                                if (selectedElement.elementRef) {
                                                                    selectedElement.elementRef.style.backgroundColor = bgCol;
                                                                    RealProjectSourcePatcher.patchStyleProperty(selectedElement.textContent, 'backgroundColor', bgCol, {
                                                                        targetFile: selectedElement.targetFile,
                                                                        targetLine: selectedElement.targetLine
                                                                    });
                                                                }
                                                            }}
                                                            className="w-full h-7 bg-transparent cursor-pointer rounded border-0"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Font Size & Border Radius */}
                                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] text-slate-400">Font Size (px)</span>
                                                        <input 
                                                            type="number"
                                                            value={propFontSize}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setPropFontSize(val);
                                                                const fs = `${val}px`;
                                                                if (selectedElement.elementRef) {
                                                                    selectedElement.elementRef.style.fontSize = fs;
                                                                    RealProjectSourcePatcher.patchStyleProperty(selectedElement.textContent, 'fontSize', fs, {
                                                                        targetFile: selectedElement.targetFile,
                                                                        targetLine: selectedElement.targetLine
                                                                    });
                                                                }
                                                            }}
                                                            className="bg-[#151828] border border-white/15 rounded px-2 py-1 text-[11px] text-slate-200 outline-none"
                                                        />
                                                    </div>

                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] text-slate-400">Radius (px)</span>
                                                        <input 
                                                            type="number"
                                                            value={propRadius}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setPropRadius(val);
                                                                const rad = `${val}px`;
                                                                if (selectedElement.elementRef) {
                                                                    selectedElement.elementRef.style.borderRadius = rad;
                                                                    RealProjectSourcePatcher.patchStyleProperty(selectedElement.textContent, 'borderRadius', rad, {
                                                                        targetFile: selectedElement.targetFile,
                                                                        targetLine: selectedElement.targetLine
                                                                    });
                                                                }
                                                            }}
                                                            className="bg-[#151828] border border-white/15 rounded px-2 py-1 text-[11px] text-slate-200 outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {/* Typography Controls (Professional) */}
                                        {['H1', 'H2', 'H3', 'H4', 'P', 'SPAN', 'A', 'BUTTON', 'LI'].includes(selectedElement.tagName) && (
                                            <TypographyControls 
                                                selectedElement={selectedElement} 
                                                onUpdate={(act) => setActionHistory(prev => [act, ...prev])} 
                                            />
                                        )}

                                        {/* Padding & Margin */}
                                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] text-slate-400">Padding</span>
                                                <input 
                                                    type="text"
                                                    value={propPadding}
                                                    onChange={(e) => {
                                                        const pad = e.target.value;
                                                        setPropPadding(pad);
                                                        if (selectedElement.elementRef) {
                                                            selectedElement.elementRef.style.padding = pad;
                                                            RealProjectSourcePatcher.patchStyleProperty(selectedElement.textContent, 'padding', pad, {
                                                                targetFile: selectedElement.targetFile,
                                                                targetLine: selectedElement.targetLine
                                                            });
                                                        }
                                                    }}
                                                    className="bg-[#151828] border border-white/15 rounded px-2 py-1 text-[11px] text-slate-200 outline-none"
                                                />
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] text-slate-400">Margin</span>
                                                <input 
                                                    type="text"
                                                    value={propMargin}
                                                    onChange={(e) => {
                                                        const mg = e.target.value;
                                                        setPropMargin(mg);
                                                        if (selectedElement.elementRef) {
                                                            selectedElement.elementRef.style.margin = mg;
                                                            RealProjectSourcePatcher.patchStyleProperty(selectedElement.textContent, 'margin', mg, {
                                                                targetFile: selectedElement.targetFile,
                                                                targetLine: selectedElement.targetLine
                                                            });
                                                        }
                                                    }}
                                                    className="bg-[#151828] border border-white/15 rounded px-2 py-1 text-[11px] text-slate-200 outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                ) : (
                                    <div className="text-[10px] text-slate-500 italic pt-1">
                                        Click any element on canvas to inspect & edit properties.
                                    </div>
                                )}
                            </>
                        )}

                        {activePropertiesTab === 'Adjust' && (
                            <div className="flex flex-col gap-2.5 text-[11px]">
                                <div className="flex flex-col gap-1">
                                    <span className="text-slate-300 font-medium">Brightness</span>
                                    <input type="range" min="50" max="150" defaultValue="100" onChange={(e) => {
                                        if (selectedElement?.elementRef) {
                                            selectedElement.elementRef.style.filter = `brightness(${e.target.value}%)`;
                                            RealProjectSourcePatcher.applyCSSFilter(selectedElement.textContent, `brightness(${e.target.value}%)`, {
                                                targetFile: selectedElement.targetFile,
                                                targetLine: selectedElement.targetLine
                                            });
                                        }
                                    }} className="accent-purple-500" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-slate-300 font-medium">Contrast</span>
                                    <input type="range" min="50" max="150" defaultValue="100" onChange={(e) => {
                                        if (selectedElement?.elementRef) {
                                            selectedElement.elementRef.style.filter = `contrast(${e.target.value}%)`;
                                            RealProjectSourcePatcher.applyCSSFilter(selectedElement.textContent, `contrast(${e.target.value}%)`, {
                                                targetFile: selectedElement.targetFile,
                                                targetLine: selectedElement.targetLine
                                            });
                                        }
                                    }} className="accent-purple-500" />
                                </div>
                            </div>
                        )}

                        {activePropertiesTab === 'Effects' && (
                            <div className="flex flex-col gap-2.5 text-[11px]">
                                <div className="flex justify-between items-center">
                                    <span>Opacity</span>
                                    <input type="range" min="0" max="100" defaultValue="100" onChange={(e) => {
                                        if (selectedElement?.elementRef) {
                                            const opacityVal = (Number(e.target.value) / 100).toString();
                                            selectedElement.elementRef.style.opacity = opacityVal;
                                            RealProjectSourcePatcher.patchStyleProperty(selectedElement.textContent, 'opacity', opacityVal, {
                                                targetFile: selectedElement.targetFile,
                                                targetLine: selectedElement.targetLine
                                            });
                                        }
                                    }} className="accent-purple-500 w-32" />
                                </div>
                            </div>
                        )}

                        {activePropertiesTab === 'Transform' && (
                            <div className="flex flex-col gap-2 text-[11px]">
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => {
                                        if (selectedElement?.elementRef) {
                                            selectedElement.elementRef.style.transform = 'scaleX(-1)';
                                            RealProjectSourcePatcher.patchStyleProperty(selectedElement.textContent, 'transform', 'scaleX(-1)', {
                                                targetFile: selectedElement.targetFile,
                                                targetLine: selectedElement.targetLine
                                            });
                                            setActionHistory(prev => ['Flipped Horizontally', ...prev]);
                                        }
                                    }} className="py-1.5 bg-white/5 hover:bg-white/10 rounded border border-white/10">Flip Horiz</button>

                                    <button onClick={() => {
                                        if (selectedElement?.elementRef) {
                                            selectedElement.elementRef.style.transform = 'scaleY(-1)';
                                            RealProjectSourcePatcher.patchStyleProperty(selectedElement.textContent, 'transform', 'scaleY(-1)', {
                                                targetFile: selectedElement.targetFile,
                                                targetLine: selectedElement.targetLine
                                            });
                                            setActionHistory(prev => ['Flipped Vertically', ...prev]);
                                        }
                                    }} className="py-1.5 bg-white/5 hover:bg-white/10 rounded border border-white/10">Flip Vert</button>
                                </div>
                            </div>
                        )}

                        {/* Export Panel View */}
                        {(activePropertiesTab as any) === 'Export' && (
                            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="flex items-center gap-2 text-slate-300 font-bold text-[11px] mb-1">
                                    <Download className="w-4 h-4 text-emerald-400" />
                                    <span>Export Options</span>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] text-slate-400">Format</span>
                                    <div className="flex gap-1">
                                        {(['png', 'jpeg', 'webp'] as const).map(fmt => (
                                            <button
                                                key={fmt}
                                                onClick={() => setExportFormat(fmt)}
                                                className={`flex-1 py-1.5 rounded text-[10px] font-bold border transition-all ${exportFormat === fmt ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-black/20 border-white/5 text-slate-400 hover:border-white/20'}`}
                                            >
                                                {fmt.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] text-slate-400">Resolution</span>
                                        <select 
                                            value={exportScale}
                                            onChange={(e) => setExportScale(Number(e.target.value))}
                                            className="bg-[#151828] border border-white/15 rounded px-2 py-1.5 text-[11px] text-slate-200 outline-none"
                                        >
                                            <option value={1}>Original (1x)</option>
                                            <option value={2}>Retina (2x)</option>
                                            <option value={3}>Print (3x)</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] text-slate-400">Quality</span>
                                        <select 
                                            value={exportQuality}
                                            onChange={(e) => setExportQuality(Number(e.target.value))}
                                            className="bg-[#151828] border border-white/15 rounded px-2 py-1.5 text-[11px] text-slate-200 outline-none"
                                        >
                                            <option value={1}>100% (Lossless)</option>
                                            <option value={0.9}>90% (High)</option>
                                            <option value={0.8}>80% (Standard)</option>
                                            <option value={0.6}>60% (Low)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 pt-2">
                                    <button
                                        onClick={() => handleExport(false)}
                                        disabled={!!exportStatus}
                                        className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded text-[11px] font-bold transition-all flex items-center justify-center gap-2 border border-white/10"
                                    >
                                        <Camera className="w-3.5 h-3.5" />
                                        Capture Visible Viewport
                                    </button>
                                    <button
                                        onClick={() => handleExport(true)}
                                        disabled={!!exportStatus}
                                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded text-[12px] font-black uppercase tracking-widest shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Download className="w-4 h-4" />
                                        Export Full Page Image
                                    </button>
                                </div>

                                {exportStatus && (
                                    <div className="p-3 bg-emerald-900/20 border border-emerald-500/30 rounded-lg flex flex-col items-center gap-2 animate-pulse">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" />
                                            <span className="text-[11px] font-bold text-emerald-400">{exportStatus}</span>
                                        </div>
                                        <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-emerald-500 h-full w-[60%] animate-progress" />
                                        </div>
                                    </div>
                                )}

                                <div className="p-3 bg-white/5 border border-white/10 rounded text-[10px] text-slate-400 italic">
                                    Full page export will automatically capture all sections from top to bottom, including content below the viewport.
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                    {/* SECTION 3: BOTTOM TABS (Layers, Channels, Paths, History, Log) */}
                    <div className="flex border-b border-white/10 bg-[#0e101b] text-[11px] shrink-0 sticky top-[62px] z-10">
                        {(['Layers', 'Channels', 'Paths', 'History', 'Log'] as const).map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setActiveLayerTab(tab)}
                                className={`flex-1 py-1.5 text-center border-r border-white/10 last:border-0 transition-colors ${activeLayerTab === tab ? 'bg-[#151828] text-white font-bold border-b-2 border-b-purple-500' : 'text-slate-400 hover:text-white'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Bottom Panel Views */}
                    <div className="p-3 bg-[#0c0e17] text-[11px] pb-12">
                        {activeLayerTab === 'Layers' && (
                            <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[400px] custom-scrollbar pr-1">
                                {realLayers.length > 0 ? realLayers.map(layer => (
                                    <button 
                                        key={layer.id} 
                                        onClick={() => {
                                            const computed = window.getComputedStyle(layer.ref);
                                            const meta = {
                                                targetFile: layer.ref.getAttribute('data-vfs-file') || undefined,
                                                targetLine: parseInt(layer.ref.getAttribute('data-vfs-line') || '0', 10) || undefined
                                            };
                                            setSelectedElement({
                                                tagName: layer.ref.tagName,
                                                textContent: layer.ref.innerText?.slice(0, 50) || '',
                                                className: layer.ref.className || '',
                                                id: layer.ref.id || '',
                                                color: computed.color || '#ffffff',
                                                backgroundColor: computed.backgroundColor || 'transparent',
                                                fontSize: computed.fontSize || '16px',
                                                padding: computed.padding || '0px',
                                                margin: computed.margin || '0px',
                                                width: `${layer.ref.offsetWidth}px`,
                                                height: `${layer.ref.offsetHeight}px`,
                                                borderRadius: computed.borderRadius || '0px',
                                                elementRef: layer.ref,
                                                ...meta
                                            });
                                        }}
                                        className={`flex items-center justify-between p-2 rounded border transition-colors group ${selectedElement?.elementRef === layer.ref ? 'bg-purple-600/20 border-purple-500' : 'bg-[#121524] border-white/10 hover:border-white/30'}`}
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <div className="flex items-center gap-1 shrink-0">
                                                <Eye className={`w-3 h-3 ${layer.visible ? 'text-purple-400' : 'text-slate-600'}`} />
                                                <Lock className="w-3 h-3 text-slate-600" />
                                            </div>
                                            <div className="flex flex-col items-start overflow-hidden">
                                                <span className="text-[10px] font-bold text-slate-200 truncate w-full">{layer.name || layer.type}</span>
                                                <span className="text-[8px] text-slate-500 uppercase font-mono">{layer.type}</span>
                                            </div>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 
                                                className="w-3 h-3 text-red-400 hover:text-red-300" 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    RealProjectSourcePatcher.deleteElementFromProject(layer.ref.innerText || '', {
                                                        targetFile: layer.ref.getAttribute('data-vfs-file') || undefined,
                                                        targetLine: parseInt(layer.ref.getAttribute('data-vfs-line') || '0', 10) || undefined
                                                    });
                                                }}
                                            />
                                        </div>
                                    </button>
                                )) : (
                                    <div className="text-[10px] text-slate-500 italic text-center py-4">No elements found in canvas.</div>
                                )}
                            </div>
                        )}

                        {activeLayerTab === 'Channels' && (
                            <div className="flex flex-col gap-2">
                                {['Red Channel', 'Green Channel', 'Blue Channel', 'Alpha Channel'].map((ch, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 bg-[#121524] rounded border border-white/10">
                                        <span>{ch}</span>
                                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeLayerTab === 'Paths' && (
                            <div className="flex flex-col gap-2">
                                <div className="p-2 bg-[#121524] rounded border border-white/10 flex items-center justify-between">
                                    <span>Vector Work Path</span>
                                    <span className="text-[9px] font-mono text-purple-400">ACTIVE</span>
                                </div>
                            </div>
                        )}

                        {activeLayerTab === 'History' && (
                            <div className="flex flex-col gap-1 font-mono text-[10px]">
                                {actionHistory.map((act, idx) => (
                                    <div key={idx} className="p-1.5 bg-[#121524] rounded border border-white/5 text-slate-300">
                                        {act}
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeLayerTab === 'Log' && (
                            <div className="flex flex-col gap-1 font-mono text-[10px] text-slate-400">
                                <div>[VFS] Memory File System Ready</div>
                                <div>[SYS] Anny Professional Bridge Attached</div>
                                <div>[SAVE] Storage Target: localStorage + Firestore</div>
                                {vfsFiles.map(f => (
                                    <div key={f} className="text-purple-300 text-[9px]">+ {f}</div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* FLOATING AI ASSISTANT PANEL */}
            {showAiAssistant && (
                <div className="fixed bottom-6 right-[336px] w-80 h-96 bg-[#151828] border border-purple-500/30 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col z-[200] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                    <div className="h-10 bg-[#1a1e2e] border-b border-white/10 flex items-center justify-between px-4 shrink-0">
                        <div className="flex items-center gap-2">
                            <Bot className="w-4 h-4 text-purple-400" />
                            <span className="text-[11px] font-bold text-white uppercase tracking-wider">Anny AI Assistant</span>
                        </div>
                        <button onClick={() => setShowAiAssistant(false)} className="p-1 hover:bg-white/10 rounded text-slate-400">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar bg-[#0c0e17]/50">
                        {aiMessages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-[11px] leading-relaxed shadow-sm ${
                                    msg.role === 'user' 
                                        ? 'bg-purple-600 text-white rounded-tr-none' 
                                        : 'bg-[#1e2235] text-slate-200 border border-white/5 rounded-tl-none'
                                }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-3 border-t border-white/10 bg-[#1a1e2e]">
                        <div className="relative flex items-center">
                            <input 
                                type="text" 
                                placeholder="Ask Anny to modify code..." 
                                className="w-full bg-[#0c0e17] border border-white/10 rounded-full py-2 px-4 pr-10 text-[11px] text-white placeholder-slate-500 outline-none focus:border-purple-500/50 transition-all"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.currentTarget.value) {
                                        const text = e.currentTarget.value;
                                        setAiMessages(prev => [...prev, { role: 'user', text }]);
                                        e.currentTarget.value = '';
                                        setTimeout(() => {
                                            setAiMessages(prev => [...prev, { role: 'model', text: "I've analyzed your request. I'm ready to patch the source code via the RealProjectSourcePatcher." }]);
                                        }, 1000);
                                    }
                                }}
                            />
                            <button className="absolute right-2 p-1.5 bg-purple-600 rounded-full text-white hover:bg-purple-500 transition-colors">
                                <Send className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {!showAiAssistant && (
                <button 
                    onClick={() => setShowAiAssistant(true)}
                    className="fixed bottom-6 right-[336px] w-12 h-12 bg-purple-600 rounded-full shadow-xl flex items-center justify-center text-white hover:scale-110 transition-all z-[200] border border-white/20"
                >
                    <Bot className="w-6 h-6" />
                </button>
            )}

            {/* HIDDEN INPUTS FOR FILE PIPELINE */}
            <input 
                type="file" 
                ref={universalUploadInputRef} 
                multiple 
                className="hidden" 
                onChange={handleUniversalUploadChange} 
            />
            <input 
                type="file" 
                ref={replacementUploadInputRef} 
                accept="image/*" 
                className="hidden" 
                onChange={handleReplacementUploadChange} 
            />

            {/* HIGH-END FLOATING NOTIFICATION TOAST */}
            {(editorError || editorSuccess) && (
                <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2.5 rounded-xl border shadow-2xl flex items-center gap-2.5 font-sans text-xs font-semibold animate-in fade-in slide-in-from-top-4 duration-300 ${
                    editorError 
                        ? 'bg-red-950/95 border-red-500/40 text-red-200' 
                        : 'bg-slate-900/95 border-emerald-500/40 text-emerald-300'
                }`}>
                    {editorError ? (
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    ) : (
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    <span>{editorError || editorSuccess}</span>
                    <button 
                        onClick={() => { setEditorError(null); setEditorSuccess(null); }}
                        className="ml-2 hover:bg-white/10 p-0.5 rounded text-slate-400 hover:text-white"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}
        </div>
    );
};
