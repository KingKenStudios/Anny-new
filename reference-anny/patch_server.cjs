const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/const result = await aiBrain.execute\(\{[^]*?\}\);/g, `
      const { modelRouter } = await import('./src/core/modelRouter.js');
      const route = modelRouter.selectRoute({ taskCategory: 'general' });
      const aiResponse = await modelRouter.executeRoutedChat([{ role: 'user', content: req.body.prompt || req.body.query }], route);
      const result = { response: aiResponse.content };
`);
code = code.replace(/const result = await annyOrchestrator.handleRequest\(prompt, projectId, history, images\);/g, `
      const { annyCognitiveKernel } = await import('./src/core/AnnyCognitiveKernel.js');
      const result = await annyCognitiveKernel.executePipeline({
        sessionId: projectId || 'default',
        userPrompt: prompt,
        history,
        images
      });
`);

fs.writeFileSync('server.ts', code);
