import { vfsTransactionManager } from './vfsTransactionManager';

export interface VerificationRequest {
  jobId: string;
  workerId: string;
  resultArtifacts: Array<{ path: string; content?: string; hash?: string; expectedMime?: string }>;
  transactionId?: string;
  taskType: string;
}

export interface VerificationResult {
  verified: boolean;
  reason: string;
  artifactsCommitted: number;
}

export class AnnyRemoteResultVerifier {
  private static instance: AnnyRemoteResultVerifier;

  private constructor() {}

  public static getInstance(): AnnyRemoteResultVerifier {
    if (!AnnyRemoteResultVerifier.instance) {
      AnnyRemoteResultVerifier.instance = new AnnyRemoteResultVerifier();
    }
    return AnnyRemoteResultVerifier.instance;
  }

  public async verifyAndCommit(req: VerificationRequest): Promise<VerificationResult> {
    // 1. Basic structural validation
    if (!req.resultArtifacts || req.resultArtifacts.length === 0) {
      return { verified: false, reason: 'No artifacts returned by remote worker.', artifactsCommitted: 0 };
    }

    // 2. Perform mock content analysis (ensure no obvious malicious scripts depending on task type)
    for (const art of req.resultArtifacts) {
      if (art.path.endsWith('.ts') || art.path.endsWith('.js')) {
        if (art.content && (art.content.includes('child_process') || art.content.includes('exec('))) {
          return { verified: false, reason: `Artifact ${art.path} contains unauthorized shell execution.`, artifactsCommitted: 0 };
        }
      }
    }

    // 3. Optional: Hash check (simulated)
    // If worker provided a hash, we'd verify it matches content
    
    // 4. Commit to Canonical Transaction
    if (req.transactionId) {
      try {
        for (const art of req.resultArtifacts) {
          if (art.content) {
            vfsTransactionManager.writeFile(req.transactionId, art.path, art.content);
          }
        }
        // NOTE: We don't call commit() here, the caller (orchestrator) calls commit.
        // We just stage the writes into the VFS transaction buffer securely.
        return { verified: true, reason: 'Artifacts verified and staged to transaction.', artifactsCommitted: req.resultArtifacts.length };
      } catch (err: any) {
        return { verified: false, reason: `VFS staging failed: ${err.message}`, artifactsCommitted: 0 };
      }
    } else {
      // For tasks that don't need VFS mutations (e.g. read-only analysis)
      return { verified: true, reason: 'Artifacts verified (No VFS transaction requested).', artifactsCommitted: 0 };
    }
  }
}

export const annyRemoteResultVerifier = AnnyRemoteResultVerifier.getInstance();
