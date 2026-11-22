/**
 * ANNY — ENGINEERING, MECHATRONICS, AEROSPACE, VEHICLE & SAFETY ASSISTANT ENGINE
 *
 * Offline-first deterministic calculation, open-source toolchain starter export (KiCad,
 * OpenSCAD, OpenPLC Structured Text, ROS 2 rclpy), and structured offline safety checklists.
 *
 * Truthfulness & Safety Policy:
 * - Calculations use standard textbook engineering equations and clearly document assumptions.
 * - Preliminary aerospace / vehicle / electrical / structural results are NEVER represented as
 *   certified, airworthy, code-compliant, or safe without licensed professional verification.
 * - Emergency checklists assist immediate awareness and NEVER claim emergency services have
 *   been dispatched.
 */

export type EngineeringDiscipline =
  | 'electrical_power'
  | 'robotics_mechatronics'
  | 'aerospace_preliminary'
  | 'vehicle_ev';

export interface EngineeringCalculationResult {
  discipline: EngineeringDiscipline;
  title: string;
  inputs: Record<string, number | string>;
  outputs: Array<{ label: string; value: string; unit: string; notes?: string }>;
  warnings: string[];
  disclaimer: string;
  toolchainArtifact?: {
    toolName: string;
    filename: string;
    mimeType: string;
    content: string;
  };
}

export interface SafetyChecklist {
  id: string;
  title: string;
  category:
    | 'electrical'
    | 'fire'
    | 'machinery_loto'
    | 'robotics_estop'
    | 'chemical'
    | 'medical_first_aid';
  urgency: 'CRITICAL' | 'HIGH';
  immediateSteps: string[];
  doNotDo: string[];
  emergencyCallGuidance: string;
  disclaimer: string;
}

const SAFETY_CRITICAL_DISCLAIMER =
  'PRELIMINARY ENGINEERING ESTIMATE ONLY — NOT CERTIFIED. Independent peer review, physical testing, applicable codes (NEC/IEC, ISO, FAA/EASA), and licensed professional sign-off are mandatory before fabrication, energization, or flight.';

export function calculateElectricalAndSolar(params: {
  voltageV: number;
  currentA: number;
  phases?: 1 | 3;
  powerFactor?: number;
  cableLengthM?: number;
  conductorMm2?: number;
  batteryAh?: number;
  batteryVoltageV?: number;
}): EngineeringCalculationResult {
  const V = Math.max(1, Number(params.voltageV) || 230);
  const I = Math.max(0.1, Number(params.currentA) || 16);
  const phases = params.phases === 3 ? 3 : 1;
  const pf = Math.min(1, Math.max(0.1, Number(params.powerFactor) || 0.9));
  const lengthM = Math.max(1, Number(params.cableLengthM) || 25);
  const areaMm2 = Math.max(0.5, Number(params.conductorMm2) || 4);

  const apparentPowerVA = phases === 3 ? Math.sqrt(3) * V * I : V * I;
  const realPowerW = apparentPowerVA * pf;
  const copperResistivity = 0.0172; // Ohm*mm^2/m @ 20C
  const factor = phases === 3 ? Math.sqrt(3) : 2;
  const voltageDropV = (factor * lengthM * I * copperResistivity) / areaMm2;
  const voltageDropPct = (voltageDropV / V) * 100;
  const recommendedBreakerA = Math.ceil((I * 1.25) / 5) * 5;

  const warnings: string[] = [];
  if (voltageDropPct > 3) {
    warnings.push(
      `Estimated voltage drop (${voltageDropPct.toFixed(2)}%) exceeds common 3% branch-circuit guideline; consider increasing conductor cross-section above ${areaMm2} mm^2.`
    );
  }
  if (V >= 50) {
    warnings.push('Hazardous voltage (>= 50V AC/DC): verify LOTO, PPE, and local electrical code compliance.');
  }

  const batV = Number(params.batteryVoltageV) || 48;
  const batAh = Number(params.batteryAh) || 100;
  const bankWh = batV * batAh;
  const usableRuntimeHours = (bankWh * 0.8) / Math.max(10, realPowerW);

  const openPlcStarter = `(* Preliminary IEC 61131-3 OpenPLC Interlock & Overload Starter — Review before deployment *)
PROGRAM Motor_VFD_Starter
VAR
  StartBtn AT %IX0.0 : BOOL;
  StopNC AT %IX0.1 : BOOL;
  ThermalOverloadOK AT %IX0.2 : BOOL;
  EmergencyStopOK AT %IX0.3 : BOOL;
  ContactorRun AT %QX0.0 : BOOL;
END_VAR

  (* Fail-safe NC stop & E-Stop interlock *)
  IF NOT StopNC OR NOT EmergencyStopOK OR NOT ThermalOverloadOK THEN
    ContactorRun := FALSE;
  ELSIF StartBtn THEN
    ContactorRun := TRUE;
  END_IF;
END_PROGRAM`;

  return {
    discipline: 'electrical_power',
    title: `${phases}-Phase Electrical Load, Voltage Drop & Storage Estimate`,
    inputs: {
      voltageV: V,
      currentA: I,
      phases,
      powerFactor: pf,
      cableLengthM: lengthM,
      conductorMm2: areaMm2,
    },
    outputs: [
      { label: 'Apparent Power', value: (apparentPowerVA / 1000).toFixed(2), unit: 'kVA' },
      { label: 'Active Power', value: (realPowerW / 1000).toFixed(2), unit: 'kW' },
      { label: 'Est. Voltage Drop (Cu)', value: `${voltageDropV.toFixed(2)} (${voltageDropPct.toFixed(2)}%)`, unit: 'V / %' },
      { label: '125% Continuous Breaker Ref', value: String(recommendedBreakerA), unit: 'A', notes: 'Subject to wire ampacity & ambient derating' },
      { label: `Battery Bank (${batV}V ${batAh}Ah @ 80% DoD)`, value: usableRuntimeHours.toFixed(2), unit: 'hours' },
    ],
    warnings,
    disclaimer: SAFETY_CRITICAL_DISCLAIMER,
    toolchainArtifact: {
      toolName: 'OpenPLC / IEC 61131-3 Structured Text',
      filename: 'motor_interlock_starter.st',
      mimeType: 'text/plain',
      content: openPlcStarter,
    },
  };
}

export function calculateRoboticsMechatronics(params: {
  payloadKg: number;
  armLengthM: number;
  targetAngularAccelRadS2?: number;
  safetyFactor?: number;
  wheelDiameterM?: number;
  targetSpeedMS?: number;
}): EngineeringCalculationResult {
  const mass = Math.max(0.05, Number(params.payloadKg) || 2);
  const length = Math.max(0.05, Number(params.armLengthM) || 0.45);
  const accel = Math.max(0, Number(params.targetAngularAccelRadS2) || 4);
  const sf = Math.max(1.2, Number(params.safetyFactor) || 2.0);
  const g = 9.81;

  const staticTorqueNm = mass * g * length;
  const inertiaKgM2 = mass * length * length;
  const dynamicTorqueNm = inertiaKgM2 * accel;
  const requiredJointTorqueNm = (staticTorqueNm + dynamicTorqueNm) * sf;

  const wheelD = Math.max(0.03, Number(params.wheelDiameterM) || 0.16);
  const speedMS = Math.max(0.1, Number(params.targetSpeedMS) || 1.2);
  const wheelRpm = (speedMS / (Math.PI * wheelD)) * 60;

  const ros2NodeStarter = `#!/usr/bin/env python3
"""Preliminary ROS 2 (rclpy) Velocity Watchdog Node — Simulation/Bench Use Only."""
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist

class SafetyVelocityWatchdog(Node):
    def __init__(self):
        super().__init__('anny_velocity_watchdog')
        self.pub = self.create_publisher(Twist, '/cmd_vel_safe', 10)
        self.sub = self.create_subscription(Twist, '/cmd_vel', self.on_cmd, 10)
        self.max_linear_mps = ${speedMS.toFixed(2)}

    def on_cmd(self, msg: Twist):
        msg.linear.x = max(-self.max_linear_mps, min(self.max_linear_mps, msg.linear.x))
        self.pub.publish(msg)

def main():
    rclpy.init()
    node = SafetyVelocityWatchdog()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()
`;

  return {
    discipline: 'robotics_mechatronics',
    title: 'Robotic Joint Torque, Safety Factor & Mobile Drive Sizing',
    inputs: {
      payloadKg: mass,
      armLengthM: length,
      targetAngularAccelRadS2: accel,
      safetyFactor: sf,
    },
    outputs: [
      { label: 'Static Holding Torque', value: staticTorqueNm.toFixed(2), unit: 'N·m' },
      { label: 'Dynamic Inertial Torque', value: dynamicTorqueNm.toFixed(2), unit: 'N·m' },
      { label: `Required Actuator Torque (${sf}x SF)`, value: requiredJointTorqueNm.toFixed(2), unit: 'N·m' },
      { label: `Wheel Speed (${wheelD}m dia @ ${speedMS}m/s)`, value: wheelRpm.toFixed(1), unit: 'RPM' },
    ],
    warnings: [
      requiredJointTorqueNm > 40
        ? 'High-torque joint (> 40 N·m): enforce hardware torque limiters, pinch-point guards, and hardwired E-Stop.'
        : 'Include link self-weight and gearbox efficiency (typically 70–85%) when selecting servo/actuator.',
    ],
    disclaimer: SAFETY_CRITICAL_DISCLAIMER,
    toolchainArtifact: {
      toolName: 'ROS 2 (rclpy) Node Starter',
      filename: 'anny_velocity_watchdog.py',
      mimeType: 'text/x-python',
      content: ros2NodeStarter,
    },
  };
}

export function calculateAerospacePreliminary(params: {
  massKg: number;
  wingAreaM2: number;
  clMax?: number;
  liftToDragRatio?: number;
  staticThrustN?: number;
}): EngineeringCalculationResult {
  const mass = Math.max(0.2, Number(params.massKg) || 12);
  const wingArea = Math.max(0.05, Number(params.wingAreaM2) || 0.85);
  const clMax = Math.min(2.8, Math.max(0.4, Number(params.clMax) || 1.35));
  const ld = Math.max(2, Number(params.liftToDragRatio) || 11);
  const g = 9.81;
  const rhoSeaLevel = 1.225; // kg/m^3 ISA sea level

  const weightN = mass * g;
  const wingLoadingNm2 = weightN / wingArea;
  const stallSpeedMS = Math.sqrt((2 * weightN) / (rhoSeaLevel * wingArea * clMax));
  const recommendedCruiseMS = stallSpeedMS * 1.45;
  const thrustN = Number(params.staticThrustN) || weightN * 0.45;
  const thrustToWeight = thrustN / weightN;

  const openScadWingStarter = `// OpenSCAD Preliminary Airframe Sizing Reference (NOT FOR FLIGHT WITHOUT STRUCTURAL/CFD/FLIGHT TEST)
wing_area_m2 = ${wingArea};
aspect_ratio = 8;
wingspan_mm = sqrt(wing_area_m2 * aspect_ratio) * 1000;
mean_chord_mm = (wingspan_mm / aspect_ratio);

linear_extrude(height = wingspan_mm, center = true)
  scale([mean_chord_mm, mean_chord_mm * 0.12])
    circle(r = 0.5, $fn = 48);
`;

  return {
    discipline: 'aerospace_preliminary',
    title: 'Preliminary Aircraft / UAV Sizing & Stall Envelope (UNVERIFIED)',
    inputs: {
      massKg: mass,
      wingAreaM2: wingArea,
      clMax,
      liftToDragRatio: ld,
      staticThrustN: Number(thrustN.toFixed(1)),
    },
    outputs: [
      { label: 'Gross Weight', value: weightN.toFixed(1), unit: 'N' },
      { label: 'Wing Loading', value: wingLoadingNm2.toFixed(1), unit: 'N/m²' },
      { label: 'Sea-Level Stall Speed (Vs)', value: `${stallSpeedMS.toFixed(1)} m/s (${(stallSpeedMS * 1.94384).toFixed(1)} kt)`, unit: 'm/s | knots' },
      { label: 'Est. Cruise Speed (1.45×Vs)', value: `${recommendedCruiseMS.toFixed(1)} m/s`, unit: 'm/s' },
      { label: 'Thrust-to-Weight Ratio (T/W)', value: thrustToWeight.toFixed(2), unit: 'ratio' },
    ],
    warnings: [
      'AIRWORTHINESS NOTICE: Simplified steady-level ISA sea-level estimate only. Does NOT compute Reynolds effects, CG stability margins, flutter, structural loads, or regulatory compliance.',
      thrustToWeight < 0.25 ? 'Low thrust-to-weight (< 0.25) may limit takeoff climb gradient.' : 'Validate propulsion cooling and continuous thrust derating on static test stand.',
    ],
    disclaimer: SAFETY_CRITICAL_DISCLAIMER,
    toolchainArtifact: {
      toolName: 'OpenSCAD Parametric Reference',
      filename: 'uav_wing_reference.scad',
      mimeType: 'text/plain',
      content: openScadWingStarter,
    },
  };
}

export function calculateVehicleEvPreliminary(params: {
  vehicleMassKg: number;
  batteryKwh: number;
  dragCd?: number;
  frontalAreaM2?: number;
  cruiseSpeedKmh?: number;
}): EngineeringCalculationResult {
  const mass = Math.max(50, Number(params.vehicleMassKg) || 1450);
  const batteryKwh = Math.max(0.2, Number(params.batteryKwh) || 60);
  const cd = Math.max(0.15, Number(params.dragCd) || 0.28);
  const area = Math.max(0.2, Number(params.frontalAreaM2) || 2.25);
  const speedKmh = Math.max(10, Number(params.cruiseSpeedKmh) || 90);
  const speedMS = speedKmh / 3.6;

  const rho = 1.225;
  const crr = 0.011;
  const g = 9.81;
  const rollingForceN = crr * mass * g;
  const aeroForceN = 0.5 * rho * cd * area * speedMS * speedMS;
  const wheelPowerW = (rollingForceN + aeroForceN) * speedMS;
  const drivetrainEfficiency = 0.86;
  const batteryPowerKw = wheelPowerW / drivetrainEfficiency / 1000;
  const whPerKm = (batteryPowerKw * 1000) / speedKmh;
  const estimatedRangeKm = (batteryKwh * 0.9 * 1000) / Math.max(10, whPerKm);

  return {
    discipline: 'vehicle_ev',
    title: 'Preliminary EV / Machine Drivetrain & Range Estimate',
    inputs: {
      vehicleMassKg: mass,
      batteryKwh,
      dragCd: cd,
      frontalAreaM2: area,
      cruiseSpeedKmh: speedKmh,
    },
    outputs: [
      { label: 'Steady Cruise Draw (est.)', value: batteryPowerKw.toFixed(2), unit: 'kW' },
      { label: 'Energy Consumption Rate', value: whPerKm.toFixed(0), unit: 'Wh/km' },
      { label: 'Ideal Constant-Speed Range (90% Usable)', value: estimatedRangeKm.toFixed(0), unit: 'km' },
      { label: 'Aero Drag Force @ Cruise', value: aeroForceN.toFixed(0), unit: 'N' },
    ],
    warnings: [
      'Preliminary flat-road steady-speed physics estimate only; grades, acceleration cycles, HVAC auxiliary load, and thermal derating reduce real range.',
    ],
    disclaimer: SAFETY_CRITICAL_DISCLAIMER,
  };
}

export const OFFLINE_SAFETY_CHECKLISTS: SafetyChecklist[] = [
  {
    id: 'electrical_emergency',
    title: 'Electrical Shock / Arc Flash / Live Fault',
    category: 'electrical',
    urgency: 'CRITICAL',
    immediateSteps: [
      'DO NOT touch an energized victim with bare hands or conductive objects.',
      'De-energize power immediately from the upstream breaker, isolator, or Emergency Stop ONLY if safe to reach.',
      'Stand back clear of energized arc/step-potential zones and call local emergency services.',
      'Only after confirming zero energy, check responsiveness and breathing; apply CPR/AED if trained and needed.',
    ],
    doNotDo: [
      'Do not use wet wood, metal poles, or bare skin near high-voltage conductors.',
      'Do not assume a tripped breaker means a downstream capacitor bank or UPS is discharged.',
    ],
    emergencyCallGuidance: 'Contact local emergency medical & utility services immediately (e.g., 112 / 999 / 911 depending on region).',
    disclaimer: 'Offline reference checklist only. ANNY does NOT automatically dial emergency services and is not a medical provider.',
  },
  {
    id: 'fire_emergency',
    title: 'Fire & Lithium-Ion / Electrical Fire Response',
    category: 'fire',
    urgency: 'CRITICAL',
    immediateSteps: [
      'Activate the nearest fire alarm and alert everyone in the immediate area.',
      'Evacuate along marked exits—stay low below smoke and close doors behind you without locking.',
      'NEVER use water on energized electrical equipment (Class C) or thermal-runaway lithium batteries without isolation/clearance.',
      'Assemble outside at the designated muster point and call emergency fire services.',
    ],
    doNotDo: [
      'Do not use elevators or re-enter a smoke-filled room.',
      'Do not fight a spreading lithium-ion battery fire indoors without proper toxic-fume protection.',
    ],
    emergencyCallGuidance: 'Call local fire/emergency dispatch immediately from a safe outside location.',
    disclaimer: 'Offline emergency guidance only. Follow local fire marshal instructions and emergency services.',
  },
  {
    id: 'machinery_loto',
    title: 'Industrial Machinery & Lockout / Tagout (LOTO)',
    category: 'machinery_loto',
    urgency: 'HIGH',
    immediateSteps: [
      'Press local Emergency Stop and bring moving shafts, presses, or actuators to a complete zero-energy stop.',
      'Isolate electrical, pneumatic, hydraulic, and gravity/spring stored energy sources.',
      'Apply personal lock and dated tag to every isolation point, then verify zero energy ("try-step").',
    ],
    doNotDo: [
      'Never rely solely on software UI interlocks or PLC outputs for human entry safety.',
      'Never remove another technician’s lock without formal facility verification.',
    ],
    emergencyCallGuidance: 'Alert site safety officer and call emergency medical services if crushing or entanglement occurred.',
    disclaimer: 'Software safety reference only—physical OSHA/ISO 14118 lockout devices are mandatory.',
  },
  {
    id: 'robot_estop',
    title: 'Robot & Autonomous Machine E-Stop Protocol',
    category: 'robotics_estop',
    urgency: 'HIGH',
    immediateSteps: [
      'Strike the physical mushroom Emergency Stop button on the robot controller or teach pendant.',
      'Trigger software E-Stop lock in AIOS / ROS 2 supervisory panel as secondary confirmation.',
      'Clear human personnel outside the maximum kinematic reach envelope before resetting faults.',
    ],
    doNotDo: [
      'Never enter an active industrial or mobile robot cell while servos remain enabled.',
    ],
    emergencyCallGuidance: 'If injury occurred, keep power isolated and contact site medical/emergency response immediately.',
    disclaimer: 'Software alerts cannot replace hardwired Category 0/1 physical safety relays.',
  },
  {
    id: 'medical_first_aid',
    title: 'Medical Emergency Recognition & First-Aid Awareness',
    category: 'medical_first_aid',
    urgency: 'CRITICAL',
    immediateSteps: [
      'Check scene safety first before approaching the person.',
      'Check responsiveness and normal breathing. For chest pain, stroke signs (FAST), severe bleeding, or unconsciousness, call emergency services immediately.',
      'Apply firm direct pressure with clean cloth for severe bleeding; stay on the line with emergency dispatchers.',
    ],
    doNotDo: [
      'Do not move a person with suspected neck/spinal injury unless exposed to immediate fire/collapse danger.',
      'Do not rely on AI output in place of licensed clinicians or paramedics.',
    ],
    emergencyCallGuidance: 'Call local ambulance/emergency services immediately (911 / 112 / 999).',
    disclaimer: 'First-aid awareness only — not medical advice or diagnosis. ANNY has NOT contacted emergency services.',
  },
];

export function searchSafetyChecklists(query: string): SafetyChecklist[] {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return OFFLINE_SAFETY_CHECKLISTS;
  return OFFLINE_SAFETY_CHECKLISTS.filter((c) => {
    const hay = `${c.title} ${c.category} ${c.immediateSteps.join(' ')}`.toLowerCase();
    return hay.includes(q);
  });
}
