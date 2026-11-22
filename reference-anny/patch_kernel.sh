sed -i 's|import { intentResolver } from '"'"'./intentResolver'"'"';|import { cognitiveIntentEngine } from '"'"'./cognitiveIntentEngine'"'"';|g' src/core/AnnyCognitiveKernel.ts
sed -i 's|intentResolver.classifyDeepIntent(|cognitiveIntentEngine.buildIntentModel(|g' src/core/AnnyCognitiveKernel.ts
sed -i 's|const deepIntent = cognitiveIntentEngine.buildIntentModel(prompt, input.history || \[\]);|const deepIntent = cognitiveIntentEngine.buildIntentModel(prompt, input.history || []);|g' src/core/AnnyCognitiveKernel.ts
sed -i '/const taskRelationship = /d' src/core/AnnyCognitiveKernel.ts
