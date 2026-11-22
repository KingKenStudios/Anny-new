import React from 'react';
import { LucideIcon, ChevronRight } from 'lucide-react';

export interface ToolItem {
  id: string;
  name: string;
  icon: LucideIcon;
  shortcut?: string;
}

interface ToolGroupProps {
  id: string;
  name: string;
  icon: LucideIcon;
  tools: ToolItem[];
  activeTool: string;
  activeSubTool: string;
  showFlyout: boolean;
  shortcut?: string;
  onSelect: (groupId: string, subToolId: string) => void;
  onToggleFlyout: (e?: React.MouseEvent) => void;
}

export const ToolGroup: React.FC<ToolGroupProps> = ({
  id,
  name,
  icon,
  tools,
  activeTool,
  activeSubTool,
  showFlyout,
  shortcut,
  onSelect,
  onToggleFlyout
}) => {
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [flyoutTop, setFlyoutTop] = React.useState<number | string>('auto');

  React.useEffect(() => {
    if (showFlyout && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const flyoutHeight = Math.min(tools.length * 32 + 40, window.innerHeight * 0.7);
      
      // If flyout would go off bottom, shift it up
      if (rect.top + flyoutHeight > window.innerHeight - 20) {
        setFlyoutTop(window.innerHeight - flyoutHeight - 20);
      } else {
        setFlyoutTop(rect.top - 4);
      }
    }
  }, [showFlyout, tools.length]);

  const isActive = activeTool === id;
  const currentSubTool = tools.find(t => t.id === activeSubTool) || tools[0];
  const DisplayIcon = currentSubTool.icon;

  return (
    <div className="relative flex flex-col items-center">
      <button
        ref={buttonRef}
        onClick={(e) => {
          if (tools.length > 1) {
            onToggleFlyout(e);
          } else {
            onSelect(id, tools[0].id);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onToggleFlyout(e);
        }}
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all relative group/btn ${
          isActive 
            ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' 
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`}
        title={`${currentSubTool.name} (${shortcut})`}
      >
        <DisplayIcon className="w-5 h-5" />
        {tools.length > 1 && (
          <div className="absolute bottom-0 right-0 w-0 h-0 border-b-[6px] border-r-[6px] border-transparent border-b-current border-r-current opacity-40 group-hover/btn:opacity-100 transition-opacity" style={{ transform: 'rotate(0deg)' }} />
        )}
      </button>

      {showFlyout && tools.length > 1 && (
        <div 
          className="fixed left-12 w-52 bg-[#1a1c26] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-lg py-1 z-[1000] animate-in fade-in slide-in-from-left-2 duration-150"
          style={{ 
            top: flyoutTop,
          }}
        >
          <div className="px-3 py-1.5 mb-1 border-b border-white/5 flex justify-between items-center">
            <span className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em]">{name}</span>
            {shortcut && <span className="text-[9px] text-slate-500 font-mono">{shortcut}</span>}
          </div>
          <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
            {tools.map(tool => (
              <button
                key={tool.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(id, tool.id);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-[11px] transition-all group ${
                  activeSubTool === tool.id 
                    ? 'bg-purple-600 text-white font-bold' 
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <tool.icon className={`w-4 h-4 ${activeSubTool === tool.id ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} />
                <div className="flex-1 text-left whitespace-nowrap">{tool.name}</div>
                {activeSubTool === tool.id && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
