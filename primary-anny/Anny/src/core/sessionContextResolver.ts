/**
 * ANNY CORE — SESSION CONTEXT RESOLVER
 * Deeply inspects chat history, project state, editor context, VFS, and active execution
 * to resolve implicit and contextual references in user prompts ("it", "that", "the button", "the image", "make it purple", etc.)
 */

import { virtualFileSystem } from './virtualFileSystem';

export interface ResolvedSessionContext {
  sessionId: string;
  projectId: string;
  normalizedInput: string;
  referencedFiles: string[];
  referencedComponents: string[];
  referencedElements: string[];
  referencedImages: string[];
  activeTargetFile?: string;
  activeTargetComponent?: string;
  activeTargetElement?: string;
  extractedConstraints: Record<string, boolean | string>;
  negativeConstraints: string[];
  userCorrections: string[];
  recentDiscussedTopic: string;
  recentBuildSummary?: string;
  editorActiveFile?: string;
  lastModifiedFiles: string[];
  resolvedPromptWithContext: string;
  conversationMode: 'new' | 'continuation' | 'topic_shift' | 'project_continuation';
  lastUserMessage: string;
  lastAssistantMessage: string;
}

export class SessionContextResolver {
  private static instance: SessionContextResolver;

  public static getInstance(): SessionContextResolver {
    if (!SessionContextResolver.instance) {
      SessionContextResolver.instance = new SessionContextResolver();
    }
    return SessionContextResolver.instance;
  }

  /**
   * Performs deep multi-layered context resolution across history, project, VFS, and editor
   */
  public resolveContext(
    userPrompt: string,
    history: any[] = [],
    sessionId: string = 'default_session',
    projectId: string = 'default_project',
    editorState?: { activeFile?: string; selection?: string }
  ): ResolvedSessionContext {
    const rawInput = userPrompt || '';
    const normalizedInput = rawInput.trim().replace(/\s+/g, ' ');
    const lowerInput = normalizedInput.toLowerCase();

    // 1. Gather current workspace/VFS state
    const allVfsMap = virtualFileSystem.getAllFilesMap ? virtualFileSystem.getAllFilesMap() : {};
    const existingFilePaths = Object.keys(allVfsMap);

    // 2. Scan recent conversation history (up to last 15 messages)
    const recentHistory = Array.isArray(history) ? history.slice(-15) : [];
    
    const referencedFiles: string[] = [];
    const referencedComponents: string[] = [];
    const referencedElements: string[] = [];
    const referencedImages: string[] = [];
    const userCorrections: string[] = [];
    const negativeConstraints: string[] = [];
    const extractedConstraints: Record<string, boolean | string> = {};

    let recentDiscussedTopic = 'General conversation';
    let recentBuildSummary = '';
    let lastUserMessage = '';
    let lastAssistantMessage = '';
    let lastUserTopic = '';
    let conversationMode: 'new' | 'continuation' | 'topic_shift' | 'project_continuation' = 'new';

    // Inspect VFS file names for direct mention in prompt or recent history
    existingFilePaths.forEach(filePath => {
      const fileName = filePath.split('/').pop() || '';
      const baseName = fileName.replace(/\.(tsx?|jsx?|css|html|json)$/, '');

      if (lowerInput.includes(fileName.toLowerCase()) || lowerInput.includes(baseName.toLowerCase())) {
        if (!referencedFiles.includes(filePath)) referencedFiles.push(filePath);
        if (baseName && !referencedComponents.includes(baseName)) referencedComponents.push(baseName);
      }
    });

    // Process history chronologically to extract discussed entities and corrections
    recentHistory.forEach(msg => {
      if (!msg || typeof msg.content !== 'string') return;
      const content = msg.content;
      const lowerContent = content.toLowerCase();
      if (msg.role === 'user') {
        lastUserMessage = content.trim();
        lastUserTopic = content.trim().split(/\s+/).slice(0, 12).join(' ');
      } else if (msg.role === 'assistant' || msg.role === 'model') {
        lastAssistantMessage = content.trim();
      }

      // Extract referenced files from past messages
      existingFilePaths.forEach(filePath => {
        const fileName = filePath.split('/').pop() || '';
        const baseName = fileName.replace(/\.(tsx?|jsx?|css|html|json)$/, '');
        if (lowerContent.includes(fileName.toLowerCase()) || lowerContent.includes(baseName.toLowerCase())) {
          if (!referencedFiles.includes(filePath)) referencedFiles.push(filePath);
          if (baseName && !referencedComponents.includes(baseName)) referencedComponents.push(baseName);
        }
      });

      // Extract UI elements discussed in recent history
      const uiElements = ['button', 'hero', 'header', 'nav', 'navbar', 'footer', 'sidebar', 'card', 'form', 'input', 'modal', 'table', 'chart', 'image', 'avatar', 'banner', 'logo', 'theme', 'menu'];
      uiElements.forEach(elem => {
        if (lowerContent.includes(elem) && !referencedElements.includes(elem)) {
          referencedElements.push(elem);
        }
      });

      // Extract image references (data URLs or http images)
      const imgMatches = content.match(/https?:\/\/[^\s"']+\.(png|jpg|jpeg|svg|webp)|data:image\/[a-zA-Z]+;base64,[^\s"']+/gi);
      if (imgMatches) {
        imgMatches.forEach(img => {
          if (!referencedImages.includes(img)) referencedImages.push(img);
        });
      }

      // Extract user corrections and negative constraints from user messages
      if (msg.role === 'user') {
        const negMatches = content.match(/(?:don't|do not|never|avoid|without|no|shouldn't|should not|does not|doesn't|keep|preserve)\s+([^\.,;\n]+)/gi);
        if (negMatches) {
          negMatches.forEach(m => {
            const cleaned = m.trim();
            if (!userCorrections.includes(cleaned)) userCorrections.push(cleaned);
            if (!negativeConstraints.includes(cleaned)) negativeConstraints.push(cleaned);
          });
        }

        // Specific preservation rules (Scenario 2: "Don't change the navigation")
        if (/don't change (the )?(nav|navigation|menu|header|sidebar)/i.test(lowerContent)) {
          extractedConstraints['PRESERVE_NAVIGATION'] = true;
        }
        if (/don't change (the )?header/i.test(lowerContent)) {
          extractedConstraints['PRESERVE_HEADER'] = true;
        }
        if (/keep (the )?(current )?design/i.test(lowerContent)) {
          extractedConstraints['PRESERVE_DESIGN'] = true;
        }
      }

      // Track recent build status/topic from assistant messages
      if (msg.role === 'assistant' || msg.role === 'system' || msg.role === 'model') {
        if (/compiled|build successful|synthesized|application generation completed|project generated/i.test(content)) {
          recentBuildSummary = content.slice(0, 220);
        }
      }
    });

    // Detect explicit preservation constraints in current prompt
    if (/don't change (the )?(nav|navigation|menu)/i.test(lowerInput)) {
      extractedConstraints['PRESERVE_NAVIGATION'] = true;
    }
    if (/don't change (the )?header/i.test(lowerInput)) {
      extractedConstraints['PRESERVE_HEADER'] = true;
    }
    if (/don't touch (the )?sidebar/i.test(lowerInput)) {
      extractedConstraints['PRESERVE_SIDEBAR'] = true;
    }
    if (/keep (everything else|the rest|the current layout)/i.test(lowerInput)) {
      extractedConstraints['PRESERVE_OTHER_LAYOUT'] = true;
    }

    // 3. Resolve Reference Targets (e.g. "make the button bigger", "make it purple", "fix the image", "change this")
    let activeTargetFile = editorState?.activeFile || referencedFiles[referencedFiles.length - 1];
    let activeTargetComponent = referencedComponents[referencedComponents.length - 1];
    let activeTargetElement = referencedElements[referencedElements.length - 1];

    // Check specific element targets in prompt
    if (/\b(button|btn)\b/i.test(lowerInput)) {
      activeTargetElement = 'button';
      // Search for button component or file in VFS
      const btnFile = existingFilePaths.find(f => /button/i.test(f));
      if (btnFile) activeTargetFile = btnFile;
    } else if (/\b(hero|hero section)\b/i.test(lowerInput)) {
      activeTargetElement = 'hero section';
      const heroFile = existingFilePaths.find(f => /hero/i.test(f));
      if (heroFile) activeTargetFile = heroFile;
    } else if (/\b(header|navigation|navbar|nav)\b/i.test(lowerInput)) {
      activeTargetElement = 'header navigation';
      const headerFile = existingFilePaths.find(f => /header|nav/i.test(f));
      if (headerFile) activeTargetFile = headerFile;
    } else if (/\b(image|picture|photo|banner)\b/i.test(lowerInput)) {
      activeTargetElement = 'image component';
    }

    // Resolve pronouns ("it", "that", "this", "the previous one", "make it better")
    const containsPronoun = /\b(it|that|this|the previous one|the one we just changed)\b/i.test(lowerInput);
    
    let resolvedPromptWithContext = normalizedInput;
    if (containsPronoun || lowerInput === 'make it better' || lowerInput === 'fix it') {
      const targetDesc = activeTargetElement || activeTargetComponent || (activeTargetFile ? activeTargetFile.split('/').pop() : 'recent component');
      resolvedPromptWithContext = `${normalizedInput} [Target: ${targetDesc} in ${activeTargetFile || 'active application'}]`;
    }

    // Identify last modified files in VFS
    const lastModifiedFiles = referencedFiles.length > 0 
      ? referencedFiles 
      : existingFilePaths.filter(f => f.endsWith('.tsx') || f.endsWith('.jsx')).slice(0, 5);

    return {
      sessionId,
      projectId,
      normalizedInput,
      referencedFiles,
      referencedComponents,
      referencedElements,
      referencedImages,
      activeTargetFile,
      activeTargetComponent,
      activeTargetElement,
      extractedConstraints,
      negativeConstraints,
      userCorrections,
      recentDiscussedTopic,
      recentBuildSummary,
      conversationMode,
      lastUserMessage,
      lastAssistantMessage,
      editorActiveFile: editorState?.activeFile,
      lastModifiedFiles,
      resolvedPromptWithContext
    };
  }
}

export const sessionContextResolver = SessionContextResolver.getInstance();
