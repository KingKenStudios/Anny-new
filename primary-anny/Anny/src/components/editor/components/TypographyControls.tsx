import React, { useState, useMemo } from 'react';
import { 
  Type, AlignLeft, AlignCenter, AlignRight, AlignJustify, 
  Bold, Italic, Underline, Strikethrough, ChevronDown, Search, 
  ArrowUp, ArrowDown, Type as TypeIcon
} from 'lucide-react';
import { RealProjectSourcePatcher } from '../services/RealProjectSourcePatcher';
import { SelectedElementData } from '../bridge/RealProjectEditorBridge';

export const FONT_FAMILIES = [
  "Arial", "Helvetica", "Verdana", "Tahoma", "Trebuchet MS", "Times New Roman", "Georgia", "Garamond", "Courier New", "Impact", "Comic Sans MS",
  "Inter", "Roboto", "Open Sans", "Montserrat", "Poppins", "Lato", "Oswald", "Raleway", "Nunito", "Playfair Display", "Merriweather", 
  "Source Sans 3", "Source Code Pro", "DM Sans", "Manrope", "Plus Jakarta Sans", "Work Sans", "Fira Sans", "Ubuntu",
  "Helvetica Neue", "Nunito Sans", "Roboto Slab", "Bebas Neue", "Source Serif 4", "Fira Code", 
  "JetBrains Mono", "IBM Plex Sans", "IBM Plex Serif", "PT Sans", "PT Serif", "Noto Sans", "Noto Serif", 
  "Libre Baskerville", "Cormorant Garamond", "Cinzel", "Bodoni Moda", "Abril Fatface", "Pacifico", 
  "Dancing Script", "Great Vibes", "Lobster", "Permanent Marker", "Space Grotesk", "Space Mono", "Sora", 
  "Outfit", "Urbanist", "Rubik", "Quicksand", "Comfortaa", "Barlow", "Barlow Condensed", 
  "Archivo", "Archivo Black", "Karla", "Mulish", "Cabin", "Josefin Sans", "Maven Pro", "Titillium Web", "Exo 2", "Rajdhani"
].sort();

interface TypographyControlsProps {
  selectedElement: SelectedElementData;
  onUpdate: (action: string) => void;
}

export const TypographyControls: React.FC<TypographyControlsProps> = ({ selectedElement, onUpdate }) => {
  const [fontSearch, setFontSearch] = useState('');
  const [isFontOpen, setIsFontOpen] = useState(false);

  const filteredFonts = useMemo(() => {
    return FONT_FAMILIES.filter(f => f.toLowerCase().includes(fontSearch.toLowerCase()));
  }, [fontSearch]);

  const patchStyle = (prop: string, val: string) => {
    if (selectedElement.elementRef) {
      selectedElement.elementRef.style[prop as any] = val;
      RealProjectSourcePatcher.patchStyleProperty(selectedElement.textContent, prop, val, {
        targetFile: selectedElement.targetFile,
        targetLine: selectedElement.targetLine
      });
      onUpdate(`Updated ${prop} to ${val}`);
    }
  };

  const applyPreset = (preset: string) => {
    let styles: Record<string, string> = {};
    switch (preset) {
      case 'Heading':
        styles = { fontSize: '32px', fontWeight: '800', lineHeight: '1.2', letterSpacing: '-0.02em' };
        break;
      case 'Subheading':
        styles = { fontSize: '24px', fontWeight: '600', lineHeight: '1.4', letterSpacing: '-0.01em' };
        break;
      case 'Body':
        styles = { fontSize: '16px', fontWeight: '400', lineHeight: '1.6', letterSpacing: 'normal' };
        break;
      case 'Caption':
        styles = { fontSize: '12px', fontWeight: '400', lineHeight: '1.5', opacity: '0.7' };
        break;
      case 'Button':
        styles = { fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' };
        break;
    }

    if (Object.keys(styles).length > 0 && selectedElement.elementRef) {
      Object.entries(styles).forEach(([prop, val]) => {
        if (selectedElement.elementRef) selectedElement.elementRef.style[prop as any] = val;
      });
      RealProjectSourcePatcher.patchTypography(selectedElement.textContent, styles, {
        targetFile: selectedElement.targetFile,
        targetLine: selectedElement.targetLine
      });
      onUpdate(`Applied ${preset} typography preset`);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-3 bg-white/5 border border-white/10 rounded-lg animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex items-center gap-2 mb-1">
        <Type className="w-4 h-4 text-purple-400" />
        <span className="text-[11px] font-bold text-white uppercase tracking-wider">Typography</span>
      </div>

      {/* Font Family Selector */}
      <div className="relative">
        <span className="text-[10px] text-slate-400 block mb-1">Font Family</span>
        <button 
          onClick={() => setIsFontOpen(!isFontOpen)}
          className="w-full bg-[#151828] border border-white/15 rounded px-2 py-1.5 text-[11px] text-slate-200 flex items-center justify-between hover:border-purple-500 transition-colors"
        >
          <span style={{ fontFamily: selectedElement.elementRef?.style.fontFamily || 'inherit' }}>
            {selectedElement.elementRef?.style.fontFamily?.replace(/['"]/g, '') || 'Default'}
          </span>
          <ChevronDown className={`w-3 h-3 transition-transform ${isFontOpen ? 'rotate-180' : ''}`} />
        </button>

        {isFontOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#1A1E2E] border border-white/20 rounded shadow-2xl z-50 max-h-64 flex flex-col overflow-hidden">
            <div className="p-2 border-b border-white/10 flex items-center gap-2 sticky top-0 bg-[#1A1E2E]">
              <Search className="w-3 h-3 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search fonts..." 
                className="bg-transparent border-none outline-none text-[10px] text-white w-full"
                value={fontSearch}
                onChange={(e) => setFontSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              {filteredFonts.map(font => (
                <button
                  key={font}
                  onClick={() => {
                    patchStyle('fontFamily', font);
                    setIsFontOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-[11px] text-slate-300 hover:bg-purple-600 hover:text-white transition-colors border-b border-white/5 last:border-none"
                  style={{ fontFamily: font }}
                >
                  {font}
                </button>
              ))}
              {filteredFonts.length === 0 && (
                <div className="p-3 text-[10px] text-slate-500 italic text-center">No fonts found</div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-400">Weight</span>
          <select 
            value={selectedElement.elementRef?.style.fontWeight || '400'}
            onChange={(e) => patchStyle('fontWeight', e.target.value)}
            className="bg-[#151828] border border-white/15 rounded px-2 py-1 text-[11px] text-slate-200 outline-none"
          >
            <option value="100">Thin (100)</option>
            <option value="200">Extra Light (200)</option>
            <option value="300">Light (300)</option>
            <option value="400">Regular (400)</option>
            <option value="500">Medium (500)</option>
            <option value="600">Semi Bold (600)</option>
            <option value="700">Bold (700)</option>
            <option value="800">Extra Bold (800)</option>
            <option value="900">Black (900)</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-400">Size</span>
          <div className="flex items-center gap-1">
            <input 
              type="text" 
              value={selectedElement.elementRef?.style.fontSize || '16px'}
              onChange={(e) => patchStyle('fontSize', e.target.value)}
              className="w-full bg-[#151828] border border-white/15 rounded px-2 py-1 text-[11px] text-slate-200 outline-none font-mono"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-400">Line Height</span>
          <input 
            type="text" 
            placeholder="1.5"
            value={selectedElement.elementRef?.style.lineHeight || ''}
            onChange={(e) => patchStyle('lineHeight', e.target.value)}
            className="w-full bg-[#151828] border border-white/15 rounded px-2 py-1 text-[11px] text-slate-200 outline-none font-mono"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-400">Letter Spacing</span>
          <input 
            type="text" 
            placeholder="0px"
            value={selectedElement.elementRef?.style.letterSpacing || ''}
            onChange={(e) => patchStyle('letterSpacing', e.target.value)}
            className="w-full bg-[#151828] border border-white/15 rounded px-2 py-1 text-[11px] text-slate-200 outline-none font-mono"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[10px] text-slate-400">Alignment & Style</span>
        <div className="flex items-center justify-between p-1 bg-black/20 rounded border border-white/5">
          <div className="flex items-center gap-0.5">
            {[
              { id: 'left', icon: AlignLeft },
              { id: 'center', icon: AlignCenter },
              { id: 'right', icon: AlignRight },
              { id: 'justify', icon: AlignJustify }
            ].map(btn => (
              <button 
                key={btn.id}
                onClick={() => patchStyle('textAlign', btn.id)}
                className={`p-1.5 rounded transition-colors ${selectedElement.elementRef?.style.textAlign === btn.id ? 'bg-purple-600 text-white' : 'hover:bg-white/10 text-slate-400'}`}
              >
                <btn.icon className="w-3 h-3" />
              </button>
            ))}
          </div>
          <div className="w-[1px] h-4 bg-white/10 mx-1" />
          <div className="flex items-center gap-0.5">
            <button 
              onClick={() => patchStyle('fontStyle', selectedElement.elementRef?.style.fontStyle === 'italic' ? 'normal' : 'italic')}
              className={`p-1.5 rounded transition-colors ${selectedElement.elementRef?.style.fontStyle === 'italic' ? 'bg-purple-600 text-white' : 'hover:bg-white/10 text-slate-400'}`}
            >
              <Italic className="w-3 h-3" />
            </button>
            <button 
              onClick={() => patchStyle('textDecoration', selectedElement.elementRef?.style.textDecoration === 'underline' ? 'none' : 'underline')}
              className={`p-1.5 rounded transition-colors ${selectedElement.elementRef?.style.textDecoration === 'underline' ? 'bg-purple-600 text-white' : 'hover:bg-white/10 text-slate-400'}`}
            >
              <Underline className="w-3 h-3" />
            </button>
            <button 
              onClick={() => patchStyle('textDecoration', selectedElement.elementRef?.style.textDecoration === 'line-through' ? 'none' : 'line-through')}
              className={`p-1.5 rounded transition-colors ${selectedElement.elementRef?.style.textDecoration === 'line-through' ? 'bg-purple-600 text-white' : 'hover:bg-white/10 text-slate-400'}`}
            >
              <Strikethrough className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-slate-400">Text Transform</span>
        <div className="flex items-center gap-1">
          {['none', 'uppercase', 'lowercase', 'capitalize'].map(val => (
            <button
              key={val}
              onClick={() => patchStyle('textTransform', val)}
              className={`flex-1 py-1 rounded text-[9px] uppercase font-bold border transition-colors ${selectedElement.elementRef?.style.textTransform === val ? 'bg-purple-600 border-purple-400 text-white' : 'bg-black/20 border-white/5 text-slate-400 hover:border-white/20'}`}
            >
              {val === 'none' ? 'Ab' : val === 'uppercase' ? 'AB' : val === 'lowercase' ? 'ab' : 'Aa'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-slate-400">Presets</span>
        <div className="flex flex-wrap gap-1.5">
          {['Heading', 'Subheading', 'Body', 'Caption', 'Button'].map(p => (
            <button 
              key={p}
              onClick={() => applyPreset(p)}
              className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] text-slate-300 hover:bg-purple-600 hover:border-purple-400 hover:text-white transition-all"
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
