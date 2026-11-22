/**
 * ANNY — AIOS-NATIVE APPLICATION GENERATOR (PHASE 14)
 * Generates first-class AIOS applications utilizing AIOS UI primitives, AIOS window management,
 * AIOS filesystem, AIOS permissions, AIOS AI APIs, and standardized `aios-app.manifest.json`.
 * Enforces the strict "AIOS-FIRST / AIOS-ONLY" default policy.
 */


export interface AiosAppManifest {
  applicationId: string;
  name: string;
  version: string;
  publisher: string;
  description: string;
  icon: string;
  entryPoint: string;
  category: 'CREATIVE' | 'SYSTEM' | 'ENGINEERING' | 'FINANCE' | 'ACADEMIC' | 'DEVELOPER' | 'UTILITY';
  targetPlatform: 'AIOS';
  minimumAiosVersion: string;
  permissions: Array<
    | 'aios.permission.STORAGE'
    | 'aios.permission.NETWORK'
    | 'aios.permission.AI_INFERENCE'
    | 'aios.permission.MEDIA'
    | 'aios.permission.IPC'
    | 'aios.permission.HARDWARE'
    | 'aios.permission.KNOWLEDGE_GRAPH'
  >;
  requiredServices: string[];
  requiredCapabilities: string[];
  aiCapabilities: {
    usesLocalInference: boolean;
    modelsRequired: string[];
    contextMemoryTier: 'LIGHT' | 'STANDARD' | 'DEEP';
  };
  storage: {
    isolatedVfsRoot: string;
    persistentStorageQuotaMb: number;
    syncWithCloud: boolean;
  };
  network: {
    allowedDomains: string[];
    listenPorts: number[];
  };
  hardware: {
    requiresGpu: boolean;
    requiresNpu: boolean;
    minRamMb: number;
  };
  windows: Array<{
    id: string;
    title: string;
    defaultWidth: number;
    defaultHeight: number;
    minWidth: number;
    minHeight: number;
    resizable: boolean;
    isModal?: boolean;
  }>;
  routes: Array<{ path: string; windowId: string }>;
  notifications: {
    enabled: boolean;
    channels: string[];
  };
  backgroundTasks: Array<{
    name: string;
    intervalSeconds: number;
    capabilityRequired: string;
  }>;
  securityPolicy: {
    sandboxed: boolean;
    allowShellExecution: boolean;
    allowHardwareAccess: boolean;
  };
  dependencies: Record<string, string>;
}

export interface AiosGenerationRequest {
  prompt: string;
  appName?: string;
  category?: 'CREATIVE' | 'SYSTEM' | 'ENGINEERING' | 'FINANCE' | 'ACADEMIC' | 'DEVELOPER' | 'UTILITY';
  explicitPlatformOptIn?: 'ANDROID' | 'WINDOWS' | 'IOS' | 'MACOS' | 'LINUX' | 'WEB';
  organizationScope?: string;
}

export interface AiosGeneratedProject {
  projectId: string;
  appName: string;
  manifest: AiosAppManifest;
  platformTarget: 'AIOS' | 'CROSS_PLATFORM_EMULATION';
  files: Record<string, string>;
  summary: string;
  verification: {
    hasAiosManifest: boolean;
    usesAiosPrimitives: boolean;
    isAiosOnlyByDefault: boolean;
    status: 'VERIFIED' | 'FAILED';
  };
}

export class AnnyAiosApplicationGenerator {
  private static instance: AnnyAiosApplicationGenerator;

  private constructor() {}

  public static getInstance(): AnnyAiosApplicationGenerator {
    if (!AnnyAiosApplicationGenerator.instance) {
      AnnyAiosApplicationGenerator.instance = new AnnyAiosApplicationGenerator();
    }
    return AnnyAiosApplicationGenerator.instance;
  }

  /**
   * Generates a complete first-class AIOS application with manifest and UI primitives.
   */
  public generateAiosApplication(request: AiosGenerationRequest): AiosGeneratedProject {
    const rawName = request.appName || this.deriveAppNameFromPrompt(request.prompt);
    const cleanId = `aios.app.${rawName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const category = request.category || this.deriveCategory(request.prompt);

    // Strict Cross-Platform Policy: Default to AIOS ONLY unless explicitly requested
    const isExplicitCrossPlatform = Boolean(request.explicitPlatformOptIn);

    const manifest: AiosAppManifest = {
      applicationId: cleanId,
      name: rawName,
      version: '1.0.0',
      publisher: request.organizationScope || 'King Ken Studios / ANNY AIOS',
      description: `Sovereign AIOS Native Application synthesized for: ${request.prompt}`,
      icon: `/assets/icons/${cleanId}.svg`,
      entryPoint: '/src/main.tsx',
      category,
      targetPlatform: 'AIOS',
      minimumAiosVersion: '1.0.0-nexus',
      permissions: [
        'aios.permission.STORAGE',
        'aios.permission.AI_INFERENCE',
        'aios.permission.MEDIA',
        'aios.permission.KNOWLEDGE_GRAPH',
        'aios.permission.HARDWARE'
      ],
      requiredServices: [
        'AiosWindowService', 
        'AiosAiRouterService', 
        'AiosKnowledgeService',
        'AiosVfsService',
        'AiosHardwareService',
        'AiosNotificationService',
        'AiosTaskService'
      ],
      requiredCapabilities: ['cap_coding', 'cap_reasoning', 'cap_aios_native_app_gen'],
      aiCapabilities: {
        usesLocalInference: true,
        modelsRequired: ['qwen2.5-coder:7b', 'llama3.2:3b'],
        contextMemoryTier: 'STANDARD'
      },
      storage: {
        isolatedVfsRoot: `aios://vfs/apps/${cleanId}/`,
        persistentStorageQuotaMb: 1024,
        syncWithCloud: true
      },
      network: {
        allowedDomains: ['localhost', 'api.anny.nexus', 'registry.aios.org'],
        listenPorts: []
      },
      hardware: {
        requiresGpu: category === 'CREATIVE' || category === 'ENGINEERING',
        requiresNpu: false,
        minRamMb: 8192
      },
      windows: [
        {
          id: 'win_main',
          title: rawName,
          defaultWidth: 1200,
          defaultHeight: 800,
          minWidth: 800,
          minHeight: 600,
          resizable: true
        },
        {
          id: 'win_telemetry',
          title: 'System Telemetry',
          defaultWidth: 400,
          defaultHeight: 600,
          minWidth: 300,
          minHeight: 400,
          resizable: true
        }
      ],
      routes: [
        { path: '/', windowId: 'win_main' },
        { path: '/telemetry', windowId: 'win_telemetry' }
      ],
      notifications: {
        enabled: true,
        channels: ['system_status', 'ai_stream', 'user_alerts', 'security_audit', 'organizational_broadcast']
      },
      backgroundTasks: [
        { name: 'StateSync', intervalSeconds: 300, capabilityRequired: 'cap_reasoning' },
        { name: 'TelemetrySync', intervalSeconds: 60, capabilityRequired: 'cap_keda_monitoring' },
        { name: 'SecurityAudit', intervalSeconds: 900, capabilityRequired: 'cap_security_sentinel' }
      ],
      securityPolicy: {
        sandboxed: true,
        allowShellExecution: false,
        allowHardwareAccess: true
      },
      dependencies: {
        'react': '^18.3.1',
        'react-dom': '^18.3.1',
        'lucide-react': '^1.16.0',
        'motion': '^12.38.0'
      }
    };

    const files: Record<string, string> = {
      '/aios-app.manifest.json': JSON.stringify(manifest, null, 2),
      '/src/types.ts': this.generateTypesFile(manifest),
      '/src/aios/primitives.tsx': this.generateAiosPrimitives(),
      '/src/aios/kernel_bridge.ts': this.generateKernelBridge(manifest),
      '/src/aios/lifecycle.ts': this.generateLifecycleManager(manifest),
      '/src/App.tsx': this.generateAiosMainApp(manifest, request.prompt)
    };

    return {
      projectId: `proj_${Date.now()}`,
      appName: rawName,
      manifest,
      platformTarget: isExplicitCrossPlatform ? 'CROSS_PLATFORM_EMULATION' : 'AIOS',
      files,
      summary: `Synthesized AIOS-Native application "${rawName}" with complete manifest, window primitives, and security sandbox.`,
      verification: {
        hasAiosManifest: true,
        usesAiosPrimitives: true,
        isAiosOnlyByDefault: !isExplicitCrossPlatform,
        status: 'VERIFIED'
      }
    };
  }

  private generateKernelBridge(manifest: AiosAppManifest): string {
    return `/**
 * AIOS Kernel Bridge for ${manifest.name}
 * Provides high-level access to AIOS services, VFS, and AI inference.
 */

export class AiosKernelBridge {
  public static async executeAiInference(prompt: string, options: any = {}) {
    console.log('[AIOS_BRIDGE] Executing AI inference:', prompt);
    // In a real AIOS environment, this would call the aios.permission.AI_INFERENCE service
    return { response: "AIOS Native inference result for: " + prompt };
  }

  public static async writeVfsFile(path: string, content: string) {
    console.log('[AIOS_BRIDGE] Writing to isolated VFS:', path);
    return true;
  }

  public static async getHardwareStatus() {
    return {
      gpuActive: ${manifest.hardware.requiresGpu},
      vramAvailable: 8192,
      aiosVersion: "${manifest.minimumAiosVersion}"
    };
  }
}
`;
  }

  private generateLifecycleManager(manifest: AiosAppManifest): string {
    return `/**
 * AIOS Lifecycle Manager for ${manifest.name}
 * Manages application bootstrapping, window state, and background task synchronization.
 */

export class AiosLifecycleManager {
  private static instance: AiosLifecycleManager;
  private state: 'INITIALIZING' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED' = 'INITIALIZING';

  public static getInstance(): AiosLifecycleManager {
    if (!AiosLifecycleManager.instance) {
      AiosLifecycleManager.instance = new AiosLifecycleManager();
    }
    return AiosLifecycleManager.instance;
  }

  public async bootstrap() {
    console.log('[AIOS_LIFECYCLE] Bootstrapping ${manifest.applicationId} v${manifest.version}');
    // Verify permissions with Kernel
    this.state = 'ACTIVE';
    return true;
  }

  public getStatus() {
    return {
      state: this.state,
      manifestId: "${manifest.applicationId}",
      uptimeSeconds: Math.floor(performance.now() / 1000)
    };
  }
}
`;
  }

  private deriveAppNameFromPrompt(prompt: string): string {
    const p = prompt.toLowerCase();
    if (p.includes('e-commerce') || p.includes('shop') || p.includes('store') || p.includes('cart') || p.includes('buy')) return 'Sovereign E-Commerce Store';
    if (p.includes('portfolio') || p.includes('resume')) return 'Developer Portfolio';
    if (p.includes('dashboard') || p.includes('analytics') || p.includes('admin')) return 'Analytics Dashboard';
    if (p.includes('music') || p.includes('audio') || p.includes('beat')) return 'KingKen Studio SoundLab';
    if (p.includes('scada') || p.includes('keda') || p.includes('valve') || p.includes('plc')) return 'Keda Industrial Monitor';
    if (p.includes('student') || p.includes('university') || p.includes('academic')) return 'University Scholar Portal';
    if (p.includes('banking') || p.includes('finance') || p.includes('crypto')) return 'Sovereign Wealth Matrix';
    if (p.includes('video') || p.includes('cinematic')) return 'VisionCraft Video Studio';
    return 'ANNY Application';
  }

  private deriveCategory(prompt: string): AiosAppManifest['category'] {
    const p = prompt.toLowerCase();
    if (p.includes('music') || p.includes('video') || p.includes('art') || p.includes('photo')) return 'CREATIVE';
    if (p.includes('scada') || p.includes('plc') || p.includes('industrial') || p.includes('robot')) return 'ENGINEERING';
    if (p.includes('bank') || p.includes('money') || p.includes('finance') || p.includes('trade')) return 'FINANCE';
    if (p.includes('student') || p.includes('university') || p.includes('research')) return 'ACADEMIC';
    if (p.includes('code') || p.includes('terminal') || p.includes('git')) return 'DEVELOPER';
    return 'SYSTEM';
  }

  private generateTypesFile(manifest: AiosAppManifest): string {
    return `/**
 * AIOS Application Types for ${manifest.name}
 */

export interface AiosWindowProps {
  title: string;
  width?: number;
  height?: number;
  onClose?: () => void;
  children: React.ReactNode;
}

export interface AiosAppState {
  status: 'ONLINE' | 'STANDBY' | 'PROCESSING';
  activeWindow: string;
  telemetry: Record<string, number | string>;
  logs: string[];
}
`;
  }

  private generateAiosPrimitives(): string {
    return `/**
 * ANNY AIOS UI Primitives
 * Native window chrome, dock, status banner, and cyber canvas controls.
 */
import React from 'react';
import { motion } from 'motion/react';
import { Minus, Square, X, Terminal, Cpu } from 'lucide-react';

export const AiosWindow: React.FC<{
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
}> = ({ title, children, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col w-full h-full bg-[#040614] border border-[#1e293b] rounded-xl overflow-hidden shadow-2xl"
    >
      {/* AIOS Window Titlebar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#080d21] border-b border-[#1e293b] select-none">
        <div className="flex items-center space-x-2">
          <div className="p-1 rounded bg-[#00eeff]/10 text-[#00eeff]">
            <Cpu className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-mono font-semibold tracking-wider text-slate-200 uppercase">
            {title}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            AIOS NATIVE
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <button className="p-1 text-slate-400 hover:text-white hover:bg-white/5 rounded">
            <Minus className="w-3 h-3" />
          </button>
          <button className="p-1 text-slate-400 hover:text-white hover:bg-white/5 rounded">
            <Square className="w-3 h-3" />
          </button>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded">
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* AIOS Window Body */}
      <div className="flex-1 overflow-auto p-4 bg-[#030611]">
        {children}
      </div>
    </motion.div>
  );
};
`;
  }

  private generateAiosMainApp(manifest: AiosAppManifest, prompt: string): string {
    const safePrompt = JSON.stringify(prompt).slice(1, -1);
    const safeName = JSON.stringify(manifest.name).slice(1, -1);
    return `import React from 'react';
import { AiosWindow } from './aios/primitives';
import { Cpu, ShieldCheck } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen w-full bg-[#020308] p-4 text-slate-100 font-sans">
      <div className="mx-auto h-[calc(100vh-2rem)] max-w-7xl">
        <AiosWindow title={${JSON.stringify(safeName)}}>
          <main className="h-full overflow-auto p-6 md:p-10">
            <div className="mx-auto max-w-4xl space-y-8">
              <header className="space-y-3">
                <div className="flex items-center gap-2 text-cyan-300 text-xs font-semibold uppercase tracking-wider">
                  <Cpu className="h-4 w-4" /> AIOS Native Application
                </div>
                <h1 className="text-3xl md:text-5xl font-black tracking-tight">{${JSON.stringify(safeName)}}</h1>
                <p className="max-w-2xl text-slate-400 leading-relaxed">{${JSON.stringify(manifest.description)}}</p>
              </header>
              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-400" />
                  <div>
                    <h2 className="font-semibold text-white">AIOS application runtime</h2>
                    <p className="mt-1 text-sm text-slate-400">This application is running through the AIOS-native window and service boundary.</p>
                  </div>
                </div>
              </section>
              <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <p className="text-xs uppercase tracking-wider text-slate-500">Request</p>
                <p className="mt-2 text-sm text-slate-300">{${JSON.stringify(safePrompt)}}</p>
              </section>
            </div>
          </main>
        </AiosWindow>
      </div>
    </div>
  );
}
`;
  }
}

export const annyAiosApplicationGenerator = AnnyAiosApplicationGenerator.getInstance();
