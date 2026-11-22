const fs = require('fs');

let eCode = fs.readFileSync('src/core/AnnyEnterprisePreventiveIntelligenceEngine.ts', 'utf8');
eCode = eCode.replace(/AnnyEmergingRiskTypes/g, "AnnyCrisisPredictionTypes");
eCode = eCode.replace(/'HUMAN_IN_THE_LOOP'/g, "'ASSISTED'");
fs.writeFileSync('src/core/AnnyEnterprisePreventiveIntelligenceEngine.ts', eCode);

let tCode = fs.readFileSync('src/core/AnnyPreventiveIntelligenceTypes.ts', 'utf8');
tCode = tCode.replace(/'HUMAN_IN_THE_LOOP'/g, "'ASSISTED'");
fs.writeFileSync('src/core/AnnyPreventiveIntelligenceTypes.ts', tCode);

let sCode = fs.readFileSync('src/core/AnnyPhase73EnterprisePreventiveIntelligenceRealitySuite.ts', 'utf8');
sCode = sCode.replace(/'HUMAN_IN_THE_LOOP'/g, "'ASSISTED'");
sCode = sCode.replace(/'IMMINENT'/g, "'SHORT_TERM'");
fs.writeFileSync('src/core/AnnyPhase73EnterprisePreventiveIntelligenceRealitySuite.ts', sCode);
