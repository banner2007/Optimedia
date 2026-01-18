
import React, { useState, useEffect } from 'react';
import { editImage } from '../services/geminiService';
import { saveWork, getIconAssets } from '../services/persistenceService';
import { ImageUpload } from '../components/ImageUpload';
import { 
  Settings2, Wand2, Download, RefreshCw, CheckCircle2, 
  Circle, LayoutGrid, Palette, CloudUpload, AlertCircle, 
  Globe, Link as LinkIcon, Image as ImageIcon, 
  Loader2 as LoaderIcon, Check, Info, Instagram, Facebook 
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
    setError(null); // Limpiar errores al cargar
    try {
      const icons = await getIconAssets();
      setBrandIcons(icons);
    } catch (err: any) {
      console.error("Error loading brand icons:", err);
      setError(err.message); // Mostrar el mensaje de error al usuario
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
      if (icon.base64) {
        const match = icon.base64.match(/^data:(.+);base64,(.+)$/);
        if (match) {
          setBrandLogo({ data: match[2], mime: match[1] });
          setSelectedBrandIconId(icon.id);
        } else {
          throw new Error("Formato local inválido");
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
      setError(err.message || "Error al cargar activo.");
      setSelectedBrandIconId(null);
      setBrandLogo(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleRatio = (ratio: AspectRatio) => {
    if (selectedRatios.includes(ratio)) {
      if (selectedRatios.length > 1) setSelectedRatios(selectedRatios.filter(r => r !== ratio));
    } else if (selectedRatios.length < 4) {
      setSelectedRatios([...selectedRatios, ratio]);
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
      setError(err.message || "La edición falló.");
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
        await saveWork('EDIT', resultImages[idx].url, prompt, { size, ratio: selectedRatios[idx % selectedRatios.length] });
        newSaved.add(idx);
      }
      setSavedIds(newSaved);
    } catch (err: any) {
      setError(err.message || "Error al guardar.");
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
    link.download = `optimedia-variant-${index + 1}.png`;
    link.click();
  };

  const handleShare = (platform: 'facebook' | 'instagram', url: string) => {
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
        <p className="text-slate-400 mt-1">Generación de 4 variantes optimizadas con integración inteligente de activos.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start h-full">
        <div className="lg:col-span-4 space-y-4">
          
          <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <ImageIcon className="w-3 h-3 text-indigo-400" />
              Activos de Marca
            </h3>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-5 gap-2">
              {iconsLoading ? (
                <div className="col-span-full flex justify-center py-2"><LoaderIcon className="w-4 h-4 animate-spin text-slate-500" /></div>
              ) : brandIcons.length === 0 ? (
                <p className="col-span-full text-[10px] text-slate-500 italic">No hay activos. Ve a 'Analizar' para agregar.</p>
              ) : (
                brandIcons.map((icon) => (
                  <button
                    key={icon.id}
                    onClick={() => handleSelectBrandIcon(icon)}
                    title={icon.name}
                    disabled={loading}
                    className={`relative aspect-square rounded-xl border-2 overflow-hidden transition-all duration-200 hover:scale-105 bg-slate-900 flex items-center justify-center p-1.5 ${
                      selectedBrandIconId === icon.id 
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg shadow-indigo-500/10' 
                        : 'border-slate-700 opacity-60 hover:opacity-100 grayscale hover:grayscale-0'
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
            {selectedBrandIconId && (
              <div className="mt-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                <p className="text-[10px] text-indigo-400 font-medium flex items-center gap-1">
                  <Info className="w-3 h-3" /> Todas las imágenes usarán los colores de tu marca. El logo se integrará de forma única donde el diseño lo requiera.
                </p>
              </div>
            )}
            {error && !loading && ( // Mostrar error solo si no se está cargando y hay un error
             <div className="mt-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-[10px] flex gap-2 animate-in fade-in slide-in-from-top-1">
               <AlertCircle className="w-3 h-3 flex-shrink-0" />
               <p>{error}</p>
             </div>
            )}
          </div>

          <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-indigo-400" />
              Imagen Base
            </h3>
            {!sourceImage ? (
              <ImageUpload onImageSelected={(data, mime) => setSourceImage({ data, mime })} label="Cargar imagen para editar" />
            ) : (
              <div className="relative group rounded-lg overflow-hidden bg-slate-900 border border-slate-700">
                 <img src={`data:${sourceImage.mime};base64,${sourceImage.data}`} className="w-full max-h-[200px] object-contain" alt="Source" />
                 <button onClick={() => { setSourceImage(null); setResultImages([]); }} className="absolute top-2 right-2 bg-slate-900/90 p-2 rounded-full hover:bg-slate-700 transition-colors opacity-0 group-hover:opacity-100 border border-slate-700"><RefreshCw className="w-4 h-4 text-white" /></button>
              </div>
            )}
          </div>

          <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700 space-y-4 shadow-xl">
             <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Wand2 className="w-3 h-3" /> Instrucciones
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ej: Aplica el estilo de mi marca..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm h-24 resize-none outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
                />
             </div>

             <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Globe className="w-3 h-3" /> URL Referencia (Marketing)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LinkIcon className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://tu-marca.com"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
                  />
                </div>
             </div>
             
             <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Formatos Sugeridos</label>
                <div className="grid grid-cols-3 gap-2">
                    {Object.values(AspectRatio).map((ar) => (
                      <button key={ar} onClick={() => toggleRatio(ar)} className={`px-2 py-2 rounded-lg text-[10px] border transition-all ${selectedRatios.includes(ar) ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                        {ar}
                      </button>
                    ))}
                </div>
             </div>

             <button
                onClick={handleEdit}
                disabled={!sourceImage || !prompt || loading}
                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                  loading ? 'bg-indigo-600/50 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20 text-white active:scale-[0.98]'
                }`}
              >
                {loading ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                <span>{loading ? 'Generando 4 variantes...' : 'Generar y Optimizar'}</span>
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

              {error && loading && <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-[10px] flex gap-2 animate-in fade-in slide-in-from-top-1"><AlertCircle className="w-3 h-3 flex-shrink-0" />{error}</div>}
          </div>
        </div>

        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700 min-h-[600px] flex flex-col shadow-inner overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-300 flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-indigo-400" />
                Variantes Generadas (4)
              </h3>
              {resultImages.length > 0 && (
                 <button onClick={downloadSelected} disabled={selectedIndices.size === 0} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95">
                  <Download className="w-4 h-4" /> Descargar Todo
                </button>
              )}
            </div>
            
            <div className="flex-1 overflow-auto pr-2 custom-scrollbar">
               {resultImages.length > 0 ? (
                 <div className="grid gap-6 md:grid-cols-2">
                   {resultImages.map((img, idx) => (
                     <div key={idx} className={`group relative rounded-2xl overflow-hidden border-2 transition-all duration-300 ${selectedIndices.has(idx) ? 'border-indigo-500 ring-4 ring-indigo-500/10 shadow-xl' : 'border-slate-800 hover:border-slate-600 shadow-lg'}`}>
                        <div onClick={() => toggleSelection(idx)} className="cursor-pointer">
                          <img src={img.url} alt={`Var ${idx}`} className="w-full h-auto min-h-[300px] object-contain bg-slate-900" />
                        </div>
                        
                        {/* Status Overlay */}
                        <div className={`absolute top-4 right-4 p-1.5 rounded-full transition-all shadow-lg cursor-pointer ${selectedIndices.has(idx) ? 'bg-indigo-500 text-white scale-110' : 'bg-black/40 text-slate-300'}`} onClick={() => toggleSelection(idx)}>
                           {selectedIndices.has(idx) ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                        </div>

                        {/* Toolbar Footer */}
                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex gap-2">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleShare('facebook', img.url); }}
                              className="p-2 bg-slate-800/80 hover:bg-blue-600 rounded-full text-white transition-all hover:scale-110"
                              title="Compartir en Facebook"
                            >
                              <Facebook className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleShare('instagram', img.url); }}
                              className="p-2 bg-slate-800/80 hover:bg-gradient-to-tr hover:from-yellow-400 hover:via-pink-500 hover:to-purple-600 rounded-full text-white transition-all hover:scale-110"
                              title="Compartir en Instagram"
                            >
                              <Instagram className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                             <span className="text-[9px] font-medium text-white/70 bg-white/10 px-2 py-1 rounded backdrop-blur-md border border-white/10">
                                {selectedRatios[idx % selectedRatios.length]}
                             </span>
                             <button 
                              onClick={(e) => { e.stopPropagation(); downloadSingle(img.url, idx); }}
                              className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-full text-white transition-all shadow-lg hover:scale-110"
                              title="Descargar esta variante"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="h-full flex flex-col items-center justify-center text-slate-600 min-h-[500px] border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/10">
                   {loading ? (
                     <div className="text-center space-y-4">
                        <div className="relative">
                          <LoaderIcon className="w-16 h-16 text-indigo-500 animate-spin mx-auto opacity-20" />
                          <Wand2 className="w-6 h-6 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
                        </div>
                        <p className="text-slate-400 animate-pulse font-medium">Optimizando 4 visuales estratégicos...</p>
                        <p className="text-slate-600 text-xs">Sincronizando paleta de colores de marca...</p>
                     </div>
                   ) : (
                     <div className="text-center space-y-4 opacity-20">
                        <ImageIcon className="w-20 h-20 mx-auto" />
                        <p className="text-xl font-medium">Panel de Producción</p>
                        <p className="text-sm max-w-xs mx-auto">Generaremos 4 variantes listas para compartir o descargar.</p>
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
