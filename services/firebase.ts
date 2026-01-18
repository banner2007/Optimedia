import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getFirestore, Firestore } from "firebase/firestore";

// Configuración exacta proporcionada por el usuario
const firebaseConfig = {
  apiKey: "AIzaSyCRPTC-n4mqDR_nApCjjKt0fURFE8PJMrc",
  authDomain: "optimedia-studio.firebaseapp.com",
  projectId: "optimedia-studio",
  storageBucket: "optimedia-studio.firebasestorage.app",
  messagingSenderId: "773497522944",
  appId: "1:773497522944:web:60f2a39be5e6b8318801e5"
};

// Singleton para la Firebase App
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

/**
 * Obtiene la instancia de Firestore.
 * With the importmap fixed to a single version (11.1.0), this will resolve correctly.
 */
export const getDb = (): Firestore => {
  try {
    return getFirestore(app);
  } catch (error: any) {
    console.error("Firestore retrieval error:", error);
    throw error;
  }
};

/**
 * Obtiene la instancia de Storage.
 */
export const getStorageInstance = (): FirebaseStorage => {
  try {
    return getStorage(app);
  } catch (error: any) {
    console.error("Storage retrieval error:", error);
    throw error;
  }
};

export default app;