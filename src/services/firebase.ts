import { initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyB-u4aI6K8o0cCrFoVzxn971uLAY8CIOuA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "school-prep-assistant.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "school-prep-assistant",
};

function isPlaceholderConfig(config: typeof firebaseConfig): boolean {
  return Object.values(config).some((value) => value === "REPLACE_ME");
}

export const isFirebaseConfigured = !isPlaceholderConfig(firebaseConfig);

export const firebaseApp: FirebaseApp | null = isFirebaseConfigured
  ? initializeApp(firebaseConfig)
  : null;

export const db: Firestore | null = firebaseApp ? getFirestore(firebaseApp) : null;
