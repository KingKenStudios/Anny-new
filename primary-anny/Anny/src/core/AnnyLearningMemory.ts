/**
 * ANNY — CONTINUOUS LEARNING & CROSS-SESSION MEMORY
 *
 * Two deliberately separated learning scopes:
 * 1. PRIVATE: user/session/project memories. These are only retrievable for the same user.
 * 2. GLOBAL: de-identified behavioral/engineering patterns. Raw private prompts are never
 *    copied into the global scope. Only compact, non-sensitive patterns and outcomes are kept.
 *
 * PostgreSQL is the durable store when configured. Kernel callers await write acknowledgements
 * for truthful status reporting, while isolating persistence failures from the user response.
 */
import { getServerPostgresPlatform } from '../services/postgresBridge';

export type LearningScope = 'private' | 'global';
export type LearningType = 'interaction' | 'preference' | 'decision' | 'feedback' | 'outcome' | 'pattern';

export interface LearningRecord {
  id: string;
  ownerUserId: string;
  sessionId: string;
  projectId: string;
  scope: LearningScope;
  type: LearningType;
  content: string;
  topic?: string;
  importance: number;
  source: 'chat' | 'build' | 'api' | 'feedback' | 'system';
  createdAt?: string;
  updatedAt?: string;
}

const MAX_CONTEXT_ITEMS = 12;
const MAX_CONTENT = 1200;

function clean(value: unknown, max = MAX_CONTENT): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function keywords(text: string): string[] {
  return [...new Set(clean(text, 500).toLowerCase().split(/[^a-z0-9_]+/).filter(w => w.length > 3))].slice(0, 12);
}

export class AnnyLearningMemory {
  private static instance: AnnyLearningMemory;
  constructor(private readonly resolvePostgres: typeof getServerPostgresPlatform = getServerPostgresPlatform) {}

  static getInstance(): AnnyLearningMemory {
    if (!this.instance) this.instance = new AnnyLearningMemory();
    return this.instance;
  }

  /** Record private interaction memory. Never promoted to global automatically. */
  async recordPrivate(input: Omit<LearningRecord, 'id' | 'scope' | 'createdAt' | 'updatedAt'>): Promise<boolean> {
    if (!input.ownerUserId || input.ownerUserId === 'anonymous') return false;
    const content = clean(input.content);
    if (!content) return false;
    const pg = await this.resolvePostgres();
    if (!pg) return false;
    await pg.insert('memory_items', {
      owner_user_id: input.ownerUserId,
      session_id: clean(input.sessionId, 160) || 'default_session',
      project_id: clean(input.projectId, 160) || 'default_project',
      scope: 'private',
      type: input.type,
      content,
      topic: clean(input.topic, 180),
      importance: Math.max(0, Math.min(1, input.importance)),
      source: input.source
    } as any);
    return true;
  }

  /** Record a de-identified global pattern. Never pass raw user text here. */
  async recordGlobalPattern(pattern: string, metadata: {
    type?: LearningType;
    source?: LearningRecord['source'];
    topic?: string;
    importance?: number;
  } = {}): Promise<void> {
    const content = clean(pattern, 500);
    if (!content) return;
    const pg = await this.resolvePostgres();
    if (!pg) return;
    await pg.insert('memory_items', {
      owner_user_id: 'global',
      session_id: 'global',
      project_id: 'global',
      scope: 'global',
      type: metadata.type || 'pattern',
      content,
      topic: clean(metadata.topic, 180),
      importance: Math.max(0, Math.min(1, metadata.importance ?? 0.4)),
      source: metadata.source || 'api'
    } as any);
  }

  /** Retrieve private memories across all prior sessions for this same user. */
  async retrieveUserContext(userId: string, prompt: string, projectId?: string): Promise<LearningRecord[]> {
    if (!userId || userId === 'anonymous') return [];
    const terms = keywords(prompt);
    const pg = await this.resolvePostgres();
    if (!pg) return [];
    // Scope is enforced in the database query itself, not after a global row scan.
    const candidates = await pg.queryMemoryItems(userId, 'private', 500);

    return candidates
      .map((r: any) => {
        const content = typeof r.content === 'string' ? r.content : JSON.stringify(r.content ?? '');
        const haystack = `${content} ${r.topic ?? ''} ${r.project_id ?? ''}`.toLowerCase();
        const score = terms.reduce((n, term) => n + (haystack.includes(term) ? 2 : 0), 0)
          + ((projectId && r.project_id === projectId) ? 4 : 0)
          + Number(r.importance ?? 0);
        return { r, content, score };
      })
      .filter((x: any) => x.score > 0 || terms.length === 0)
      .sort((a: any, b: any) => b.score - a.score || String(b.r.created_at ?? '').localeCompare(String(a.r.created_at ?? '')))
      .slice(0, MAX_CONTEXT_ITEMS)
      .map((x: any) => this.toRecord(x.r, x.content));
  }

  /** Retrieve global de-identified patterns without exposing another user's private memory. */
  async retrieveGlobalContext(prompt: string): Promise<LearningRecord[]> {
    const terms = keywords(prompt);
    const pg = await this.resolvePostgres();
    if (!pg) return [];
    // Global patterns are explicitly scoped; private records are never fetched here.
    const rows = await pg.queryMemoryItems('global', 'global', 250);
    return rows
      .map((r: any) => {
        const content = typeof r.content === 'string' ? r.content : JSON.stringify(r.content ?? '');
        const haystack = `${content} ${r.topic ?? ''}`.toLowerCase();
        const score = terms.reduce((n, term) => n + (haystack.includes(term) ? 1 : 0), 0) + Number(r.importance ?? 0);
        return { r, content, score };
      })
      .filter((x: any) => terms.length === 0 || x.score > 0)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 6)
      .map((x: any) => this.toRecord(x.r, x.content));
  }

  /** Learn stable user preferences only from explicit user language, not guesses. */
  async learnExplicitPreference(userId: string, sessionId: string, projectId: string, preference: string): Promise<void> {
    const value = clean(preference, 600);
    if (!value) return;
    await this.recordPrivate({
      ownerUserId: userId,
      sessionId,
      projectId,
      type: 'preference',
      content: value,
      topic: 'user preference',
      importance: 0.9,
      source: 'chat'
    });
  }

  /** Record outcome/feedback privately and optionally aggregate a safe global pattern. */
  async learnOutcome(input: {
    userId: string;
    sessionId: string;
    projectId: string;
    taskType: string;
    success: boolean;
    feedback?: string;
    source?: 'chat' | 'build' | 'api' | 'feedback' | 'system';
  }): Promise<boolean> {
    const result = `${clean(input.taskType, 120)} outcome: ${input.success ? 'successful' : 'failed'}`;
    const privateSaved = await this.recordPrivate({
      ownerUserId: input.userId,
      sessionId: input.sessionId,
      projectId: input.projectId,
      type: 'outcome',
      content: input.feedback ? `${result}. Feedback: ${clean(input.feedback, 500)}` : result,
      topic: input.taskType,
      importance: input.success ? 0.65 : 0.8,
      source: input.source || 'system'
    });

    // Global learning is optional and de-identified; it must not mask a confirmed private write.
    try {
      await this.recordGlobalPattern(`${clean(input.taskType, 100)} execution ${input.success ? 'succeeded' : 'failed'}`, {
        type: 'pattern', source: input.source || 'system', topic: input.taskType, importance: input.success ? 0.35 : 0.5
      });
    } catch (error: any) {
      console.warn('[ANNY Learning] global pattern write skipped:', error?.message || error);
    }
    return privateSaved;
  }

  /** Record a manual rule/memory explicitly added by the user and return its stored record. */
  async addManualMemory(userId: string, content: string, topic = 'Manual Rule', projectId = 'default_project'): Promise<LearningRecord | null> {
    if (!userId || userId === 'anonymous') return null;
    const cleaned = clean(content);
    if (!cleaned) return null;
    const pg = await this.resolvePostgres();
    if (!pg) return null;
    const inserted = await pg.insert('memory_items', {
      owner_user_id: userId,
      session_id: 'manual_memory',
      project_id: clean(projectId, 160) || 'default_project',
      scope: 'private',
      type: 'preference',
      content: cleaned,
      topic: clean(topic, 180) || 'Manual Rule',
      importance: 0.95,
      source: 'feedback',
    } as any);
    return this.toRecord(inserted, cleaned);
  }

  /** Delete an owned private memory entry cleanly. */
  async deletePrivateMemory(userId: string, id: string): Promise<boolean> {
    if (!userId || userId === 'anonymous' || !id) return false;
    const pg = await this.resolvePostgres();
    if (!pg) return false;
    const row = await pg.findById<any>('memory_items', id);
    if (!row) return false;
    const owner = row.owner_user_id ?? row.ownerUserId;
    if (owner !== userId) return false;
    return pg.delete('memory_items', id);
  }

  private toRecord(row: any, content: string): LearningRecord {
    return {
      id: String(row.id),
      ownerUserId: String(row.owner_user_id ?? row.ownerUserId ?? 'global'),
      sessionId: String(row.session_id ?? 'default_session'),
      projectId: String(row.project_id ?? 'default_project'),
      scope: (row.scope ?? 'private') as LearningScope,
      type: (row.type ?? 'interaction') as LearningType,
      content,
      topic: row.topic ? String(row.topic) : undefined,
      importance: Number(row.importance ?? 0.5),
      source: (row.source ?? 'system') as LearningRecord['source'],
      createdAt: row.created_at ?? row.createdAt,
      updatedAt: row.updated_at ?? row.updatedAt
    };
  }
}

export const annyLearningMemory = AnnyLearningMemory.getInstance();
