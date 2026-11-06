export const TOTAL_LEVELS = 500;
export const DEFAULT_SPIRE_SEED = 739281;

export type BiomeId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type StepSurfaceTheme =
  | 'sanctuary'
  | 'clockwork'
  | 'aqueduct'
  | 'causeway'
  | 'quartz'
  | 'orrery'
  | 'anomaly'
  | 'crucible'
  | 'nimbus'
  | 'monolith';

export type StepHazardType =
  | 'none'       // Solid carved sanctuary monolith
  | 'pusher'     // Recessed bronze hydraulic piston ram with floor track
  | 'sweeper'    // Central rotating brass clockwork sweeper beam
  | 'log'        // Gliding aerial gondola mounted on a visible horizontal rail
  | 'conveyor'   // Carved roller belt that slides the player toward the edge while charging
  | 'turntable'  // Rotating bronze sundial compass that turns player aimAngle
  | 'blinker'    // Phase-blinking ether monolith that cycles between solid and intangible
  | 'ice'        // Mirror quartz low-friction slab
  | 'barrier'    // Central carved stone obelisk requiring an angled jump or side-step
  | 'glitch'     // Phase-jittering & control-inverting anomaly block
  | 'crumble'    // Fractured sandstone slab that trembles 1.25s then collapses
  | 'wind'       // Shifting gale vortex
  | 'bouncer';   // Repulsor rune rim that ricochets sloppy edge landings

export type VehicleStyle =
  | 'golem'
  | 'chariot'
  | 'sentinel'
  | 'scarab'
  | 'pendulum'
  | 'meteor';

export interface DecoyLedge {
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  trapType: 'shatter' | 'repulsor';
}

export interface LevelStep {
  stepNumber: number; // 1 to 500
  biome: BiomeId;
  surfaceTheme: StepSurfaceTheme;
  title: string;
  psychologicalTrap: string;
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  friction: number;
  restitution: number;
  chargeSpeedMultiplier: number;
  hazard: StepHazardType;
  vehicleStyle: VehicleStyle;
  hazardSpeed: number;
  hazardAmplitude: number;
  hazardPhase: number;
  conveyorDirX: number;
  conveyorDirZ: number;
  hasTreeLeft: boolean;
  hasTreeRight: boolean;
  hasBarrierCenter: boolean;
  decoyLedge?: DecoyLedge;
  dirX: number;
  dirZ: number;
  turnAngleDeg: number;
  horizGap: number;
  clearGap: number;
  vertRise: number;
  topColorHex: number;
  topAltColorHex: number;
  sideColorHex: number;
  accentHex: number;
}

export interface BiomeBlueprint {
  biome: BiomeId;
  name: string;
  range: string;
  subtitle: string;
  themeColor: string;
  surfaceTheme: StepSurfaceTheme;
  coreIrritationMechanic: string;
}

export const BIOME_BLUEPRINTS: BiomeBlueprint[] = [
  {
    biome: 1,
    name: '01. Emerald Gorge Sanctuary',
    range: 'Steps 001 – 050',
    subtitle: 'Mossy Stone Terraces · Sundials, Obelisks & Piston Rams',
    themeColor: '#10b981',
    surfaceTheme: 'sanctuary',
    coreIrritationMechanic:
      'Well-spaced mossy stone monoliths rising along a switchback trail above the rushing river gorge. Introduces rotating sundials, central obelisks, and telegraphed stone piston rams.',
  },
  {
    biome: 2,
    name: '02. Terracotta Clockwork Citadel',
    range: 'Steps 051 – 100',
    subtitle: 'Crimson & Brass Plinths · Clockwork Sweepers & Conveyors',
    themeColor: '#ea580c',
    surfaceTheme: 'clockwork',
    coreIrritationMechanic:
      'Rotating brass sweeper beams and sundial turntables paired with stone roller belts that slide your vessel toward the cornice while charging.',
  },
  {
    biome: 3,
    name: '03. Azure Waterfall Aqueducts',
    range: 'Steps 101 – 150',
    subtitle: 'Turquoise Basins · Gliding Rail Gondolas & Repulsors',
    themeColor: '#06b6d4',
    surfaceTheme: 'aqueduct',
    coreIrritationMechanic:
      'Aerial stone gondolas gliding along suspended brass rails—time your vault so the moving plinth slides under your landing ring.',
  },
  {
    biome: 4,
    name: '04. Obsidian Piston Causeway',
    range: 'Steps 151 – 200',
    subtitle: 'Basalt Tiers · Heavy Hydraulic Rams & Fractured Slabs',
    themeColor: '#f43f5e',
    surfaceTheme: 'causeway',
    coreIrritationMechanic:
      'Recessed basalt piston rams ignite with crimson warning runes before thrusting across the causeway to hurl lingering climbers into lower tiers.',
  },
  {
    biome: 5,
    name: '05. Frosted Quartz Reliquary',
    range: 'Steps 201 – 250',
    subtitle: 'Mirror Quartz Slabs · Low Friction & Repulsor Rims',
    themeColor: '#38bdf8',
    surfaceTheme: 'quartz',
    coreIrritationMechanic:
      'Polished 0.22μ mirror-quartz slabs combined with repulsor rune rims that ricochet off-center landings down the spire.',
  },
  {
    biome: 6,
    name: '06. Suspended Brass Orrery',
    range: 'Steps 251 – 300',
    subtitle: 'Gilded Scaffolding · Clockwork Scythes & Crumble Stone',
    themeColor: '#f59e0b',
    surfaceTheme: 'orrery',
    coreIrritationMechanic:
      'Fractured sandstone ledges that tremble and collapse 1.25s after touchdown, chained into rotating brass clockwork sweepers.',
  },
  {
    biome: 7,
    name: '07. Phase-Shift Anomaly Spire',
    range: 'Steps 301 – 350',
    subtitle: 'Ether Monoliths · Phase Blink-Stones & Inverted Aim',
    themeColor: '#a855f7',
    surfaceTheme: 'anomaly',
    coreIrritationMechanic:
      'Reality-warping violet plinths that cycle between solid stone and intangible ether on a visible rune rhythm.',
  },
  {
    biome: 8,
    name: '08. Crucible of Hephaestus',
    range: 'Steps 351 – 400',
    subtitle: 'Molten Forge Tiers · Twin Pistons & Fast Roller Belts',
    themeColor: '#f97316',
    surfaceTheme: 'crucible',
    coreIrritationMechanic:
      'High-speed bronze forge pistons and directional roller belts suspended above a 350-step vertical drop.',
  },
  {
    biome: 9,
    name: '09. Tempest Nimbus Sanctum',
    range: 'Steps 401 – 450',
    subtitle: 'Cloud-Cut Pillars · Shifting Gale Crosswinds & Gondolas',
    themeColor: '#6366f1',
    surfaceTheme: 'nimbus',
    coreIrritationMechanic:
      'Turbulent crosswinds curve your airborne trajectory between narrow cloud pillars and gliding aerial gondolas.',
  },
  {
    biome: 10,
    name: '10. The Monolith of Nothing',
    range: 'Steps 451 – 500',
    subtitle: 'Celestial Gilded Spire · The Final Unpredictable Gauntlet',
    themeColor: '#eab308',
    surfaceTheme: 'monolith',
    coreIrritationMechanic:
      'Synthesizes turntables, roller belts, rail gondolas, phase-blinkers, and shifting winds up to Step 500, where the philosophical truth awaits.',
  },
];

export const PHILOSOPHICAL_ENDING_QUOTE =
  'All of this just for a win? You have learned nothing.';

export const PHILOSOPHICAL_TAUNTS: {
  minStepsLost: number;
  quote: string;
  author: string;
}[] = [
  {
    minStepsLost: 1,
    quote: 'You tried to memorize a rhythm on a mountain that refuses to repeat itself.',
    author: 'Notes on Falling, I',
  },
  {
    minStepsLost: 2,
    quote: 'At least the lower monolith broke your fall. And your illusion of mastery.',
    author: 'On Precision, IV',
  },
  {
    minStepsLost: 4,
    quote: 'You were already celebrating the next tier before your vessel touched the stone.',
    author: 'The Architecture of Ego',
  },
  {
    minStepsLost: 7,
    quote: 'Notice how quickly your pride turns into blaming the wind or the turntable.',
    author: 'Meditations on Kinetics',
  },
  {
    minStepsLost: 12,
    quote: 'Look up. The spire just shifted its timing while you were tumbling.',
    author: 'Treatise on Living Stone',
  },
  {
    minStepsLost: 20,
    quote: 'Everything you just lost existed only in your expectation of keeping it.',
    author: 'Sunk Cost Monologues',
  },
  {
    minStepsLost: 35,
    quote: 'Sisyphus had a boulder. You have a spacebar and five hundred shifting monoliths.',
    author: 'Fragments of the Spire',
  },
  {
    minStepsLost: 60,
    quote: 'Ten minutes of focus erased by a single greedy millisecond of overcharge.',
    author: 'Entropy in Isometric Space',
  },
  {
    minStepsLost: 100,
    quote: 'You could close the tab right now and be free. Yet here you are, charging another vault.',
    author: 'The Voluntary Cage',
  },
  {
    minStepsLost: 180,
    quote: 'To tumble across three architectural eras in four seconds is a masterclass in futility.',
    author: 'Book of the Monolith, CDXCIX',
  },
];

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BIOME_PALETTES: Record<
  BiomeId,
  {
    top: number;
    topAlt: number;
    side: number;
    accent: number;
    theme: StepSurfaceTheme;
  }
> = {
  1: {
    top: 0x52b788,
    topAlt: 0x40916c,
    side: 0x6b5b45,
    accent: 0xd97706,
    theme: 'sanctuary',
  },
  2: {
    top: 0xe76f51,
    topAlt: 0xc8553d,
    side: 0x5c3728,
    accent: 0xf4a261,
    theme: 'clockwork',
  },
  3: {
    top: 0x2ec4b6,
    topAlt: 0x20968b,
    side: 0x1b4d4a,
    accent: 0xffbf69,
    theme: 'aqueduct',
  },
  4: {
    top: 0x4a4e69,
    topAlt: 0x34374c,
    side: 0x22223b,
    accent: 0xf43f5e,
    theme: 'causeway',
  },
  5: {
    top: 0x90e0ef,
    topAlt: 0x48cae4,
    side: 0x0077b6,
    accent: 0xcaf0f8,
    theme: 'quartz',
  },
  6: {
    top: 0xe9c46a,
    topAlt: 0xd4a359,
    side: 0x6c461f,
    accent: 0xf4a261,
    theme: 'orrery',
  },
  7: {
    top: 0x7209b7,
    topAlt: 0x560bad,
    side: 0x240046,
    accent: 0xf72585,
    theme: 'anomaly',
  },
  8: {
    top: 0x6d597a,
    topAlt: 0x4f3f59,
    side: 0x2b2024,
    accent: 0xf97316,
    theme: 'crucible',
  },
  9: {
    top: 0x8ecae6,
    topAlt: 0x62b6cb,
    side: 0x1b4965,
    accent: 0xffb703,
    theme: 'nimbus',
  },
  10: {
    top: 0xfcefb4,
    topAlt: 0xf3d57c,
    side: 0x85581a,
    accent: 0xf59e0b,
    theme: 'monolith',
  },
};

export const GROUND_FLOOR_Y = -1.35;
export const GROUND_SPAWN_X = -1.45;
export const GROUND_SPAWN_Z = 2.85;

export const GROUND_STEP_META: LevelStep = {
  stepNumber: 0,
  biome: 1,
  title: 'Sanctuary Ground Floor (Base Camp)',
  x: GROUND_SPAWN_X,
  y: GROUND_FLOOR_Y,
  z: GROUND_SPAWN_Z,
  width: 6.0,
  depth: 6.0,
  height: 0.4,
  dirX: 0.453,
  dirZ: -0.891,
  turnAngleDeg: 0,
  horizGap: 3.19,
  clearGap: 1.35,
  vertRise: 0.9,
  chargeSpeedMultiplier: 1.0,
  surfaceTheme: 'sanctuary',
  hazard: 'none',
  friction: 0.92,
  restitution: 0.15,
  hazardSpeed: 0,
  hazardPhase: 0,
  hazardAmplitude: 0,
  vehicleStyle: 'golem',
  hasTreeLeft: false,
  hasTreeRight: false,
  hasBarrierCenter: false,
  conveyorDirX: 0,
  conveyorDirZ: 0,
  decoyLedge: undefined,
  topColorHex: 0x52b788,
  topAltColorHex: 0x40916c,
  sideColorHex: 0x7f5539,
  accentHex: 0xd97706,
  psychologicalTrap:
    'Vault up from the Sanctuary Ground Floor onto Step 1 to begin your 500-step ascent.',
};

export function generate500Levels(seed = DEFAULT_SPIRE_SEED): LevelStep[] {
  const rng = mulberry32(seed);
  const steps: LevelStep[] = [];

  let curX = 0;
  // Step 1 sits 0.90m above the Sanctuary Ground Floor (GROUND_FLOOR_Y = -1.35 -> Step 1 y = -0.45)
  let curY = -0.45;
  let curZ = 0;
  // In isometric projection (camera at +X, +Y, +Z),
  // heading = -1.15 rad (+X, -Z) climbs cleanly UP-RIGHT on screen,
  // and heading = -2.45 rad (-X, -Z) climbs cleanly UP-LEFT on screen!
  let headingRad = -1.12;
  let switchbackLegRemaining = 3;
  let switchbackSide: 1 | -1 = 1; // 1 = Up-Right leg (-1.15 rad), -1 = Up-Left leg (-2.50 rad)

  for (let i = 1; i <= TOTAL_LEVELS; i++) {
    const biome = Math.min(10, Math.ceil(i / 50)) as BiomeId;
    const pal = BIOME_PALETTES[biome];

    const isMilestone = i === 1 || i % 25 === 0 || i === TOTAL_LEVELS;
    const sizeVarW = (rng() - 0.5) * 0.2;
    const sizeVarD = (rng() - 0.5) * 0.2;

    let width = isMilestone
      ? 2.25
      : Math.max(1.5, 2.02 - biome * 0.035 + sizeVarW);
    let depth = isMilestone
      ? 2.25
      : Math.max(1.5, 2.02 - biome * 0.035 + sizeVarD);

    if (i === 1) {
      width = 2.35;
      depth = 2.35;
    } else if (i <= 5) {
      width = 2.05;
      depth = 2.05;
    } else if (i === TOTAL_LEVELS) {
      width = 3.0;
      depth = 3.0;
    }

    let turnAngleDeg = 0;
    let horizGap = i === 1 ? 3.19 : 0;
    let clearGap = i === 1 ? 1.35 : 0;
    let vertRise = i === 1 ? 0.9 : 0;
    let dx = Number(Math.cos(headingRad).toFixed(4));
    let dz = Number(Math.sin(headingRad).toFixed(4));

    if (i > 1) {
      const prevStep = steps[i - 2];
      const prevRadius = Math.max(prevStep.width, prevStep.depth) * 0.5;
      const curRadius = Math.max(width, depth) * 0.5;

      // Guaranteed edge-to-edge air gap between 1.15m and 1.75m
      // Center-to-center horizGap = ~3.10m..3.75m (always 100% reachable at 48%..68% charge!)
      if (i === 2) {
        clearGap = 1.25;
        vertRise = 0.88;
      } else if (i <= 5) {
        clearGap = 1.22 + rng() * 0.28;
        vertRise = 0.86 + rng() * 0.16;
      } else {
        const gapRoll = rng();
        if (gapRoll < 0.34) {
          clearGap = 1.15 + rng() * 0.25;
          vertRise = 0.96 + rng() * 0.2;
        } else if (gapRoll < 0.74) {
          clearGap = 1.32 + rng() * 0.3;
          vertRise = 0.84 + rng() * 0.18;
        } else {
          clearGap = 1.52 + rng() * 0.28;
          vertRise = 0.74 + rng() * 0.16;
        }
      }

      horizGap = prevRadius + curRadius + clearGap;

      switchbackLegRemaining--;
      if (switchbackLegRemaining <= 0) {
        switchbackSide = switchbackSide === 1 ? -1 : 1;
        switchbackLegRemaining = 2 + Math.floor(rng() * 3); // 2 to 4 steps per switchback leg
      }

      // Target heading climbs UP-SCREEN (away from camera in +X/+Z) while weaving Left and Right
      const targetBaseHeading =
        i === 2
          ? -1.12
          : switchbackSide === 1
          ? -1.08 + (rng() - 0.5) * 0.42
          : -2.52 + (rng() - 0.5) * 0.42;

      const diffToTarget = Math.atan2(
        Math.sin(targetBaseHeading - headingRad),
        Math.cos(targetBaseHeading - headingRad)
      );
      const nextHeading = headingRad + diffToTarget;
      turnAngleDeg = Math.round((diffToTarget * 180) / Math.PI);
      headingRad = nextHeading;

      dx = Number(Math.cos(headingRad).toFixed(4));
      dz = Number(Math.sin(headingRad).toFixed(4));

      curX += dx * horizGap;
      curZ += dz * horizGap;
      curY += vertRise;
    }

    let hazard: StepHazardType = 'none';
    let friction = 0.92;
    let restitution = 0.15;
    let hazardSpeed = 0;
    let hazardAmplitude = 0;
    const vehicleStyle: VehicleStyle = 'golem';
    let hasTreeLeft = false;
    let hasTreeRight = false;
    let hasBarrierCenter = false;
    let conveyorDirX = -dz;
    let conveyorDirZ = dx;

    const chargeSpeedMultiplier =
      i <= 4 ? 1.0 : Number((0.88 + rng() * 0.32).toFixed(2));

    if (i <= 3 || isMilestone) {
      hazard = 'none';
      hasTreeLeft = i === 1 || i % 25 === 0;
      hasTreeRight = i % 50 === 0;
    } else {
      const hRoll = rng();
      hasTreeLeft = rng() < 0.24;
      hasTreeRight = rng() < 0.2;

      if (biome === 1) {
        if (hRoll < 0.3) {
          hazard = 'none';
        } else if (hRoll < 0.5) {
          hazard = 'turntable';
          hazardSpeed = (rng() < 0.5 ? 1 : -1) * (0.95 + rng() * 0.45);
        } else if (hRoll < 0.68) {
          hazard = 'pusher';
          hazardSpeed = 1.8 + rng() * 0.5;
          hazardAmplitude = 0.85;
        } else if (hRoll < 0.85) {
          hazard = 'barrier';
          hasBarrierCenter = true;
        } else {
          hazard = 'crumble';
        }
      } else if (biome === 2) {
        if (hRoll < 0.3) {
          hazard = 'turntable';
          hazardSpeed = (rng() < 0.5 ? 1 : -1) * (1.25 + rng() * 0.6);
        } else if (hRoll < 0.56) {
          hazard = 'sweeper';
          hazardSpeed = (rng() < 0.5 ? 1 : -1) * (1.65 + rng() * 0.65);
        } else if (hRoll < 0.8) {
          hazard = 'conveyor';
          hazardSpeed = 1.25 + rng() * 0.5;
          const angle = rng() * Math.PI * 2;
          conveyorDirX = Math.cos(angle);
          conveyorDirZ = Math.sin(angle);
        } else {
          hazard = 'bouncer';
          restitution = 0.85;
        }
      } else if (biome === 3) {
        if (hRoll < 0.36) {
          hazard = 'log';
          hazardSpeed = 1.35 + rng() * 0.65;
          hazardAmplitude = 0.55 + rng() * 0.25;
        } else if (hRoll < 0.6) {
          hazard = 'conveyor';
          hazardSpeed = 1.35 + rng() * 0.5;
        } else if (hRoll < 0.8) {
          hazard = 'barrier';
          hasBarrierCenter = true;
        } else {
          hazard = 'ice';
          friction = 0.25;
        }
      } else if (biome === 4) {
        if (hRoll < 0.36) {
          hazard = 'pusher';
          hazardSpeed = 2.1 + rng() * 0.6;
          hazardAmplitude = 0.92;
        } else if (hRoll < 0.64) {
          hazard = 'sweeper';
          hazardSpeed = (rng() < 0.5 ? 1 : -1) * (1.85 + rng() * 0.7);
        } else if (hRoll < 0.84) {
          hazard = 'turntable';
          hazardSpeed = (rng() < 0.5 ? 1 : -1) * (1.45 + rng() * 0.65);
        } else {
          hazard = 'crumble';
        }
      } else if (biome === 5) {
        friction = 0.22;
        if (hRoll < 0.3) {
          hazard = 'pusher';
          hazardSpeed = 2.1 + rng() * 0.6;
          hazardAmplitude = 0.88;
        } else if (hRoll < 0.58) {
          hazard = 'bouncer';
          restitution = 0.88;
        } else if (hRoll < 0.8) {
          hazard = 'turntable';
          hazardSpeed = (rng() < 0.5 ? 1 : -1) * 1.4;
        } else {
          hazard = 'ice';
        }
      } else if (biome === 6) {
        if (hRoll < 0.32) {
          hazard = 'crumble';
        } else if (hRoll < 0.64) {
          hazard = 'sweeper';
          hazardSpeed = (rng() < 0.5 ? 1 : -1) * (1.9 + rng() * 0.75);
        } else if (hRoll < 0.84) {
          hazard = 'conveyor';
          hazardSpeed = 1.5 + rng() * 0.5;
        } else {
          hazard = 'barrier';
          hasBarrierCenter = true;
        }
      } else if (biome === 7) {
        if (hRoll < 0.38) {
          hazard = 'blinker';
          hazardSpeed = 1.15 + rng() * 0.5;
        } else if (hRoll < 0.72) {
          hazard = 'glitch';
          hazardSpeed = 2.6 + rng() * 0.7;
          hazardAmplitude = 0.55;
        } else {
          hazard = 'turntable';
          hazardSpeed = (rng() < 0.5 ? 1 : -1) * 1.75;
        }
      } else if (biome === 8) {
        if (hRoll < 0.34) {
          hazard = 'pusher';
          hazardSpeed = 2.35 + rng() * 0.65;
          hazardAmplitude = 0.95;
        } else if (hRoll < 0.62) {
          hazard = 'conveyor';
          hazardSpeed = 1.65 + rng() * 0.5;
        } else if (hRoll < 0.84) {
          hazard = 'bouncer';
          restitution = 0.9;
        } else {
          hazard = 'crumble';
        }
      } else if (biome === 9) {
        if (hRoll < 0.36) {
          hazard = 'wind';
          hazardSpeed = 2.2 + rng() * 0.8;
        } else if (hRoll < 0.64) {
          hazard = 'log';
          hazardSpeed = 1.5 + rng() * 0.6;
          hazardAmplitude = 0.6 + rng() * 0.25;
        } else if (hRoll < 0.84) {
          hazard = 'sweeper';
          hazardSpeed = 2.1 + rng() * 0.65;
        } else {
          hazard = 'blinker';
          hazardSpeed = 1.25 + rng() * 0.45;
        }
      } else {
        friction = rng() < 0.32 ? 0.24 : 0.88;
        if (hRoll < 0.2) {
          hazard = 'pusher';
          hazardSpeed = 2.45;
          hazardAmplitude = 0.95;
        } else if (hRoll < 0.38) {
          hazard = 'blinker';
          hazardSpeed = 1.35;
        } else if (hRoll < 0.56) {
          hazard = 'turntable';
          hazardSpeed = (rng() < 0.5 ? 1 : -1) * 1.85;
        } else if (hRoll < 0.74) {
          hazard = 'conveyor';
          hazardSpeed = 1.75;
        } else if (hRoll < 0.88) {
          hazard = 'sweeper';
          hazardSpeed = 2.25;
        } else {
          hazard = 'glitch';
          hazardSpeed = 2.8;
          hazardAmplitude = 0.6;
        }
      }
    }

    let decoyLedge: DecoyLedge | undefined;
    if (i > 12 && i < TOTAL_LEVELS - 1 && rng() < 0.16) {
      const sideSign = rng() < 0.5 ? 1 : -1;
      const decoyAngle = headingRad + sideSign * (1.2 + rng() * 0.35);
      const decoyDist = 3.2 + rng() * 0.5;
      decoyLedge = {
        x: Number((curX + Math.cos(decoyAngle) * decoyDist).toFixed(2)),
        y: Number((curY + 0.35 + rng() * 0.3).toFixed(2)),
        z: Number((curZ + Math.sin(decoyAngle) * decoyDist).toFixed(2)),
        width: 1.4,
        depth: 1.4,
        trapType: rng() < 0.5 ? 'shatter' : 'repulsor',
      };
    }

    let topColorHex = pal.top;
    let topAltColorHex = pal.topAlt;
    let sideColorHex = pal.side;
    let accentHex = pal.accent;

    if (hazard === 'pusher') {
      topColorHex = 0x64594b;
      topAltColorHex = 0x52483c;
      sideColorHex = 0x3b332b;
      accentHex = 0xf43f5e;
    } else if (hazard === 'sweeper') {
      topColorHex = 0xc87d55;
      topAltColorHex = 0xb06944;
      sideColorHex = 0x5c3728;
      accentHex = 0xfbbf24;
    } else if (hazard === 'log') {
      topColorHex = 0x9c6644;
      topAltColorHex = 0x7f5539;
      sideColorHex = 0x582f0e;
      accentHex = 0x38bdf8;
    } else if (hazard === 'conveyor') {
      topColorHex = 0x6b4c35;
      topAltColorHex = 0x523a28;
      sideColorHex = 0x422d1d;
      accentHex = 0xf59e0b;
    } else if (hazard === 'turntable') {
      topColorHex = 0xd4a359;
      topAltColorHex = 0xb8863b;
      sideColorHex = 0x784b10;
      accentHex = 0xfef08a;
    } else if (hazard === 'blinker') {
      topColorHex = 0x6d28d9;
      topAltColorHex = 0x5b21b6;
      sideColorHex = 0x2e1065;
      accentHex = 0x38bdf8;
    } else if (hazard === 'glitch') {
      topColorHex = 0x4c1d95;
      topAltColorHex = 0x3b0764;
      sideColorHex = 0x1e1b4b;
      accentHex = 0xe879f9;
    } else if (hazard === 'ice') {
      topColorHex = 0x7dd3fc;
      topAltColorHex = 0x38bdf8;
      sideColorHex = 0x0284c7;
      accentHex = 0xe0f2fe;
    }

    const hazardDescriptions: Record<StepHazardType, { t: string; p: string }> =
      {
        none: {
          t:
            i === 1
              ? 'Sanctuary Trailhead'
              : i === 500
              ? 'The Monolith of Nothing'
              : `Sanctuary Monolith ${i}`,
          p:
            i === 500
              ? 'The 500th summit monolith. Delivers the final philosophical verdict.'
              : `Carved stone terrace (${clearGap.toFixed(1)}m air gap, ${turnAngleDeg}° turn) overlooking the emerald gorge.`,
        },
        pusher: {
          t: `Hydraulic Ram ${i}`,
          p: 'Recessed bronze temple piston glows crimson for 0.6s before thrusting across the stone track.',
        },
        sweeper: {
          t: `Clockwork Sweeper ${i}`,
          p: 'Central rotating brass beam sweeps across the monolith—time your landing and vault over or behind the arm.',
        },
        log: {
          t: `Aerial Rail Gondola ${i}`,
          p: 'Glides along a suspended brass rail bar—align your green landing ring as the plinth slides into range.',
        },
        conveyor: {
          t: `Roller Belt Slab ${i}`,
          p: 'Carved stone rollers continuously slide your vessel toward the cornice while you charge.',
        },
        turntable: {
          t: `Sundial Turntable ${i}`,
          p: 'Rotating bronze compass dial turns your launch angle—release Space when your green ring aligns on the next beacon.',
        },
        blinker: {
          t: `Ether Blink-Stone ${i}`,
          p: 'Cycles between solid stone and empty ether—vault while the monolith is fully materialized.',
        },
        ice: {
          t: `Mirror Quartz ${i}`,
          p: 'Polished crystal slab (0.22μ) preserves landing momentum—brake with WASD before charging.',
        },
        barrier: {
          t: `Obelisk Pillar ${i}`,
          p: 'Carved central rune obelisk blocks direct low vaults—step around with A/D or vault high over the shoulder.',
        },
        glitch: {
          t: `Anomaly Plinth ${i}`,
          p: 'Reality-warping block that phase-jitters and inverts directional steering while grounded.',
        },
        crumble: {
          t: `Fractured Sandstone ${i}`,
          p: 'Cracked terracotta tiles tremble for 1.25s on touchdown before dropping into the chasm.',
        },
        wind: {
          t: `Tempest Vortex ${i}`,
          p: 'Swirling crosswind gusts curve your airborne trajectory—use the live green landing ring to compensate.',
        },
        bouncer: {
          t: `Repulsor Rim ${i}`,
          p: 'High-restitution rune border ricochets sloppy edge landings—aim squarely inside the green target ring.',
        },
      };

    const desc = hazardDescriptions[hazard];

    steps.push({
      stepNumber: i,
      biome,
      surfaceTheme: pal.theme,
      title: desc.t,
      psychologicalTrap: desc.p,
      x: Number(curX.toFixed(3)),
      y: Number(curY.toFixed(3)),
      z: Number(curZ.toFixed(3)),
      width: Number(width.toFixed(2)),
      depth: Number(depth.toFixed(2)),
      height: isMilestone ? 1.35 : 0.95,
      friction,
      restitution,
      chargeSpeedMultiplier,
      hazard,
      vehicleStyle,
      hazardSpeed: Number(hazardSpeed.toFixed(2)),
      hazardAmplitude: Number(hazardAmplitude.toFixed(2)),
      hazardPhase: Number((rng() * Math.PI * 2).toFixed(3)),
      conveyorDirX: Number(conveyorDirX.toFixed(3)),
      conveyorDirZ: Number(conveyorDirZ.toFixed(3)),
      hasTreeLeft,
      hasTreeRight,
      hasBarrierCenter,
      decoyLedge,
      dirX: dx,
      dirZ: dz,
      turnAngleDeg,
      horizGap: Number(horizGap.toFixed(2)),
      clearGap: Number(clearGap.toFixed(2)),
      vertRise: Number(vertRise.toFixed(2)),
      topColorHex,
      topAltColorHex,
      sideColorHex,
      accentHex,
    });
  }

  return steps;
}

export let currentSpireSeed = DEFAULT_SPIRE_SEED;
export const LEVELS_500: LevelStep[] = generate500Levels(DEFAULT_SPIRE_SEED);
export const LEVELS_100: LevelStep[] = LEVELS_500;

export function reseedLevels500(newSeed: number): LevelStep[] {
  currentSpireSeed = newSeed >>> 0;
  const fresh = generate500Levels(currentSpireSeed);
  for (let i = 0; i < TOTAL_LEVELS; i++) {
    LEVELS_500[i] = fresh[i];
  }
  return LEVELS_500;
}

export function mutateUpperStepsOnFall(
  fromStep: number,
  fallCount: number
): void {
  const rng = mulberry32(
    (currentSpireSeed + fromStep * 131 + fallCount * 997) >>> 0
  );
  const startIdx = Math.max(1, fromStep);
  for (let i = startIdx; i < TOTAL_LEVELS; i++) {
    const s = LEVELS_500[i];
    s.hazardPhase = Number((rng() * Math.PI * 2).toFixed(3));
    if (i > 4) {
      s.chargeSpeedMultiplier = Number((0.88 + rng() * 0.32).toFixed(2));
    }
    if (s.hazard === 'turntable' || s.hazard === 'sweeper') {
      s.hazardSpeed = -s.hazardSpeed;
    }
  }
}
