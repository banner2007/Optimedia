
import React, { useState, useEffect, useCallback } from 'react';
import { saveIconAsset, getIconAssets, deleteIconAsset, deleteAllIcons } from '../services/persistenceService';
import { ImageUpload } from '../components/ImageUpload';
import { ScanSearch, Bot, RefreshCcw, Trash2, Image as ImageIcon, Loader2, Eraser, AlertCircle, Info, FileText, ImageIcon as FileImageIcon, Maximize } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Helper to convert base64 to Blob for size calculation
const base64ToBlob = (base64: string, mimeType: string): Blob => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

// Main component
export const AnalyzeView: React.FC = () => {
  const [image, setImage] = useState<{data: string, mime: string, url: string} | null>(null);
  const [notes, setNotes] = useState(''); // Renombrado de prompt a notes
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Icon Library State
  const [icons, setIcons] = useState<any[]>([]);
  const [iconsLoading, setIconsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);

  useEffect(() => {
    loadIcons();
  }, []);

  const loadIcons = async () => {
    setIconsLoading(true);
    setError(null);
    try {
      const data = await getIconAssets();
      setIcons(data);
    } catch (err: any) {
      console.error("Error loading icons:", err);
      setError(err.message);
    } finally {
      setIconsLoading(false);
    }
  };

  const performAnalysis = useCallback(async (base64Data: string, mimeType: string) => {
    setLoading(true);
    setError(null);
    try {
      const blob = base64ToBlob(base64Data, mimeType);
      const sizeKB = (blob.size / 1024).toFixed(2);

      let metadataText = `### Análisis de Metadatos\n\n`;
      metadataText += `- **Tamaño del Archivo:** ${sizeKB} KB\n`;
      metadataText += `- **Tipo MIME:** \`${mimeType}\`\n`;

      // Get image dimensions using an Image object
      const img = new Image();
      const imageUrl = `data:${mimeType};base64,${base64Data}`;
      img.src = imageUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      metadataText += `- **Dimensiones:** ${img.width}x${img.height} px\n`;
      metadataText += `- **Relación de Aspecto:** ${(img.width / img.height).toFixed(2)}:1\n`;

      // Basic optimization suggestions
      metadataText += `\n### Sugerencias de Optimización\n\n`;
      if (mimeType.includes('image/png')) {
        metadataText += `Es un PNG. Bueno para imágenes con transparencia o gráficos nítidos. Para fotos, considera convertir a WebP o JPEG para reducir el tamaño.\n`;
      } else if (mimeType.includes('image/jpeg')) {
        metadataText += `Es un JPEG. Bueno para fotografías. Considera ajustar la calidad o convertir a WebP para una mayor compresión sin mucha pérdida visual.\n`;
      } else if (mimeType.includes('image/gif')) {
        metadataText += `Es un GIF. Útil para animaciones simples. Para imágenes estáticas, WebP o PNG suelen ser mejores opciones por su eficiencia.\n`;
      } else if (mimeType.includes('image/webp')) {
        metadataText += `Es un WebP. Excelente formato moderno para la web, ofrece buena compresión y calidad. ¡Bien hecho!\n`;
      } else {
        metadataText += `Formato \`${mimeType}\`. Asegúrate de que sea compatible con los navegadores. WebP es una opción moderna recomendada.\n`;
      }

      if (parseFloat(sizeKB) > 300) {
        metadataText += `El archivo es bastante grande (${sizeKB} KB). Redimensionar o comprimir podría mejorar drásticamente los tiempos de carga web.\n`;
      } else if (parseFloat(sizeKB) > 100) {
        metadataText += `El tamaño del archivo es moderado. Una pequeña optimización podría ser beneficiosa para la velocidad de la página.\n`;
      } else {
        metadataText += `El tamaño del archivo es bueno para la web. ¡Continúa así!\n`;
      }

      setAnalysisResult(metadataText);
      setImage({ data: base64Data, mime: mimeType, url: imageUrl });

    } catch (err: any) {
      console.error("Error performing client-side analysis:", err);
      setError(err.message || "Error al analizar la imagen localmente.");
      setAnalysisResult(null);
      setImage(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleImageSelected = useCallback((base64Data: string, mimeType: string) => {
    // base64Data ya viene sin el prefijo "data:..."
    performAnalysis(base64Data, mimeType);
  }, [performAnalysis]);

  const handleSaveToLibrary = async () => {
    if (!image || !analysisResult) return;
    setLoading(true);
    setError(null);
    try {
      const iconName = notes 
        ? (notes.length > 25 ? notes.substring(0, 25) + '...' : notes) 
        : `Activo ${icons.length + 1}`;
      
      const newIcon = await saveIconAsset(image.url, iconName, analysisResult);
      setIcons(prev => [newIcon, ...prev]);
      setSelectedIconId(newIcon.id);
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al guardar en la biblioteca. Por favor intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectIcon = (icon: any) => {
    setSelectedIconId(icon.id);
    setAnalysisResult(icon.analysisResult || "No hay análisis disponible para esta imagen.");
    setNotes(icon.name);
    setError(null);
    
    // Asumiendo que imageUrl ya es un data URL o URL pública
    // Extraemos base64 y mimeType para el análisis si el icono fue cargado desde url pura
    const match = icon.imageUrl.match(/^data:(.+);base64,(.+)$/);
    if (match) {
        setImage({ data: match[2], mime: match[1], url: icon.imageUrl });
    } else {
        // Si no es un data URL, no podemos hacer un análisis en el cliente directamente
        // pero podemos mostrar la imagen
        setImage({ data: "", mime: "image/png", url: icon.imageUrl }); // Data vacía si no es base64
    }
  };

  const handleDeleteIcon = async (e: React.MouseEvent, id: string, storagePath?: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("¿Eliminar este activo?")) return;
    setDeletingId(id);
    setError(null);
    try {
      await deleteIconAsset(id, storagePath);
      setIcons(prev => prev.filter(icon => icon.id !== id));
      if (selectedIconId === id) {
        handleReset();
      }
    } catch (err: any) {
      console.error("Delete failed", err);
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    if (icons.length === 0) return;
    if (!confirm("¿Borrar toda la biblioteca?")) return;
    setDeletingAll(true);
    setError(null);
    try {
      await deleteAllIcons();
      setIcons([]);
      handleReset();
    } catch (err: any) {
      console.error("Delete all failed", err);
      setError(err.message);
    } finally {
      setDeletingAll(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setAnalysisResult(null);
    setNotes('');
    setSelectedIconId(null);
    setError(null);
  };

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto p-6 space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <ScanSearch className="w-6 h-6 text-indigo-400" />
          Análisis de Activos y Metadatos
        </h2>
        <p className="text-slate-400 mt-1">Sube o selecciona un activo para ver sus metadatos y sugerencias de optimización.</p>
      </header>

      {/* Brand Icons Library Section */}
      <section className="bg-slate-800/20 border border-slate-700/50 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ImageIcon className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-semibold text-white">Biblioteca de Activos</h3>
            <span className="bg-slate-700 text-slate-400 text-[10px] px-2 py-0.5 rounded-full">
              {icons.length}
            </span>
          </div>
          {icons.length > 0 && (
            <button onClick={handleDeleteAll} disabled={deletingAll} className="text-red-400 text-xs flex items-center gap-1 hover:text-red-300 transition-colors">
              {deletingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eraser className="w-3 h-3" />} 
              Borrar Todo
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 min-h-[100px]">
          {iconsLoading ? (
             <div className="col-span-full flex items-center justify-center py-8">
               <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
             </div>
          ) : icons.length === 0 ? (
            <div className="col-span-full py-8 text-center border-2 border-dashed border-slate-700 rounded-2xl">
              <p className="text-slate-500 text-sm">Tu biblioteca está vacía. Analiza una imagen para agregarla aquí.</p>
            </div>
          ) : (
            icons.map((icon) => (
              <div 
                key={icon.id} 
                onClick={() => handleSelectIcon(icon)}
                className={`group relative aspect-square bg-slate-900 rounded-2xl border cursor-pointer p-2 flex items-center justify-center overflow-hidden transition-all duration-200 ${selectedIconId === icon.id ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-700 hover:border-slate-500'}`}
              >
                <img src={icon.imageUrl} alt={icon.name} className="max-w-full max-h-full object-contain transition-transform group-hover:scale-105" />
                <button 
                  onClick={(e) => handleDeleteIcon(e, icon.id, icon.storagePath)} 
                  disabled={deletingId === icon.id}
                  className="absolute -top-1 -right-1 bg-red-600 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 z-10"
                >
                  {deletingId === icon.id ? <Loader2 className="w-3 h-3 animate-spin text-white" /> : <Trash2 className="w-3 h-3 text-white" />}
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-[8px] text-white p-1.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                  {icon.name}
                </div>
              </div>
            ))
          )}
        </div>
        {error && (
             <div className="mt-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
               <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
               <p>{error}</p>
             </div>
          )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          {!image ? (
            <ImageUpload onImageSelected={handleImageSelected} label="Subir imagen para analizar y guardar en biblioteca" />
          ) : (
            <div className="relative group overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/40">
              <img 
                src={image.url} 
                className="w-full max-h-[400px] object-contain mx-auto" 
                alt="Preview" 
              />
              <button onClick={handleReset} className="absolute top-2 right-2 bg-slate-900/80 p-2 rounded-full hover:bg-slate-700 transition-colors opacity-0 group-hover:opacity-100">
                <RefreshCcw className="w-4 h-4 text-white" />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input 
              type="text" 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              placeholder="Añade notas o etiquetas para la imagen (ej: logo principal, campaña)" 
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
            />
            <button 
              onClick={handleSaveToLibrary} 
              disabled={!image || loading || !analysisResult} 
              className={`px-6 py-2 rounded-xl text-white font-semibold flex items-center justify-center transition-all ${
                loading || !image || !analysisResult ? 'bg-indigo-600/50 cursor-not-allowed shadow-none' : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20'
              }`}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Info className="w-5 h-5" />}
              <span>{loading ? 'Analizando...' : 'Guardar Activo'}</span>
            </button>
          </div>
        </div>
        <div className="bg-slate-800/30 rounded-3xl p-8 border border-slate-700 min-h-[400px] shadow-inner overflow-auto">
          {analysisResult ? (
            <div key={selectedIconId || 'current'} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
               <ReactMarkdown className="prose prose-invert max-w-none prose-sm sm:prose-base">{analysisResult}</ReactMarkdown>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
               <FileText className="w-12 h-12 opacity-10" />
               <p className="text-center italic text-sm">Sube una imagen o selecciona una de la biblioteca.<br/>El análisis de metadatos se conservará permanentemente para cada activo.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};