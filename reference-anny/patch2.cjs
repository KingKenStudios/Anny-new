const fs = require('fs');
let code = fs.readFileSync('src/AnnyWorkspace.tsx', 'utf8');
const lines = code.split('\n');
const fixed = [];
let skip = false;
for (const line of lines) {
  if (line.includes('const res = await fetch("/api/anny/pipeline"')) {
    fixed.push(`      const res = await fetch("/api/anny/pipeline", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: currentChatId || "workspace_session", prompt: query, history: updatedHistory, requestType: isBuildRequest ? "build" : "chat" }) });`);
    fixed.push(`      if (!res.ok) throw new Error("API Pipeline Failed");`);
    fixed.push(`      const orchRes = await res.json();`);
    skip = true;
    continue;
  }
  if (skip) {
    if (line.includes('});')) {
      skip = false;
    }
    continue;
  }
  fixed.push(line);
}
fs.writeFileSync('src/AnnyWorkspace.tsx', fixed.join('\n'));
