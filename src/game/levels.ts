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
    name: '01. Hawk Peak Lower Trailhead',
    range: 'Stages 001 – 050',
    subtitle: 'Sunlit Pine Sanctuary · Grounded Cliff Outcrops, Rune Locks & Boulders',
    themeColor: '#7ca936',
    surfaceTheme: 'sanctuary',
    atmosphericLayer: 'troposphere_valley',
    coreIrritationMechanic:
      'Traverse varied mountain cliff ledges, weave around solid mossy boulders and fallen cedar logs, activate glowing Rune Plates, and follow the directional jump compass.',
  },
  {
    biome: 2,
    name: '02. Autumn Birch Switchbacks',
    range: 'Stages 051 – 100',
    subtitle: 'Golden Canopy & Cloud Rim · Knife-Edge Ridges & Dual Rune Locks',
    themeColor: '#d97724',
    surfaceTheme: 'clockwork',
    atmosphericLayer: 'alpine_cloud_deck',
    coreIrritationMechanic:
      'Climb into the alpine cloud sea where narrow ridge spines, rotating timber beams, and wide canyon shelves test your timing.',
  },
  {
    biome: 3,
    name: '03. Lower Stratosphere Sky-Pier',
    range: 'Stages 101 – 150',
    subtitle: 'Breaking the Cloud Deck (100+) · Cobalt Skies & Cliff Causeways',
    themeColor: '#2ec4b6',
    surfaceTheme: 'aqueduct',
    atmosphericLayer: 'stratosphere',
    coreIrritationMechanic:
      'Ascend above the cloud sea into the deep cobalt Stratosphere. Cross moving cliff ferries and unlock dual-rune barriers before vaulting.',
  },
  {
    biome: 4,
    name: '04. Stratospheric Jetstream Citadel',
    range: 'Stages 151 – 200',
    subtitle: 'High-Altitude Basalt Relays · Fracture Slabs & Crosswinds',
    themeColor: '#3b82f6',
    surfaceTheme: 'causeway',
    atmosphericLayer: 'stratosphere',
    coreIrritationMechanic:
      'Jetstream crosswinds sweep between ancient mountain citadel ledges while unstable fracture slabs tremble beneath your boots.',
  },
  {
    biome: 5,
    name: '05. Mesosphere Cryo-Quartz Spire',
    range: 'Stages 201 – 250',
    subtitle: 'Twilight Horizon & First Stars · Low-Friction Quartz & Totem Slaloms',
    themeColor: '#38bdf8',
    surfaceTheme: 'quartz',
    atmosphericLayer: 'thermosphere_aurora',
    coreIrritationMechanic:
      'Slick cryo-quartz decks preserve landing momentum in thin upper-atmosphere air while rotating crystal arms sweep the path.',
  },
  {
    biome: 6,
    name: '06. Aurora Borealis Causeway',
    range: 'Stages 251 – 300',
    subtitle: 'Emerald & Violet Sky Curtains · Triple-Rune Sanctuaries & Dials',
    themeColor: '#10b981',
    surfaceTheme: 'orrery',
    atmosphericLayer: 'thermosphere_aurora',
    coreIrritationMechanic:
      'Under shimmering aurora curtains, solve 3-plate rune puzzles on spinning astrolabe decks before lining up your jump.',
  },
  {
    biome: 7,
    name: '07. Thermosphere Orbital Ring',
    range: 'Stages 301 – 350',
    subtitle: 'Sub-Orbital Obsidian Decks · Phase-Blinking Bridges & Gravity Gusts',
    themeColor: '#8b5cf6',
    surfaceTheme: 'anomaly',
    atmosphericLayer: 'thermosphere_aurora',
    coreIrritationMechanic:
      'Sub-orbital platforms phase in and out on a rhythm—navigate the solid crystal chicanes and leap before the deck dematerializes.',
  },
  {
    biome: 8,
    name: '08. Exosphere Starlight Foundry',
    range: 'Stages 351 – 400',
    subtitle: 'Edge of Space · Solar-Sail Decks, Meteor Spheres & Magnetic Streams',
    themeColor: '#f59e0b',
    surfaceTheme: 'crucible',
    atmosphericLayer: 'deep_space',
    coreIrritationMechanic:
      'Enter Deep Space where ringed planets and nebulae fill the void and rolling meteor spheres patrol gilded solar-sail stages.',
  },
  {
    biome: 9,
    name: '09. Deep Space Nebula Sanctuary',
    range: 'Stages 401 – 450',
    subtitle: 'Cosmic Starfields & Ringed Planets · Shifting Void Currents',
    themeColor: '#ec4899',
    surfaceTheme: 'nimbus',
    atmosphericLayer: 'deep_space',
    coreIrritationMechanic:
      'High-precision jumps across crystalline asteroid sanctuaries with shifting camera angles every 12 stages.',
  },
  {
    biome: 10,
    name: '10. Hawk Peak 500 Astral Apex',
    range: 'Stages 451 – 500',
    subtitle: 'The True Cosmic Summit · Every Puzzle & Obstacle Combined',
    themeColor: '#facc15',
    surfaceTheme: 'monolith',
    atmosphericLayer: 'deep_space',
    coreIrritationMechanic:
      'The final 50 cosmic monoliths combine 3-rune barrier locks, boulder slaloms, sweeping beams, and shifting camera angles up to Stage 500.',
  },
];

export const PHILOSOPHICAL_ENDING_QUOTE =
  'From a sunlit pine valley to the silent stars of Stage 500—you climbed the entire mountain purely on your own two feet.';

export const PHILOSOPHICAL_TAUNTS: {
  minStepsLost: number;
  quote: string;
  author: string;
}[] = [
  {
    minStepsLost: 1,
    quote: 'You cleared the whole stage puzzle just to misjudge the launch edge by six inches.',
    author: 'Ranger Barnaby, Trail Log #4',
  },
  {
    minStepsLost: 2,
    quote: 'Listen to the peaceful acoustic guitar. Let the calm music soothe the sting of that fall.',
    author: 'Pip the Crow, Perched Above You',
  },
  {
    minStepsLost: 4,
    quote: 'Did the camera shift throw off your depth perception, or was that jump artistic expression?',
    author: 'Chadwick the Mountain Goat',
  },
  {
    minStepsLost: 7,
    quote: 'At least the lower cliff terrace caught your fall instead of the river!',
    author: 'Maeve the Camper Fox',
  },
  {
    minStepsLost: 12,
    quote: 'I move at 0.02 miles per hour and I am somehow still ahead of you.',
    author: 'Shelly the Tortoise',
  },
  {
    minStepsLost: 20,
    quote: 'Look on the bright side: those lower cliff outcrops look even prettier on the way down.',
    author: 'Ranger Barnaby, Field Notes',
  },
  {
    minStepsLost: 35,
    quote: 'A peaceful mountain melody plays on, completely indifferent to your gravity-assisted descent.',
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
export const GROUND_SPAWN_X = -1.2;
export const GROUND_SPAWN_Z = 2.6;

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
  // 7. Trailhead Wooden Signpost (x: -1.35, z: -1.45)
  {
    id: 'collider-signpost',
    label: 'Trailhead Signpost',
    x: -1.35,
    z: -1.45,
    halfW: 0.54,
    halfD: 0.28,
    height: 1.65,
    kind: 'prop',
  },
  // 8. Cedar Split-Rail Fence Line (x: 4.2, z: -1.8)
  {
    id: 'collider-fence-south',
    label: 'Park Boundary Fence',
    x: 4.2,
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
  difficultyRating: 1,
  title: 'Hawk Peak Base Camp & River Valley',
  x: GROUND_SPAWN_X,
  y: GROUND_FLOOR_Y,
  z: GROUND_SPAWN_Z,
  width: 28.0,
  depth: 22.0,
  height: 0.4,
  supportDepth: 4.0,
  dirX: 0.453,
  dirZ: -0.891,
  turnAngleDeg: 0,
  horizGap: 3.6,
  clearGap: 1.25,
  vertRise: 0.82,
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
  runePlates: [],
  deckObstacles: [],
  npc: {
    id: 'npc-base-camp',
    ...NPC_CAST[0],
    blocksPathByDefault: false,
    relX: -2.2,
    relZ: -0.4,
  },
  conveyorDirX: 0,
  conveyorDirZ: 0,
  decoyLedge: undefined,
  topColorHex: 0x7ca936,
  topAltColorHex: 0x648c28,
  sideColorHex: 0x645d55,
  accentHex: 0xc87d44,
  psychologicalTrap:
    'Cross the arched cedar bridge over the rushing turquoise river, chat with Ranger Barnaby in POV camera mode [E], and leap onto Stage 1 to begin the 500-stage ascent.',
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
  const tx = Math.abs(dx) > 0.001 ? halfW / Math.abs(dx) : Infinity;
  const tz = Math.abs(dz) > 0.001 ? halfD / Math.abs(dz) : Infinity;
  return Math.min(tx, tz);
}

export function generate500Levels(seed = DEFAULT_SPIRE_SEED): LevelStep[] {
  const rng = mulberry32(seed);
  const steps: LevelStep[] = [];

  // Stage 1 starts just south of the river bank so the player leaps from the valley trail or bridge onto Stage 1!
  let curX = 0.85;
  let curY = -0.52;
  let curZ = -1.65;
  let headingRad = -1.18;

  for (let i = 1; i <= TOTAL_LEVELS; i++) {
    const biome = Math.min(10, Math.ceil(i / 50)) as BiomeId;
    const atmosphericLayer = getAtmosphericLayerForStep(i);
    const pal = BIOME_PALETTES[biome];

    const difficultyRating = Math.min(
      10,
      Math.max(1, Math.ceil((i / TOTAL_LEVELS) * 10))
    );

    const isMilestone =
      i === 1 || i % 12 === 0 || i % 25 === 0 || i === TOTAL_LEVELS;

    // ============================================================================
    // DRAMATIC STAGE SIZE & SHAPE PERMUTATIONS (No two adjacent stages share identical dimensions!)
    // ============================================================================
    let stageArchetype: StageArchetype = 'switchback_terrace';
    let width = 3.8;
    let depth = 3.8;

    if (i === 1) {
      stageArchetype = 'outpost_plaza';
      width = 4.2;
      depth = 4.0;
    } else if (i === TOTAL_LEVELS) {
      stageArchetype = 'grand_sanctuary';
      width = 5.8;
      depth = 5.8;
    } else if (isMilestone) {
      stageArchetype = 'grand_sanctuary';
      width = 4.8 + rng() * 0.8;
      depth = 4.6 + rng() * 0.8;
    } else {
      const permRoll = (i * 3 + Math.floor(rng() * 5)) % 6;
      if (permRoll === 0) {
        // Grand Puzzle Sanctuary: Huge courtyard for multi-rune & multi-boulder puzzles
        stageArchetype = 'grand_sanctuary';
        width = 4.85 + rng() * 0.85;
        depth = 4.55 + rng() * 0.85;
      } else if (permRoll === 1) {
        // Knife-Edge Ridge: Elongated narrow mountain spine
        stageArchetype = 'knife_ridge';
        width = 4.35 + rng() * 0.85;
        depth = 2.45 + rng() * 0.35;
      } else if (permRoll === 2) {
        // Broad Canyon Shelf: Wide lateral span with wing runes
        stageArchetype = 'canyon_span';
        width = 3.05 + rng() * 0.45;
        depth = 4.85 + rng() * 0.95;
      } else if (permRoll === 3 && i > 4) {
        // Precision Pinnacle Needle: Compact outcrop requiring crisp footwork
        stageArchetype = 'pin_needle';
        width = 2.65 + rng() * 0.38;
        depth = 2.65 + rng() * 0.38;
      } else if (permRoll === 4) {
        // Outpost Plaza: Medium-large scenic terrace
        stageArchetype = 'outpost_plaza';
        width = 4.15 + rng() * 0.65;
        depth = 3.95 + rng() * 0.65;
      } else {
        // Asymmetric Switchback Terrace
        stageArchetype = 'switchback_terrace';
        width = 3.65 + rng() * 0.95;
        depth = 3.25 + rng() * 0.95;
      }
    }

    let turnAngleDeg = 0;
    let horizGap = i === 1 ? 3.8 : 0;
    let clearGap = i === 1 ? 1.18 : 0;
    let vertRise = i === 1 ? 0.82 : 0;
    let dx = Number(Math.cos(headingRad).toFixed(4));
    let dz = Number(Math.sin(headingRad).toFixed(4));

    if (i > 1) {
      const prevStep = steps[i - 2];

      // Helical / Winding Mountain Ascent so lower stages naturally sit beneath upper stages to catch falls logically!
      const spiralDelta =
        i <= 3
          ? (rng() - 0.5) * 0.24
          : 0.34 + (rng() - 0.35) * 0.38;
      headingRad += spiralDelta;
      turnAngleDeg = Math.round((spiralDelta * 180) / Math.PI);

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

      if (i === 2) {
        clearGap = 1.18;
        vertRise = 0.8;
      } else if (i <= 10) {
        clearGap = 1.16 + rng() * 0.24;
        vertRise = 0.78 + rng() * 0.16;
      } else {
        const prog = i / TOTAL_LEVELS;
        clearGap = 1.18 + prog * 0.28 + rng() * 0.24;
        vertRise = 0.8 + prog * 0.16 + rng() * 0.15;
      }

      horizGap = prevExtent + curExtent + clearGap;

      curX += dx * horizGap;
      curZ += dz * horizGap;
      curY += vertRise;
    }

    const perpX = -dz;
    const perpZ = dx;

    let hazard: StepHazardType = 'none';
    let gauntletType: TrailGauntletType = 'plank_bridge';
    let friction = 0.92;
    const restitution = 0.15;
    let hazardSpeed = 0;
    let hazardAmplitude = 0;
    const vehicleStyle: VehicleStyle = 'golem';
    const hasTreeLeft =
      i < 220 && stageArchetype !== 'pin_needle' && rng() < 0.68;
    const hasTreeRight =
      i < 220 && stageArchetype !== 'pin_needle' && rng() < 0.65;
    let hasBarrierCenter = false;
    const conveyorDirX = perpX;
    const conveyorDirZ = perpZ;

    const chargeSpeedMultiplier =
      i <= 4
        ? 1.0
        : Number((0.92 + (i / TOTAL_LEVELS) * 0.26 + rng() * 0.2).toFixed(2));

    const hasBridgeToNext =
      i === 1 || i === 2 || (i < 160 && i % 4 === 0);

    // Multi-Rune Gate Locks: On puzzle stages, the front Launch Edge is blocked by a solid energy/stone barrier
    // until the player steps on 1, 2, or 3 Rune Pressure Plates arranged across the stage deck!
    const requiresSwitch =
      i === 2 ||
      i === 4 ||
      i === 6 ||
      stageArchetype === 'grand_sanctuary' ||
      stageArchetype === 'canyon_span' ||
      (i >= 8 && i < TOTAL_LEVELS && (i % 2 === 0 || rng() < 0.52));

    const runePlates: RunePlateNode[] = [];
    if (requiresSwitch && i < TOTAL_LEVELS) {
      const plateCount =
        stageArchetype === 'pin_needle' || i <= 5
          ? 1
          : stageArchetype === 'grand_sanctuary' && i >= 12
          ? 3
          : stageArchetype === 'canyon_span' || i % 2 === 0
          ? 2
          : 1;

      for (let pIdx = 0; pIdx < plateCount; pIdx++) {
        let fwdOffset = 0;
        let latOffset = 0;
        if (plateCount === 1) {
          fwdOffset = -width * 0.06;
          latOffset = (i % 2 === 0 ? 1 : -1) * (depth * 0.24);
        } else if (plateCount === 2) {
          fwdOffset = (pIdx === 0 ? -0.12 : 0.06) * width;
          latOffset = (pIdx === 0 ? -1 : 1) * (depth * 0.28);
        } else {
          fwdOffset =
            pIdx === 0 ? -width * 0.2 : pIdx === 1 ? -width * 0.05 : width * 0.1;
          latOffset =
            pIdx === 0
              ? -depth * 0.28
              : pIdx === 1
              ? depth * 0.28
              : 0;
        }
        const rx = Number((dx * fwdOffset + perpX * latOffset).toFixed(2));
        const rz = Number((dz * fwdOffset + perpZ * latOffset).toFixed(2));
        runePlates.push({
          id: `rune-${i}-${pIdx}`,
          index: pIdx,
          relX: rx,
          relZ: rz,
          radius: 0.68,
        });
      }
    }

    const switchRelX = runePlates[0]?.relX ?? 0;
    const switchRelZ = runePlates[0]?.relZ ?? 0;

    // ============================================================================
    // ON-DECK SOLID SCULPTED OBSTACLES (Mossy Crag Boulders, Fallen Cedar Logs, Carved Totems, Spruce Trees)
    // Placed with guaranteed clearance from the Back Landing Zone & Rune Plates!
    // ============================================================================
    const deckObstacles: DeckObstacle[] = [];

    const tryAddObstacle = (cand: DeckObstacle) => {
      // 1. Keep Back Landing Zone clear so landing never clips an obstacle
      const fwdProj = cand.relX * dx + cand.relZ * dz;
      if (fwdProj < -width * 0.24) return;
      // 2. Keep Front Launch Strip clear so player can stand at the launch compass
      if (fwdProj > width * 0.26) return;
      // 3. Keep clear of all Rune Plates so every rune is reachable
      for (const rp of runePlates) {
        if (
          Math.hypot(cand.relX - rp.relX, cand.relZ - rp.relZ) <
          Math.max(cand.halfW, cand.halfD) + 0.58
        ) {
          return;
        }
      }
      // 4. Keep clear of existing obstacles
      for (const ex of deckObstacles) {
        if (
          Math.hypot(cand.relX - ex.relX, cand.relZ - ex.relZ) <
          Math.max(cand.halfW, cand.halfD) + Math.max(ex.halfW, ex.halfD) + 0.42
        ) {
          return;
        }
      }
      deckObstacles.push(cand);
    };

    if (hasTreeLeft) {
      deckObstacles.push({
        id: `tree-L-${i}`,
        relX: Number((-dx * width * 0.33 - perpX * depth * 0.35).toFixed(2)),
        relZ: Number((-dz * width * 0.33 - perpZ * depth * 0.35).toFixed(2)),
        halfW: 0.36,
        halfD: 0.36,
        height: 1.55,
        kind: i > 100 ? 'crystal' : 'tree',
      });
    }
    if (hasTreeRight) {
      deckObstacles.push({
        id: `tree-R-${i}`,
        relX: Number((-dx * width * 0.33 + perpX * depth * 0.35).toFixed(2)),
        relZ: Number((-dz * width * 0.33 + perpZ * depth * 0.35).toFixed(2)),
        halfW: 0.36,
        halfD: 0.36,
        height: 1.55,
        kind: i > 100 ? 'crystal' : 'tree',
      });
    }

    if (i > 1 && i < TOTAL_LEVELS) {
      if (stageArchetype === 'grand_sanctuary') {
        hasBarrierCenter = true;
        tryAddObstacle({
          id: `totem-center-${i}`,
          relX: 0,
          relZ: 0,
          halfW: 0.44,
          halfD: 0.44,
          height: 1.25,
          kind: 'totem',
        });
        tryAddObstacle({
          id: `boulder-L-${i}`,
          relX: Number((-dx * 0.45 - perpX * (depth * 0.22)).toFixed(2)),
          relZ: Number((-dz * 0.45 - perpZ * (depth * 0.22)).toFixed(2)),
          halfW: 0.42,
          halfD: 0.42,
          height: 0.95,
          kind: i > 120 ? 'crystal' : 'pillar',
        });
        tryAddObstacle({
          id: `boulder-R-${i}`,
          relX: Number((dx * 0.38 + perpX * (depth * 0.22)).toFixed(2)),
          relZ: Number((dz * 0.38 + perpZ * (depth * 0.22)).toFixed(2)),
          halfW: 0.42,
          halfD: 0.42,
          height: 0.95,
          kind: i > 120 ? 'crystal' : 'pillar',
        });
      } else if (stageArchetype === 'canyon_span') {
        // Twin Fallen Cedar Logs / Totems flanking the center forcing wing detours
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
        // Staggered ridge boulders forcing a tight weave along the narrow spine
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
    }

    // Side-Character Mocking & Path-Blocking NPCs stationed on key terraces
    let npc: TrailNpcData | undefined;
    if (
      i === 1 ||
      i === 3 ||
      i === 6 ||
      i === 12 ||
      i % 9 === 0 ||
      i === TOTAL_LEVELS - 1
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
        (castTemplate.behavior === 'blocker' ||
          i === 3 ||
          i === 12 ||
          i % 18 === 0);
      const npcSide = i % 2 === 0 ? 1 : -1;
      const npcAngle = blocksPath ? headingRad : headingRad + npcSide * 1.35;
      const distMult = blocksPath ? 0.28 : 0.34;
      npc = {
        id: `npc-step-${i}`,
        ...castTemplate,
        blocksPathByDefault: blocksPath,
        relX: Number((Math.cos(npcAngle) * (width * distMult)).toFixed(2)),
        relZ: Number((Math.sin(npcAngle) * (depth * distMult)).toFixed(2)),
      };
    }

    // Non-repeating dynamic stage hazard selection across all 500 stages
    if (i === 1 || i === TOTAL_LEVELS) {
      hazard = 'none';
      gauntletType = 'ranger_outpost';
    } else if (i === 2) {
      hazard = 'barrier';
      gauntletType = 'switch_gate';
    } else if (i === 3) {
      hazard = 'pusher';
      hazardSpeed = 1.55;
      hazardAmplitude = 0.85;
      gauntletType = 'boulder_run';
    } else {
      const hRoll = (rng() + i * 0.173) % 1;
      const speedScale = 1 + (i / TOTAL_LEVELS) * 0.55;

      if (hRoll < 0.19) {
        hazard = 'pusher';
        hazardSpeed = (1.55 + rng() * 0.55) * speedScale;
        hazardAmplitude = 0.88;
        gauntletType = 'boulder_run';
      } else if (hRoll < 0.35) {
        hazard = 'sweeper';
        hazardSpeed =
          (rng() < 0.5 ? 1 : -1) * (1.35 + rng() * 0.5) * speedScale;
        gauntletType = 'sawmill_sweep';
      } else if (hRoll < 0.49) {
        hazard = 'conveyor';
        hazardSpeed = (1.15 + rng() * 0.45) * speedScale;
        gauntletType = 'mud_switchback';
      } else if (hRoll < 0.61) {
        hazard = 'turntable';
        hazardSpeed = (rng() < 0.5 ? 1 : -1) * (0.95 + rng() * 0.45);
        gauntletType = 'switch_gate';
      } else if (hRoll < 0.73) {
        hazard = 'crumble';
        gauntletType = 'crumble_ledge';
      } else if (hRoll < 0.83 && i > 14) {
        hazard = 'log';
        hazardSpeed = (1.15 + rng() * 0.45) * speedScale;
        hazardAmplitude = 0.55 + rng() * 0.22;
        gauntletType = 'log_ferry';
      } else if (hRoll < 0.92 && i > 20) {
        hazard = 'wind';
        hazardSpeed = 1.85 + rng() * 0.65;
        gauntletType = 'wind_ridge';
      } else {
        hazard = i > 50 && rng() < 0.5 ? 'ice' : 'barrier';
        if (hazard === 'ice') friction = 0.28;
        gauntletType = requiresSwitch ? 'switch_gate' : 'plank_bridge';
      }
    }

    if (requiresSwitch) {
      gauntletType = 'switch_gate';
    }

    const archetypeLabels: Record<StageArchetype, string> = {
      outpost_plaza: 'Outpost Ledge',
      grand_sanctuary: 'Grand Puzzle Sanctuary',
      knife_ridge: 'Knife-Edge Ridge',
      canyon_span: 'Broad Canyon Span',
      pin_needle: 'Precision Pinnacle',
      switchback_terrace: 'Switchback Terrace',
    };

    const hazardDescriptions: Record<StepHazardType, { t: string; p: string }> =
      {
        none: {
          t:
            i === 1
              ? 'Hawk Peak Lower Overlook'
              : i === 500
              ? 'Hawk Peak 500 Astral Summit'
              : `${archetypeLabels[stageArchetype]} ${i}`,
          p:
            i === 500
              ? 'The 500th cosmic summit monolith high in deep space.'
              : `Weave past the sculpted boulders to the golden launch compass (${clearGap.toFixed(1)}m jump).`,
        },
        pusher: {
          t: `Rolling Boulder ${archetypeLabels[stageArchetype]} ${i}`,
          p: 'Time your sprint past the rolling granite boulder and line up with the golden launch arrow.',
        },
        sweeper: {
          t: `Rotating Beam ${archetypeLabels[stageArchetype]} ${i}`,
          p: 'Weave around the carved totems and time the rotating timber beam before charging your jump.',
        },
        log: {
          t: `Drifting Cliff Causeway ${i}`,
          p: 'Cross the moving ledge and release your jump when the emerald target ring locks on.',
        },
        conveyor: {
          t: `Mountain Torrent Deck ${i}`,
          p: 'A lateral stream pushes across the ledge—counter-steer to the golden launch compass.',
        },
        turntable: {
          t: `Astrolabe Compass ${archetypeLabels[stageArchetype]} ${i}`,
          p: 'Rotating center dial shifts your heading—step to the outer launch rim to aim cleanly.',
        },
        blinker: {
          t: `Phase-Shift Causeway ${i}`,
          p: 'Stage slabs cycle between solid and ethereal—cross and vault while solid!',
        },
        ice: {
          t: `Glacier Quartz ${archetypeLabels[stageArchetype]} ${i}`,
          p: 'Low-friction surface preserves landing momentum—use the boulder chicanes to stabilize.',
        },
        barrier: {
          t: `Boulder Slalom ${archetypeLabels[stageArchetype]} ${i}`,
          p: 'Sculpted boulders and fallen cedar logs block the center—weave S-curves to the launch compass.',
        },
        glitch: {
          t: `Gravity Eddy ${archetypeLabels[stageArchetype]} ${i}`,
          p: 'Upper-atmosphere turbulence tests your spatial orientation—trust the green landing ring.',
        },
        crumble: {
          t: `Fracture Crag ${archetypeLabels[stageArchetype]} ${i}`,
          p: 'Unstable cliff stone trembles after touchdown—advance to the launch edge before it drops!',
        },
        wind: {
          t: `Jetstream ${archetypeLabels[stageArchetype]} ${i}`,
          p: 'High-altitude crosswinds curve your jump trajectory—aim into the wind!',
        },
        bouncer: {
          t: `Repulsor Rim ${archetypeLabels[stageArchetype]} ${i}`,
          p: 'Crystal bumpers line the outer rim—land squarely inside the deck.',
        },
      };

    const desc = hazardDescriptions[hazard];
    const switchNote =
      runePlates.length > 0
        ? ` [PUZZLE LOCK: Step on ${runePlates.length} Rune Plate${runePlates.length > 1 ? 's' : ''} to lower the Launch Gate!]`
        : '';

    // Deep grounded cliff support column depth so stages are anchored into the mountain massif (never floating islands!)
    const supportDepth =
      i <= 300
        ? Number((7.5 + (i % 5) * 1.4).toFixed(2))
        : Number((3.8 + (i % 4) * 0.9).toFixed(2));

    steps.push({
      stepNumber: i,
      biome,
      atmosphericLayer,
      stageArchetype,
      surfaceTheme: pal.theme,
      gauntletType,
      difficultyRating,
      title:
        runePlates.length > 0
          ? `${desc.t} (${runePlates.length}-Rune Lock)`
          : desc.t,
      psychologicalTrap: `${desc.p}${switchNote}`,
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
      runePlates,
      deckObstacles,
      npc,
      decoyLedge: undefined,
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
