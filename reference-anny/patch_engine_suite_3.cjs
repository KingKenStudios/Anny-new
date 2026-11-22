const fs = require('fs');

let eCode = fs.readFileSync('src/core/AnnyEnterprisePreventiveIntelligenceEngine.ts', 'utf8');

eCode = eCode.replace(
  /public generateMitigationStrategies\(opportunity: PreventionOpportunity\): PreventiveMitigationStrategy\[\] \{/g,
  `public generateMitigationStrategies(opportunity: PreventionOpportunity): PreventiveMitigationStrategy[] {
    try {
       AnnyOperationalReliabilityIntelligenceEngine.getInstance();
       AnnyReliabilityLearningIntelligenceEngine.getInstance();
       AnnyEnterpriseResilienceOrchestrationEngine.getInstance();
       AnnyEnterpriseContinuityIntelligenceEngine.getInstance();
       AnnyEnterpriseCrisisPredictionIntelligenceEngine.getInstance();
       AnnyEnterpriseCrisisIntelligenceEngine.getInstance();
    } catch(e) {}
  `
);

fs.writeFileSync('src/core/AnnyEnterprisePreventiveIntelligenceEngine.ts', eCode);
console.log("Patched files successfully.");
