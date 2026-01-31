
import { ref, uploadString, getDownloadURL, deleteObject, getBytes } from "firebase/storage";
import { getStorageInstance, getDb } from "./firebase";
import { collection, addDoc, getDocs, doc, deleteDoc, query, orderBy } from "firebase/firestore";
import { SavedItem } from "../types";

const PROJECTS_KEY = 'optimedia_projects_local';

const generateLocalId = () => Math.random().toString(36).substring(2, 15);

const handleFirestoreError = (error: any, context: string) => {
  const msg = error?.message || "";
  console.error(`Error en ${context}:`, error);
  throw new Error(`Error en ${context}: ${msg}`);
};

/**
 * Descarga un archivo directamente de Storage como ArrayBuffer y lo convierte a Base64.
 * Este método evita los bloqueos de CORS del navegador al no usar URLs públicas.
 */
export const downloadBase64 = async (storagePath: string, mimeType: string = 'image/png'): Promise<string> => {
  try {
    const storage = getStorageInstance();
    const storageRef = ref(storage, storagePath);
    const buffer = await getBytes(storageRef);
    
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunk = 8192;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
    }
    return btoa(binary);
  } catch (error: any) {
    console.error("Error descargando datos de Storage:", error);
    if (error.code === 'storage/unauthorized') {
      throw new Error("Sin permisos. Verifica las reglas de Storage.");
    }
    if (error.message?.includes('CORS') || error.code?.includes('network')) {
      throw new Error("CORS bloqueado. Ejecuta el comando 'gsutil cors' en Cloud Shell.");
    }
    throw error;
  }
};

export const saveWork = async (
  type: 'GENERATE' | 'EDIT' | 'ANALYZE' | 'LANDING',
  base64Data: string,
  prompt: string,
  config?: any
) => {
  try {
    const fileName = `${type.toLowerCase()}_${Date.now()}.png`;
    const storagePath = `outputs/${fileName}`;
    const storage = getStorageInstance();
    const storageRef = ref(storage, storagePath);
    
    const uploadResult = await uploadString(storageRef, base64Data, 'data_url');
    const downloadUrl = await getDownloadURL(uploadResult.ref);

    const newItem = {
      id: generateLocalId(),
      type,
      imageUrl: downloadUrl,
      storagePath,
      prompt,
      config: config || {},
      timestamp: Date.now()
    };

    const existing = JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]');
    localStorage.setItem(PROJECTS_KEY, JSON.stringify([newItem, ...existing]));

    return newItem.id;
  } catch (error) {
    console.warn("Error guardando localmente", error);
    throw error;
  }
};

export const getHistory = async (): Promise<SavedItem[]> => {
  try {
    const data = localStorage.getItem(PROJECTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    return [];
  }
};

export const saveIconAsset = async (base64Data: string, mimeType: string, name: string, analysisResult?: string) => {
  try {
    const db = getDb();
    const fileName = `icon_${Date.now()}_${name.replace(/\s+/g, '_').substring(0, 50)}`;
    const storagePath = `icons/${fileName}`;
    const storage = getStorageInstance();
    const storageRef = ref(storage, storagePath);
    
    const dataUrl = base64Data.startsWith('data:') ? base64Data : `data:${mimeType};base64,${base64Data}`;
    
    const uploadResult = await uploadString(storageRef, dataUrl, 'data_url');
    const downloadUrl = await getDownloadURL(uploadResult.ref);

    const iconsCollection = collection(db, "icons");
    const docRef = await addDoc(iconsCollection, {
      name,
      imageUrl: downloadUrl,
      storagePath,
      mimeType,
      analysisResult: analysisResult || '',
      timestamp: Date.now()
    });

    return {
      id: docRef.id,
      name,
      imageUrl: downloadUrl,
      mimeType,
      storagePath,
      analysisResult: analysisResult || '',
      timestamp: Date.now()
    };
  } catch (error) {
    handleFirestoreError(error, "guardar activo");
  }
};

export const getIconAssets = async () => {
  try {
    const db = getDb();
    const iconsCollection = collection(db, "icons");
    const q = query(iconsCollection, orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];
  } catch (error) {
    handleFirestoreError(error, "leer biblioteca");
    return [];
  }
};

export const deleteIconAsset = async (id: string, storagePath?: string) => {
  try {
    const db = getDb();
    const storage = getStorageInstance();
    if (storagePath) {
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef).catch(() => {});
    }
    await deleteDoc(doc(db, "icons", id));
  } catch (error) {
    handleFirestoreError(error, "eliminar activo");
  }
};

export const deleteAllIcons = async () => {
  try {
    const db = getDb();
    const iconsCollection = collection(db, "icons");
    const querySnapshot = await getDocs(iconsCollection);
    const storage = getStorageInstance();
    
    const deletePromises = querySnapshot.docs.map(async (d) => {
      const data = d.data();
      if (data.storagePath) {
        const storageRef = ref(storage, data.storagePath);
        await deleteObject(storageRef).catch(() => {});
      }
      await deleteDoc(doc(db, "icons", d.id));
    });
    await Promise.all(deletePromises);
  } catch (error) {
    handleFirestoreError(error, "limpiar biblioteca");
  }
};
