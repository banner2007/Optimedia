import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCRPTC-n4mqDR_nApCjjKt0fURFE8PJMrc",
  authDomain: "optimedia-studio.firebaseapp.com",
  projectId: "optimedia-studio",
  storageBucket: "optimedia-studio.firebasestorage.app",
  messagingSenderId: "773497522944",
  appId: "1:773497522944:web:60f2a39be5e6b8318801e5",
};

// Inicialización segura (evita errores de doble carga)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 🔥 SERVICIOS
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
