
import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  orderBy,
  query,
  deleteDoc,
  doc,
  writeBatch
} from "firebase/firestore";
import { SavedItem } from "../types";

const HISTORY_COLLECTION = "history";
const ASSETS_COLLECTION = "assets";

/**
 * Guarda un trabajo de edición o análisis en el historial.
 */
export async function saveWork(type: 'EDIT' | 'ANALYZE', imageUrl: string, promptOrNotes: string, config: any = {}) {
  const docRef = await addDoc(collection(db, HISTORY_COLLECTION), {
    type,
    imageUrl,
    prompt: promptOrNotes, // 'prompt' se mantiene por compatibilidad, pero ahora puede ser 'notes'
    config,
    timestamp: Date.now(),
  });
  return { id: docRef.id };
}

/**
 * Obtiene el historial completo de trabajos.
 */
export async function getHistory(): Promise<SavedItem[]> {
  try {
    const q = query(collection(db, HISTORY_COLLECTION), orderBy("timestamp", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ 
      id: d.id, 
      ...d.data(),
      timestamp: d.data().timestamp || Date.now() 
    } as SavedItem));
  } catch (error) {
    console.error("Error fetching history:", error);
    return [];
  }
}

/**
 * Guarda un activo de marca (icono/logo) con sus notas/análisis de metadatos.
 */
export async function saveIconAsset(imageUrl: string, name: string, analysisResultOrNotes: string) {
  const docRef = await addDoc(collection(db, ASSETS_COLLECTION), {
    imageUrl,
    name,
    analysisResult: analysisResultOrNotes, // analysisResult ahora contendrá las notas o metadatos
    timestamp: Date.now(),
  });
  return { 
    id: docRef.id, 
    imageUrl, 
    name, 
    analysisResult: analysisResultOrNotes, 
    timestamp: Date.now() 
  };
}

/**
 * Obtiene todos los activos de marca guardados.
 */
export async function getIconAssets(): Promise<any[]> {
  try {
    const q = query(collection(db, ASSETS_COLLECTION), orderBy("timestamp", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Error fetching assets:", error);
    return [];
  }
}

/**
 * Elimina un activo de marca específico.
 */
export async function deleteIconAsset(id: string, storagePath?: string) {
  await deleteDoc(doc(db, ASSETS_COLLECTION, id));
}

/**
 * Elimina todos los activos de la biblioteca.
 */
export async function deleteAllIcons() {
  const q = query(collection(db, ASSETS_COLLECTION));
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach((d) => {
    batch.delete(d.ref);
  });
  await batch.commit();
}

/**
 * Elimina un item del historial.
 */
export async function deleteHistoryItem(id: string) {
  await deleteDoc(doc(db, HISTORY_COLLECTION, id));
}