const fs = require('fs');
let code = fs.readFileSync('src/AnnyWorkspace.tsx', 'utf8');
const search = `      const res = await fetch("/api/anny/pipeline", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: currentChatId || "workspace_session", prompt: query, history: updatedHistory, requestType: isBuildRequest ? "build" : "chat" }) }); if (!res.ok) throw new Error("API Pipeline Failed"); const orchRes = await res.json();
        sessionId: currentChatId || 'workspace_session',
        userPrompt: query,
        history: updatedHistory,
        requestType: isBuildRequest ? 'build' : 'chat'
      });`;
const replace = `      const res = await fetch("/api/anny/pipeline", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: currentChatId || "workspace_session", prompt: query, history: updatedHistory, requestType: isBuildRequest ? "build" : "chat" }) }); if (!res.ok) throw new Error("API Pipeline Failed"); const orchRes = await res.json();`;
code = code.replace(search, replace);
fs.writeFileSync('src/AnnyWorkspace.tsx', code);
