/**
 * ANNY ENTERPRISE ARCHITECTURE - 4-TIER MEMORY ENGINE & RAG PIPELINE
 * Manages:
 * 1. Working Memory (Active execution variables & task state)
 * 2. Session Memory (Conversation history & current turn state)
 * 3. Project Memory (Files, dependencies, architecture, schemas, decisions)
 * 4. Long-Term Knowledge & Hybrid RAG Retrieval (Qdrant Dense Vector + BM25 Keyword Search + Reciprocal Rank Fusion)
 */

import { qdrantPlatform } from '../services/qdrantPlatform';
import { db, auth } from '../lib/firebase';
import { doc, setDoc, getDoc, collection, getDocs, query, where, serverTimestamp } from 'firebase/firestore';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('ANNY_FIREBASE_ERROR: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface MemoryRecord {
  id: string;
  category: 'working' | 'session' | 'project' | 'long_term';
  key: string;
  value: any;
  timestamp: string;
}

export interface DocumentChunk {
  chunkId: string;
  documentTitle: string;
  text: string;
  chunkIndex: number;
  tokens: number;
  ownerUserId?: string;
}

export interface RAGSearchResult {
  chunkId: string;
  text: string;
  documentTitle: string;
  score: number;
  retrievalSource: 'dense' | 'bm25' | 'rrf_fusion';
}

export class MemoryEngine {
  private static instance: MemoryEngine;
  private workingMemory: Map<string, any> = new Map();
  private sessionMemory: Map<string, any> = new Map();
  private projectMemory: Map<string, any> = new Map();
  private longTermMemory: Map<string, any> = new Map();

  // Structured Cognitive Memory Tiers (9 Categories)
  private factMemory: Map<string, { fact: string; category: string; timestamp: number }> = new Map();
  private preferenceMemory: Map<string, any> = new Map();
  private negativeMemory: Set<string> = new Set();
  private decisionMemory: Map<string, { decision: string; reason: string; alternatives?: string[]; expectedOutcome?: string; actualOutcome?: string; timestamp: number }> = new Map();
  private experienceMemory: Map<string, any> = new Map();
  private failureMemory: Map<string, { error: string; rootCause: string; timestamp: number }> = new Map();
  private successMemory: Map<string, { pattern: string; verificationScore: number }> = new Map();
  private proceduralMemory: Map<string, { procedureName: string; steps: string[]; successRate: number }> = new Map();
  private environmentMemory: Map<string, any> = new Map();

  // In-memory BM25 index for keyword retrieval
  private keywordIndex: Map<string, DocumentChunk> = new Map();

  public static getInstance(): MemoryEngine {
    if (!MemoryEngine.instance) {
      MemoryEngine.instance = new MemoryEngine();
    }
    return MemoryEngine.instance;
  }

  // --- 9 DISTINCT MEMORY CATEGORY ACCESSORS ---
  
  private async syncToCloud(category: string, key: string, value: any) {
    const uid = auth?.currentUser?.uid;
    if (!uid) return;
    try {
      const docId = `${uid}_${category}_${key}`.replace(/[^a-z0-9_]/gi, '_');
      await setDoc(doc(db, 'memory', docId), {
        id: docId,
        userId: uid,
        category,
        key,
        value,
        timestamp: new Date().toISOString(),
        serverTime: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `memory/${category}_${key}`);
    }
  }

  public async loadFromCloud() {
    const uid = auth?.currentUser?.uid;
    if (!uid) return;
    try {
      const q = query(collection(db, 'memory'), where('userId', '==', uid));
      const snapshot = await getDocs(q);
      snapshot.forEach(doc => {
        const data = doc.data();
        const { category, key, value } = data;
        switch (category) {
          case 'fact': this.factMemory.set(key, value); break;
          case 'preference': this.preferenceMemory.set(key, value); break;
          case 'negative': this.negativeMemory.add(key); break;
          case 'decision': this.decisionMemory.set(key, value); break;
          case 'experience': this.experienceMemory.set(key, value); break;
          case 'failure': this.failureMemory.set(key, value); break;
          case 'success': this.successMemory.set(key, value); break;
          case 'procedural': this.proceduralMemory.set(key, value); break;
          case 'environment': this.environmentMemory.set(key, value); break;
        }
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'memory');
    }
  }

  // 1. Fact Memory
  public setFact(key: string, fact: string, category: string = 'general'): void {
    const val = { fact, category, timestamp: Date.now() };
    this.factMemory.set(key, val);
    this.syncToCloud('fact', key, val);
  }
  public getFact(key: string): string | undefined {
    return this.factMemory.get(key)?.fact;
  }
  public getAllFacts(): Array<{ key: string; fact: string; category: string }> {
    return Array.from(this.factMemory.entries()).map(([key, val]) => ({ key, fact: val.fact, category: val.category }));
  }

  // 2. Preference Memory
  public setPreference(key: string, value: any): void {
    this.preferenceMemory.set(key, value);
    this.syncToCloud('preference', key, value);
  }
  public getPreference(key: string): any {
    return this.preferenceMemory.get(key);
  }
  public getAllPreferences(): Record<string, any> {
    const prefs: Record<string, any> = {};
    this.preferenceMemory.forEach((val, key) => { prefs[key] = val; });
    return prefs;
  }

  // 3. Negative Memory
  public addNegativeConstraint(constraint: string): void {
    if (constraint && constraint.trim()) {
      const clean = constraint.trim().toLowerCase();
      this.negativeMemory.add(clean);
      this.syncToCloud('negative', clean, { enabled: true });
    }
  }
  public getNegativeMemory(): string[] {
    return Array.from(this.negativeMemory);
  }

  // 4. Decision Memory
  public recordDecision(key: string, decision: string, reason: string, alternatives?: string[], expectedOutcome?: string, actualOutcome?: string): void {
    const val = { decision, reason, alternatives, expectedOutcome, actualOutcome, timestamp: Date.now() };
    this.decisionMemory.set(key, val);
    this.syncToCloud('decision', key, val);
  }
  public getDecisionMemory(): Array<{ key: string; decision: string; reason: string; alternatives?: string[]; expectedOutcome?: string; actualOutcome?: string; timestamp: number }> {
    return Array.from(this.decisionMemory.entries()).map(([key, val]) => ({
      key,
      ...val
    }));
  }

  // 5. Experience Memory
  public recordExperienceRecord(id: string, record: any): void {
    this.experienceMemory.set(id, record);
  }
  public getExperienceRecords(): any[] {
    return Array.from(this.experienceMemory.values());
  }

  // 6. Failure Memory
  public recordFailure(key: string, error: string, rootCause: string): void {
    const val = { error, rootCause, timestamp: Date.now() };
    this.failureMemory.set(key, val);
    this.syncToCloud('failure', key, val);
  }
  public getFailureMemory(): Array<{ id: string; error: string; rootCause: string; timestamp: number }> {
    return Array.from(this.failureMemory.entries()).map(([id, val]) => ({
      id,
      error: val.error,
      rootCause: val.rootCause,
      timestamp: val.timestamp
    }));
  }

  // 7. Success Memory
  public recordSuccess(key: string, pattern: string, score: number): void {
    const val = { pattern, verificationScore: score };
    this.successMemory.set(key, val);
    this.syncToCloud('success', key, val);
  }
  public getSuccessMemory(): Array<{ key: string; pattern: string; verificationScore: number }> {
    return Array.from(this.successMemory.entries()).map(([key, val]) => ({ key, pattern: val.pattern, verificationScore: val.verificationScore }));
  }

  // 8. Procedural Memory
  public recordProcedure(procedureName: string, steps: string[], successRate: number = 1.0): void {
    const val = { procedureName, steps, successRate };
    this.proceduralMemory.set(procedureName, val);
    this.syncToCloud('procedural', procedureName, val);
  }
  public getProcedure(procedureName: string): { procedureName: string; steps: string[]; successRate: number } | undefined {
    return this.proceduralMemory.get(procedureName);
  }
  public getAllProcedures(): Array<{ procedureName: string; steps: string[]; successRate: number }> {
    return Array.from(this.proceduralMemory.values());
  }

  // 9. Environment Memory
  public setEnvironmentInfo(key: string, info: any): void {
    this.environmentMemory.set(key, info);
  }
  public getEnvironmentInfo(key: string): any {
    return this.environmentMemory.get(key);
  }

  /**
   * Process explicit user corrections ("No", "That's wrong", "I don't like x")
   * and convert them into negative constraints to prevent repeating mistakes.
   */
  public processUserCorrection(userMessage: string): { corrected: boolean; extractedNegative?: string } {
    const trimmed = (userMessage || '').trim().toLowerCase();
    const isCorrection = /^(no|wrong|stop|don't|do not|i don't like|that's wrong|remove|delete|never)\b/i.test(trimmed) ||
                         /\b(i don't like|that's wrong|don't do that|never use|no more|stop using)\b/i.test(trimmed);

    if (isCorrection) {
      const negativeMatch = userMessage.match(/(?:don't|do not|never use|no|stop|remove|delete|i don't like|that's wrong)\s+([^\.,;\n]+)/gi);
      let extracted = '';
      if (negativeMatch) {
        extracted = negativeMatch[0].trim();
        this.addNegativeConstraint(extracted);
      } else {
        extracted = userMessage;
        this.addNegativeConstraint(extracted);
      }
      return { corrected: true, extractedNegative: extracted };
    }

    return { corrected: false };
  }

  // Tier 1: Working Memory (Active execution variables)
  public setWorkingMemory(key: string, value: any): void {
    this.workingMemory.set(key, value);
  }

  public getWorkingMemory(key: string): any {
    return this.workingMemory.get(key);
  }

  // Tier 2: Session Memory (Conversation turn history)
  public setShortTerm(key: string, value: any): void {
    this.sessionMemory.set(key, value);
  }

  public getShortTerm(key: string): any {
    return this.sessionMemory.get(key);
  }

  // Tier 3: Project Memory (Files, dependencies, architecture & decisions)
  public setProjectMemory(key: string, value: any): void {
    this.projectMemory.set(key, value);
  }

  public getProjectMemory(key: string): any {
    return this.projectMemory.get(key);
  }

  public getFullProjectContext(): Record<string, any> {
    const obj: Record<string, any> = {};
    this.projectMemory.forEach((val, key) => { obj[key] = val; });
    return obj;
  }

  // Tier 4: Long-Term Knowledge & Team Preferences
  public setLongTerm(key: string, value: any): void {
    this.longTermMemory.set(key, value);
  }

  public getLongTerm(key: string): any {
    return this.longTermMemory.get(key);
  }

  /**
   * RAG INGESTION PIPELINE
   * Document -> Ingestion -> Text Extraction -> Chunking -> Dense Vector Upsert -> BM25 Index
   */
  public async ingestDocument(
    documentTitle: string,
    rawText: string,
    category: string = 'knowledge_base',
    ownerUserId?: string
  ): Promise<{ chunksIngested: number; totalTokens: number }> {
    // 1. Text Extraction & Cleaning
    const cleanText = rawText.replace(/\r\n/g, '\n').trim();
    if (!cleanText) return { chunksIngested: 0, totalTokens: 0 };

    // 2. Chunking (Fixed size with 50-token overlap)
    const words = cleanText.split(/\s+/);
    const chunkSizeWords = 150;
    const overlapWords = 30;
    const chunks: DocumentChunk[] = [];

    let start = 0;
    let chunkIdx = 0;
    const ownerPrefix = ownerUserId ? `${ownerUserId.replace(/[^a-z0-9]/gi, '_')}_` : '';
    while (start < words.length) {
      const end = Math.min(start + chunkSizeWords, words.length);
      const chunkText = words.slice(start, end).join(' ');
      const chunkId = `doc_${ownerPrefix}${documentTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_chunk_${chunkIdx}`;

      const chunk: DocumentChunk = {
        chunkId,
        documentTitle,
        text: chunkText,
        chunkIndex: chunkIdx,
        tokens: Math.ceil(chunkText.length / 4),
        ownerUserId
      };

      chunks.push(chunk);
      this.keywordIndex.set(chunkId, chunk);

      // Upsert into Qdrant vector database
      await qdrantPlatform.upsertDocument('knowledge_base', chunkText, {
        title: documentTitle,
        category,
        metadata: { chunkId, chunkIndex: chunkIdx, ownerUserId }
      });

      start += (chunkSizeWords - overlapWords);
      chunkIdx++;
    }

    let totalTokens = 0;
    chunks.forEach(c => { totalTokens += c.tokens; });

    return { chunksIngested: chunks.length, totalTokens };
  }

  /**
   * HYBRID RAG RETRIEVAL (Dense Qdrant Vector + BM25 Keyword Search + Reciprocal Rank Fusion)
   */
  public async retrieveRAGContext(query: string, limit: number = 3, ownerUserId?: string): Promise<RAGSearchResult[]> {
    if (!query || !query.trim()) return [];

    // 1. Dense Vector Search via Qdrant
    const vectorResults = await qdrantPlatform.search(
      'knowledge_base',
      query,
      limit * 2,
      undefined,
      undefined,
      ownerUserId
    );

    // 2. BM25 Keyword Search across internal index
    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const bm25Scores: Array<{ chunk: DocumentChunk; score: number }> = [];

    this.keywordIndex.forEach((chunk) => {
      if (ownerUserId && chunk.ownerUserId !== ownerUserId) {
        return;
      }
      const chunkLower = chunk.text.toLowerCase();
      let matches = 0;
      queryTerms.forEach(term => {
        if (chunkLower.includes(term)) matches++;
      });
      if (matches > 0) {
        bm25Scores.push({ chunk, score: matches / queryTerms.length });
      }
    });

    bm25Scores.sort((a, b) => b.score - a.score);

    // 3. Reciprocal Rank Fusion (RRF) Reranking
    const rrfMap: Map<string, { chunkId: string; text: string; documentTitle: string; rrfScore: number }> = new Map();
    const kConstant = 60;

    // Dense RRF
    vectorResults.forEach((vr, rank) => {
      const rrf = 1 / (kConstant + rank + 1);
      rrfMap.set(vr.id, {
        chunkId: vr.id,
        text: vr.content,
        documentTitle: vr.payload?.title || 'Knowledge Base',
        rrfScore: rrf
      });
    });

    // BM25 RRF
    bm25Scores.slice(0, limit * 2).forEach((bm, rank) => {
      const rrf = 1 / (kConstant + rank + 1);
      const existing = rrfMap.get(bm.chunk.chunkId);
      if (existing) {
        existing.rrfScore += rrf;
      } else {
        rrfMap.set(bm.chunk.chunkId, {
          chunkId: bm.chunk.chunkId,
          text: bm.chunk.text,
          documentTitle: bm.chunk.documentTitle,
          rrfScore: rrf
        });
      }
    });

    const finalRAG = Array.from(rrfMap.values())
      .sort((a, b) => b.rrfScore - a.rrfScore)
      .slice(0, limit)
      .map(item => ({
        chunkId: item.chunkId,
        text: item.text,
        documentTitle: item.documentTitle,
        score: Number(item.rrfScore.toFixed(5)),
        retrievalSource: 'rrf_fusion' as const
      }));

    return finalRAG;
  }

  public storeVector(key: string, embedding: number[], data: any): void {
    qdrantPlatform.upsertDocument('knowledge_base', JSON.stringify(data), { title: key }, embedding);
  }

  public getSummaryStats() {
    return {
      workingMemoryCount: this.workingMemory.size,
      sessionMemoryCount: this.sessionMemory.size,
      projectMemoryCount: this.projectMemory.size,
      longTermCount: this.longTermMemory.size,
      keywordIndexChunks: this.keywordIndex.size
    };
  }
}

export const memoryEngine = MemoryEngine.getInstance();
