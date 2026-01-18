import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Tus credenciales de Optimedia Studio
const firebaseConfig = {
    apiKey: "AIzaSyCRPTC-n4mqDR_nApCjjKt0fURFE8PJMrc",
    authDomain: "optimedia-studio.firebaseapp.com",
    projectId: "optimedia-studio",
    storageBucket: "optimedia-studio.firebasestorage.app",
    messagingSenderId: "773497522944",
    appId: "1:773497522944:web:60f2a39be5e6b8318801e5"
};

// Inicialización segura
let db, storage;

try {
    // Verificamos que la configuración sea válida antes de iniciar
    if (!firebaseConfig.projectId || firebaseConfig.projectId === "undefined") {
        throw new Error("La configuración de Firebase está incompleta o es 'undefined'.");
    }

    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);

    console.log("✅ Optimedia: Firebase conectado correctamente.");
    document.getElementById('status-bar').innerText = "Estado: Conectado a Optimedia Studio";

} catch (error) {
    console.error("❌ Error al inicializar Optimedia:", error.message);
    document.getElementById('status-bar').innerText = "Error: " + error.message;
}

// Exportamos para que otros componentes puedan realizar consultas
export { db, storage };

// Acceso global para depuración en consola
window.db = db;