import { initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "REPLACE_ME",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "REPLACE_ME",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "REPLACE_ME",
};

function isPlaceholderConfig(config: typeof firebaseConfig): boolean {
  return Object.values(config).some((value) => value === "REPLACE_ME");
}

export const isFirebaseConfigured = !isPlaceholderConfig(firebaseConfig);

export const firebaseApp: FirebaseApp | null = isFirebaseConfigured
  ? initializeApp(firebaseConfig)
  : null;

export const db: Firestore | null = firebaseApp ? getFirestore(firebaseApp) : null;
