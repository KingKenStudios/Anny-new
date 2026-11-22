/**
 * ANNY — ARCHITECTURAL DESIGN INTELLIGENCE ENGINE (PHASE 2)
 *
 * Generates coherent, non-overlapping residential and commercial spatial plans,
 * architectural SVG drawings, valid AutoCAD ASCII DXF R12 exports, room/door/window
 * schedules, preliminary material & BOQ cost guidance, brief-gap clarifying questions,
 * and an honest 5-stage workflow tracker.
 *
 * Strictly truthful: conceptual & schematic planning only — never claims structural
 * engineering certification, soil/geotech sign-off, or fabricated statutory building codes.
 */

export type BuildingTypology =
  | 'bungalow'
  | 'duplex'
  | 'detached_villa'
  | 'mansion'
  | 'apartment_block'
  | 'office_hub'
  | 'retail_plaza'
  | 'studio_broadcast'
  | 'clinic'
  | 'hospitality';

export type ClimateProfile = 'tropical_west_africa' | 'temperate' | 'arid';

export interface ArchitecturePlanInput {
  projectName?: string;
  typology: BuildingTypology;
  climate?: ClimateProfile;
  location?: string;
  plotWidthM?: number;
  plotDepthM?: number;
  bedrooms?: number;
  bathrooms?: number;
  floors?: number;
  includeCourtyard?: boolean;
  includeBoyQuarters?: boolean;
  includeSolarRoof?: boolean;
  parkingBays?: number;
  additionalNotes?: string;
}

export interface RoomSpec {
  id: string;
  name: string;
  floor: number;
  zone: 'public' | 'private' | 'service' | 'circulation' | 'commercial' | 'outdoor';
  xM: number;
  yM: number;
  widthM: number;
  depthM: number;
  areaM2: number;
  windows: Array<'N' | 'S' | 'E' | 'W'>;
  doorWall: 'N' | 'S' | 'E' | 'W';
  crossVentilated: boolean;
  notes?: string;
}

export interface DoorWindowScheduleItem {
  tag: string;
  kind: 'door' | 'window';
  spec: string;
  widthMm: number;
  heightMm: number;
  count: number;
  material: string;
  locations: string[];
}

export interface BoqLineItem {
  element: string;
  basis: string;
  estimatedRangeUsd: [number, number];
}

export interface WorkflowStageStatus {
  stageNumber: 1 | 2 | 3 | 4 | 5;
  name: string;
  status: 'COMPLETED' | 'CURRENT' | 'PENDING_PRO_SIGN_OFF';
  description: string;
}

export interface ArchitecturePlanResult {
  projectName: string;
  typology: BuildingTypology;
  climate: ClimateProfile;
  location: string;
  plotWidthM: number;
  plotDepthM: number;
  footprintWidthM: number;
  footprintDepthM: number;
  floors: number;
  totalGrossFloorAreaM2: number;
  siteCoveragePercent: number;
  appliedAssumptions: string[];
  clarifyingQuestions: string[];
  rooms: RoomSpec[];
  roomSchedule: Array<{
    floor: number;
    room: string;
    zone: string;
    dimensionsM: string;
    areaM2: number;
    ventilation: string;
  }>;
  doorWindowSchedule: DoorWindowScheduleItem[];
  materialSuggestions: Array<{ category: string; recommendation: string; rationale: string }>;
  preliminaryBoqGuidance: {
    disclaimer: string;
    estimatedTotalRangeUsd: [number, number];
    lineItems: BoqLineItem[];
  };
  passiveClimateStrategies: string[];
  structuralAndSiteNotes: string[];
  workflowStages: WorkflowStageStatus[];
  honestyDisclaimer: string;
  elevationAndSectionSummary: {
    floorToFloorM: number;
    plinthHeightM: number;
    eaveOverhangMm: number;
    ridgeHeightM: number;
    sectionAxis: string;
  };
  svgFloorPlan: string;
  svgFrontElevation: string;
  dxfR12Content: string;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function escapeXml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function detectBriefGaps(input: ArchitecturePlanInput): {
  clarifyingQuestions: string[];
  appliedAssumptions: string[];
} {
  const clarifyingQuestions: string[] = [];
  const appliedAssumptions: string[] = [];

  if (!input.plotWidthM || !input.plotDepthM) {
    clarifyingQuestions.push(
      'What are your exact site plot dimensions (width × depth in meters) and road-frontage direction?'
    );
    appliedAssumptions.push('Assumed standard rectangular plot (e.g., 18m × 30m for residential, 24m × 36m for commercial) with front road along South edge.');
  }

  if (!input.climate) {
    clarifyingQuestions.push('Which climate zone or city is the site located in (to orient solar shading and cross-ventilation)?');
    appliedAssumptions.push('Applied Tropical West Africa passive-cooling profile (deep roof overhangs, shaded North/South openings, wet-wall grouping).');
  }

  if (!input.floors) {
    const isMulti = ['duplex', 'apartment_block', 'office_hub', 'retail_plaza', 'hospitality'].includes(input.typology);
    appliedAssumptions.push(`Assumed ${isMulti ? 2 : 1} floor(s) based on ${input.typology.replace(/_/g, ' ')} typology.`);
  }

  if (['bungalow', 'duplex', 'detached_villa', 'mansion', 'apartment_block'].includes(input.typology) && !input.bedrooms) {
    clarifyingQuestions.push('How many bedrooms and en-suite bathrooms are required per dwelling unit?');
    appliedAssumptions.push('Assumed 4 bedrooms / 4 bathrooms residential program.');
  }

  if (!input.parkingBays) {
    clarifyingQuestions.push('How many covered or open parking bays and generator/inverter utility enclosures are required on site?');
    appliedAssumptions.push('Reserved 2–4 setback parking bays along the front compound approach.');
  }

  return { clarifyingQuestions, appliedAssumptions };
}

function buildFloorRooms(
  typology: BuildingTypology,
  floor: number,
  fpW: number,
  fpD: number,
  bedrooms: number
): RoomSpec[] {
  const rooms: RoomSpec[] = [];
  const corridorH = 1.5;
  const topDepth = round2((fpD - corridorH) * 0.48);
  const botDepth = round2(fpD - corridorH - topDepth);
  const topY = 0;
  const corrY = topDepth;
  const botY = round2(topDepth + corridorH);

  const isCommercial = ['office_hub', 'retail_plaza', 'studio_broadcast', 'clinic', 'hospitality'].includes(typology);

  if (floor === 1) {
    if (isCommercial) {
      const lobbyW = round2(fpW * 0.34);
      const studioOrHallW = round2(fpW * 0.42);
      const supportW = round2(fpW - lobbyW - studioOrHallW);

      rooms.push(
        {
          id: `f1_lobby`,
          name: typology === 'clinic' ? 'Reception & Triage' : typology === 'retail_plaza' ? 'Anchor Retail Bay' : 'Main Reception & Lobby',
          floor: 1,
          zone: 'commercial',
          xM: 0,
          yM: topY,
          widthM: lobbyW,
          depthM: topDepth,
          areaM2: round2(lobbyW * topDepth),
          windows: ['N', 'W'],
          doorWall: 'S',
          crossVentilated: true,
        },
        {
          id: `f1_core`,
          name: typology === 'studio_broadcast' ? 'Live Studio A / Acoustic Room' : typology === 'clinic' ? 'Consultation & Lab Wing' : 'Open Operations Hall',
          floor: 1,
          zone: 'commercial',
          xM: lobbyW,
          yM: topY,
          widthM: studioOrHallW,
          depthM: topDepth,
          areaM2: round2(studioOrHallW * topDepth),
          windows: typology === 'studio_broadcast' ? [] : ['N'],
          doorWall: 'S',
          crossVentilated: typology !== 'studio_broadcast',
        },
        {
          id: `f1_stair_service`,
          name: 'Stair & MEP / Wet Core',
          floor: 1,
          zone: 'service',
          xM: round2(lobbyW + studioOrHallW),
          yM: topY,
          widthM: supportW,
          depthM: topDepth,
          areaM2: round2(supportW * topDepth),
          windows: ['N', 'E'],
          doorWall: 'S',
          crossVentilated: true,
          notes: 'Plumbing riser + distribution panel',
        },
        {
          id: `f1_corridor`,
          name: 'Central Spine Corridor',
          floor: 1,
          zone: 'circulation',
          xM: 0,
          yM: corrY,
          widthM: fpW,
          depthM: corridorH,
          areaM2: round2(fpW * corridorH),
          windows: ['E', 'W'],
          doorWall: 'W',
          crossVentilated: true,
        },
        {
          id: `f1_front_left`,
          name: typology === 'studio_broadcast' ? 'Master Control & Edit Suite' : typology === 'clinic' ? 'Pharmacy & Waiting' : 'Showroom / Meeting Suite',
          floor: 1,
          zone: 'commercial',
          xM: 0,
          yM: botY,
          widthM: round2(fpW * 0.5),
          depthM: botDepth,
          areaM2: round2(fpW * 0.5 * botDepth),
          windows: ['S', 'W'],
          doorWall: 'N',
          crossVentilated: true,
        },
        {
          id: `f1_front_right`,
          name: typology === 'studio_broadcast' ? 'Client Lounge & Green Room' : typology === 'retail_plaza' ? 'Boutique Bay & Store' : 'Admin & Server / Utility Room',
          floor: 1,
          zone: 'commercial',
          xM: round2(fpW * 0.5),
          yM: botY,
          widthM: round2(fpW - round2(fpW * 0.5)),
          depthM: botDepth,
          areaM2: round2((fpW - round2(fpW * 0.5)) * botDepth),
          windows: ['S', 'E'],
          doorWall: 'N',
          crossVentilated: true,
        }
      );
      return rooms;
    }

    // Residential ground floor
    const isSingleFloor = typology === 'bungalow';
    const kitchenW = round2(fpW * 0.28);
    const diningW = round2(fpW * 0.28);
    const stairOrGuestW = round2(fpW - kitchenW - diningW);

    const livingW = round2(fpW * (isSingleFloor ? 0.44 : 0.56));
    const verandaW = round2(fpW * 0.22);
    const rightBotW = round2(fpW - livingW - verandaW);

    rooms.push(
      {
        id: 'f1_kitchen',
        name: 'Kitchen & Store (Wet Core)',
        floor: 1,
        zone: 'service',
        xM: 0,
        yM: topY,
        widthM: kitchenW,
        depthM: topDepth,
        areaM2: round2(kitchenW * topDepth),
        windows: ['N', 'W'],
        doorWall: 'S',
        crossVentilated: true,
        notes: 'Aligned on North/West wet-wall plumbing spine',
      },
      {
        id: 'f1_dining',
        name: 'Dining Room',
        floor: 1,
        zone: 'public',
        xM: kitchenW,
        yM: topY,
        widthM: diningW,
        depthM: topDepth,
        areaM2: round2(diningW * topDepth),
        windows: ['N'],
        doorWall: 'S',
        crossVentilated: true,
      },
      {
        id: 'f1_rear_suite',
        name: isSingleFloor ? 'Primary En-Suite Bedroom' : 'Guest Suite + Stairwell',
        floor: 1,
        zone: isSingleFloor ? 'private' : 'circulation',
        xM: round2(kitchenW + diningW),
        yM: topY,
        widthM: stairOrGuestW,
        depthM: topDepth,
        areaM2: round2(stairOrGuestW * topDepth),
        windows: ['N', 'E'],
        doorWall: 'S',
        crossVentilated: true,
      },
      {
        id: 'f1_corridor',
        name: 'Cross-Ventilated Passage',
        floor: 1,
        zone: 'circulation',
        xM: 0,
        yM: corrY,
        widthM: fpW,
        depthM: corridorH,
        areaM2: round2(fpW * corridorH),
        windows: ['E', 'W'],
        doorWall: 'W',
        crossVentilated: true,
      },
      {
        id: 'f1_living',
        name: 'Main Living Room',
        floor: 1,
        zone: 'public',
        xM: 0,
        yM: botY,
        widthM: livingW,
        depthM: botDepth,
        areaM2: round2(livingW * botDepth),
        windows: ['S', 'W'],
        doorWall: 'E',
        crossVentilated: true,
      },
      {
        id: 'f1_veranda',
        name: 'Shaded Entrance Veranda',
        floor: 1,
        zone: 'outdoor',
        xM: livingW,
        yM: botY,
        widthM: verandaW,
        depthM: botDepth,
        areaM2: round2(verandaW * botDepth),
        windows: ['S'],
        doorWall: 'N',
        crossVentilated: true,
      },
      {
        id: 'f1_right_front',
        name: isSingleFloor ? 'Bedrooms 2–3 + Shared Bath' : 'Ante-Room & Visitor WC',
        floor: 1,
        zone: isSingleFloor ? 'private' : 'public',
        xM: round2(livingW + verandaW),
        yM: botY,
        widthM: rightBotW,
        depthM: botDepth,
        areaM2: round2(rightBotW * botDepth),
        windows: ['S', 'E'],
        doorWall: 'N',
        crossVentilated: true,
      }
    );
    return rooms;
  }

  // Upper floor(s) — cleanly partitioned, zero overlaps
  if (isCommercial) {
    const leftW = round2(fpW * 0.48);
    const rightW = round2(fpW - leftW);
    rooms.push(
      {
        id: `f${floor}_exec`,
        name: `Level ${floor} Executive Suites`,
        floor,
        zone: 'commercial',
        xM: 0,
        yM: topY,
        widthM: leftW,
        depthM: topDepth,
        areaM2: round2(leftW * topDepth),
        windows: ['N', 'W'],
        doorWall: 'S',
        crossVentilated: true,
      },
      {
        id: `f${floor}_stair_core`,
        name: `Level ${floor} Stair & Restroom Core`,
        floor,
        zone: 'service',
        xM: leftW,
        yM: topY,
        widthM: rightW,
        depthM: topDepth,
        areaM2: round2(rightW * topDepth),
        windows: ['N', 'E'],
        doorWall: 'S',
        crossVentilated: true,
      },
      {
        id: `f${floor}_hall`,
        name: `Level ${floor} Spine Gallery`,
        floor,
        zone: 'circulation',
        xM: 0,
        yM: corrY,
        widthM: fpW,
        depthM: corridorH,
        areaM2: round2(fpW * corridorH),
        windows: ['E', 'W'],
        doorWall: 'W',
        crossVentilated: true,
      },
      {
        id: `f${floor}_workfloor`,
        name: `Level ${floor} Open Collaboration Studio`,
        floor,
        zone: 'commercial',
        xM: 0,
        yM: botY,
        widthM: fpW,
        depthM: botDepth,
        areaM2: round2(fpW * botDepth),
        windows: ['S', 'E', 'W'],
        doorWall: 'N',
        crossVentilated: true,
      }
    );
    return rooms;
  }

  // Residential upper floor
  const masterW = round2(fpW * 0.54);
  const stairCoreW = round2(fpW - masterW);
  const upperBedCount = Math.max(2, bedrooms - 1);
  const bedSplitW = round2(fpW / Math.min(3, upperBedCount));

  rooms.push(
    {
      id: `f${floor}_master`,
      name: `Primary Bedroom + Walk-In Closet & En-Suite`,
      floor,
      zone: 'private',
      xM: 0,
      yM: topY,
      widthM: masterW,
      depthM: topDepth,
      areaM2: round2(masterW * topDepth),
      windows: ['N', 'W'],
      doorWall: 'S',
      crossVentilated: true,
    },
    {
      id: `f${floor}_stair_landing`,
      name: `Upper Stairwell & Family Lounge`,
      floor,
      zone: 'circulation',
      xM: masterW,
      yM: topY,
      widthM: stairCoreW,
      depthM: topDepth,
      areaM2: round2(stairCoreW * topDepth),
      windows: ['N', 'E'],
      doorWall: 'S',
      crossVentilated: true,
    },
    {
      id: `f${floor}_passage`,
      name: `Level ${floor} Gallery Passage`,
      floor,
      zone: 'circulation',
      xM: 0,
      yM: corrY,
      widthM: fpW,
      depthM: corridorH,
      areaM2: round2(fpW * corridorH),
      windows: ['E', 'W'],
      doorWall: 'W',
      crossVentilated: true,
    }
  );

  const count = Math.min(3, upperBedCount);
  let cursorX = 0;
  for (let i = 0; i < count; i++) {
    const w = i === count - 1 ? round2(fpW - cursorX) : bedSplitW;
    rooms.push({
      id: `f${floor}_bed_${i + 2}`,
      name: `En-Suite Bedroom ${i + 2}`,
      floor,
      zone: 'private',
      xM: cursorX,
      yM: botY,
      widthM: w,
      depthM: botDepth,
      areaM2: round2(w * botDepth),
      windows: i === 0 ? ['S', 'W'] : i === count - 1 ? ['S', 'E'] : ['S'],
      doorWall: 'N',
      crossVentilated: i === 0 || i === count - 1,
    });
    cursorX = round2(cursorX + w);
  }

  return rooms;
}

export function generateArchitecturalSvg(plan: {
  projectName: string;
  typology: BuildingTypology;
  plotWidthM: number;
  plotDepthM: number;
  footprintWidthM: number;
  footprintDepthM: number;
  rooms: RoomSpec[];
}): string {
  const scale = 28; // px per meter
  const padLeft = 56;
  const padTop = 64;
  const floor1Rooms = plan.rooms.filter((r) => r.floor === 1);
  const offsetX = round2((plan.plotWidthM - plan.footprintWidthM) / 2);
  const offsetY = round2((plan.plotDepthM - plan.footprintDepthM) * 0.45);

  const svgWidth = Math.max(680, Math.round(plan.plotWidthM * scale + padLeft * 2));
  const svgHeight = Math.max(540, Math.round(plan.plotDepthM * scale + padTop + 96));

  const zoneFill: Record<RoomSpec['zone'], string> = {
    public: '#0f2744',
    private: '#132a3e',
    service: '#1e293b',
    circulation: '#0c1829',
    commercial: '#112a45',
    outdoor: '#0c2d28',
  };

  const roomElements = floor1Rooms
    .map((room) => {
      const rx = padLeft + (offsetX + room.xM) * scale;
      const ry = padTop + (offsetY + room.yM) * scale;
      const rw = room.widthM * scale;
      const rh = room.depthM * scale;

      const windowTicks = room.windows
        .map((side) => {
          if (side === 'N') {
            return `<line x1="${rx + rw * 0.3}" y1="${ry}" x2="${rx + rw * 0.7}" y2="${ry}" stroke="#38bdf8" stroke-width="3.5" />`;
          }
          if (side === 'S') {
            return `<line x1="${rx + rw * 0.3}" y1="${ry + rh}" x2="${rx + rw * 0.7}" y2="${ry + rh}" stroke="#38bdf8" stroke-width="3.5" />`;
          }
          if (side === 'W') {
            return `<line x1="${rx}" y1="${ry + rh * 0.3}" x2="${rx}" y2="${ry + rh * 0.7}" stroke="#38bdf8" stroke-width="3.5" />`;
          }
          return `<line x1="${rx + rw}" y1="${ry + rh * 0.3}" x2="${rx + rw}" y2="${ry + rh * 0.7}" stroke="#38bdf8" stroke-width="3.5" />`;
        })
        .join('\n      ');

      // Door swing indicator
      const doorCx = room.doorWall === 'S' ? rx + rw * 0.18 : room.doorWall === 'N' ? rx + rw * 0.18 : room.doorWall === 'E' ? rx + rw : rx;
      const doorCy = room.doorWall === 'S' ? ry + rh : room.doorWall === 'N' ? ry : ry + rh * 0.25;
      const doorArc = `<circle cx="${round2(doorCx)}" cy="${round2(doorCy)}" r="10" fill="none" stroke="#f59e0b" stroke-width="1.2" stroke-dasharray="2,2" />`;

      return `
      <rect x="${round2(rx)}" y="${round2(ry)}" width="${round2(rw)}" height="${round2(rh)}" fill="${zoneFill[room.zone]}" stroke="#e2e8f0" stroke-width="1.6" />
      ${windowTicks}
      ${doorArc}
      <text x="${round2(rx + rw / 2)}" y="${round2(ry + rh / 2 - 4)}" fill="#f8fafc" font-size="10.5" font-weight="600" font-family="system-ui, sans-serif" text-anchor="middle">${escapeXml(room.name)}</text>
      <text x="${round2(rx + rw / 2)}" y="${round2(ry + rh / 2 + 11)}" fill="#94a3b8" font-size="9.5" font-family="monospace" text-anchor="middle">${room.widthM}m x ${room.depthM}m (${room.areaM2}m²)</text>`;
    })
    .join('\n');

  const fpPxX = padLeft + offsetX * scale;
  const fpPxY = padTop + offsetY * scale;
  const fpPxW = plan.footprintWidthM * scale;
  const fpPxH = plan.footprintDepthM * scale;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="100%" role="img" aria-label="Conceptual floor plan for ${escapeXml(plan.projectName)}">
  <rect width="${svgWidth}" height="${svgHeight}" fill="#050b18" />
  <text x="${padLeft}" y="28" fill="#38bdf8" font-size="14" font-weight="700" font-family="system-ui, sans-serif">${escapeXml(plan.projectName)} — GROUND FLOOR CONCEPTUAL LAYOUT</text>
  <text x="${padLeft}" y="45" fill="#94a3b8" font-size="10.5" font-family="monospace">CONCEPTUAL SCHEMATIC (NOT FOR CONSTRUCTION) | PLOT ${plan.plotWidthM}m x ${plan.plotDepthM}m | FOOTPRINT ${plan.footprintWidthM}m x ${plan.footprintDepthM}m</text>

  <!-- Site Plot Boundary -->
  <rect x="${padLeft}" y="${padTop}" width="${round2(plan.plotWidthM * scale)}" height="${round2(plan.plotDepthM * scale)}" fill="#071124" stroke="#475569" stroke-width="1.5" stroke-dasharray="6,4" />

  <!-- Building Footprint Double Exterior Wall -->
  <rect x="${round2(fpPxX - 3)}" y="${round2(fpPxY - 3)}" width="${round2(fpPxW + 6)}" height="${round2(fpPxH + 6)}" fill="none" stroke="#94a3b8" stroke-width="2" />

  ${roomElements}

  <!-- North Indicator -->
  <g transform="translate(${svgWidth - 52}, 42)">
    <circle cx="0" cy="0" r="18" fill="#0b1730" stroke="#38bdf8" stroke-width="1.2" />
    <polygon points="0,-13 -5,4 0,0 5,4" fill="#38bdf8" />
    <text x="0" y="13" fill="#e2e8f0" font-size="8.5" font-weight="700" font-family="monospace" text-anchor="middle">N</text>
  </g>

  <!-- Scale & Disclaimer Footer -->
  <text x="${padLeft}" y="${svgHeight - 24}" fill="#cbd5e1" font-size="10" font-family="monospace">Cyan = Cross-Ventilation Windows | Dashed Amber = Door Swing | Scale: Metric (meters)</text>
  <text x="${padLeft}" y="${svgHeight - 9}" fill="#fbbf24" font-size="9.5" font-family="system-ui, sans-serif">PRELIMINARY CONCEPT ONLY — Structural, MEP, geotech, and municipal permits require licensed architect/engineer sign-off.</text>
</svg>`;
}

export function generateElevationSvg(plan: {
  projectName: string;
  floors: number;
  footprintWidthM: number;
  floorToFloorM: number;
  plinthHeightM: number;
  eaveOverhangMm: number;
  ridgeHeightM: number;
}): string {
  const svgW = 680;
  const svgH = 340;
  const groundY = 278;
  const pxPerM = 18;
  const bldgW = Math.min(440, Math.max(220, Math.round(plan.footprintWidthM * pxPerM)));
  const startX = Math.round((svgW - bldgW) / 2);
  const plinthPx = Math.round(plan.plinthHeightM * pxPerM);
  const floorPx = Math.round(plan.floorToFloorM * pxPerM);
  const overhangPx = Math.round((plan.eaveOverhangMm / 1000) * pxPerM);
  const roofTopY = groundY - plinthPx - plan.floors * floorPx;
  const roofPeakY = Math.max(58, roofTopY - Math.round((plan.ridgeHeightM - plan.plinthHeightM - plan.floors * plan.floorToFloorM) * pxPerM));

  const floorBands: string[] = [];
  for (let f = 0; f < plan.floors; f++) {
    const bandY = groundY - plinthPx - (f + 1) * floorPx;
    floorBands.push(
      `<rect x="${startX}" y="${bandY}" width="${bldgW}" height="${floorPx}" fill="${f % 2 === 0 ? '#0f2744' : '#132a3e'}" stroke="#e2e8f0" stroke-width="1.6" />`
    );
    // Window bays across facade
    const bayCount = 4;
    const bayW = 36;
    const bayH = Math.round(floorPx * 0.45);
    const step = bldgW / (bayCount + 1);
    for (let b = 1; b <= bayCount; b++) {
      const wx = Math.round(startX + step * b - bayW / 2);
      const wy = Math.round(bandY + floorPx * 0.25);
      floorBands.push(`<rect x="${wx}" y="${wy}" width="${bayW}" height="${bayH}" fill="#082f49" stroke="#38bdf8" stroke-width="1.4" />`);
    }
    floorBands.push(
      `<text x="${startX - 10}" y="${bandY + floorPx / 2}" fill="#94a3b8" font-size="9.5" font-family="monospace" text-anchor="end">LVL ${f + 1}</text>`
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="100%" role="img" aria-label="Conceptual South elevation for ${escapeXml(plan.projectName)}">
  <rect width="${svgW}" height="${svgH}" fill="#050b18" />
  <text x="32" y="26" fill="#38bdf8" font-size="13" font-weight="700" font-family="system-ui, sans-serif">${escapeXml(plan.projectName)} — SCHEMATIC SOUTH ELEVATION &amp; SECTION DATUMS</text>
  <text x="32" y="42" fill="#94a3b8" font-size="10" font-family="monospace">CONCEPTUAL ONLY | RIDGE +${plan.ridgeHeightM}m | EAVE OVERHANG ${plan.eaveOverhangMm}mm | ${plan.floors} FLOOR(S)</text>

  <!-- Plinth & Ground Line -->
  <rect x="${startX}" y="${groundY - plinthPx}" width="${bldgW}" height="${plinthPx}" fill="#1e293b" stroke="#94a3b8" stroke-width="1.4" />
  <line x1="24" y1="${groundY}" x2="${svgW - 24}" y2="${groundY}" stroke="#475569" stroke-width="2" />

  ${floorBands.join('\n  ')}

  <!-- Pitched Solar Roof with Deep Passive Eave Overhang -->
  <polygon points="${startX - overhangPx},${roofTopY} ${Math.round(svgW / 2)},${roofPeakY} ${startX + bldgW + overhangPx},${roofTopY}" fill="#172554" stroke="#f59e0b" stroke-width="2" />

  <!-- Dimension Callouts -->
  <line x1="${startX + bldgW + 24}" y1="${groundY}" x2="${startX + bldgW + 24}" y2="${roofPeakY}" stroke="#38bdf8" stroke-width="1.2" stroke-dasharray="3,3" />
  <text x="${startX + bldgW + 32}" y="${Math.round((groundY + roofPeakY) / 2)}" fill="#38bdf8" font-size="10" font-family="monospace">+${plan.ridgeHeightM}m Total</text>

  <text x="32" y="${svgH - 12}" fill="#fbbf24" font-size="9.5" font-family="system-ui, sans-serif">PRELIMINARY ELEVATION SCHEMATIC — Structural wind/roof framing and footing depth require licensed engineer verification.</text>
</svg>`;
}

/**
 * Generates genuine ASCII AutoCAD DXF R12 output readable by AutoCAD, LibreCAD, QCAD, and DraftSight.
 */
export function generateArchitecturalDxf(plan: {
  projectName: string;
  plotWidthM: number;
  plotDepthM: number;
  footprintWidthM: number;
  footprintDepthM: number;
  rooms: RoomSpec[];
}): string {
  const lines: string[] = [];
  const push = (...items: Array<string | number>) => {
    for (const it of items) lines.push(String(it));
  };

  const addLine = (layer: string, x1: number, y1: number, x2: number, y2: number) => {
    push(0, 'LINE', 8, layer, 10, round2(x1), 20, round2(y1), 30, 0, 11, round2(x2), 21, round2(y2), 31, 0);
  };

  const addRect = (layer: string, x: number, y: number, w: number, h: number) => {
    addLine(layer, x, y, x + w, y);
    addLine(layer, x + w, y, x + w, y + h);
    addLine(layer, x + w, y + h, x, y + h);
    addLine(layer, x, y + h, x, y);
  };

  const addText = (layer: string, x: number, y: number, height: number, text: string) => {
    push(0, 'TEXT', 8, layer, 10, round2(x), 20, round2(y), 30, 0, 40, height, 1, text.replace(/[\r\n]+/g, ' '));
  };

  push(0, 'SECTION', 2, 'HEADER', 9, '$ACADVER', 1, 'AC1009', 9, '$INSUNITS', 70, 6, 0, 'ENDSEC');

  push(0, 'SECTION', 2, 'TABLES', 0, 'TABLE', 2, 'LAYER', 70, 4);
  for (const [layerName, color] of [
    ['SITE_BOUNDARY', 8],
    ['WALLS', 7],
    ['DOORS_WINDOWS', 4],
    ['ROOM_LABELS', 3],
  ] as const) {
    push(0, 'LAYER', 2, layerName, 70, 0, 62, color, 6, 'CONTINUOUS');
  }
  push(0, 'ENDTAB', 0, 'ENDSEC');

  push(0, 'SECTION', 2, 'ENTITIES');

  // Plot boundary
  addRect('SITE_BOUNDARY', 0, 0, plan.plotWidthM, plan.plotDepthM);

  const offsetX = round2((plan.plotWidthM - plan.footprintWidthM) / 2);
  const offsetY = round2((plan.plotDepthM - plan.footprintDepthM) * 0.45);

  // Exterior wall envelope (double-wall 225mm = 0.225m offset)
  addRect('WALLS', offsetX, offsetY, plan.footprintWidthM, plan.footprintDepthM);
  addRect('WALLS', offsetX - 0.225, offsetY - 0.225, plan.footprintWidthM + 0.45, plan.footprintDepthM + 0.45);

  const floor1Rooms = plan.rooms.filter((r) => r.floor === 1);
  for (const room of floor1Rooms) {
    const rx = offsetX + room.xM;
    // Flip Y for CAD positive-up coordinate system
    const ry = offsetY + (plan.footprintDepthM - room.yM - room.depthM);
    addRect('WALLS', rx, ry, room.widthM, room.depthM);
    addText('ROOM_LABELS', rx + 0.4, ry + room.depthM * 0.55, 0.28, `${room.name} (${room.areaM2}m2)`);

    // Window markings on DOORS_WINDOWS layer
    for (const wSide of room.windows) {
      if (wSide === 'N') addLine('DOORS_WINDOWS', rx + room.widthM * 0.3, ry + room.depthM, rx + room.widthM * 0.7, ry + room.depthM);
      if (wSide === 'S') addLine('DOORS_WINDOWS', rx + room.widthM * 0.3, ry, rx + room.widthM * 0.7, ry);
      if (wSide === 'W') addLine('DOORS_WINDOWS', rx, ry + room.depthM * 0.3, rx, ry + room.depthM * 0.7);
      if (wSide === 'E') addLine('DOORS_WINDOWS', rx + room.widthM, ry + room.depthM * 0.3, rx + room.widthM, ry + room.depthM * 0.7);
    }
  }

  addText('ROOM_LABELS', 0.5, plan.plotDepthM + 1.2, 0.4, `${plan.projectName} - CONCEPTUAL SCHEMATIC ONLY (NOT FOR CONSTRUCTION)`);
  push(0, 'ENDSEC', 0, 'EOF');

  return lines.join('\n');
}

export function generateArchitecturePlan(input: ArchitecturePlanInput): ArchitecturePlanResult {
  const typology = input.typology;
  const climate: ClimateProfile = input.climate || 'tropical_west_africa';
  const location = (input.location || 'Lagos / Abuja Climate Zone').trim();
  const isCommercial = ['office_hub', 'retail_plaza', 'studio_broadcast', 'clinic', 'hospitality'].includes(typology);

  const defaultW = isCommercial ? 24 : typology === 'mansion' ? 30 : 18;
  const defaultD = isCommercial ? 36 : typology === 'mansion' ? 40 : 30;
  const plotWidthM = round2(clamp(Number(input.plotWidthM) || defaultW, 9, 120));
  const plotDepthM = round2(clamp(Number(input.plotDepthM) || defaultD, 12, 160));

  const defaultFloors = ['duplex', 'apartment_block', 'office_hub', 'retail_plaza', 'hospitality'].includes(typology) ? 2 : 1;
  const floors = Math.max(1, Math.min(6, Math.round(Number(input.floors) || defaultFloors)));
  const bedrooms = Math.max(1, Math.min(12, Math.round(Number(input.bedrooms) || 4)));

  // Respect realistic boundary setbacks (min 3m front/sides/rear when plot allows)
  const setbackSide = plotWidthM >= 14 ? 3.0 : 1.8;
  const setbackFrontRear = plotDepthM >= 18 ? 4.5 : 2.5;
  const footprintWidthM = round2(clamp(plotWidthM - setbackSide * 2, 6.5, isCommercial ? 28 : 22));
  const footprintDepthM = round2(clamp(plotDepthM - setbackFrontRear * 2, 8.0, isCommercial ? 32 : 24));

  const { clarifyingQuestions, appliedAssumptions } = detectBriefGaps(input);
  const rooms: RoomSpec[] = [];
  for (let f = 1; f <= floors; f++) {
    rooms.push(...buildFloorRooms(typology, f, footprintWidthM, footprintDepthM, bedrooms));
  }

  const totalGrossFloorAreaM2 = round2(footprintWidthM * footprintDepthM * floors);
  const siteCoveragePercent = round2(((footprintWidthM * footprintDepthM) / (plotWidthM * plotDepthM)) * 100);

  const projectName =
    (input.projectName && input.projectName.trim()) ||
    `${typology.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} Concept`;

  const roomSchedule = rooms.map((r) => ({
    floor: r.floor,
    room: r.name,
    zone: r.zone,
    dimensionsM: `${r.widthM}m × ${r.depthM}m`,
    areaM2: r.areaM2,
    ventilation: r.crossVentilated ? `Cross-vent (${r.windows.join('/')})` : r.windows.length ? `Single (${r.windows.join('/')})` : 'Mechanical / Acoustic',
  }));

  const doorWindowSchedule: DoorWindowScheduleItem[] = [
    { tag: 'D1', kind: 'door', spec: 'Double security timber/steel main entry', widthMm: 1500, heightMm: 2400, count: 1, material: 'Hardwood / Steel Core', locations: ['Main Entry'] },
    { tag: 'D2', kind: 'door', spec: 'Internal flush room door', widthMm: 900, heightMm: 2100, count: Math.max(4, rooms.length - 1), material: 'Solid core timber', locations: ['Bedrooms / Suites / Offices'] },
    { tag: 'D3', kind: 'door', spec: 'Moisture-resistant wet area door', widthMm: 750, heightMm: 2100, count: Math.max(2, floors * 2), material: 'Composite / PVC-clad', locations: ['Restrooms / Baths'] },
    { tag: 'W1', kind: 'window', spec: 'Casement / aluminum glazed window with solar hood', widthMm: 1800, heightMm: 1500, count: Math.max(4, floors * 4), material: 'Powder-coated aluminum + Low-E glass', locations: ['Living / Workspaces / Bedrooms'] },
    { tag: 'W2', kind: 'window', spec: 'High-level exhaust & daylight window', widthMm: 900, heightMm: 600, count: Math.max(2, floors * 2), material: 'Frosted casement aluminum', locations: ['Kitchen / Wet Core'] },
  ];

  const materialSuggestions =
    climate === 'tropical_west_africa'
      ? [
          { category: 'Superstructure Wall', recommendation: '225mm vibrated sandcrete hollow blocks with reinforced RC columns', rationale: 'Durable thermal mass and standard regional masonry availability.' },
          { category: 'Roofing & Overhangs', recommendation: 'Long-span insulated aluminum roof sheets with 900mm–1200mm eaves overhang', rationale: 'Reflects high solar radiation and shields walls from driving monsoon rain.' },
          { category: 'Glazing & Shading', recommendation: 'Tinted Low-E double-casement aluminum with projecting concrete sun-breakers', rationale: 'Maximizes natural daylight & cross-ventilation while cutting solar heat gain.' },
          { category: 'Site Drainage', recommendation: 'Permeable interlocking compound pavers + perimeter storm soakaway trenches', rationale: 'Prevents compound flooding during heavy tropical rainfall.' },
        ]
      : climate === 'arid'
      ? [
          { category: 'Envelope', recommendation: 'Insulated double-leaf masonry / AAC thermal blocks', rationale: 'Stabilizes extreme diurnal desert temperature swings.' },
          { category: 'Shading', recommendation: 'Deep recessed courtyard arcades and mashrabiya solar screens', rationale: 'Reduces direct glare and cools incoming air via shaded courtyards.' },
        ]
      : [
          { category: 'Envelope', recommendation: 'Insulated timber/steel frame or cavity brick with R-20+ mineral wool', rationale: 'Maintains seasonal heating/cooling efficiency.' },
          { category: 'Glazing', recommendation: 'Thermally broken double-glazed uPVC/aluminum windows', rationale: 'Prevents winter thermal bridging and condensation.' },
        ];

  const costPerM2Min = isCommercial ? 520 : 380;
  const costPerM2Max = isCommercial ? 880 : 650;
  const minTotal = Math.round(totalGrossFloorAreaM2 * costPerM2Min);
  const maxTotal = Math.round(totalGrossFloorAreaM2 * costPerM2Max);

  const preliminaryBoqGuidance = {
    disclaimer:
      'PRELIMINARY CONCEPT GUIDANCE ONLY — Order-of-magnitude budgeting ranges depend heavily on soil bearing capacity, foundation depth, finish specification, and regional material inflation. Engage a licensed Quantity Surveyor for tender BOQ.',
    estimatedTotalRangeUsd: [minTotal, maxTotal] as [number, number],
    lineItems: [
      { element: 'Substructure & Foundations', basis: `Approx. 18% of GFA (${totalGrossFloorAreaM2}m²)`, estimatedRangeUsd: [Math.round(minTotal * 0.18), Math.round(maxTotal * 0.18)] as [number, number] },
      { element: 'Concrete Frame, Slabs & Masonry', basis: `Approx. 34% (${floors} floor(s))`, estimatedRangeUsd: [Math.round(minTotal * 0.34), Math.round(maxTotal * 0.34)] as [number, number] },
      { element: 'Roofing, Ceiling & Waterproofing', basis: 'Approx. 14%', estimatedRangeUsd: [Math.round(minTotal * 0.14), Math.round(maxTotal * 0.14)] as [number, number] },
      { element: 'MEP (Plumbing, Electrical, Solar/AC rough-in)', basis: 'Approx. 16%', estimatedRangeUsd: [Math.round(minTotal * 0.16), Math.round(maxTotal * 0.16)] as [number, number] },
      { element: 'Finishes, Doors, Windows & Compound Works', basis: 'Approx. 18%', estimatedRangeUsd: [Math.round(minTotal * 0.18), Math.round(maxTotal * 0.18)] as [number, number] },
    ],
  };

  const passiveClimateStrategies =
    climate === 'tropical_west_africa'
      ? [
          'Orient major bedrooms and living spaces along prevailing SW-NE breeze axis with dual-aspect openings.',
          'Cluster kitchens, bathrooms, and plumbing shafts along a single service spine to simplify waste lines and waterproofing.',
          'Minimize large unshaded West-facing windows to avoid intense afternoon thermal load.',
          ...(input.includeSolarRoof !== false ? ['Reserve South/pitch roof plane unobstructed for solar PV array + battery/inverter ventilation room.'] : []),
        ]
      : ['Optimize South/North solar gain ratios and compact wet-wall service cores.'];

  const structuralAndSiteNotes = [
    `Site coverage is ${siteCoveragePercent}% (${round2(footprintWidthM * footprintDepthM)}m² footprint on ${round2(plotWidthM * plotDepthM)}m² plot), leaving perimeter setbacks for daylight, ventilation, and drainage.`,
    floors > 1
      ? 'Multi-floor wet cores and stairwells are vertically stacked across all floors to maintain continuous structural load paths and shared plumbing stacks.'
      : 'Single-level structural layout simplifies strip/raft footing loads and future vertical extension assessment (requires engineer review).',
    'Verify local town-planning setback distances, flood elevation levels, and borehole/septic separation distances on your surveyed site plan.',
  ];

  const workflowStages: WorkflowStageStatus[] = [
    { stageNumber: 1, name: 'Conceptual Brief & Massing', status: 'COMPLETED', description: 'Program zones, plot coverage, climate strategy, and spatial brief established.' },
    { stageNumber: 2, name: 'Schematic Floor Plan & DXF', status: 'CURRENT', description: 'Non-overlapping SVG layout, AutoCAD DXF R12 geometry, and room/door schedules generated.' },
    { stageNumber: 3, name: 'Design Development (Arch & MEP)', status: 'PENDING_PRO_SIGN_OFF', description: 'Detailed elevations, sections, lighting/HVAC sizing, and landscape coordination.' },
    { stageNumber: 4, name: 'Structural & Geotech Review', status: 'PENDING_PRO_SIGN_OFF', description: 'Soil test, foundation design, beam/column reinforcement schedules by structural engineer.' },
    { stageNumber: 5, name: 'Construction-Ready & Permit Filing', status: 'PENDING_PRO_SIGN_OFF', description: 'Stamped working drawings, statutory building permit submission, and QS tender BOQ.' },
  ];

  const honestyDisclaimer =
    'ANNY Architectural Planning provides conceptual/schematic layouts, preliminary schedules, and CAD DXF R12 geometry for early planning. It is NOT a stamped construction drawing set, structural engineering certification, or legal building code compliance approval.';

  const svgFloorPlan = generateArchitecturalSvg({
    projectName,
    typology,
    plotWidthM,
    plotDepthM,
    footprintWidthM,
    footprintDepthM,
    rooms,
  });

  const floorToFloorM = climate === 'tropical_west_africa' ? 3.15 : 3.0;
  const plinthHeightM = 0.6;
  const eaveOverhangMm = climate === 'tropical_west_africa' ? 1050 : 600;
  const ridgeHeightM = round2(plinthHeightM + floors * floorToFloorM + 2.1);

  const elevationAndSectionSummary = {
    floorToFloorM,
    plinthHeightM,
    eaveOverhangMm,
    ridgeHeightM,
    sectionAxis: `Section A-A cuts North-South through vertical stair & wet-core spine (${footprintDepthM}m depth, ${floors} floor(s)).`,
  };

  const svgFrontElevation = generateElevationSvg({
    projectName,
    floors,
    footprintWidthM,
    floorToFloorM,
    plinthHeightM,
    eaveOverhangMm,
    ridgeHeightM,
  });

  const dxfR12Content = generateArchitecturalDxf({
    projectName,
    plotWidthM,
    plotDepthM,
    footprintWidthM,
    footprintDepthM,
    rooms,
  });

  return {
    projectName,
    typology,
    climate,
    location,
    plotWidthM,
    plotDepthM,
    footprintWidthM,
    footprintDepthM,
    floors,
    totalGrossFloorAreaM2,
    siteCoveragePercent,
    appliedAssumptions,
    clarifyingQuestions,
    rooms,
    roomSchedule,
    doorWindowSchedule,
    materialSuggestions,
    preliminaryBoqGuidance,
    passiveClimateStrategies,
    structuralAndSiteNotes,
    workflowStages,
    honestyDisclaimer,
    elevationAndSectionSummary,
    svgFloorPlan,
    svgFrontElevation,
    dxfR12Content,
  };
}

export function exportArchitecturalReportMarkdown(plan: ArchitecturePlanResult): string {
  return [
    `# ${plan.projectName} — Conceptual Architectural Project Brief & Documentation`,
    '',
    `> **IMPORTANT NOTICE:** ${plan.honestyDisclaimer}`,
    '',
    `## 1. Site & Massing Summary`,
    `- **Typology:** ${plan.typology.replace(/_/g, ' ')}`,
    `- **Location / Climate:** ${plan.location} (${plan.climate})`,
    `- **Plot Dimensions:** ${plan.plotWidthM}m × ${plan.plotDepthM}m`,
    `- **Building Footprint:** ${plan.footprintWidthM}m × ${plan.footprintDepthM}m (${plan.siteCoveragePercent}% site coverage)`,
    `- **Floors / Gross Floor Area:** ${plan.floors} floor(s), ${plan.totalGrossFloorAreaM2} m² GFA`,
    `- **Elevation & Section Datums:** Plinth +${plan.elevationAndSectionSummary.plinthHeightM}m, Floor-to-Floor ${plan.elevationAndSectionSummary.floorToFloorM}m, Eave Overhang ${plan.elevationAndSectionSummary.eaveOverhangMm}mm, Ridge +${plan.elevationAndSectionSummary.ridgeHeightM}m`,
    `- **Section Cut A-A:** ${plan.elevationAndSectionSummary.sectionAxis}`,
    '',
    `## 2. Applied Assumptions & Brief Clarifications`,
    ...(plan.appliedAssumptions.length ? plan.appliedAssumptions.map((a) => `- Assumption: ${a}`) : ['- All key brief inputs explicitly supplied.']),
    ...(plan.clarifyingQuestions.length ? ['', '### Open Clarifying Questions', ...plan.clarifyingQuestions.map((q) => `- ${q}`)] : []),
    '',
    `## 3. Room Schedule`,
    '| Floor | Room | Zone | Dimensions | Area (m²) | Ventilation |',
    '|---|---|---|---|---|---|',
    ...plan.roomSchedule.map((r) => `| ${r.floor} | ${r.room} | ${r.zone} | ${r.dimensionsM} | ${r.areaM2} | ${r.ventilation} |`),
    '',
    `## 4. Door & Window Schedule`,
    '| Tag | Kind | Specification | Size (mm) | Qty | Material |',
    '|---|---|---|---|---|---|',
    ...plan.doorWindowSchedule.map((d) => `| ${d.tag} | ${d.kind} | ${d.spec} | ${d.widthMm}×${d.heightMm} | ${d.count} | ${d.material} |`),
    '',
    `## 5. Climate Strategy & Structural / Site Notes`,
    ...plan.passiveClimateStrategies.map((s) => `- ${s}`),
    ...plan.structuralAndSiteNotes.map((s) => `- ${s}`),
    '',
    `## 6. Preliminary BOQ Guidance`,
    `${plan.preliminaryBoqGuidance.disclaimer}`,
    `- **Estimated Conceptual Range:** $${plan.preliminaryBoqGuidance.estimatedTotalRangeUsd[0].toLocaleString()} – $${plan.preliminaryBoqGuidance.estimatedTotalRangeUsd[1].toLocaleString()} USD`,
    ...plan.preliminaryBoqGuidance.lineItems.map((li) => `- **${li.element}** (${li.basis}): $${li.estimatedRangeUsd[0].toLocaleString()} – $${li.estimatedRangeUsd[1].toLocaleString()}`),
    '',
    `## 7. 5-Stage Professional Workflow Tracker`,
    ...plan.workflowStages.map((w) => `- Stage ${w.stageNumber} (${w.name}): **${w.status}** — ${w.description}`),
  ].join('\n');
}
