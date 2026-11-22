const fs = require('fs');

let eCode = fs.readFileSync('src/core/AnnyEnterprisePreventiveIntelligenceEngine.ts', 'utf8');

// Fix executeIntervention
eCode = eCode.replace(
  /execEngine\.createExecutionPlan\(\{[\s\S]*?\}\);/g,
  `execEngine.createExecutionPlan({
           actionCandidateId: \`exec_\${plan.planId}\`,
           organization: 'keda' as any,
           executingOrganization: 'keda' as any,
           environment: 'PRODUCTION' as any,
           requiredCapabilities: [],
           requiredResources: plan.resourceRequirements,
           riskLevel: 'HIGH' as any,
           autonomyLevel: plan.autonomyLevel,
           expectedOutcome: plan.expectedOutcome,
           steps: []
        });`
);

// Fix escalateToCrisisCommand
eCode = eCode.replace(
  /crisisEngine\.detectAndDeclareCrisis\(\{[\s\S]*?\}\);/g,
  `crisisEngine.detectAndDeclareCrisis({
              initiatingOrganization: 'keda' as any,
              affectedOrganizations: ['keda'] as any,
              severity: 'CRITICAL' as any,
              classifications: ['SYSTEMIC_FAILURE'] as any,
              epistemicStatus: 'VERIFIED'
           });`
);

fs.writeFileSync('src/core/AnnyEnterprisePreventiveIntelligenceEngine.ts', eCode);
console.log("Patched files successfully.");
