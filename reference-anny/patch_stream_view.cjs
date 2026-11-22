const fs = require('fs');
let code = fs.readFileSync('src/components/chat/ExecutionStreamView.tsx', 'utf8');

// Remove completed messages display
code = code.replace(/\{completedMessages\.map\(\(msg, idx\) => \([\s\S]*?\}\)\}/g, "");
// Remove current active stage display
code = code.replace(/\{streamState\.isRunning && currentMessage && \([\s\S]*?\}\)\}/g, "");
// Remove footer status bar
code = code.replace(/\{\!streamState\.isRunning && streamState\.currentStatus === 'completed' && \([\s\S]*?\}\)\}/g, "");

fs.writeFileSync('src/components/chat/ExecutionStreamView.tsx', code);
