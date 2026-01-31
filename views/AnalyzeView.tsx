
import React, { useState, useEffect } from 'react';
import { analyzeImage } from '../services/geminiService';
import { saveIconAsset, getIconAssets, deleteIconAsset, deleteAllIcons } from '../services/persistenceService';
import { ImageUpload } from '../components/ImageUpload';
import { ScanSearch, Bot, RefreshCcw, Trash2, Image as ImageIcon, Loader2, Bot as BotIcon, Eraser, AlertCircle, Database } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export const AnalyzeView: React.FC = () => {
  const [image, setImage] = useState<{data: string, mime: string} | null>(null);
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
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
      console.warn("Biblioteca de Firestore no disponible:", err.message);
      if (err.message.includes("BASE DE DATOS NO CONFIGURADA")) {
        setError(err.message);
      }
    } finally {
      setIconsLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);
    try {
      const text = await analyzeImage(image.data, image.mime, prompt);
      setResult(text);
      
      try {
        const iconName = prompt 
          ? (prompt.length > 25 ? prompt.substring(0, 25) + '...' : prompt) 
          : `Análisis ${icons.length + 1}`;
        
        const newIcon = await saveIconAsset(image.data, image.mime, iconName, text);
        
        if (newIcon) {
          setIcons(prev => [newIcon, ...prev]);
          setSelectedIconId(newIcon.id);
        }
      } catch (saveErr: any) {
        console.warn("No se pudo guardar el activo en Firestore:", saveErr.message);
        setError("Análisis completado, pero no se pudo guardar en la biblioteca (Posible error de CORS o Firestore).");
      }
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al analizar la imagen.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectIcon = (icon: any) => {
    setSelectedIconId(icon.id);
    setResult(icon.analysisResult || "No hay análisis disponible.");
    setPrompt(icon.name);
    setImage({ data: icon.imageUrl, mime: icon.mimeType || 'image/png' });
  };

  const handleDeleteIcon = async (e: React.MouseEvent, id: string, storagePath?: string) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm("¿Eliminar este activo?")) return;
    setDeletingId(id);
    try {
      await deleteIconAsset(id, storagePath);
      setIcons(prev => prev.filter(icon => icon.id !== id));
      if (selectedIconId === id) handleReset();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    if (icons.length === 0 || !confirm("¿Borrar toda la biblioteca?")) return;
    setDeletingAll(true);
    try {
      await deleteAllIcons();
      setIcons([]);
      handleReset();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingAll(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setResult(null);
    setPrompt('');
    setSelectedIconId(null);
    setError(null);
  };

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto p-6 space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <ScanSearch className="w-6 h-6 text-indigo-400" />
          Análisis y Activos de Marca
        </h2>
        <p className="text-slate-400 mt-1">Entiende tus imágenes y gestiónalas como activos permanentes.</p>
      </header>

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

        {error && error.includes("BASE DE DATOS NO CONFIGURADA") ? (
          <div className="p-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col items-center text-center space-y-3">
             <Database className="w-10 h-10 text-amber-500 opacity-50" />
             <div className="max-w-md">
                <h4 className="text-amber-400 font-bold mb-1">Acción Requerida en Firebase</h4>
                <p className="text-slate-400 text-xs leading-relaxed whitespace-pre-wrap">{error}</p>
             </div>
             <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-colors">
               Ir a Consola de Firebase
             </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 min-h-[100px]">
            {iconsLoading ? (
              <div className="col-span-full flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              </div>
            ) : icons.length === 0 ? (
              <div className="col-span-full py-8 text-center border-2 border-dashed border-slate-700 rounded-2xl">
                <p className="text-slate-500 text-sm">Tu biblioteca está vacía. Analiza una imagen para guardarla.</p>
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
                </div>
              ))
            )}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          {!image ? (
            <ImageUpload onImageSelected={(data, mime) => setImage({ data, mime })} label="Cargar para analizar y guardar" />
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
              placeholder="¿Qué quieres saber de la imagen?" 
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
          {error && !error.includes("BASE DE DATOS NO CONFIGURADA") && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>
        <div className="bg-slate-800/30 rounded-3xl p-8 border border-slate-700 min-h-[400px] shadow-inner overflow-auto">
          {result ? (
            <div key={selectedIconId || 'current'} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
               <ReactMarkdown className="prose prose-invert max-w-none prose-sm sm:prose-base">{result}</ReactMarkdown>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
               <Bot className="w-12 h-12 opacity-10" />
               <p className="text-center italic text-sm">Sube una imagen para ver el análisis impulsado por Flash.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
