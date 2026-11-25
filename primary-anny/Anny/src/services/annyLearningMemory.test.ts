import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { AnnyLearningMemory } from '../core/AnnyLearningMemory.ts';

const privateInput = {
  ownerUserId: 'user-a',
  sessionId: 'session-a',
  projectId: 'project-a',
  type: 'interaction' as const,
  content: 'I prefer concise electrical engineering examples',
  topic: 'response preference',
  importance: 0.8,
  source: 'chat' as const,
};

describe('AnnyLearningMemory persistence and tenant scoping', () => {
  test('reports a private write only after the store insert resolves', async () => {
    const writes: Array<{ table: string; record: any }> = [];
    const store = {
      insert: async (table: string, record: any) => {
        writes.push({ table, record });
        return { id: 'stored-1', ...record };
      },
      queryMemoryItems: async () => [],
    };
    const memory = new AnnyLearningMemory(async () => store as any);

    assert.equal(await memory.recordPrivate(privateInput), true);
    assert.equal(writes.length, 1);
    assert.equal(writes[0].table, 'memory_items');
    assert.equal(writes[0].record.owner_user_id, 'user-a');
    assert.equal(writes[0].record.scope, 'private');
    assert.equal(writes[0].record.content, privateInput.content);
  });

  test('does not resolve storage for anonymous users and reports unavailable storage as false', async () => {
    let resolverCalls = 0;
    const memory = new AnnyLearningMemory(async () => {
      resolverCalls += 1;
      return null;
    });

    assert.equal(await memory.recordPrivate({ ...privateInput, ownerUserId: 'anonymous' }), false);
    assert.equal(resolverCalls, 0);
    assert.equal(await memory.recordPrivate(privateInput), false);
    assert.equal(resolverCalls, 1);
  });

  test('propagates a failed private insert so the kernel can report it accurately', async () => {
    const store = {
      insert: async () => {
        throw new Error('database unavailable');
      },
      queryMemoryItems: async () => [],
    };
    const memory = new AnnyLearningMemory(async () => store as any);

    await assert.rejects(memory.recordPrivate(privateInput), /database unavailable/);
  });

  test('retrieves private and global memories using exact owner and scope queries', async () => {
    const calls: Array<{ owner: string; scope: string; limit: number }> = [];
    const store = {
      queryMemoryItems: async (owner: string, scope: 'private' | 'global', limit: number) => {
        calls.push({ owner, scope, limit });
        return [{
          id: `memory-${owner}`,
          owner_user_id: owner,
          session_id: 'session-a',
          project_id: 'project-a',
          scope,
          type: scope === 'private' ? 'preference' : 'pattern',
          content: 'Electrical engineering examples',
          topic: 'engineering',
          importance: 0.8,
          source: 'chat',
        }];
      },
      insert: async () => ({}),
    };
    const memory = new AnnyLearningMemory(async () => store as any);

    const privateRecords = await memory.retrieveUserContext('user-a', 'electrical engineering');
    const globalRecords = await memory.retrieveGlobalContext('electrical engineering');

    assert.deepEqual(calls, [
      { owner: 'user-a', scope: 'private', limit: 500 },
      { owner: 'global', scope: 'global', limit: 250 },
    ]);
    assert.equal(privateRecords[0]?.ownerUserId, 'user-a');
    assert.equal(privateRecords[0]?.scope, 'private');
    assert.equal(globalRecords[0]?.ownerUserId, 'global');
    assert.equal(globalRecords[0]?.scope, 'global');
  });

  test('keeps a confirmed private outcome when optional global aggregation fails', async () => {
    const writes: any[] = [];
    const store = {
      insert: async (_table: string, record: any) => {
        writes.push(record);
        if (record.scope === 'global') throw new Error('global aggregation unavailable');
        return { id: 'private-outcome-1', ...record };
      },
      queryMemoryItems: async () => [],
    };
    const memory = new AnnyLearningMemory(async () => store as any);

    const saved = await memory.learnOutcome({
      userId: 'user-a',
      sessionId: 'session-a',
      projectId: 'project-a',
      taskType: 'software engineering',
      success: true,
      source: 'chat',
    });

    assert.equal(saved, true);
    assert.equal(writes.filter(record => record.scope === 'private').length, 1);
    assert.equal(writes.filter(record => record.scope === 'global').length, 1);
  });
});
