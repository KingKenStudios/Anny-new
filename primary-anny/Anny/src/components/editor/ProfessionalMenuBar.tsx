import React, { useState, useEffect, useRef } from 'react';
import { 
  File, Edit2, Image as ImageIcon, Layers, MousePointer2, 
  Filter, View, Monitor, HelpCircle, ChevronRight 
} from 'lucide-react';

interface MenuAction {
  label: string;
  shortcut?: string;
  action?: () => void;
  disabled?: boolean;
  divider?: boolean;
  children?: MenuAction[];
}

interface ProfessionalMenuBarProps {
  onAction: (action: string) => void;
}

export const ProfessionalMenuBar: React.FC<ProfessionalMenuBarProps> = ({ onAction }) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const menus: Record<string, MenuAction[]> = {
    File: [
      { label: 'New', shortcut: 'Ctrl+N', action: () => onAction('new') },
      { label: 'Open Project', shortcut: 'Ctrl+O', action: () => onAction('open') },
      { divider: true, label: '' },
      { label: 'Save', shortcut: 'Ctrl+S', action: () => onAction('save') },
      { label: 'Save As...', shortcut: 'Ctrl+Shift+S', action: () => onAction('save_as') },
      { divider: true, label: '' },
      { label: 'Export', action: () => onAction('export') },
      { label: 'Import', action: () => onAction('import') },
      { divider: true, label: '' },
      { label: 'Close Session', action: () => onAction('close') },
    ],
    Edit: [
      { label: 'Undo', shortcut: 'Ctrl+Z', action: () => onAction('undo') },
      { label: 'Redo', shortcut: 'Ctrl+Shift+Z', action: () => onAction('redo') },
      { divider: true, label: '' },
      { label: 'Cut', shortcut: 'Ctrl+X', action: () => onAction('cut') },
      { label: 'Copy', shortcut: 'Ctrl+C', action: () => onAction('copy') },
      { label: 'Paste', shortcut: 'Ctrl+V', action: () => onAction('paste') },
      { divider: true, label: '' },
      { label: 'Select All', shortcut: 'Ctrl+A', action: () => onAction('select_all') },
      { label: 'Deselect', shortcut: 'Ctrl+D', action: () => onAction('deselect') },
    ],
    Image: [
      { label: 'Canvas Size', action: () => onAction('canvas_size') },
      { label: 'Image Size', action: () => onAction('image_size') },
      { divider: true, label: '' },
      { label: 'Rotate 90° CW', action: () => onAction('rotate_cw') },
      { label: 'Rotate 90° CCW', action: () => onAction('rotate_ccw') },
      { label: 'Flip Horizontal', action: () => onAction('flip_h') },
      { label: 'Flip Vertical', action: () => onAction('flip_v') },
    ],
    Layer: [
      { label: 'New Layer', action: () => onAction('new_layer') },
      { label: 'Duplicate Layer', shortcut: 'Ctrl+J', action: () => onAction('duplicate_layer') },
      { label: 'Delete Layer', action: () => onAction('delete_layer') },
      { divider: true, label: '' },
      { label: 'Bring to Front', shortcut: 'Ctrl+Shift+]', action: () => onAction('bring_front') },
      { label: 'Send to Back', shortcut: 'Ctrl+Shift+[', action: () => onAction('send_back') },
    ],
    Select: [
      { label: 'All', shortcut: 'Ctrl+A', action: () => onAction('select_all') },
      { label: 'Deselect', shortcut: 'Ctrl+D', action: () => onAction('deselect') },
      { label: 'Invert Selection', shortcut: 'Ctrl+Shift+I', action: () => onAction('invert_selection') },
    ],
    Filter: [
      { label: 'Blur', action: () => onAction('filter_blur') },
      { label: 'Sharpen', action: () => onAction('filter_sharpen') },
      { divider: true, label: '' },
      { label: 'Brightness/Contrast', action: () => onAction('filter_brightness') },
      { label: 'Hue/Saturation', action: () => onAction('filter_hue') },
      { label: 'Grayscale', action: () => onAction('filter_grayscale') },
    ],
    View: [
      { label: 'Zoom In', shortcut: 'Ctrl++', action: () => onAction('zoom_in') },
      { label: 'Zoom Out', shortcut: 'Ctrl+-', action: () => onAction('zoom_out') },
      { label: 'Fit to Screen', shortcut: 'Ctrl+0', action: () => onAction('fit_screen') },
      { divider: true, label: '' },
      { label: '100%', shortcut: 'Ctrl+1', action: () => onAction('zoom_100') },
      { label: '200%', action: () => onAction('zoom_200') },
      { divider: true, label: '' },
      { label: 'Show Grid', action: () => onAction('toggle_grid') },
      { label: 'Show Guides', action: () => onAction('toggle_guides') },
    ],
    Window: [
      { label: 'Workspace Reset', action: () => onAction('reset_workspace') },
      { divider: true, label: '' },
      { label: 'AI Assistant', shortcut: 'Ctrl+Shift+A', action: () => onAction('toggle_ai') },
      { label: 'Layers', action: () => onAction('toggle_layers') },
      { label: 'Properties', action: () => onAction('toggle_properties') },
      { label: 'History', action: () => onAction('toggle_history') },
      { divider: true, label: '' },
      { label: 'Full Screen', shortcut: 'F', action: () => onAction('toggle_fullscreen') },
    ],
    Help: [
      { label: 'Keyboard Shortcuts', action: () => onAction('help_shortcuts') },
      { label: 'About Anny Pro', action: () => onAction('help_about') },
    ]
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} className="h-7 bg-[#1c1e26] border-b border-white/5 flex items-center px-2 text-[11px] select-none z-[100] sticky top-0">
      <div className="flex items-center gap-1">
        {Object.keys(menus).map(menuKey => (
          <div key={menuKey} className="relative">
            <button
              onMouseEnter={() => activeMenu && setActiveMenu(menuKey)}
              onClick={() => setActiveMenu(activeMenu === menuKey ? null : menuKey)}
              className={`px-3 py-1 rounded transition-colors ${activeMenu === menuKey ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
            >
              {menuKey}
            </button>
            
            {activeMenu === menuKey && (
              <div className="absolute top-full left-0 mt-0.5 w-56 bg-[#252833] border border-white/10 shadow-2xl rounded py-1 z-[110] animate-in fade-in zoom-in-95 duration-100">
                {menus[menuKey].map((item, idx) => (
                  item.divider ? (
                    <div key={idx} className="h-[1px] bg-white/5 my-1 mx-2" />
                  ) : (
                    <button
                      key={idx}
                      onClick={() => {
                        item.action?.();
                        setActiveMenu(null);
                      }}
                      disabled={item.disabled}
                      className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-purple-600 hover:text-white group text-left disabled:opacity-30"
                    >
                      <span className="text-slate-200 group-hover:text-white">{item.label}</span>
                      {item.shortcut && (
                        <span className="text-slate-500 text-[9px] group-hover:text-white/70">{item.shortcut}</span>
                      )}
                    </button>
                  )
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
