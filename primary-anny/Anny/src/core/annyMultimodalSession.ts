export type MultimodalInputType = 'TEXT' | 'VOICE' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'FILE' | 'URL';

export interface MultimodalInput {
  id: string;
  type: MultimodalInputType;
  content?: string;
  transcript?: string;
  url?: string;
  buffer?: Buffer;
  mimeType?: string;
  size?: number;
  checksum?: string;
  source?: string;
  localPath?: string;
  createdAt: number;
  organizationId?: string;
  projectId?: string;
  sessionId: string;
  securityClassification?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  provenance: string;
  metadata?: Record<string, any>;
}

export interface DeviceContext {
  hardwareProfile?: any;
  capabilities?: string[];
  os?: string;
}

export interface UIContext {
  currentApplicationId?: string;
  currentAiosWindowId?: string;
  viewportWidth?: number;
  viewportHeight?: number;
}

export interface MultimodalSessionState {
  inputs: MultimodalInput[];
  deviceContext?: DeviceContext;
  uiContext?: UIContext;
  activeVoiceStream?: boolean;
}

export class AnnyMultimodalSessionManager {
  private static instance: AnnyMultimodalSessionManager;
  private sessionStates: Map<string, MultimodalSessionState> = new Map();

  private constructor() {}

  public static getInstance(): AnnyMultimodalSessionManager {
    if (!AnnyMultimodalSessionManager.instance) {
      AnnyMultimodalSessionManager.instance = new AnnyMultimodalSessionManager();
    }
    return AnnyMultimodalSessionManager.instance;
  }

  public getSessionState(sessionId: string): MultimodalSessionState {
    if (!this.sessionStates.has(sessionId)) {
      this.sessionStates.set(sessionId, { inputs: [] });
    }
    return this.sessionStates.get(sessionId)!;
  }

  public addInput(sessionId: string, input: MultimodalInput): void {
    const state = this.getSessionState(sessionId);
    state.inputs.push(input);
  }
}

export const annyMultimodalSessionManager = AnnyMultimodalSessionManager.getInstance();
export const annyMultimodalSession = annyMultimodalSessionManager;
