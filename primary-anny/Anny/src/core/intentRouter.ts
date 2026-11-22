/**
 * ANNY — PRE-LLM INTENT ROUTER ENGINE (VERSION 1.0)
 * Classifies every user request into explicit Execution Modes BEFORE LLM generation.
 * Prevents code dumping in chat and orchestrates Anny Virtual Subsystems.
 */

import { ProjectGenerationEngine, ProjectWorkspace } from './projectGenerationEngine';
import { WorkspaceManager } from './workspaceManager';
import { VirtualFileSystem } from './virtualFileSystem';
import { verificationFramework } from './verificationFramework';
import { imageGenerationEngine } from './imageGenerationEngine';
import { autonomousVerificationPlatform } from './autonomousVerificationPlatform';
import { universalPreviewEngine } from './universalPreviewEngine';
import { universalArtifactEngine } from './universalArtifactEngine';
import { aiProviderPlatform } from '../services/aiProviderPlatform';

export type ExecutionMode =
  | 'conversation'
  | 'project_generation'
  | 'project_modification'
  | 'image_generation'
  | 'bug_fixing'
  | 'refactoring'
  | 'database_design'
  | 'api_generation'
  | 'ui_design'
  | 'testing'
  | 'deployment'
  | 'documentation'
  | 'terminal'
  | 'git'
  | 'infrastructure'
  | 'agent_orchestration';

export interface RouteResult {
  mode: ExecutionMode;
  confidence: number;
  reason: string;
  actionRequired: 'generate_project' | 'modify_project' | 'generate_image' | 'run_terminal' | 'chat_response' | 'agent_task';
}

import { universalExecutionController } from './universalExecutionController';

export class IntentRouterEngine {
  private static instance: IntentRouterEngine;

  public static getInstance(): IntentRouterEngine {
    if (!IntentRouterEngine.instance) {
      IntentRouterEngine.instance = new IntentRouterEngine();
    }
    return IntentRouterEngine.instance;
  }

  public classifyIntent(prompt: string): RouteResult {
    const p = prompt.trim().toLowerCase();

    // 1. Direct Terminal Command Execution
    if (p.startsWith('/') || p.startsWith('npm ') || p.startsWith('git ') || p.startsWith('cd ') || p.startsWith('ls ') || p.startsWith('cat ')) {
      return {
        mode: 'terminal',
        confidence: 0.95,
        reason: 'Direct terminal command or slash directive detected.',
        actionRequired: 'run_terminal'
      };
    }

    // 2. Image Generation Mode (STRICTLY for visual art, logos, photos, drawings - NOT websites/3D/software)
    if ((/generate (a|an)?\s*(logo|illustration|concept art|icon|poster|picture|drawing|photo|portrait|avatar)/i.test(prompt) ||
        /draw (a|an)?\s*(logo|illustration|icon|poster|picture|photo)/i.test(prompt) ||
        /create (a|an)?\s*(logo|icon|illustration|poster|artwork)/i.test(prompt)) &&
        !/website|3d|app|model|code|component|landing|dashboard|store|html|css|react/i.test(prompt)) {
      return {
        mode: 'image_generation',
        confidence: 0.98,
        reason: 'User requested visual image or artwork synthesis.',
        actionRequired: 'generate_image'
      };
    }

    // Check if an active project exists in Virtual FileSystem
    const vfs = WorkspaceManager.getInstance().getVFS();
    const vfsHasCode = vfs.exists('/src/App.tsx') && vfs.readFile('/src/App.tsx').trim().length > 30;
    const isExplicitReset = /start a new project|rebuild from scratch|create a new project|fresh project|reset workspace|clear project/i.test(p);

    if (vfsHasCode && !isExplicitReset) {
      return {
        mode: 'project_modification',
        confidence: 0.99,
        reason: 'Active project code detected in workspace VFS. Routing instruction to incremental project modification.',
        actionRequired: 'generate_project'
      };
    }

    // 3. Project Generation Mode (Websites, 3D Models, Applications, UIs, Dashboards)
    if (/^(build|create|generate|make|develop|construct|setup|scaffold|design)\s+/i.test(prompt) ||
        /3d|website|app|e-commerce|ecommerce|store|shop|shoe|apexbank|keda|scada|rest api|financial operating system|ken pay|facebook|netflix|google ai studio|erp|todo|crm|saas|calculator|portfolio|simulation|dashboard|landing page|ui mockup|prototype|model|component/i.test(prompt)) {
      return {
        mode: 'project_generation',
        confidence: 0.98,
        reason: 'User requested building or generating a real functional software project, website, 3D model, or application.',
        actionRequired: 'generate_project'
      };
    }

    // 3. Project Modification
    if (/add (feature|page|button|component|route|endpoint)|update (code|file|component)|modify/i.test(p)) {
      return {
        mode: 'project_modification',
        confidence: 0.92,
        reason: 'Request to update existing project workspace code.',
        actionRequired: 'modify_project'
      };
    }

    // 4. Bug Fixing
    if (/fix (bug|error|crash|issue)|debug|resolve error|type error/i.test(p)) {
      return {
        mode: 'bug_fixing',
        confidence: 0.90,
        reason: 'Bug fix or code error resolution request.',
        actionRequired: 'modify_project'
      };
    }

    // 5. Refactoring
    if (/refactor|optimize code|clean up code|rewrite function/i.test(p)) {
      return {
        mode: 'refactoring',
        confidence: 0.88,
        reason: 'Code refactoring and optimization request.',
        actionRequired: 'modify_project'
      };
    }

    // 6. Database Design
    if (/database|schema|migration|prisma|drizzle|sql table|firestore collection/i.test(p)) {
      return {
        mode: 'database_design',
        confidence: 0.88,
        reason: 'Database schema modeling request.',
        actionRequired: 'modify_project'
      };
    }

    // 7. API Generation
    if (/create (api|endpoint|route|graphql|rest)|backend route/i.test(p)) {
      return {
        mode: 'api_generation',
        confidence: 0.88,
        reason: 'API route creation request.',
        actionRequired: 'modify_project'
      };
    }

    // 8. UI Design
    if (/ui design|theme|tailwind styling|component layout|dark mode|css/i.test(p)) {
      return {
        mode: 'ui_design',
        confidence: 0.85,
        reason: 'Visual UI styling and layout request.',
        actionRequired: 'modify_project'
      };
    }

    // 9. Testing
    if (/test|unit test|jest|vitest|playwright|e2e/i.test(p)) {
      return {
        mode: 'testing',
        confidence: 0.85,
        reason: 'Test suite generation or execution.',
        actionRequired: 'modify_project'
      };
    }

    // 10. Deployment
    if (/deploy|build production|cloud run|docker|kubernetes|ci\/cd/i.test(p)) {
      return {
        mode: 'deployment',
        confidence: 0.90,
        reason: 'Build and deployment pipeline trigger.',
        actionRequired: 'agent_task'
      };
    }

    // 11. Documentation
    if (/document|readme|jsdoc|api docs/i.test(p)) {
      return {
        mode: 'documentation',
        confidence: 0.82,
        reason: 'Documentation synthesis request.',
        actionRequired: 'chat_response'
      };
    }

    // 12. Git
    if (/git commit|git push|pull request|branch/i.test(p)) {
      return {
        mode: 'git',
        confidence: 0.90,
        reason: 'Version control action.',
        actionRequired: 'run_terminal'
      };
    }

    // 13. Infrastructure / SCADA
    if (/scada|plc|loto|industrial|modbus|sensor/i.test(p)) {
      return {
        mode: 'infrastructure',
        confidence: 0.85,
        reason: 'Industrial automation & infrastructure directive.',
        actionRequired: 'agent_task'
      };
    }

    // 14. Multi-Agent Orchestration
    if (/orchestrate|multi-agent|spawn agent|delegate task/i.test(p)) {
      return {
        mode: 'agent_orchestration',
        confidence: 0.88,
        reason: 'Multi-agent orchestration request.',
        actionRequired: 'agent_task'
      };
    }

    // 15. Default Conversation
    return {
      mode: 'conversation',
      confidence: 0.95,
      reason: 'General Q&A or discussion prompt.',
      actionRequired: 'chat_response'
    };
  }

  /**
   * Orchestrates prompt handling through Anny Subsystems BEFORE calling standard LLM completion.
   */
  public async handleRoutedRequest(
    prompt: string,
    onLogUpdate: (log: string) => void,
    onProjectCreated?: (workspace: ProjectWorkspace) => void
  ): Promise<{ handledByEngine: boolean; messageResponse?: string }> {
    const route = this.classifyIntent(prompt);
    onLogUpdate(`Processing request intent: ${route.mode}`);

    if (route.actionRequired === 'generate_image' || route.actionRequired === 'generate_project' || route.actionRequired === 'modify_project') {
      const uecResult = await universalExecutionController.executeRequest(prompt, onLogUpdate);
      return {
        handledByEngine: uecResult.handledByController,
        messageResponse: uecResult.messageResponse
      };
    }

    if (route.actionRequired === 'run_terminal') {
      onLogUpdate(`💻 Terminal-like input detected: '${prompt}'`);
      return {
        handledByEngine: true,
        messageResponse: `\`\`\`\nArbitrary terminal command execution is not implemented in this chat interface.\nUse the Terminal panel in the Studio workspace for real command support.\n\`\`\``
      };
    }

    // Default to LLM conversation
    return {
      handledByEngine: false
    };
  }
}

export const intentRouter = IntentRouterEngine.getInstance();
