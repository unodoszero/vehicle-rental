import { initializeApp, getApps } from 'firebase/app';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  getFirestore,
  Firestore
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize the Firebase App instance
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore with Offline Persistence enabled for offline usage
let dbInstance: Firestore;
const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';

try {
  dbInstance = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    },
    databaseId
  );
} catch {
  // If Firestore is already initialized in fast-refresh / module reloads
  dbInstance = getFirestore(app, databaseId);
}

export const db = dbInstance;
