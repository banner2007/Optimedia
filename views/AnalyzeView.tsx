
import React, { useState, useEffect } from 'react';
import { analyzeImage } from '../services/geminiService';
import { saveIconAsset, getIconAssets, deleteIconAsset, deleteAllIcons } from '../services/persistenceService';
import { ImageUpload } from '../components/ImageUpload';
import { ScanSearch, Bot, RefreshCcw, Trash2, Image as ImageIcon, Loader2, Bot as BotIcon, Eraser, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export const AnalyzeView: React.FC = () => {
  const [image, setImage] = useState<{data: string, mime: string} | null>(null);
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null); // Nuevo estado para errores
  
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
    setError(null); // Limpiar errores al cargar
    try {
      const data = await getIconAssets();
      setIcons(data);
    } catch (err: any) {
      console.error("Error loading icons:", err);
      setError(err.message); // Mostrar el mensaje de error al usuario
    } finally {
      setIconsLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setLoading(true);
    setError(null); // Limpiar errores antes de analizar
    try {
      // 1. Obtener el análisis de Gemini
      const text = await analyzeImage(image.data, image.mime, prompt);
      setResult(text);
      
      // 2. Solo después de recibir la respuesta, guardar en la biblioteca
      const iconName = prompt 
        ? (prompt.length > 25 ? prompt.substring(0, 25) + '...' : prompt) 
        : `Análisis ${icons.length + 1}`;
      
      const fullBase64 = `data:${image.mime};base64,${image.data}`;
      const newIcon = await saveIconAsset(fullBase64, iconName, text);
      
      // 3. Actualizar la UI local con el nuevo activo
      setIcons(prev => [newIcon, ...prev]);
      setSelectedIconId(newIcon.id);
      
    } catch (err: any) {
      console.error(err);
      setResult(null); // Limpiar el resultado si hay un error
      setError(err.message || "Error al analizar la imagen. Por favor intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectIcon = (icon: any) => {
    setSelectedIconId(icon.id);
    setResult(icon.analysisResult || "No hay análisis disponible para esta imagen.");
    setPrompt(icon.name);
    setError(null); // Limpiar errores al seleccionar un icono
    // Convert download URL or existing path to preview object
    setImage({
      data: icon.imageUrl, // For preview, using the URL directly in a simplified way
      mime: 'image/png' // Assuming standard format for the preview container
    });
  };

  const handleDeleteIcon = async (e: React.MouseEvent, id: string, storagePath?: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("¿Eliminar este activo?")) return;
    setDeletingId(id);
    setError(null); // Limpiar errores antes de eliminar
    try {
      await deleteIconAsset(id, storagePath);
      setIcons(prev => prev.filter(icon => icon.id !== id));
      if (selectedIconId === id) {
        handleReset();
      }
    } catch (err: any) {
      console.error("Delete failed", err);
      setError(err.message); // Mostrar el mensaje de error al usuario
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    if (icons.length === 0) return;
    if (!confirm("¿Borrar toda la biblioteca?")) return;
    setDeletingAll(true);
    setError(null); // Limpiar errores antes de eliminar todo
    try {
      await deleteAllIcons();
      setIcons([]);
      handleReset();
    } catch (err: any) {
      console.error("Delete all failed", err);
      setError(err.message); // Mostrar el mensaje de error al usuario
    } finally {
      setDeletingAll(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setResult(null);
    setPrompt('');
    setSelectedIconId(null);
    setError(null); // Limpiar errores al resetear
  };

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto p-6 space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <ScanSearch className="w-6 h-6 text-indigo-400" />
          Análisis y Activos de Marca
        </h2>
        <p className="text-slate-400 mt-1">Selecciona un activo guardado para ver su análisis o sube uno nuevo.</p>
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
        {error && ( // Mostrar error debajo de la biblioteca
             <div className="mt-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
               <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
               <p>{error}</p>
             </div>
          )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          {!image ? (
            <ImageUpload onImageSelected={(data, mime) => setImage({ data, mime })} label="Subir imagen para analizar y guardar en biblioteca" />
          ) : (
            <div className="relative group overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/40">
              <img 
                src={image.data.startsWith('http') || image.data.startsWith('data:') ? image.data : `data:${image.mime};base64,${image.data}`} 
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
              value={prompt} 
              onChange={(e) => setPrompt(e.target.value)} 
              placeholder="¿Qué quieres saber? (Ej: Describe el estilo visual)" 
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
            />
            <button 
              onClick={handleAnalyze} 
              disabled={!image || loading} 
              className={`px-6 py-2 rounded-xl text-white font-semibold flex items-center justify-center transition-all ${
                loading ? 'bg-indigo-600/50 cursor-not-allowed shadow-none' : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20'
              }`}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BotIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <div className="bg-slate-800/30 rounded-3xl p-8 border border-slate-700 min-h-[400px] shadow-inner overflow-auto">
          {result ? (
            <div key={selectedIconId || 'current'} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
               <ReactMarkdown className="prose prose-invert max-w-none prose-sm sm:prose-base">{result}</ReactMarkdown>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
               <Bot className="w-12 h-12 opacity-10" />
               <p className="text-center italic text-sm">Sube una imagen o selecciona una de la biblioteca.<br/>El análisis se conservará permanentemente para cada activo.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
