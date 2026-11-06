import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';

const PORT = 3000;
const DATA_FILE = path.resolve(process.cwd(), '.leaderboard-store.json');

export interface StoredPlayerRecord {
  uid: string;
  handle: string;
  avatarSkin: 'chicken' | 'cauldron' | 'astronaut' | 'frog';
  tauntMotto: string;
  peakStep: number;
  totalFalls: number;
  worstFall: number;
  rageScore: number;
  updatedAt: string;
}

const INITIAL_RIVALS: StoredPlayerRecord[] = [
  {
    uid: 'rival_bennett_99',
    handle: 'BennettHammer',
    avatarSkin: 'cauldron',
    tauntMotto: 'Fell from Step 489 to Step 14. Do not talk to me.',
    peakStep: 489,
    totalFalls: 312,
    worstFall: 475,
    rageScore: 99,
    updatedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    uid: 'rival_jumpking_77',
    handle: 'BabeAtTheTop',
    avatarSkin: 'chicken',
    tauntMotto: 'The astral meteor bolt on Monolith 382 is a paid actor.',
    peakStep: 382,
    totalFalls: 194,
    worstFall: 210,
    rageScore: 94,
    updatedAt: new Date(Date.now() - 1000 * 60 * 28).toISOString(),
  },
  {
    uid: 'rival_pogo_55',
    handle: 'PogoMasochist',
    avatarSkin: 'frog',
    tauntMotto: 'Anomaly Spire 320 inverted my aim and mutated the mountain.',
    peakStep: 324,
    totalFalls: 248,
    worstFall: 185,
    rageScore: 88,
    updatedAt: new Date(Date.now() - 1000 * 60 * 44).toISOString(),
  },
  {
    uid: 'rival_crossy_42',
    handle: 'MonolithShatter',
    avatarSkin: 'chicken',
    tauntMotto: 'Jumped onto a decoy shatter-ledge at Step 261. Lost 90 steps.',
    peakStep: 261,
    totalFalls: 140,
    worstFall: 142,
    rageScore: 82,
    updatedAt: new Date(Date.now() - 1000 * 60 * 65).toISOString(),
  },
  {
    uid: 'rival_ice_31',
    handle: 'SlipperySlope',
    avatarSkin: 'astronaut',
    tauntMotto: 'Act V ice physics should be illegal in 42 countries.',
    peakStep: 214,
    totalFalls: 97,
    worstFall: 98,
    rageScore: 76,
    updatedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    uid: 'rival_tilt_19',
    handle: 'BrokenSpacebar',
    avatarSkin: 'cauldron',
    tauntMotto: 'Overcharged by 2% on Step 148. Dropped 6 tiers.',
    peakStep: 148,
    totalFalls: 83,
    worstFall: 74,
    rageScore: 71,
    updatedAt: new Date(Date.now() - 1000 * 60 * 130).toISOString(),
  },
  {
    uid: 'rival_newbie_08',
    handle: 'JustOneMoreTry',
    avatarSkin: 'frog',
    tauntMotto: 'I said 5 minutes. It has been 3 hours.',
    peakStep: 76,
    totalFalls: 54,
    worstFall: 41,
    rageScore: 64,
    updatedAt: new Date(Date.now() - 1000 * 60 * 190).toISOString(),
  },
];

function loadStore(): StoredPlayerRecord[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Fallback to initial seed
  }
  return [...INITIAL_RIVALS];
}

function saveStore(records: StoredPlayerRecord[]): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2), 'utf-8');
  } catch {
    // Ignore write failure in read-only environments
  }
}

let leaderboardStore: StoredPlayerRecord[] = loadStore();

async function startServer() {
  const app = express();
  app.use(express.json());

  // GET /api/leaderboard - Returns sorted top climbers out of 500 levels
  app.get('/api/leaderboard', (_req, res) => {
    const sorted = [...leaderboardStore].sort((a, b) => {
      if (b.peakStep !== a.peakStep) return b.peakStep - a.peakStep;
      return a.totalFalls - b.totalFalls;
    });
    res.json({
      totalLevels: 500,
      entries: sorted.slice(0, 50),
    });
  });

  // POST /api/leaderboard - Upserts a player's profile, peak step, falls, rage score, and feisty motto
  app.post('/api/leaderboard', (req, res) => {
    const body = req.body || {};
    const uid = String(body.uid || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
    const handle = String(body.handle || '').trim().slice(0, 24);

    if (!uid || handle.length < 2) {
      res.status(400).json({
        error: 'Player handle must be between 2 and 24 characters.',
      });
      return;
    }

    const validSkins = ['chicken', 'cauldron', 'astronaut', 'frog'] as const;
    const avatarSkin = validSkins.includes(body.avatarSkin)
      ? body.avatarSkin
      : 'chicken';
    const tauntMotto =
      String(body.tauntMotto || 'Still suffering on the mountain.')
        .trim()
        .slice(0, 80) || 'Still suffering on the mountain.';
    const peakStep = Math.max(1, Math.min(500, Number(body.peakStep) || 1));
    const totalFalls = Math.max(0, Number(body.totalFalls) || 0);
    const worstFall = Math.max(0, Math.min(500, Number(body.worstFall) || 0));
    const rageScore = Math.max(0, Math.min(100, Number(body.rageScore) || 0));

    const existingIdx = leaderboardStore.findIndex((r) => r.uid === uid);
    const updatedRecord: StoredPlayerRecord = {
      uid,
      handle,
      avatarSkin,
      tauntMotto,
      peakStep:
        existingIdx >= 0
          ? Math.max(leaderboardStore[existingIdx].peakStep, peakStep)
          : peakStep,
      totalFalls:
        existingIdx >= 0
          ? Math.max(leaderboardStore[existingIdx].totalFalls, totalFalls)
          : totalFalls,
      worstFall:
        existingIdx >= 0
          ? Math.max(leaderboardStore[existingIdx].worstFall, worstFall)
          : worstFall,
      rageScore:
        existingIdx >= 0
          ? Math.max(leaderboardStore[existingIdx].rageScore, rageScore)
          : rageScore,
      updatedAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      leaderboardStore[existingIdx] = updatedRecord;
    } else {
      leaderboardStore.push(updatedRecord);
    }

    saveStore(leaderboardStore);

    const sorted = [...leaderboardStore].sort((a, b) => {
      if (b.peakStep !== a.peakStep) return b.peakStep - a.peakStep;
      return a.totalFalls - b.totalFalls;
    });

    const rank = sorted.findIndex((r) => r.uid === uid) + 1;
    res.json({
      profile: updatedRecord,
      rank,
      entries: sorted.slice(0, 50),
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
