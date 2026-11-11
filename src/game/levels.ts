export const TOTAL_LEVELS = 500;
export const DEFAULT_SPIRE_SEED = 739281;

export type BiomeId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type AtmosphericLayerId =
  | 'troposphere_valley'   // Steps 0 - 50: Sunlit Pine Valley & Autumn Crags
  | 'alpine_cloud_deck'    // Steps 51 - 100: High Alpine Glaciers & Cloud Sea
  | 'stratosphere'         // Steps 101 - 200: Cobalt Stratosphere & Jetstream Citadels
  | 'thermosphere_aurora'  // Steps 201 - 350: Upper Atmosphere Aurora & Orbital Relays
  | 'deep_space';          // Steps 351 - 500: Exosphere & Deep Space Celestial Monoliths

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

export type StageArchetype =
  | 'outpost_plaza'      // Spacious mountain outlook terrace
  | 'grand_sanctuary'    // Extra-large multi-rune puzzle courtyard (5.0m - 5.8m)
  | 'knife_ridge'        // Long narrow ridge spine requiring timed dashes (4.6m x 2.4m)
  | 'canyon_span'        // Broad lateral cliff shelf with wing rune plates (3.2m x 5.4m)
  | 'pin_needle'         // Compact high-tension pinnacle outcrop (2.6m x 2.6m)
  | 'switchback_terrace'; // Winding S-curve boulder & fallen-log slalom deck

export type StepHazardType =
  | 'none'       // Scenic trail stage with sculpted boulders, fallen logs & spruce trees
  | 'pusher'     // Rolling alpine boulder sweeping across the mid-deck corridor
  | 'sweeper'    // Rotating timber/crystal mill beam requiring timed sprint
  | 'log'        // Drifting cliff ledge / levitating ferry across chasm
  | 'conveyor'   // Rushing mountain runoff / magnetic stream pushing laterally
  | 'turntable'  // Rotating stone compass dial in the center of the stage
  | 'blinker'    // Phase-shifting bridge slabs that cycle solid/ethereal
  | 'ice'        // Low-friction alpine glacier / cryo-quartz deck
  | 'barrier'    // Fortified slalom boulder & log chicanes requiring S-curve navigation
  | 'glitch'     // High-altitude atmospheric turbulence / gravity distortion
  | 'crumble'    // Unstable fracture stone that collapses 1.65s after touchdown
  | 'wind'       // Crosswind jetstream tunnel across the launch deck
  | 'bouncer';   // Repulsor crystal / thorny rim bumpers

export const MOUNTAIN_CORE_X = 0.0;
export const MOUNTAIN_CORE_Z = -21.5;

export type StagePuzzleType =
  | 'none'
  | 'ordered_runes'
  | 'timed_runes'
  | 'boulder_socket'
  | 'crusher_gauntlet';

export type StageProgressionPhase =
  | 'early_hook'
  | 'rising_trial'
  | 'rest_beat'
  | 'crucible_spike'
  | 'boss_citadel'
  | 'milestone_sanctuary';

export type TrailGauntletType =
  | 'ranger_outpost'
  | 'plank_bridge'
  | 'boulder_run'
  | 'switch_gate'
  | 'wind_ridge'
  | 'mud_switchback'
  | 'crumble_ledge'
  | 'sawmill_sweep'
  | 'log_ferry';

export type VehicleStyle =
  | 'golem'
  | 'chariot'
  | 'sentinel'
  | 'scarab'
  | 'pendulum'
  | 'meteor';

export type NpcSpecies = 'bear' | 'goat' | 'crow' | 'fox' | 'tortoise';
export type NpcCampProp =
  | 'cabin_campfire'
  | 'camper_van'
  | 'pond_sign'
  | 'lookout_bench';

export type NpcBehaviorType = 'helpful' | 'cynical' | 'blocker';

export interface NpcDialogueChoice {
  label: string;
  highlightWord?: string;
  response: string;
  action?:
    | 'heal_rage'
    | 'roast_back'
    | 'clear_path'
    | 'altitude_hint'
    | 'camera_tip'
    | 'close';
}

export interface TrailNpcData {
  id: string;
  name: string;
  species: NpcSpecies;
  role: string;
  propType: NpcCampProp;
  behavior: NpcBehaviorType;
  blocksPathByDefault: boolean;
  relX: number;
  relZ: number;
  idleBark: string;
  fallRoast: string;
  greeting: string;
  choices: NpcDialogueChoice[];
}

export interface DeckObstacle {
  id: string;
  relX: number;
  relZ: number;
  halfW: number;
  halfD: number;
  height: number;
  kind: 'pillar' | 'wall' | 'tree' | 'crystal' | 'totem';
}

export interface RunePlateNode {
  id: string;
  index: number;
  relX: number;
  relZ: number;
  radius: number;
}

export interface ValleySolidCollider {
  id: string;
  label: string;
  x: number;
  z: number;
  halfW: number;
  halfD: number;
  height: number;
  kind: 'building' | 'prop' | 'tree' | 'rock' | 'fence';
}

export interface DecoyLedge {
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  trapType: 'shatter' | 'repulsor';
}

export interface ValleyLandmark {
  id: string;
  title: string;
  subtitle: string;
  x: number;
  z: number;
  radius: number;
  kind: 'campfire_rest' | 'lookout_shrine' | 'river_pier';
}

export interface LevelStep {
  stepNumber: number; // 1 to 500
  biome: BiomeId;
  atmosphericLayer: AtmosphericLayerId;
  stageArchetype: StageArchetype;
  surfaceTheme: StepSurfaceTheme;
  gauntletType: TrailGauntletType;
  progressionPhase: StageProgressionPhase;
  difficultyRating: number; // 1 to 10
  title: string;
  psychologicalTrap: string;
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  supportDepth: number; // Deep grounded cliff pillar depth connecting to the mountain massif
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
  hasBridgeToNext: boolean;
  requiresSwitch: boolean;
  switchRelX: number;
  switchRelZ: number;
  puzzleType: StagePuzzleType;
  runeTimeLimitSec: number;
  requiresBoulderSocket: boolean;
  boulderStartRelX: number;
  boulderStartRelZ: number;
  boulderSocketRelX: number;
  boulderSocketRelZ: number;
  spiralAngleRad: number;
  runePlates: RunePlateNode[];
  deckObstacles: DeckObstacle[];
  npc?: TrailNpcData;
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
  atmosphericLayer: AtmosphericLayerId;
  coreIrritationMechanic: string;
}

export function getAtmosphericLayerForStep(stepNumber: number): AtmosphericLayerId {
  if (stepNumber <= 50) return 'troposphere_valley';
  if (stepNumber <= 100) return 'alpine_cloud_deck';
  if (stepNumber <= 200) return 'stratosphere';
  if (stepNumber <= 350) return 'thermosphere_aurora';
  return 'deep_space';
}

export const BIOME_BLUEPRINTS: BiomeBlueprint[] = [
  {
    biome: 1,
    name: '01. Foot of Mount Tartarus (Valley Trailhead)',
    range: 'Stages 001 – 050',
    subtitle: 'Sunlit Pine Crags · Grounded Mountain Switchbacks & The First Rolling Stones',
    themeColor: '#7ca936',
    surfaceTheme: 'sanctuary',
    atmosphericLayer: 'troposphere_valley',
    coreIrritationMechanic:
      'Begin the Sisyphean hike up the solid granite mountain face. Each terrace rolls a random difficulty (1/10 to 10/10) with rolling boulders, rune locks, and carved crags.',
  },
  {
    biome: 2,
    name: '02. Sisyphean Boulder Switchbacks',
    range: 'Stages 051 – 100',
    subtitle: 'Autumn Highland Crags · Relentless Rolling Stones & Timber Mill Beams',
    themeColor: '#d97724',
    surfaceTheme: 'clockwork',
    atmosphericLayer: 'alpine_cloud_deck',
    coreIrritationMechanic:
      'Climb the steep highland cliff wall into the alpine cloud deck as runaway granite boulders roll across the carved mountain terraces.',
  },
  {
    biome: 3,
    name: '03. Cloud-Piercer Titan Buttress',
    range: 'Stages 101 – 150',
    subtitle: 'Breaking the Cloud Sea (100+) · Solid Stratosphere Cliff Terraces',
    themeColor: '#2ec4b6',
    surfaceTheme: 'aqueduct',
    atmosphericLayer: 'stratosphere',
    coreIrritationMechanic:
      'Ascend above the cloud sea along the colossal upper mountain wall. Random difficulty spikes test your timing with multi-rune gates and rolling stones.',
  },
  {
    biome: 4,
    name: '04. Windswept Atlas Crags',
    range: 'Stages 151 – 200',
    subtitle: 'High-Altitude Basalt Mountain Face · Jetstream Gusts & Fracture Stone',
    themeColor: '#3b82f6',
    surfaceTheme: 'causeway',
    atmosphericLayer: 'stratosphere',
    coreIrritationMechanic:
      'Fierce mountain crosswinds sweep across the solid basalt cliff ledges while unstable fracture stone demands decisive footwork.',
  },
  {
    biome: 5,
    name: '05. Cryo-Glacier Cliffside',
    range: 'Stages 201 – 250',
    subtitle: 'Frozen Upper Peak · Low-Friction Glacier Ledges & Rolling Ice Boulders',
    themeColor: '#38bdf8',
    surfaceTheme: 'quartz',
    atmosphericLayer: 'thermosphere_aurora',
    coreIrritationMechanic:
      'Slick glacier ledges carved into the frozen mountain massif preserve landing momentum while heavy ice boulders patrol the trail.',
  },
  {
    biome: 6,
    name: '06. Aurora Crown Escarpment',
    range: 'Stages 251 – 300',
    subtitle: 'Emerald & Violet Sky Curtains · Ancient Astrolabe Terraces',
    themeColor: '#10b981',
    surfaceTheme: 'orrery',
    atmosphericLayer: 'thermosphere_aurora',
    coreIrritationMechanic:
      'Under shimmering aurora curtains, solve 1-to-3 rune locks along the ancient mountain escarpment before vaulting higher.',
  },
  {
    biome: 7,
    name: '07. Celestial Titan Wall',
    range: 'Stages 301 – 350',
    subtitle: 'Upper Firmament Cliffside · Obsidian Crags & Runaway Monolith Stones',
    themeColor: '#8b5cf6',
    surfaceTheme: 'anomaly',
    atmosphericLayer: 'thermosphere_aurora',
    coreIrritationMechanic:
      'The mountain pierces the upper firmament—navigate random high-difficulty obsidian ledges and heavy rolling monolith stones.',
  },
  {
    biome: 8,
    name: '08. Star-Forge Mountain Ridge',
    range: 'Stages 351 – 400',
    subtitle: 'Edge of the Cosmos · Gilded Granite Wall & Solar Rolling Spheres',
    themeColor: '#f59e0b',
    surfaceTheme: 'crucible',
    atmosphericLayer: 'deep_space',
    coreIrritationMechanic:
      'Where the mountain touches deep space, gilded granite walls anchor solar-forged rolling boulders and multi-rune sanctuaries.',
  },
  {
    biome: 9,
    name: '09. Astral Massif Ascent',
    range: 'Stages 401 – 450',
    subtitle: 'Cosmic Cliff Face · Nebula Crags & High-Precision Boulders',
    themeColor: '#ec4899',
    surfaceTheme: 'nimbus',
    atmosphericLayer: 'deep_space',
    coreIrritationMechanic:
      'Scale the upper astral massif where every terrace mixes randomized difficulty ratings from calm breathers to 10/10 gauntlets.',
  },
  {
    biome: 10,
    name: '10. Summit of the Universe (Sisyphus Crown)',
    range: 'Stages 451 – 500',
    subtitle: 'The Ultimate Peak · Where the Eternal Stone Reaches the Top of the Universe',
    themeColor: '#facc15',
    surfaceTheme: 'monolith',
    atmosphericLayer: 'deep_space',
    coreIrritationMechanic:
      'The final 50 terraces of the world-mountain lead to Stage 500 at the very top of the universe, where Sisyphus’s stone finally rests.',
  },
];

export const PHILOSOPHICAL_ENDING_QUOTE =
  'From the earthly pine valley to the very top of the universe at Stage 500—one must imagine the climber happy.';

export const PHILOSOPHICAL_TAUNTS: {
  minStepsLost: number;
  quote: string;
  author: string;
}[] = [
  {
    minStepsLost: 1,
    quote: 'The stone rolls down, and the climber follows. At least it was only a single terrace!',
    author: 'Ranger Barnaby, Sisyphean Log #4',
  },
  {
    minStepsLost: 2,
    quote: 'Every terrace on this mountain has its own random difficulty—and that one clearly had your number.',
    author: 'Pip the Crow, Perched on the Cliff Wall',
  },
  {
    minStepsLost: 4,
    quote: 'Sisyphus pushed a boulder up the mountain; you just threw yourself down it!',
    author: 'Chadwick the Mountain Goat',
  },
  {
    minStepsLost: 7,
    quote: 'Good thing the solid mountain cliff terrace below caught your boots!',
    author: 'Maeve the Cartographer Fox',
  },
  {
    minStepsLost: 12,
    quote: 'I climb at 0.02 miles per hour up this rock face and I am somehow still ahead of you.',
    author: 'Shelly the Ancient Tortoise',
  },
  {
    minStepsLost: 20,
    quote: 'The mountain stands unbroken from the valley to the stars. Dust off your boots and climb again.',
    author: 'Chronicles of the Eternal Stone, Ch. VII',
  },
  {
    minStepsLost: 35,
    quote: 'A long tumble down the mountain face—yet the summit at the top of the universe still waits.',
    author: 'Hawk Peak Trail Guide, p. 42',
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
    top: 0x7ca936,    // Rich emerald-moss alpine meadow
    topAlt: 0x648c28,
    side: 0x645d55,   // Sculpted warm mountain granite
    accent: 0xc87d44, // Carved cedar & sandstone trim
    theme: 'sanctuary',
  },
  2: {
    top: 0xc28b2c,    // Golden autumn highland turf
    topAlt: 0xa1701e,
    side: 0x5c5349,
    accent: 0xd95b38, // Maple crimson-amber
    theme: 'clockwork',
  },
  3: {
    top: 0x3b9c9c,    // Lower Stratosphere teal-jade stone
    topAlt: 0x2b7a78,
    side: 0x475569,
    accent: 0x7dd3fc, // Sky-pier luminous cyan trim
    theme: 'aqueduct',
  },
  4: {
    top: 0x4f6d9a,    // Stratospheric cobalt citadel slab
    topAlt: 0x3b5278,
    side: 0x334155,
    accent: 0xfbbf24, // Gilded astrolabe brass
    theme: 'causeway',
  },
  5: {
    top: 0x7dd3fc,    // Cryo-quartz upper atmosphere
    topAlt: 0x38bdf8,
    side: 0x334155,
    accent: 0xe0f2fe,
    theme: 'quartz',
  },
  6: {
    top: 0x10b981,    // Aurora emerald-jade terrace
    topAlt: 0x059669,
    side: 0x1e293b,
    accent: 0xa78bfa, // Aurora violet rim
    theme: 'orrery',
  },
  7: {
    top: 0x6366f1,    // Thermosphere indigo-obsidian relay
    topAlt: 0x4f46e5,
    side: 0x1e1b4b,
    accent: 0x38bdf8,
    theme: 'anomaly',
  },
  8: {
    top: 0xd97706,    // Exosphere solar-gold foundry
    topAlt: 0xb45309,
    side: 0x27272a,
    accent: 0xfef08a,
    theme: 'crucible',
  },
  9: {
    top: 0x9333ea,    // Deep space nebula amethyst crystal
    topAlt: 0x7e22ce,
    side: 0x18181b,
    accent: 0xf472b6,
    theme: 'nimbus',
  },
  10: {
    top: 0xeab308,   // Cosmic Summit 500 astral gold monolith
    topAlt: 0xca8a04,
    side: 0x1e293b,
    accent: 0xffffff,
    theme: 'monolith',
  },
};

const NPC_CAST: Omit<
  TrailNpcData,
  'id' | 'relX' | 'relZ' | 'blocksPathByDefault'
>[] = [
  {
    name: 'Ranger Barnaby',
    species: 'bear',
    role: 'Hawk Peak Trail Warden',
    propType: 'cabin_campfire',
    behavior: 'helpful',
    idleBark: 'Hey hiker! Press [E] or click me for POV scouting & stage tips!',
    fallRoast: 'Ouch! At least you landed on solid rock instead of the river!',
    greeting:
      'Welcome to Hawk Peak! Every cliff terrace ahead has its own size, shape, and puzzle—clear the glowing rune plates and boulders first, then follow the golden launch chevron!',
    choices: [
      {
        label: 'how do the camera shifts work?',
        highlightWord: 'camera shifts',
        response:
          'Every 12 stages, the mountain rotates to a fresh camera perspective around the peak. Follow the golden launch arrow and emerald landing ring before releasing Space!',
        action: 'camera_tip',
      },
      {
        label: 'what happens past stage 100?',
        highlightWord: 'stage 100?',
        response:
          'Above Stage 100 you pierce the cloud deck into the Cobalt Stratosphere, then the Aurora Thermosphere (200+), and finally Deep Space (350–500)!',
        action: 'heal_rage',
      },
      {
        label: 'ready to climb',
        response:
          'Cross the arched cedar bridge over the river, follow the glowing launch arrow on every ledge, and enjoy the peaceful mountain music!',
        action: 'close',
      },
    ],
  },
  {
    name: 'Chadwick the Goat',
    species: 'goat',
    role: 'Launch-Lane Gatekeeper',
    propType: 'lookout_bench',
    behavior: 'blocker',
    idleBark: 'VIP launch lane! Press [E] to face me and talk your way past!',
    fallRoast: 'Bahaha! Gravity 1, Hiker 0! Watch your footing around the boulders!',
    greeting:
      'You made it across the stage obstacles, huh? I parked my hooves right in front of the launch chevron. Convince me to step aside!',
    choices: [
      {
        label: 'how do I unlock the barrier gates?',
        highlightWord: 'barrier gates?',
        response:
          'Step on every glowing amber Rune Plate on the terrace deck! Some wide canyon ledges have 2 or 3 runes on the wings—turn them all emerald green to drop the gate.',
        action: 'roast_back',
      },
      {
        label: 'watch me nail this next jump',
        response:
          'Big talk! Line up with the golden launch arrow and charge until the target ring turns bright green!',
        action: 'close',
      },
    ],
  },
  {
    name: 'Pip the Cynical Crow',
    species: 'crow',
    role: 'Atmospheric Scout & Critic',
    propType: 'pond_sign',
    behavior: 'cynical',
    idleBark: 'CAW! Need a POV look at the next jump? Press [E]!',
    fallRoast: 'CAW-HAHA! Spectacular tumble down to the lower cliff terrace!',
    greeting:
      'No wings, no gliders, no shortcuts—just pure leg power, boulder puzzles, and spatial geometry. That is the only way Hawk Peak respects you.',
    choices: [
      {
        label: 'why are the stages different sizes?',
        highlightWord: 'different sizes?',
        response:
          'Because real mountains are not cookie-cutter blocks! You will cross wide puzzle sanctuaries, narrow knife-edge ridges, and tiny pinnacle needles on your way up.',
        action: 'heal_rage',
      },
      {
        label: 'back to the ascent',
        response:
          'Keep your eyes on the ballistic arc and the golden launch compass when the wind picks up!',
        action: 'close',
      },
    ],
  },
  {
    name: 'Maeve the Astrologer Fox',
    species: 'fox',
    role: 'High-Altitude Expedition Cartographer',
    propType: 'camper_van',
    behavior: 'helpful',
    idleBark: 'Checking atmospheric barometer! Press [E] to chat!',
    fallRoast: 'Whoa, easy there! Good thing the lower cliff ledge caught your boots!',
    greeting:
      'Have you noticed how peaceful the mountain music is? Even when the climb gets tense, the acoustic chords keep the valley spirit alive.',
    choices: [
      {
        label: 'any tips for aiming my next jump?',
        highlightWord: 'aiming',
        response:
          'Every terrace has a glowing golden Launch Compass on its front edge pointing straight at the next stage, plus a live trajectory arc that turns emerald green at ideal charge!',
        action: 'camera_tip',
      },
      {
        label: 'thanks, onward!',
        response:
          'Clear skies—or clear starfields—ahead!',
        action: 'close',
      },
    ],
  },
  {
    name: 'Shelly the Ancient Tortoise',
    species: 'tortoise',
    role: 'Guardian of the Summit Path',
    propType: 'lookout_bench',
    behavior: 'blocker',
    idleBark: 'Slow and steady! Press [E] if you want me to clear the launch pad!',
    fallRoast: 'Rushing a jump is the fastest way to revisit five stages below!',
    greeting:
      'Everyone tries to rush the launch edge without solving the stage layout first. Take a breath, ask nicely, and I will clear the lane.',
    choices: [
      {
        label: 'how do falls work on this mountain?',
        highlightWord: 'falls',
        response:
          'Pure 3D gravity! If you miss a jump or slip off a rim, you fall down onto whichever lower cliff terrace or valley ground lies beneath your trajectory.',
        action: 'heal_rage',
      },
      {
        label: 'see you higher up',
        response:
          'Follow the golden launch chevron and measure your charge twice!',
        action: 'close',
      },
    ],
  },
];

export const GROUND_FLOOR_Y = -1.35;
export const GROUND_SPAWN_X = 0.2;
export const GROUND_SPAWN_Z = -1.8;

// River and Bridge bounds in the Base Camp Valley (for real water current & bridge deck physics!)
export const VALLEY_RIVER_BOUNDS = {
  minZ: -4.85,
  maxZ: -2.65,
  waterSurfaceY: GROUND_FLOOR_Y - 0.36,
  currentSpeedX: 2.35,
};

export const VALLEY_BRIDGE_BOUNDS = {
  minX: -0.95,
  maxX: 2.65,
  minZ: -5.1,
  maxZ: -2.4,
  deckY: GROUND_FLOOR_Y + 0.16,
};

// 100% Unified Single-Source-of-Truth Solid Colliders for Base Camp Valley (Buildings, Props, Fences, Trees)
// IsometricCanvas.tsx reads these EXACT coordinates to position the 3D meshes so visual and physical bounds match 1:1!
export const VALLEY_SOLID_COLLIDERS: ValleySolidCollider[] = [
  // 1. A-Frame Alpine Timber Lodge (x: -5.4, z: 2.3)
  {
    id: 'collider-cabin',
    label: 'Alpine Timber Lodge',
    x: -5.4,
    z: 2.3,
    halfW: 1.85,
    halfD: 1.55,
    height: 3.2,
    kind: 'building',
  },
  // 2. Stone Campfire Pit (x: -2.3, z: 2.6)
  {
    id: 'collider-campfire',
    label: 'Stone Campfire',
    x: -2.3,
    z: 2.6,
    halfW: 0.62,
    halfD: 0.62,
    height: 0.75,
    kind: 'prop',
  },
  // 3. Streamlined Vintage Airstream Caravan (x: 6.2, z: 2.6)
  {
    id: 'collider-camper',
    label: 'Expedition Caravan',
    x: 6.2,
    z: 2.6,
    halfW: 1.72,
    halfD: 1.05,
    height: 2.1,
    kind: 'building',
  },
  // 4. Curved Stone & Brass Lighthouse Watchtower (x: 8.8, z: -0.9)
  {
    id: 'collider-watchtower',
    label: 'Beacon Watchtower',
    x: 8.8,
    z: -0.9,
    halfW: 1.25,
    halfD: 1.25,
    height: 4.8,
    kind: 'building',
  },
  // 5. Expedition Canvas Geodesic Tent (x: -9.6, z: -0.6)
  {
    id: 'collider-tent',
    label: 'Expedition Tent',
    x: -9.6,
    z: -0.6,
    halfW: 1.22,
    halfD: 1.22,
    height: 1.85,
    kind: 'building',
  },
  // 6. Ancient Hawk Stone Arch Pillars (x: -9.6 & -7.8, z: 4.2)
  {
    id: 'collider-shrine-left',
    label: 'Stone Arch West Pillar',
    x: -9.6,
    z: 4.2,
    halfW: 0.48,
    halfD: 0.48,
    height: 2.5,
    kind: 'rock',
  },
  {
    id: 'collider-shrine-right',
    label: 'Stone Arch East Pillar',
    x: -7.8,
    z: 4.2,
    halfW: 0.48,
    halfD: 0.48,
    height: 2.5,
    kind: 'rock',
  },
  // 7. Trailhead Wooden Signpost (x: -1.85, z: -1.45)
  {
    id: 'collider-signpost',
    label: 'Trailhead Signpost',
    x: -1.85,
    z: -1.45,
    halfW: 0.54,
    halfD: 0.28,
    height: 1.65,
    kind: 'prop',
  },
  // 8. Cedar Split-Rail Fence Line (x: 4.8, z: -1.8)
  {
    id: 'collider-fence-south',
    label: 'Park Boundary Fence',
    x: 4.8,
    z: -1.8,
    halfW: 1.52,
    halfD: 0.26,
    height: 0.85,
    kind: 'fence',
  },
  // 9. Valley Sculpted Spruce & Autumn Trees (Shared 1:1 between renderer & physics!)
  { id: 'vtree-1', label: 'Alpine Spruce', x: -8.4, z: -1.4, halfW: 0.52, halfD: 0.52, height: 2.5, kind: 'tree' },
  { id: 'vtree-2', label: 'Autumn Birch', x: -5.6, z: -1.2, halfW: 0.52, halfD: 0.52, height: 2.6, kind: 'tree' },
  { id: 'vtree-3', label: 'Alpine Spruce', x: 5.2, z: -1.1, halfW: 0.52, halfD: 0.52, height: 2.5, kind: 'tree' },
  { id: 'vtree-4', label: 'Autumn Birch', x: 8.6, z: -6.2, halfW: 0.52, halfD: 0.52, height: 2.4, kind: 'tree' },
  { id: 'vtree-5', label: 'Alpine Spruce', x: -8.2, z: 6.2, halfW: 0.55, halfD: 0.55, height: 2.7, kind: 'tree' },
  { id: 'vtree-6', label: 'Autumn Birch', x: -3.8, z: 6.4, halfW: 0.55, halfD: 0.55, height: 2.5, kind: 'tree' },
  { id: 'vtree-7', label: 'Alpine Spruce', x: 3.4, z: 6.5, halfW: 0.55, halfD: 0.55, height: 2.6, kind: 'tree' },
  { id: 'vtree-8', label: 'Autumn Birch', x: 7.8, z: 5.8, halfW: 0.52, halfD: 0.52, height: 2.4, kind: 'tree' },
  { id: 'vtree-9', label: 'Alpine Spruce', x: -11.5, z: 2.4, halfW: 0.56, halfD: 0.56, height: 2.8, kind: 'tree' },
  { id: 'vtree-10', label: 'Autumn Birch', x: 10.4, z: 2.8, halfW: 0.56, halfD: 0.56, height: 2.7, kind: 'tree' },
  { id: 'vtree-11', label: 'Alpine Spruce', x: -6.4, z: -6.8, halfW: 0.56, halfD: 0.56, height: 2.7, kind: 'tree' },
  { id: 'vtree-12', label: 'Autumn Birch', x: 6.8, z: -6.6, halfW: 0.56, halfD: 0.56, height: 2.6, kind: 'tree' },
];

export const VALLEY_LANDMARKS: ValleyLandmark[] = [
  {
    id: 'valley-campfire',
    title: 'Ranger Lodge Campfire',
    subtitle: 'Warms cold boots & calms Rage (-25% Rage)',
    x: -2.3,
    z: 2.6,
    radius: 1.5,
    kind: 'campfire_rest',
  },
  {
    id: 'valley-river-pier',
    title: 'Turquoise River Arched Bridge',
    subtitle: 'Safe crossing over the rushing mountain river current',
    x: 0.85,
    z: -3.75,
    radius: 1.5,
    kind: 'river_pier',
  },
  {
    id: 'valley-shrine-stash',
    title: 'Ancient Hawk Stone Arch',
    subtitle: 'Monument marking the 500-stage ascent to the stars',
    x: -8.7,
    z: 4.2,
    radius: 1.5,
    kind: 'lookout_shrine',
  },
];

export const GROUND_STEP_META: LevelStep = {
  stepNumber: 0,
  biome: 1,
  atmosphericLayer: 'troposphere_valley',
  stageArchetype: 'outpost_plaza',
  gauntletType: 'ranger_outpost',
  progressionPhase: 'early_hook',
  difficultyRating: 1,
  title: 'Hawk Peak Base Camp & River Valley',
  x: GROUND_SPAWN_X,
  y: GROUND_FLOOR_Y,
  z: GROUND_SPAWN_Z,
  width: 28.0,
  depth: 22.0,
  height: 0.4,
  supportDepth: 4.0,
  dirX: 0.145,
  dirZ: -0.989,
  turnAngleDeg: 0,
  horizGap: 4.5,
  clearGap: 1.25,
  vertRise: 0.83,
  chargeSpeedMultiplier: 1.0,
  surfaceTheme: 'sanctuary',
  hazard: 'none',
  friction: 0.92,
  restitution: 0.15,
  hazardSpeed: 0,
  hazardPhase: 0,
  hazardAmplitude: 0,
  vehicleStyle: 'golem',
  hasTreeLeft: true,
  hasTreeRight: true,
  hasBarrierCenter: false,
  hasBridgeToNext: true,
  requiresSwitch: false,
  switchRelX: 0,
  switchRelZ: 0,
  puzzleType: 'none',
  runeTimeLimitSec: 0,
  requiresBoulderSocket: false,
  boulderStartRelX: 0,
  boulderStartRelZ: 0,
  boulderSocketRelX: 0,
  boulderSocketRelZ: 0,
  spiralAngleRad: Math.PI * 0.5,
  runePlates: [],
  deckObstacles: [],
  npc: {
    id: 'npc-base-camp',
    ...NPC_CAST[0],
    blocksPathByDefault: false,
    relX: -2.2,
    relZ: 2.2,
  },
  conveyorDirX: 0,
  conveyorDirZ: 0,
  decoyLedge: undefined,
  topColorHex: 0x7ca936,
  topAltColorHex: 0x648c28,
  sideColorHex: 0x645d55,
  accentHex: 0xc87d44,
  psychologicalTrap:
    'Cross the arched cedar bridge over the rushing turquoise river, chat with Ranger Barnaby in POV camera mode [E], and leap onto Stage 1 on the North Bank to begin the 500-stage spiral ascent.',
};

/**
 * Helper to compute the directional extent of an axis-aligned rectangle (width, depth)
 * along a unit vector (dx, dz), so jump gaps between variably-sized stages are exact.
 */
function directionalHalfExtent(
  width: number,
  depth: number,
  dx: number,
  dz: number
): number {
  const halfW = width * 0.5;
  const halfD = depth * 0.5;
  return Math.hypot(halfW * dx, halfD * dz) * 0.86;
}

export function generate500Levels(seed = DEFAULT_SPIRE_SEED): LevelStep[] {
  const rng = mulberry32(seed);
  const steps: LevelStep[] = [];

  // Stage 1 starts on the North Bank right at the north end of the Arched Cedar Bridge (z = -6.25),
  // anchored directly into the Southern granite face of Mount Tartarus (MOUNTAIN_CORE = (0, -21.5)).
  let curX = 0.85;
  let curY = -0.52;
  let curZ = -6.25;
  let headingRad = -0.45;

  // Hand-tuned GDD Progression Showcase for the opening 10 stages:
  // 1) Early Wins (Stages 1-2) -> 2) Rising Challenge (Stages 3-4) -> 3) Rest Beat (Stage 5) -> 4) Crucible Spikes & Boss Citadel (Stages 6-10)
  const openingDifficultyShowcase: Record<number, number> = {
    1: 2,  // Stage 1 [EARLY HOOK]: Trailhead Rune & Rolling Stone Gate (Diff 2/10)
    2: 5,  // Stage 2 [EARLY HOOK]: Sisyphus Boulder-Push Socket + Sweeper Beam (Diff 5/10)
    3: 7,  // Stage 3 [RISING TRIAL]: Sequential 2-Rune Lock + Rolling Stone + Blocker Goat (Diff 7/10)
    4: 6,  // Stage 4 [RISING TRIAL]: Timed Countdown Rune Relay + Crosswind (Diff 6/10)
    5: 3,  // Stage 5 [REST BEAT]: Scenic Breather Ledge + Sisyphus Socket (Diff 3/10)
    6: 9,  // Stage 6 [CRUCIBLE SPIKE]: 9/10 Sequential 3-Rune Tartarus Gauntlet (Diff 9/10)
    7: 2,  // Stage 7 [REST BEAT]: High-Crag Wind Breather Ledge (Diff 2/10)
    8: 8,  // Stage 8 [CRUCIBLE SPIKE]: Timed 3-Rune Relay + Rotating Mill Beam (Diff 8/10)
    9: 1,  // Stage 9 [REST BEAT]: Calm Crag Outcrop (Diff 1/10)
    10: 10, // Stage 10 [BOSS CITADEL]: 10/10 Sisyphus Boulder Altar + Relentless Rolling Stone (Diff 10/10)
  };

  for (let i = 1; i <= TOTAL_LEVELS; i++) {
    const biome = Math.min(10, Math.ceil(i / 50)) as BiomeId;
    const atmosphericLayer = getAtmosphericLayerForStep(i);
    const pal = BIOME_PALETTES[biome];

    const isMilestone =
      i % 50 === 0 || i === TOTAL_LEVELS;

    // ============================================================================
    // TRUE PER-STAGE RANDOM DIFFICULTY RATING WITH GDD PACING BEATS (1/10 to 10/10)
    // ============================================================================
    let difficultyRating: number;
    if (isMilestone) {
      difficultyRating = 2; // Every 50th Milestone Sanctuary is a calm checkpoint
    } else if (openingDifficultyShowcase[i] !== undefined) {
      difficultyRating = openingDifficultyShowcase[i];
    } else if (i % 10 === 0) {
      // Every 10th stage is a Boss Citadel spike (9/10 or 10/10)
      difficultyRating = rng() < 0.55 ? 10 : 9;
    } else if (i % 7 === 0) {
      // Every 7th stage is a Rest Beat between intensity (1/10 to 3/10)
      difficultyRating = Math.floor(rng() * 3) + 1;
    } else {
      const r1 = Math.floor(rng() * 10) + 1;
      const r2 = Math.floor(rng() * 10) + 1;
      let rolled = rng() < 0.58 ? Math.max(r1, r2) : r1;
      const prevDiff = steps[i - 2]?.difficultyRating ?? 5;
      if (Math.abs(rolled - prevDiff) <= 1) {
        rolled = ((rolled + 4) % 10) + 1;
      }
      difficultyRating = Math.max(1, Math.min(10, rolled));
    }

    const progressionPhase: StageProgressionPhase = isMilestone
      ? 'milestone_sanctuary'
      : i <= 2
      ? 'early_hook'
      : i % 10 === 0 || difficultyRating === 10
      ? 'boss_citadel'
      : difficultyRating <= 3
      ? 'rest_beat'
      : difficultyRating >= 8
      ? 'crucible_spike'
      : 'rising_trial';

    // ============================================================================
    // STAGE ARCHETYPE & DIMENSIONS DRIVEN BY RANDOM DIFFICULTY RATING
    // ============================================================================
    let stageArchetype: StageArchetype = 'switchback_terrace';
    let width = 3.8;
    let depth = 3.8;

    if (i === 1) {
      stageArchetype = 'outpost_plaza';
      width = 4.55;
      depth = 4.25;
    } else if (i === TOTAL_LEVELS) {
      stageArchetype = 'grand_sanctuary';
      width = 6.0;
      depth = 6.0;
    } else if (isMilestone) {
      stageArchetype = 'grand_sanctuary';
      width = 5.1 + rng() * 0.5;
      depth = 4.9 + rng() * 0.5;
    } else if (difficultyRating >= 8) {
      const highRoll = (i + Math.floor(rng() * 3)) % 3;
      if (highRoll === 0 && i > 6) {
        stageArchetype = 'pin_needle';
        width = 2.95 + rng() * 0.35;
        depth = 2.95 + rng() * 0.35;
      } else if (highRoll === 1) {
        stageArchetype = 'knife_ridge';
        width = 4.35 + rng() * 0.65;
        depth = 2.85 + rng() * 0.32;
      } else {
        stageArchetype = 'grand_sanctuary';
        width = 4.75 + rng() * 0.65;
        depth = 4.55 + rng() * 0.65;
      }
    } else if (difficultyRating >= 4) {
      const midRoll = (i + Math.floor(rng() * 3)) % 3;
      if (midRoll === 0) {
        stageArchetype = 'canyon_span';
        width = 3.45 + rng() * 0.42;
        depth = 4.65 + rng() * 0.65;
      } else if (midRoll === 1) {
        stageArchetype = 'switchback_terrace';
        width = 3.85 + rng() * 0.58;
        depth = 3.65 + rng() * 0.58;
      } else {
        stageArchetype = 'knife_ridge';
        width = 4.15 + rng() * 0.55;
        depth = 2.95 + rng() * 0.35;
      }
    } else {
      stageArchetype = rng() < 0.55 ? 'outpost_plaza' : 'switchback_terrace';
      width = 4.25 + rng() * 0.65;
      depth = 4.1 + rng() * 0.65;
    }

    let turnAngleDeg = 0;
    let horizGap = i === 1 ? 4.4 : 0;
    let clearGap = i === 1 ? 1.05 : 0;
    let vertRise = i === 1 ? 0.8 : 0;
    let dx = Number(Math.cos(headingRad).toFixed(4));
    let dz = Number(Math.sin(headingRad).toFixed(4));

    if (i > 1) {
      const prevStep = steps[i - 2];

      // ============================================================================
      // 3D SPIRALING MOUNTAIN ASCENT WITH NON-LINEAR CRAG SWITCHBACKS
      // Winds 360° counter-clockwise around the Colossal Central Mountain Core
      // at (MOUNTAIN_CORE_X = 0, MOUNTAIN_CORE_Z = -21.5) while weaving radially in
      // and out across jagged rock spurs so no two jumps follow a straight line!
      // ============================================================================
      const diffScale = (difficultyRating - 1) / 9;
      clearGap = Number((0.84 + diffScale * 0.34 + rng() * 0.1).toFixed(2));
      vertRise = Number((0.68 + diffScale * 0.22 + rng() * 0.08).toFixed(2));

      const prevRadialAngle = Math.atan2(
        curZ - MOUNTAIN_CORE_Z,
        curX - MOUNTAIN_CORE_X
      );
      // Target angle advances counter-clockwise (-0.28 to -0.38 rad per stage) around the mountain core
      const dTheta = -(0.27 + (i % 3) * 0.05 + rng() * 0.08);
      const nextRadialAngle = prevRadialAngle + dTheta;

      // Radial crag variation: weave between 11.4m (inner cliff alcove) and 16.0m (outer rock spur)
      // creating sharp non-linear inward and outward dogleg cuts while spiraling up the mountain!
      const zigBeat = i % 4;
      const radialBase =
        zigBeat === 0
          ? 11.5
          : zigBeat === 1
          ? 15.4
          : zigBeat === 2
          ? 12.6
          : 15.8;
      const targetRadius = radialBase + (rng() - 0.5) * 1.3;

      const idealTargetX =
        MOUNTAIN_CORE_X + Math.cos(nextRadialAngle) * targetRadius;
      const idealTargetZ =
        MOUNTAIN_CORE_Z + Math.sin(nextRadialAngle) * targetRadius;

      const desiredHeading = Math.atan2(
        idealTargetZ - curZ,
        idealTargetX - curX
      );

      const appliedDelta = Math.atan2(
        Math.sin(desiredHeading - headingRad),
        Math.cos(desiredHeading - headingRad)
      );
      headingRad = desiredHeading;
      turnAngleDeg = Math.round((appliedDelta * 180) / Math.PI);

      dx = Number(Math.cos(headingRad).toFixed(4));
      dz = Number(Math.sin(headingRad).toFixed(4));

      // Compute exact directional extents along (dx, dz) so clearGap is always fair and jumpable!
      const prevExtent = directionalHalfExtent(
        prevStep.width,
        prevStep.depth,
        dx,
        dz
      );
      const curExtent = directionalHalfExtent(width, depth, dx, dz);

      horizGap = prevExtent + curExtent + clearGap;

      curX += dx * horizGap;
      curZ += dz * horizGap;
      curY += vertRise;
    }

    const spiralAngleRad = Number(
      Math.atan2(curZ - MOUNTAIN_CORE_Z, curX - MOUNTAIN_CORE_X).toFixed(4)
    );

    const perpX = -dz;
    const perpZ = dx;

    let hazard: StepHazardType = 'none';
    let gauntletType: TrailGauntletType = 'plank_bridge';
    let friction = 0.92;
    const restitution = 0.18;
    let hazardSpeed = 0;
    let hazardAmplitude = 0;
    const vehicleStyle: VehicleStyle = 'golem';
    const hasTreeLeft =
      i < 260 && stageArchetype !== 'pin_needle' && rng() < 0.72;
    const hasTreeRight =
      i < 260 && stageArchetype !== 'pin_needle' && rng() < 0.68;
    let hasBarrierCenter = false;
    const conveyorDirX = perpX;
    const conveyorDirZ = perpZ;

    // Charge speed scales smoothly with the stage's random difficulty rating
    const chargeSpeedMultiplier = isMilestone
      ? 1.0
      : Number((1.0 + (difficultyRating / 10) * 0.28 + rng() * 0.05).toFixed(2));

    const hasBridgeToNext = false;

    // ============================================================================
    // STAGE PUZZLE ARCHETYPE SELECTION (Every non-milestone stage has a real puzzle!)
    // 1. boulder_socket: Push Sisyphus's Boulder into the Golden Altar Socket + Runes
    // 2. ordered_runes: Step on Numbered Runes in strict sequence 1 -> 2 -> 3
    // 3. timed_runes: Beat the ticking countdown clock to activate all Runes
    // 4. crusher_gauntlet: Multi-Rune Lock under heavy rolling boulders / beams
    // ============================================================================
    let puzzleType: StagePuzzleType = 'none';
    if (isMilestone) {
      puzzleType = 'none';
    } else if (i === 1) {
      puzzleType = 'crusher_gauntlet';
    } else if (i === 2 || i === 5 || i === 10) {
      puzzleType = 'boulder_socket';
    } else if (i === 3 || i === 6) {
      puzzleType = 'ordered_runes';
    } else if (i === 4 || i === 8) {
      puzzleType = 'timed_runes';
    } else {
      const pRoll = (i * 5 + Math.floor(rng() * 4)) % 4;
      if (pRoll === 0 && stageArchetype !== 'pin_needle') {
        puzzleType = 'boulder_socket';
      } else if (pRoll === 1) {
        puzzleType = 'ordered_runes';
      } else if (pRoll === 2) {
        puzzleType = 'timed_runes';
      } else {
        puzzleType = 'crusher_gauntlet';
      }
    }

    const requiresSwitch = puzzleType !== 'none' && i < TOTAL_LEVELS;
    const requiresBoulderSocket =
      puzzleType === 'boulder_socket' && i < TOTAL_LEVELS;

    // Fair countdown timer for timed_runes (6.2s to 9.0s)
    const runeTimeLimitSec =
      puzzleType === 'timed_runes'
        ? Number(Math.max(6.2, 9.2 - difficultyRating * 0.28).toFixed(1))
        : 0;

    const runePlates: RunePlateNode[] = [];
    if (requiresSwitch && i < TOTAL_LEVELS) {
      const plateCount =
        i === 1
          ? 1
          : puzzleType === 'ordered_runes' || puzzleType === 'timed_runes'
          ? difficultyRating >= 7 && stageArchetype !== 'pin_needle'
            ? 3
            : 2
          : puzzleType === 'boulder_socket'
          ? 1
          : difficultyRating >= 8
          ? 3
          : difficultyRating >= 5
          ? 2
          : 1;

      const sideFlip = rng() < 0.5 ? 1 : -1;
      for (let pIdx = 0; pIdx < plateCount; pIdx++) {
        let fwdOffset = 0;
        let latOffset = 0;
        if (i === 1) {
          // Stage 1: place the single glowing rune plate right along the central trailhead lane
          fwdOffset = 0.04 * width;
          latOffset = 0.12 * depth;
        } else if (plateCount === 1) {
          fwdOffset = (-0.12 + rng() * 0.22) * width;
          latOffset = sideFlip * (0.2 + rng() * 0.1) * depth;
        } else if (plateCount === 2) {
          fwdOffset =
            (pIdx === 0 ? -0.16 + rng() * 0.1 : 0.06 + rng() * 0.1) * width;
          latOffset =
            (pIdx === 0 ? -sideFlip : sideFlip) * (0.22 + rng() * 0.08) * depth;
        } else {
          fwdOffset =
            pIdx === 0
              ? (-0.2 + rng() * 0.07) * width
              : pIdx === 1
              ? (-0.03 + rng() * 0.09) * width
              : (0.1 + rng() * 0.08) * width;
          latOffset =
            pIdx === 0
              ? -sideFlip * (0.23 + rng() * 0.07) * depth
              : pIdx === 1
              ? sideFlip * (0.23 + rng() * 0.07) * depth
              : (-0.08 + rng() * 0.16) * depth;
        }
        const rx = Number((dx * fwdOffset + perpX * latOffset).toFixed(2));
        const rz = Number((dz * fwdOffset + perpZ * latOffset).toFixed(2));
        runePlates.push({
          id: `rune-${i}-${pIdx}`,
          index: pIdx,
          relX: rx,
          relZ: rz,
          radius: i === 1 ? 0.64 : 0.58,
        });
      }
    }

    const switchRelX = runePlates[0]?.relX ?? 0;
    const switchRelZ = runePlates[0]?.relZ ?? 0;

    // Sisyphus Pushable Boulder & Golden Altar Socket coordinates (for boulder_socket stages)
    let boulderStartRelX = 0;
    let boulderStartRelZ = 0;
    let boulderSocketRelX = 0;
    let boulderSocketRelZ = 0;
    if (requiresBoulderSocket) {
      const bSide = i % 2 === 0 ? 1 : -1;
      const startFwd = -0.12 * width;
      const startLat = -bSide * 0.2 * depth;
      const sockFwd = 0.14 * width;
      const sockLat = bSide * 0.22 * depth;
      boulderStartRelX = Number((dx * startFwd + perpX * startLat).toFixed(2));
      boulderStartRelZ = Number((dz * startFwd + perpZ * startLat).toFixed(2));
      boulderSocketRelX = Number((dx * sockFwd + perpX * sockLat).toFixed(2));
      boulderSocketRelZ = Number((dz * sockFwd + perpZ * sockLat).toFixed(2));
    }

    // ============================================================================
    // ON-DECK SOLID SCULPTED OBSTACLES (Mossy Crag Boulders, Fallen Cedar Logs, Carved Totems, Spruce Trees)
    // Placed with guaranteed clearance from the Back Landing Zone, Rune Plates & Boulder Socket!
    // ============================================================================
    const deckObstacles: DeckObstacle[] = [];

    const tryAddObstacle = (cand: DeckObstacle) => {
      // 1. Keep Back Landing Zone clear so landing never clips an obstacle
      const fwdProj = cand.relX * dx + cand.relZ * dz;
      const entryRelX = -dx * width * 0.25;
      const entryRelZ = -dz * depth * 0.25;
      if (
        Math.hypot(cand.relX - entryRelX, cand.relZ - entryRelZ) <
        Math.max(cand.halfW, cand.halfD) + 0.42
      ) {
        return;
      }
      // 2. Keep Front Launch Strip clear so player can stand at the launch edge
      if (fwdProj > width * 0.31) return;
      // 3. Keep clear of all Rune Plates so every rune is reachable
      for (const rp of runePlates) {
        if (
          Math.hypot(cand.relX - rp.relX, cand.relZ - rp.relZ) <
          Math.max(cand.halfW, cand.halfD) + 0.38
        ) {
          return;
        }
      }
      // 4. Keep clear of Sisyphus Puzzle Boulder & Altar Socket
      if (requiresBoulderSocket) {
        if (
          Math.hypot(cand.relX - boulderStartRelX, cand.relZ - boulderStartRelZ) <
            Math.max(cand.halfW, cand.halfD) + 0.55 ||
          Math.hypot(cand.relX - boulderSocketRelX, cand.relZ - boulderSocketRelZ) <
            Math.max(cand.halfW, cand.halfD) + 0.55
        ) {
          return;
        }
      }
      // 5. Keep clear of existing obstacles
      for (const ex of deckObstacles) {
        if (
          Math.hypot(cand.relX - ex.relX, cand.relZ - ex.relZ) <
          Math.max(cand.halfW, cand.halfD) + Math.max(ex.halfW, ex.halfD) + 0.38
        ) {
          return;
        }
      }
      deckObstacles.push(cand);
    };

    if (hasTreeLeft) {
      tryAddObstacle({
        id: `tree-L-${i}`,
        relX: Number((-dx * width * 0.22 - perpX * depth * 0.34).toFixed(2)),
        relZ: Number((-dz * width * 0.22 - perpZ * depth * 0.34).toFixed(2)),
        halfW: 0.34,
        halfD: 0.34,
        height: 1.55,
        kind: i > 120 ? 'crystal' : 'tree',
      });
    }
    if (hasTreeRight) {
      tryAddObstacle({
        id: `tree-R-${i}`,
        relX: Number((-dx * width * 0.22 + perpX * depth * 0.34).toFixed(2)),
        relZ: Number((-dz * width * 0.22 + perpZ * depth * 0.34).toFixed(2)),
        halfW: 0.34,
        halfD: 0.34,
        height: 1.55,
        kind: i > 120 ? 'crystal' : 'tree',
      });
    }

    if (i < TOTAL_LEVELS) {
      if (stageArchetype === 'grand_sanctuary' || difficultyRating >= 8) {
        hasBarrierCenter = true;
        tryAddObstacle({
          id: `totem-center-${i}`,
          relX: 0,
          relZ: 0,
          halfW: 0.40,
          halfD: 0.40,
          height: 1.25,
          kind: 'totem',
        });
        tryAddObstacle({
          id: `boulder-L-${i}`,
          relX: Number((-dx * 0.38 - perpX * (depth * 0.24)).toFixed(2)),
          relZ: Number((-dz * 0.38 - perpZ * (depth * 0.24)).toFixed(2)),
          halfW: 0.38,
          halfD: 0.38,
          height: 0.95,
          kind: i > 120 ? 'crystal' : 'pillar',
        });
        tryAddObstacle({
          id: `boulder-R-${i}`,
          relX: Number((dx * 0.28 + perpX * (depth * 0.24)).toFixed(2)),
          relZ: Number((dz * 0.28 + perpZ * (depth * 0.24)).toFixed(2)),
          halfW: 0.38,
          halfD: 0.38,
          height: 0.95,
          kind: i > 120 ? 'crystal' : 'pillar',
        });
      } else if (stageArchetype === 'canyon_span') {
        tryAddObstacle({
          id: `log-A-${i}`,
          relX: Number((-dx * 0.22 - perpX * (depth * 0.14)).toFixed(2)),
          relZ: Number((-dz * 0.22 - perpZ * (depth * 0.14)).toFixed(2)),
          halfW: 0.4,
          halfD: 0.4,
          height: 0.85,
          kind: 'wall',
        });
        tryAddObstacle({
          id: `log-B-${i}`,
          relX: Number((dx * 0.18 + perpX * (depth * 0.14)).toFixed(2)),
          relZ: Number((dz * 0.18 + perpZ * (depth * 0.14)).toFixed(2)),
          halfW: 0.4,
          halfD: 0.4,
          height: 0.85,
          kind: 'wall',
        });
      } else if (stageArchetype === 'knife_ridge') {
        tryAddObstacle({
          id: `ridge-rock-1-${i}`,
          relX: Number((-dx * 0.42 + perpX * (depth * 0.18)).toFixed(2)),
          relZ: Number((-dz * 0.42 + perpZ * (depth * 0.18)).toFixed(2)),
          halfW: 0.36,
          halfD: 0.36,
          height: 0.88,
          kind: 'pillar',
        });
        tryAddObstacle({
          id: `ridge-rock-2-${i}`,
          relX: Number((dx * 0.28 - perpX * (depth * 0.18)).toFixed(2)),
          relZ: Number((dz * 0.28 - perpZ * (depth * 0.18)).toFixed(2)),
          halfW: 0.36,
          halfD: 0.36,
          height: 0.88,
          kind: 'totem',
        });
      } else {
        const layoutVariant = (i + Math.floor(rng() * 3)) % 3;
        if (layoutVariant === 0) {
          hasBarrierCenter = true;
          tryAddObstacle({
            id: `center-boulder-${i}`,
            relX: 0,
            relZ: 0,
            halfW: 0.42,
            halfD: 0.42,
            height: 1.0,
            kind: i % 2 === 0 ? 'totem' : 'pillar',
          });
        } else if (layoutVariant === 1) {
          tryAddObstacle({
            id: `chicane-log-A-${i}`,
            relX: Number((-dx * 0.32 + perpX * (depth * 0.18)).toFixed(2)),
            relZ: Number((-dz * 0.32 + perpZ * (depth * 0.18)).toFixed(2)),
            halfW: 0.38,
            halfD: 0.38,
            height: 0.85,
            kind: 'wall',
          });
          tryAddObstacle({
            id: `chicane-boulder-B-${i}`,
            relX: Number((dx * 0.22 - perpX * (depth * 0.18)).toFixed(2)),
            relZ: Number((dz * 0.22 - perpZ * (depth * 0.18)).toFixed(2)),
            halfW: 0.38,
            halfD: 0.38,
            height: 0.92,
            kind: 'pillar',
          });
        } else {
          tryAddObstacle({
            id: `flank-totem-L-${i}`,
            relX: Number((dx * 0.12 - perpX * (depth * 0.24)).toFixed(2)),
            relZ: Number((dz * 0.12 - perpZ * (depth * 0.24)).toFixed(2)),
            halfW: 0.36,
            halfD: 0.36,
            height: 1.08,
            kind: 'totem',
          });
          tryAddObstacle({
            id: `flank-totem-R-${i}`,
            relX: Number((dx * 0.12 + perpX * (depth * 0.24)).toFixed(2)),
            relZ: Number((dz * 0.12 + perpZ * (depth * 0.24)).toFixed(2)),
            halfW: 0.36,
            halfD: 0.36,
            height: 1.08,
            kind: 'totem',
          });
        }
      }
      // Guarantee physical roadblock chicanes even on stages with 3-rune arrays
      if (deckObstacles.length === 0) {
        const sideSign = i % 2 === 0 ? 1 : -1;
        tryAddObstacle({
          id: `rim-spire-A-${i}`,
          relX: Number((dx * 0.04 + perpX * sideSign * (depth * 0.34)).toFixed(2)),
          relZ: Number((dz * 0.04 + perpZ * sideSign * (depth * 0.34)).toFixed(2)),
          halfW: 0.32,
          halfD: 0.32,
          height: 0.96,
          kind: i > 120 ? 'crystal' : 'pillar',
        });
        tryAddObstacle({
          id: `rim-spire-B-${i}`,
          relX: Number((-dx * 0.06 - perpX * sideSign * (depth * 0.34)).toFixed(2)),
          relZ: Number((-dz * 0.06 - perpZ * sideSign * (depth * 0.34)).toFixed(2)),
          halfW: 0.32,
          halfD: 0.32,
          height: 0.96,
          kind: 'totem',
        });
      }
    }

    // Side-Character Mocking & Path-Blocking NPCs stationed on key terraces and every 50th/100th Milestone Sanctuary
    let npc: TrailNpcData | undefined;
    if (
      i === 1 ||
      i === 3 ||
      i === 6 ||
      i === 12 ||
      i % 9 === 0 ||
      i % 50 === 0 ||
      i === TOTAL_LEVELS - 1 ||
      i === TOTAL_LEVELS
    ) {
      const castTemplate =
        i === 3
          ? NPC_CAST[1]
          : i === 6
          ? NPC_CAST[2]
          : NPC_CAST[(i + Math.floor(rng() * 3)) % NPC_CAST.length];
      const blocksPath =
        i > 1 &&
        i < TOTAL_LEVELS &&
        i % 50 !== 0 &&
        (castTemplate.behavior === 'blocker' ||
          i === 3 ||
          i === 12 ||
          i % 18 === 0);
      const npcSide = i % 2 === 0 ? 1 : -1;
      let npcAngle = blocksPath ? headingRad : headingRad + npcSide * 1.45;
      const distMult = blocksPath ? 0.28 : 0.35;
      let nRelX = Number((Math.cos(npcAngle) * (width * distMult)).toFixed(2));
      let nRelZ = Number((Math.sin(npcAngle) * (depth * distMult)).toFixed(2));

      // Ensure non-blocking NPCs never stand on top of a Rune Plate or Boulder Socket!
      if (!blocksPath) {
        const overlapsRune = runePlates.some(
          (rp) => Math.hypot(nRelX - rp.relX, nRelZ - rp.relZ) < 0.95
        );
        if (overlapsRune) {
          npcAngle = headingRad - npcSide * 1.45;
          nRelX = Number((Math.cos(npcAngle) * (width * distMult)).toFixed(2));
          nRelZ = Number((Math.sin(npcAngle) * (depth * distMult)).toFixed(2));
        }
      }

      npc = {
        id: `npc-step-${i}`,
        ...castTemplate,
        blocksPathByDefault: blocksPath,
        relX: nRelX,
        relZ: nRelZ,
      };
    }

    // ============================================================================
    // SISYPHEAN ROLLING STONE & MOUNTAIN HAZARD SELECTION SCALED BY RANDOM DIFFICULTY
    // ============================================================================
    const speedScale = 0.92 + (difficultyRating / 10) * 0.65;
    if (i % 50 === 0 || i === TOTAL_LEVELS) {
      hazard = 'none';
      gauntletType = 'ranger_outpost';
    } else if (i === 1) {
      hazard = 'pusher';
      hazardSpeed = 1.25;
      hazardAmplitude = 0.78;
      gauntletType = 'boulder_run';
    } else if (i === 2 || i === 5 || i === 8) {
      hazard = 'sweeper';
      hazardSpeed = 1.45;
      gauntletType = 'sawmill_sweep';
    } else if (i === 3 || i === 6) {
      hazard = 'pusher';
      hazardSpeed = 1.75;
      hazardAmplitude = 0.85;
      gauntletType = 'boulder_run';
    } else if (i === 4) {
      hazard = 'wind';
      hazardSpeed = 1.65;
      gauntletType = 'wind_ridge';
    } else if (difficultyRating <= 2) {
      hazard = rng() < 0.45 ? 'none' : 'wind';
      hazardSpeed = 1.35;
      gauntletType = 'plank_bridge';
    } else {
      const hRoll = (rng() + i * 0.173) % 1;

      if (hRoll < 0.32) {
        hazard = 'pusher';
        hazardSpeed = (1.65 + rng() * 0.6) * speedScale;
        hazardAmplitude = 0.92;
        gauntletType = 'boulder_run';
      } else if (hRoll < 0.50) {
        hazard = 'sweeper';
        hazardSpeed =
          (rng() < 0.5 ? 1 : -1) * (1.45 + rng() * 0.55) * speedScale;
        gauntletType = 'sawmill_sweep';
      } else if (hRoll < 0.63) {
        hazard = 'conveyor';
        hazardSpeed = (1.35 + rng() * 0.5) * speedScale;
        gauntletType = 'mud_switchback';
      } else if (hRoll < 0.75) {
        hazard = 'turntable';
        hazardSpeed = (rng() < 0.5 ? 1 : -1) * (1.15 + rng() * 0.5) * speedScale;
        gauntletType = 'switch_gate';
      } else if (hRoll < 0.86 && difficultyRating >= 5) {
        hazard = 'crumble';
        gauntletType = 'crumble_ledge';
      } else if (hRoll < 0.94 && difficultyRating >= 4) {
        hazard = 'wind';
        hazardSpeed = (1.95 + rng() * 0.65) * speedScale;
        gauntletType = 'wind_ridge';
      } else {
        hazard = difficultyRating >= 4 && rng() < 0.72 ? 'ice' : 'barrier';
        if (hazard === 'ice') friction = 0.22;
        gauntletType = requiresSwitch ? 'switch_gate' : 'plank_bridge';
      }
    }

    if (requiresSwitch) {
      gauntletType = 'switch_gate';
    }

    const archetypeLabels: Record<StageArchetype, string> = {
      outpost_plaza: 'Mountain Terrace',
      grand_sanctuary: 'Sisyphean Sanctuary',
      knife_ridge: 'Knife-Edge Crag',
      canyon_span: 'Cliffside Escarpment',
      pin_needle: 'Tartarus Spire Outcrop',
      switchback_terrace: 'Granite Switchback',
    };

    const puzzleLabels: Record<StagePuzzleType, string> = {
      none: 'Exposed Crag',
      boulder_socket: 'Sisyphus Stone Trial',
      ordered_runes: 'Harmonic Rune Lock',
      timed_runes: `${runeTimeLimitSec}s Relay Trial`,
      crusher_gauntlet: 'Tartarus Gauntlet',
    };

    const descTitle =
      i === 1
        ? 'Mount Tartarus Trailhead Gate'
        : i === 500
        ? 'Summit of the Universe · Sisyphus Crown'
        : `${archetypeLabels[stageArchetype]} ${i} · ${puzzleLabels[puzzleType]}`;

    const puzzleInstructions: Record<StagePuzzleType, string> = {
      none: `Diff ${difficultyRating}/10 · Judge the elevation, crosswind, and gap distance yourself—no trajectory reticle will guide your boots.`,
      boulder_socket: `Diff ${difficultyRating}/10 [SISYPHUS STONE TRIAL] · The carved boulder rolls back down the slope if abandoned. Drive it into the altar socket and break the rune seal.`,
      ordered_runes: `Diff ${difficultyRating}/10 [HARMONIC RUNE LOCK] · The ${runePlates.length} runes demand a strict hidden sequence. One wrong step shatters the seal and resets the stage.`,
      timed_runes: `Diff ${difficultyRating}/10 [TIMED RUNE RELAY] · The seal collapses ${runeTimeLimitSec}s after the first rune is struck. Find the fastest line across the obstacles.`,
      crusher_gauntlet: `Diff ${difficultyRating}/10 [TARTARUS GAUNTLET] · Break all ${runePlates.length} rune seals under active mountain hazards, then gauge the blind leap to the next crag.`,
    };

    const decoyLedge: DecoyLedge | undefined = undefined;
    const supportDepth = Number((8.5 + (i % 5) * 1.4).toFixed(2));

    steps.push({
      stepNumber: i,
      biome,
      atmosphericLayer,
      stageArchetype,
      surfaceTheme: pal.theme,
      gauntletType,
      progressionPhase,
      difficultyRating,
      title: descTitle,
      psychologicalTrap:
        i === 500
          ? 'The 500th terrace at the very top of the universe—where the Eternal Rolling Stone finally rests.'
          : puzzleInstructions[puzzleType],
      x: Number(curX.toFixed(3)),
      y: Number(curY.toFixed(3)),
      z: Number(curZ.toFixed(3)),
      width: Number(width.toFixed(2)),
      depth: Number(depth.toFixed(2)),
      height: isMilestone ? 1.85 : 1.45,
      supportDepth,
      friction,
      restitution,
      chargeSpeedMultiplier,
      hazard,
      vehicleStyle,
      hazardSpeed: Number(hazardSpeed.toFixed(2)),
      hazardAmplitude: Number(hazardAmplitude.toFixed(2)),
      hazardPhase: Number((rng() * Math.PI * 2).toFixed(2)),
      conveyorDirX: Number(conveyorDirX.toFixed(3)),
      conveyorDirZ: Number(conveyorDirZ.toFixed(3)),
      hasTreeLeft,
      hasTreeRight,
      hasBarrierCenter,
      hasBridgeToNext,
      requiresSwitch,
      switchRelX,
      switchRelZ,
      puzzleType,
      runeTimeLimitSec,
      requiresBoulderSocket,
      boulderStartRelX,
      boulderStartRelZ,
      boulderSocketRelX,
      boulderSocketRelZ,
      spiralAngleRad,
      runePlates,
      deckObstacles,
      npc,
      decoyLedge,
      dirX: dx,
      dirZ: dz,
      turnAngleDeg,
      horizGap: Number(horizGap.toFixed(2)),
      clearGap: Number(clearGap.toFixed(2)),
      vertRise: Number(vertRise.toFixed(2)),
      topColorHex: pal.top,
      topAltColorHex: pal.topAlt,
      sideColorHex: pal.side,
      accentHex: pal.accent,
    });
  }

  return steps;
}

export let currentSpireSeed: number = DEFAULT_SPIRE_SEED;
export const LEVELS_500: LevelStep[] = generate500Levels(DEFAULT_SPIRE_SEED);

export function reseedLevels500(newSeed: number): LevelStep[] {
  currentSpireSeed = newSeed;
  const fresh = generate500Levels(newSeed);
  LEVELS_500.length = 0;
  LEVELS_500.push(...fresh);
  return LEVELS_500;
}
