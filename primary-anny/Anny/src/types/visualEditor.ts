export interface VisualEditorProps {
  projectName?: string;
  onSwitchTab?: (tab: 'preview' | 'code' | 'files' | 'terminal' | 'database') => void;
}

export interface EditableNode {
  id: string;
  type: 'heading' | 'text' | 'button' | 'image' | 'video' | 'badge' | 'nav_link' | 'card' | 'section';
  name: string;
  tag: string;
  content: string;
  classes: string;
  originalSnippet: string;
  filePath: string;
  styles?: {
    width?: string;
    maxWidth?: string;
    paddingTop?: string;
    paddingBottom?: string;
    paddingLeft?: string;
    paddingRight?: string;
    marginTop?: string;
    marginBottom?: string;
    backgroundColor?: string;
    fontFamily?: string;
    fontWeight?: string;
    fontSize?: string;
    lineHeight?: string;
    textColor?: string;
    borderRadius?: string;
    textAlign?: string;
    opacity?: string;
  };
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
