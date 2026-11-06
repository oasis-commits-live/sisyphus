import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot as required by firebase-integration-rpc
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'leaderboard', 'connection_probe'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export type ClimberSkin = 'chicken' | 'cauldron' | 'astronaut' | 'frog';

export interface LeaderboardEntry {
  uid: string;
  handle: string;
  avatarSkin: ClimberSkin;
  tauntMotto: string;
  peakStep: number;
  totalFalls: number;
  worstFall: number;
  rageScore: number;
  updatedAt?: string;
  isVerified?: boolean;
}

export async function signInWithGooglePopup(): Promise<User | null> {
  const cred = await signInWithPopup(auth, googleProvider);
  return cred.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export { onAuthStateChanged };
export type { User };

export async function syncFirestoreLeaderboardEntry(
  entry: Omit<LeaderboardEntry, 'updatedAt'>
): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== entry.uid) return;
  const cleanHandle = entry.handle.trim().slice(0, 24) || 'Climber';
  const cleanMotto =
    entry.tauntMotto.trim().slice(0, 80) || 'Still falling.';
  const validSkins: ClimberSkin[] = ['chicken', 'cauldron', 'astronaut', 'frog'];
  const skin: ClimberSkin = validSkins.includes(entry.avatarSkin)
    ? entry.avatarSkin
    : 'chicken';

  const payload = {
    uid: entry.uid,
    handle: cleanHandle.length < 2 ? `${cleanHandle}_1` : cleanHandle,
    avatarSkin: skin,
    tauntMotto: cleanMotto,
    peakStep: Math.max(1, Math.min(500, Math.round(entry.peakStep))),
    totalFalls: Math.max(0, Math.min(1000000, Math.round(entry.totalFalls))),
    worstFall: Math.max(0, Math.min(500, Math.round(entry.worstFall))),
    rageScore: Math.max(0, Math.min(100, Math.round(entry.rageScore))),
    updatedAt: serverTimestamp(),
  };

  const docPath = `leaderboard/${entry.uid}`;
  try {
    await setDoc(doc(db, 'leaderboard', entry.uid), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function fetchFirestoreTopClimbers(): Promise<LeaderboardEntry[]> {
  const path = 'leaderboard';
  try {
    const q = query(
      collection(db, path),
      where('peakStep', '>=', 1),
      where('peakStep', '<=', 500),
      orderBy('peakStep', 'desc'),
      limit(25)
    );
    const snap = await getDocs(q);
    const list: LeaderboardEntry[] = [];
    snap.forEach((d) => {
      const data = d.data();
      list.push({
        uid: String(data.uid || d.id),
        handle: String(data.handle || 'Climber'),
        avatarSkin: (data.avatarSkin as ClimberSkin) || 'chicken',
        tauntMotto: String(data.tauntMotto || 'Still climbing.'),
        peakStep: Number(data.peakStep) || 1,
        totalFalls: Number(data.totalFalls) || 0,
        worstFall: Number(data.worstFall) || 0,
        rageScore: Number(data.rageScore) || 0,
        isVerified: true,
      });
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
