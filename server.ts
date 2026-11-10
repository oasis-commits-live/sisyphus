import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import {
  buildOfflineFallRoast,
  buildOfflineNpcReply,
} from './src/game/rules';

const PORT = 3000;
const DATA_FILE = path.resolve(process.cwd(), '.leaderboard-store.json');

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'undefined' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

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

  // 1. POST /api/narrator/fall-roast - Gemini AI Live Narrator & Fall Roasts
  app.post('/api/narrator/fall-roast', async (req, res) => {
    const body = req.body || {};
    const fromStep = Math.max(0, Math.min(500, Number(body.fromStep) || 0));
    const toStep = Math.max(0, Math.min(500, Number(body.toStep) || 0));
    const stepsLost = Math.max(
      0,
      Math.min(500, Number(body.stepsLost) ?? Math.max(0, fromStep - toStep))
    );
    const fallDropMeters = Math.max(
      0,
      Number(Number(body.fallDropMeters || stepsLost * 0.85).toFixed(2))
    );
    const rageScore = Math.max(0, Math.min(100, Number(body.rageScore) || 0));
    const fallsCount = Math.max(1, Number(body.fallsCount) || 1);
    const outfitName = String(body.outfitName || 'Crimson Wayfarer').slice(0, 40);

    const fallback = buildOfflineFallRoast({
      fromStep,
      toStep,
      stepsLost,
      fallDropMeters,
      rageScore,
      fallsCount,
      outfitName,
    });

    const ai = getGeminiClient();
    if (!ai) {
      res.json({
        quote: fallback.quote,
        author: fallback.author,
        source: 'offline_fallback',
        stepsLost,
        fallDropMeters,
      });
      return;
    }

    try {
      const prompt = `The climber (${outfitName}) just plummeted on Hawk Peak 500 from Stage ${fromStep} down to Stage ${toStep}, losing ${stepsLost} stages (${fallDropMeters.toFixed(1)} meters vertical drop). Their current Rage Score is ${rageScore}/100 across ${fallsCount} total falls. Deliver a single punchy 1-2 sentence live narrator roast or deadpan philosophical observation (max 38 words) that explicitly cites their stage numbers or ${fallDropMeters.toFixed(1)}m drop and Rage score.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'You are the omniscient, deadpan philosophical narrator of "Hawk Peak 500" (in the spirit of Getting Over It with Bennett Foddy and Albert Camus). Your tone is dry, witty, poetic, and playfully mocking. Keep your response under 38 words, plain text only, no quotation marks around the whole response.',
        },
      });

      const generatedText = response.text?.trim();
      if (generatedText && generatedText.length > 8) {
        res.json({
          quote: generatedText.replace(/^["']|["']$/g, ''),
          author: 'Gemini Live Narrator',
          source: 'gemini',
          stepsLost,
          fallDropMeters,
        });
        return;
      }
    } catch (err) {
      console.warn('Gemini fall-roast fallback triggered:', err);
    }

    res.json({
      quote: fallback.quote,
      author: fallback.author,
      source: 'offline_fallback',
      stepsLost,
      fallDropMeters,
    });
  });

  // 2. POST /api/npc/ask - Dynamic AI NPC Dialogue for Trail Guides (Hermit Goat, Cynical Crow, Bear, etc.)
  app.post('/api/npc/ask', async (req, res) => {
    const body = req.body || {};
    const question = String(body.question || '').trim().slice(0, 240);
    if (!question) {
      res.status(400).json({
        error: 'Please enter a question for the trail guide.',
      });
      return;
    }

    const npcName = String(body.npcName || 'Ranger Barnaby').slice(0, 48);
    const npcSpecies = String(body.npcSpecies || 'bear').toLowerCase().slice(0, 24);
    const npcRole = String(body.npcRole || 'Park Trail Warden').slice(0, 64);
    const currentStep = Math.max(0, Math.min(500, Number(body.currentStep) || 0));
    const peakStep = Math.max(0, Math.min(500, Number(body.peakStep) || currentStep));
    const fallsCount = Math.max(0, Number(body.fallsCount) || 0);
    const rageScore = Math.max(0, Math.min(100, Number(body.rageScore) || 0));

    const fallbackReply = buildOfflineNpcReply({
      npcName,
      npcSpecies,
      npcRole,
      question,
      currentStep,
      peakStep,
      fallsCount,
      rageScore,
    });

    const ai = getGeminiClient();
    if (!ai) {
      res.json({
        reply: fallbackReply,
        npcName,
        npcSpecies,
        source: 'offline_fallback',
      });
      return;
    }

    const personaMap: Record<string, string> = {
      goat: 'You are Old Goat Billy, the Hermit Goat of Hawk Peak. You speak with gruff alpine crag wisdom ("Baa-hah!"), obsess over hoof-grip, salt moss, and mock two-legged climbers who overcharge their jumps.',
      crow: 'You are Corvus the Watcher, a cynical, sharp-tongued crow perched on the cliffs of Hawk Peak ("Caw!"). You run betting pools with the hawks on when the player will plummet and give darkly funny tactical advice.',
      bear: 'You are Ranger Barnaby, a warm, deadpan bureaucratic Provincial Park Bear Warden on Hawk Peak. You treat 500-stage vertical plunges and glowing Rune Gates like routine trail safety regulations.',
      fox: 'You are Scout Kit, an energetic, sly red fox trail runner who loves speed-vaulting and wind-reading.',
      tortoise: 'You are Elder Shelly, an ancient, unhurried mountain tortoise who preaches patience over panic.',
    };
    const personaInstruction =
      personaMap[npcSpecies] ||
      `You are ${npcName} (${npcRole}), a memorable trail guide on Hawk Peak 500.`;

    try {
      const prompt = `The climber is at Stage ${currentStep}/500 (Peak Reached: Stage ${peakStep}, Total Falls: ${fallsCount}, Rage Score: ${rageScore}/100). They ask you: "${question}". Respond in character in 1-2 vivid sentences (max 42 words).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: `${personaInstruction} Stay strictly in character, reference the climber's current stage or falls naturally, and keep your answer under 42 words in plain text.`,
        },
      });

      const generatedReply = response.text?.trim();
      if (generatedReply && generatedReply.length > 5) {
        res.json({
          reply: generatedReply.replace(/^["']|["']$/g, ''),
          npcName,
          npcSpecies,
          source: 'gemini',
        });
        return;
      }
    } catch (err) {
      console.warn('Gemini NPC dialogue fallback triggered:', err);
    }

    res.json({
      reply: fallbackReply,
      npcName,
      npcSpecies,
      source: 'offline_fallback',
    });
  });

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
