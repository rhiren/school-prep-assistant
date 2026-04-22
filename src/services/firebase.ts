import { initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import {
  getSyncDiagnosticErrorDetails,
  syncDiagnosticsStore,
} from "./syncDiagnostics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyB-u4aI6K8o0cCrFoVzxn971uLAY8CIOuA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "school-prep-assistant.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "school-prep-assistant",
};

function isPlaceholderConfig(config: typeof firebaseConfig): boolean {
  return Object.values(config).some((value) => value === "REPLACE_ME");
}

export const isFirebaseConfigured = !isPlaceholderConfig(firebaseConfig);
let firebaseApp: FirebaseApp | null = null;
let db: Firestore | null = null;

if (!isFirebaseConfigured) {
  syncDiagnosticsStore.record({
    severity: "info",
    source: "firebase-init",
    message: "Firebase config missing. App is running local-first only.",
  });
} else {
  try {
    firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp);
    syncDiagnosticsStore.record({
      severity: "info",
      source: "firebase-init",
      message: "Firebase initialized successfully.",
      details: {
        projectId: firebaseConfig.projectId,
      },
    });
  } catch (error) {
    syncDiagnosticsStore.record({
      severity: "error",
      source: "firebase-init",
      message: "Firebase initialization failed.",
      details: getSyncDiagnosticErrorDetails(error),
    });
  }
}

export { firebaseApp, db };
