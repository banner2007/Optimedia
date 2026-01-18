import React, { useState, useEffect } from 'react';
import { editImage } from '../services/geminiService';
import { saveWork, getIconAssets } from '../services/persistenceService';
import { ImageUpload } from '../components/ImageUpload';
import { 
  Settings2, Wand2, Download, RefreshCw, CheckCircle2, 
  Circle, LayoutGrid, Palette, CloudUpload, AlertCircle, 
  Globe, Link as LinkIcon, Image as ImageIcon, 
  Loader2 as LoaderIcon, Check, Info, Instagram, Facebook,
  Zap, FileType
} from 'lucide-react';
import { GeneratedImage, ImageSize, AspectRatio } from '../types';

export const EditView: React.FC = () => {
  const [sourceImage, setSourceImage] = useState<{data: string, mime: string} | null>(null);
  const [brandLogo, setBrandLogo] = useState<{data: string, mime: string} | null>(null);
  const [selectedBrandIconId, setSelectedBrandIconId] = useState<string | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [resultImages, setResultImages] = useState<GeneratedImage[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [size, setSize] = useState<ImageSize>(ImageSize.SIZE_1K);
  const [selectedRatios, setSelectedRatios] = useState<AspectRatio[]>([AspectRatio.SQUARE_1_1]);
  
  const [brandIcons, setBrandIcons] = useState<any[]>([]);
  const [iconsLoading, setIconsLoading] = useState(false);

  useEffect(() => {
    loadBrandIcons();
  }, []);

  const loadBrandIcons = async () => {
    setIconsLoading(true);
    setError(null);
    try {
      const icons = await getIconAssets();
      setBrandIcons(icons);
    } catch (err: any) {
      console.error("Error loading brand icons:", err);
      setError(err.message);
    } finally {
      setIconsLoading(false);
    }
  };

  const handleSelectBrandIcon = async (icon: any) => {
    if (selectedBrandIconId === icon.id) {
      setSelectedBrandIconId(null);
      setBrandLogo(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Handle both data URLs and direct fetch for Firestore-stored assets
      if (icon.imageUrl.startsWith('data:')) {
        const match = icon.imageUrl.match(/^data:(.+);base64,(.+)$/);
        if (match) {
          setBrandLogo({ data: match[2], mime: match[1] });
          setSelectedBrandIconId(icon.id);
        }
      } else {
        const response = await fetch(icon.imageUrl, { mode: 'cors' });
        const blob = await response.blob();
        const reader = new FileReader();
        const base64Data = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        const match = base64Data.match(/^data:(.+);base64,(.+)$/);
        if (match) {
          setBrandLogo({ data: match[2], mime: match[1] });
          setSelectedBrandIconId(icon.id);
        }
      }
    } catch (err: any) {
      console.error("Failed to process brand icon", err);
      setError("Error al cargar activo de marca. Asegúrate de que los permisos de Firebase están configurados correctamente.");
      setSelectedBrandIconId(null);
      setBrandLogo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickOptimize = async () => {
    if (!sourceImage) return;
    setOptimizing(true);
    setError(null);
    try {
      // Local client-side optimization to WebP (Saves bandwidth and quota)
      const img = new Image();
      img.src = `data:${sourceImage.mime};base64,${sourceImage.data}`;
      await new Promise((resolve) => img.onload = resolve);

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      
      const webpDataUrl = canvas.toDataURL('image/webp', 0.8);
      setResultImages([{ url: webpDataUrl, mimeType: 'image/webp' }]);
      setSelectedIndices(new Set([0]));
    } catch (err: any) {
      setError("La optimización local falló.");
    } finally {
      setOptimizing(false);
    }
  };

  const handleEdit = async () => {
    if (!sourceImage || !prompt.trim()) return;
    setLoading(true);
    setError(null);
    setResultImages([]);
    setSavedIds(new Set());
    setSelectedIndices(new Set());
    
    try {
      const results = await editImage(
        sourceImage.data, 
        sourceImage.mime, 
        prompt, 
        4, 
        size, 
        selectedRatios, 
        brandLogo,
        websiteUrl
      );
      setResultImages(results);
      setSelectedIndices(new Set(results.map((_, i) => i)));
    } catch (err: any) {
      setError(err.message || "La edición con IA falló.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToCloud = async () => {
    if (selectedIndices.size === 0 || saving) return;
    setSaving(true);
    setError(null);
    try {
      const newSaved = new Set(savedIds);
      for (const idx of selectedIndices) {
        if (newSaved.has(idx)) continue;
        await saveWork('EDIT', resultImages[idx].url, prompt || 'Optimización Local', { size, ratio: selectedRatios[idx % selectedRatios.length] });
        newSaved.add(idx);
      }
      setSavedIds(newSaved);
    } catch (err: any) {
      setError(err.message || "Error al guardar en la nube.");
    } finally {
      setSaving(false);
    }
  };

  const toggleSelection = (index: number) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(index)) newSelected.delete(index);
    else newSelected.add(index);
    setSelectedIndices(newSelected);
  };

  const downloadSingle = (url: string, index: number) => {
    const link = document.createElement('a');
    link.href = url;
    const ext = url.split(';')[0].split('/')[1] || 'png';
    link.download = `optimedia-studio-${index + 1}.${ext}`;
    link.click();
  };

  const handleShare = (platform: 'facebook' | 'instagram', url: string) => {
    // Sharing logic remains as simulation/link generation
    if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank');
    } else {
      window.open('https://www.instagram.com/', '_blank');
    }
  };

  const downloadSelected = async () => {
    for (const index of selectedIndices) {
      const img = resultImages[index];
      if (img) {
        downloadSingle(img.url, index);
        await new Promise(r => setTimeout(r, 200));
      }
    }
  };

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto p-6 space-y-6">
       <header>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings2 className="w-6 h-6 text-indigo-400" />
          Editar y Optimizar
        </h2>
        <p className="text-slate-400 mt-1">Crea variantes con IA o realiza optimizaciones locales gratuitas para web.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start h-full">
        <div className="lg:col-span-4 space-y-4">
          
          <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <ImageIcon className="w-3 h-3 text-indigo-400" />
              Identidad Visual
            </h3>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-5 gap-2">
              {iconsLoading ? (
                <div className="col-span-full flex justify-center py-2"><LoaderIcon className="w-4 h-4 animate-spin text-slate-500" /></div>
              ) : brandIcons.length === 0 ? (
                <p className="col-span-full text-[10px] text-slate-500 italic">Sin activos de marca. Usa 'Analizar' para guardar logos.</p>
              ) : (
                brandIcons.map((icon) => (
                  <button
                    key={icon.id}
                    onClick={() => handleSelectBrandIcon(icon)}
                    title={icon.name}
                    disabled={loading || optimizing}
                    className={`relative aspect-square rounded-xl border-2 overflow-hidden transition-all duration-200 hover:scale-105 bg-slate-900 flex items-center justify-center p-1.5 ${
                      selectedBrandIconId === icon.id 
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20' 
                        : 'border-slate-700 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={icon.imageUrl} className="max-w-full max-h-full object-contain" alt={icon.name} />
                    {selectedBrandIconId === icon.id && (
                      <div className="absolute top-0 right-0 bg-indigo-500 text-white p-0.5 rounded-bl-lg shadow-sm">
                        <Check className="w-2.5 h-2.5" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-indigo-400" />
              Imagen Origen
            </h3>
            {!sourceImage ? (
              <ImageUpload onImageSelected={(data, mime) => setSourceImage({ data, mime })} label="Subir imagen" />
            ) : (
              <div className="relative group rounded-lg overflow-hidden bg-slate-900 border border-slate-700">
                 <img src={`data:${sourceImage.mime};base64,${sourceImage.data}`} className="w-full max-h-[200px] object-contain" alt="Source" />
                 <button onClick={() => { setSourceImage(null); setResultImages([]); }} className="absolute top-2 right-2 bg-slate-900/90 p-2 rounded-full hover:bg-slate-700 transition-colors opacity-0 group-hover:opacity-100 border border-slate-700"><RefreshCw className="w-4 h-4 text-white" /></button>
              </div>
            )}
            
            {sourceImage && (
              <button
                onClick={handleQuickOptimize}
                disabled={optimizing || loading}
                className="w-full mt-3 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-bold text-indigo-300 flex items-center justify-center gap-2 transition-all border border-indigo-500/20"
              >
                {optimizing ? <LoaderIcon className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                Optimización Web Local (Gratis)
              </button>
            )}
          </div>

          <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700 space-y-4 shadow-xl">
             <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Wand2 className="w-3 h-3" /> Instrucciones IA
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ej: Ajustar a colores de marca y optimizar..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm h-20 resize-none outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
                />
             </div>

             <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Globe className="w-3 h-3" /> URL Referencia (Marketing)
                </label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://tu-marca.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
                />
             </div>

             <button
                onClick={handleEdit}
                disabled={!sourceImage || !prompt || loading || optimizing}
                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                  loading ? 'bg-indigo-600/50 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20 text-white'
                }`}
              >
                {loading ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                <span>{loading ? 'Generando variaciones...' : 'Ejecutar con Gemini Pro'}</span>
              </button>
              
              {resultImages.length > 0 && (
                <button
                  onClick={handleSaveToCloud}
                  disabled={selectedIndices.size === 0 || saving}
                  className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 border transition-all ${
                    saving ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-slate-700 hover:bg-slate-600 text-indigo-400 border-indigo-500/30'
                  }`}
                >
                  {saving ? <LoaderIcon className="h-4 w-4 animate-spin text-indigo-500" /> : <CloudUpload className="w-4 h-4" />}
                  <span>{saving ? 'Guardando...' : `Guardar Selección (${selectedIndices.size})`}</span>
                </button>
              )}

              {error && <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-[10px] flex gap-2"><AlertCircle className="w-3 h-3 flex-shrink-0" />{error}</div>}
          </div>
        </div>

        <div className="lg:col-span-8 space-y-4 h-full min-h-[600px]">
          <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700 h-full flex flex-col shadow-inner overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-300 flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-indigo-400" />
                Resultados de Producción
              </h3>
              {resultImages.length > 0 && (
                 <button onClick={downloadSelected} disabled={selectedIndices.size === 0} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-bold transition-all shadow-lg">
                  <Download className="w-4 h-4" /> Bajar Selección
                </button>
              )}
            </div>
            
            <div className="flex-1 overflow-auto pr-2 custom-scrollbar">
               {resultImages.length > 0 ? (
                 <div className="grid gap-6 md:grid-cols-2">
                   {resultImages.map((img, idx) => (
                     <div key={idx} className={`group relative rounded-2xl overflow-hidden border-2 transition-all duration-300 ${selectedIndices.has(idx) ? 'border-indigo-500 ring-4 ring-indigo-500/10 shadow-xl' : 'border-slate-800 hover:border-slate-600 shadow-lg'}`}>
                        <div onClick={() => toggleSelection(idx)} className="cursor-pointer">
                          <img src={img.url} alt={`Resultado ${idx}`} className="w-full h-auto min-h-[300px] object-contain bg-slate-900" />
                        </div>
                        
                        <div className={`absolute top-4 right-4 p-1.5 rounded-full transition-all shadow-lg cursor-pointer ${selectedIndices.has(idx) ? 'bg-indigo-500 text-white scale-110' : 'bg-black/40 text-slate-300'}`} onClick={() => toggleSelection(idx)}>
                           {selectedIndices.has(idx) ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex gap-2">
                            <button onClick={(e) => { e.stopPropagation(); handleShare('facebook', img.url); }} className="p-2 bg-slate-800/80 hover:bg-blue-600 rounded-full text-white transition-all"><Facebook className="w-3.5 h-3.5" /></button>
                            <button onClick={(e) => { e.stopPropagation(); handleShare('instagram', img.url); }} className="p-2 bg-slate-800/80 hover:bg-gradient-to-tr hover:from-yellow-400 hover:to-purple-600 rounded-full text-white transition-all"><Instagram className="w-3.5 h-3.5" /></button>
                          </div>
                          <div className="flex items-center gap-2">
                             <span className="text-[9px] font-medium text-white/70 bg-white/10 px-2 py-1 rounded backdrop-blur-md border border-white/10 flex items-center gap-1">
                                {img.mimeType === 'image/webp' && <Zap className="w-2.5 h-2.5 text-yellow-400" />}
                                {img.mimeType.split('/')[1].toUpperCase()}
                             </span>
                             <button onClick={(e) => { e.stopPropagation(); downloadSingle(img.url, idx); }} className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-full text-white transition-all shadow-lg"><Download className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="h-full flex flex-col items-center justify-center text-slate-600 min-h-[500px] border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/10">
                   {loading || optimizing ? (
                     <div className="text-center space-y-4">
                        <LoaderIcon className="w-16 h-16 text-indigo-500 animate-spin mx-auto opacity-20" />
                        <p className="text-slate-400 animate-pulse font-medium">{loading ? 'Produciendo visuales con IA...' : 'Optimizando localmente para web...'}</p>
                     </div>
                   ) : (
                     <div className="text-center space-y-4 opacity-20">
                        <ImageIcon className="w-20 h-20 mx-auto" />
                        <p className="text-xl font-medium">Estudio de Edición</p>
                        <p className="text-sm max-w-xs mx-auto">Sube una imagen para empezar a optimizar o editar.</p>
                     </div>
                   )}
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};