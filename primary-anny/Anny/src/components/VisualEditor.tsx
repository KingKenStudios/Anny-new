import React from 'react';
import { AnnyProfessionalEditor } from './AnnyProfessionalEditor';
import { WorkspaceManager } from '../core/workspaceManager';

export interface EditableNode {
  id: string;
  type: 'heading' | 'text' | 'button' | 'image' | 'video' | 'badge' | 'nav_link' | 'card' | 'section';
  name: string;
  tag: string;
  content: string;
  classes: string;
  originalSnippet: string;
  filePath: string;
  styles?: Record<string, string>;
  mediaUrl?: string;
  linkRoute?: string;
  isLocked?: boolean;
  isHidden?: boolean;
}

export interface SectionGroup {
  id: string;
  name: string;
  tag: string;
  filePath: string;
  elements: EditableNode[];
  bgColor?: string;
  paddingTop?: string;
  paddingBottom?: string;
  isLocked?: boolean;
  isHidden?: boolean;
}

export interface PageItem {
  id: string;
  name: string;
  path: string;
  isActive?: boolean;
}

export interface VisualEditorProps {
  projectName?: string;
  onSwitchTab?: (tab: 'preview' | 'code' | 'files' | 'terminal' | 'database') => void;
}

export const VisualEditor: React.FC<VisualEditorProps> = ({
  projectName = 'Anny AI Application',
  onSwitchTab
}) => {
  const wsManager = WorkspaceManager.getInstance();
  const sessionId = wsManager.getActiveProjectId() || 'default-session';

  return (
    <div className="w-full h-full bg-[#050713]">
      <AnnyProfessionalEditor 
        sessionId={sessionId}
        onBackToWorkspace={() => onSwitchTab?.('preview')}
      />
    </div>
  );
};


