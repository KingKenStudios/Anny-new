/**
 * Utility functions for Neural Sessions classification, tagging, and archival export.
 */

export type SessionTag = 'Technical' | 'General' | 'Diagnostic';

export function classifySessionTag(messages: any[] = []): SessionTag {
  if (!messages || messages.length === 0) return 'General';
  
  const fullText = messages
    .map((m) => (typeof m.content === 'string' ? m.content : ''))
    .join(' ')
    .toLowerCase();

  // Diagnostic / System keywords
  const isDiagnostic = /diagnostic|liveness|ros|scada|sensor|telemetry|audit|hardware|metric|system error|safety check|fault|actuator/i.test(fullText);
  if (isDiagnostic) return 'Diagnostic';

  // Technical / Code / App Building keywords
  const isTechnical = /```|code|build|app|website|react|typescript|python|javascript|express|api|sql|database|component|function|script|deploy|modly|3d model|canvas/i.test(fullText);
  if (isTechnical) return 'Technical';

  return 'General';
}

export function getRelativeTimeFromSession(session: { date?: string; updatedAt?: string; timestamp?: string | number; messages?: any[] }): string {
  let timeVal: number | null = null;

  // Try latest message timestamp
  if (session.messages && session.messages.length > 0) {
    const lastMsg = session.messages[session.messages.length - 1];
    const ts = lastMsg.timestamp || lastMsg.createdAt || lastMsg.created_at || lastMsg.date;
    if (ts) {
      const parsed = typeof ts === 'number' ? ts : new Date(ts).getTime();
      if (!isNaN(parsed)) timeVal = parsed;
    }
  }

  // Fallback to session level timestamp/date
  if (!timeVal) {
    const sessionTs = session.updatedAt || session.date || session.timestamp;
    if (sessionTs) {
      const parsed = typeof sessionTs === 'number' ? sessionTs : new Date(sessionTs).getTime();
      if (!isNaN(parsed)) timeVal = parsed;
    }
  }

  if (!timeVal) return 'Just now';

  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - timeVal) / 1000));

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth} month${diffMonth > 1 ? 's' : ''} ago`;
  const diffYear = Math.floor(diffDay / 365);
  return `${diffYear} year${diffYear > 1 ? 's' : ''} ago`;
}

export function exportSessionAsJson(session: { id: string; title: string; date?: string; messages: any[] }) {
  const data = {
    id: session.id,
    title: session.title || 'Neural Session',
    exportedAt: new Date().toISOString(),
    tag: classifySessionTag(session.messages),
    messageCount: session.messages?.length || 0,
    messages: (session.messages || []).map((m: any) => ({
      role: m.role,
      content: m.content,
      id: m.id,
      timestamp: m.timestamp || new Date().toISOString(),
    })),
  };

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `neural_session_${session.id.slice(0, 8)}_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportSessionAsTxt(session: { id: string; title: string; date?: string; messages: any[] }) {
  let txt = `====================================================\n`;
  txt += `ANNY - NEURAL SESSION ARCHIVE\n`;
  txt += `Title: ${session.title || 'Neural Session'}\n`;
  txt += `Session ID: ${session.id}\n`;
  txt += `Classification: ${classifySessionTag(session.messages)}\n`;
  txt += `Exported: ${new Date().toLocaleString()}\n`;
  txt += `Message Count: ${session.messages?.length || 0}\n`;
  txt += `====================================================\n\n`;

  (session.messages || []).forEach((m: any, idx: number) => {
    const sender = m.role === 'user' ? 'OPERATOR (User)' : 'ANNY (Bot)';
    txt += `[${idx + 1}] ${sender}:\n${m.content}\n\n----------------------------------------------------\n\n`;
  });

  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `neural_session_${session.id.slice(0, 8)}_${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
