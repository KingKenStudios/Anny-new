import React from 'react';
import { Globe } from 'lucide-react';
import { MobileLogoMenu } from '../MobileLogoMenu';
import { AnnyPhase38UniversalLanguageStudio } from '../components/AnnyPhase38UniversalLanguageStudio';

interface AnnyLanguagesViewProps {
  onToggleMobileMenu?: () => void;
  onSelectLanguagePrompt?: (prompt: string) => void;
}

export const AnnyLanguagesView: React.FC<AnnyLanguagesViewProps> = ({
  onToggleMobileMenu,
  onSelectLanguagePrompt,
}) => {
  return (
    <div className="flex-1 flex flex-col h-full bg-[#040612] text-slate-100 overflow-hidden">
      <div className="shrink-0 flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-4 border-b border-white/10 bg-[#050818]">
        <div className="flex items-center gap-3 min-w-0">
          <MobileLogoMenu onToggleMobileMenu={onToggleMobileMenu} />
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 truncate">
              <Globe className="w-5 h-5 text-cyan-400 shrink-0" />
              Universal Language Intelligence Studio
            </h1>
            <p className="text-xs text-slate-400 truncate">
              70 African &amp; Global Languages · Code-Token Preserving Translation · LID &amp; Hardware Routing
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <AnnyPhase38UniversalLanguageStudio onSelectLanguagePrompt={onSelectLanguagePrompt} />
      </div>
    </div>
  );
};
