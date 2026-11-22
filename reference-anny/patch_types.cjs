const fs = require('fs');

let tCode = fs.readFileSync('src/core/AnnyPreventiveIntelligenceTypes.ts', 'utf8');
tCode = tCode.replace("import { TimeToImpact } from './AnnyCrisisPredictionTypes';", "import { TimeToImpact, EmergingRisk } from './AnnyCrisisPredictionTypes';");
tCode = tCode.replace("authorizationRequirement: AutonomyLevel | 'HUMAN_EXECUTIVE' | 'HUMAN_IN_THE_LOOP';", "authorizationRequirement: AutonomyLevel | 'HUMAN_EXECUTIVE' | 'HUMAN_IN_THE_LOOP' | 'LOW' | 'MEDIUM';");
tCode = tCode.replace("autonomyEligibility: AutonomyLevel;", "autonomyEligibility: AutonomyLevel | 'HUMAN_IN_THE_LOOP';");
tCode = tCode.replace("authorizationState: 'PENDING' | 'AUTHORIZED' | 'DENIED' | 'REVOKED' | 'EXPIRED';", "authorizationState: 'PENDING' | 'AUTHORIZED' | 'DENIED' | 'REVOKED' | 'EXPIRED' | string;");
fs.writeFileSync('src/core/AnnyPreventiveIntelligenceTypes.ts', tCode);

let eCode = fs.readFileSync('src/core/AnnyEnterprisePreventiveIntelligenceEngine.ts', 'utf8');
eCode = eCode.replace("import { CrisisPrediction } from './AnnyCrisisPredictionTypes';", "import { EmergingRisk } from './AnnyCrisisPredictionTypes';");
eCode = eCode.replace(/CrisisPrediction/g, "EmergingRisk");
eCode = eCode.replace("plan.autonomyLevel === 'LOW' || plan.autonomyLevel === 'MEDIUM'", "plan.autonomyLevel === 'AUTHORIZED_AUTONOMOUS' || plan.autonomyLevel === 'ASSISTED'");
fs.writeFileSync('src/core/AnnyEnterprisePreventiveIntelligenceEngine.ts', eCode);

let sCode = fs.readFileSync('src/core/AnnyPhase73EnterprisePreventiveIntelligenceRealitySuite.ts', 'utf8');
sCode = sCode.replace("import { CrisisPrediction } from './AnnyCrisisPredictionTypes';", "import { EmergingRisk } from './AnnyCrisisPredictionTypes';");
sCode = sCode.replace("const mockPrediction: CrisisPrediction = {", "const mockPrediction: EmergingRisk = {");
sCode = sCode.replace("plan.authorizationState === 'REVOKED'", "(plan.authorizationState as string) === 'REVOKED'");
fs.writeFileSync('src/core/AnnyPhase73EnterprisePreventiveIntelligenceRealitySuite.ts', sCode);
