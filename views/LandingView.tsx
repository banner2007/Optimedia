
import React, { useState, useEffect } from 'react';
import { generateLandingBanner, generatePaletteFromContext } from '../services/geminiService';
import { saveWork, getIconAssets, downloadBase64 } from '../services/persistenceService';
import { ImageUpload } from '../components/ImageUpload';
import { 
  LayoutTemplate, ShoppingBag, Palette, Type, 
  Sparkles, Download, CloudUpload, Loader2, 
  AlertCircle, X, Check, Image as ImageIcon,
  FileText, Info, RotateCcw, Paintbrush
} from 'lucide-react';
import { AspectRatio } from '../types';

export const LandingView: React.FC = () => {
  const [productImage, setProductImage] = useState<{data: string, mime: string} | null>(null);
  const [styleImage, setStyleImage] = useState<{data: string, mime: string} | null>(null);
  const [brandLogo, setBrandLogo] = useState<{data: string, mime: string} | null>(null);
  const [selectedBrandIconId, setSelectedBrandIconId] = useState<string | null>(null);
  const [productInfo, setProductInfo] = useState('');
  const [headline, setHeadline] = useState('');
  const [offer, setOffer] = useState('');
  const [cta, setCta] = useState('Comprar Ahora');
  const [ratio, setRatio] = useState<AspectRatio>(AspectRatio.LANDSCAPE_16_9);
  const [loading, setLoading] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  
  const [colorPalette, setColorPalette] = useState<string[]>([]);
  const [paletteLoading, setPaletteLoading] = useState(false);

  const [brandIcons, setBrandIcons] = useState<any[]>([]);
  const [iconsLoading, setIconsLoading] = useState(false);

  useEffect(() => {
    loadBrandIcons();
  }, []);

  const loadBrandIcons = async () => {
    setIconsLoading(true);
    try {
      const icons = await getIconAssets();
      setBrandIcons(icons);
    } catch (err: any) {
      console.warn("No se pudieron cargar activos de marca", err);
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
      if (icon.storagePath) {
        const base64 = await downloadBase64(icon.storagePath, icon.mimeType || 'image/png');
        setBrandLogo({ data: base64, mime: icon.mimeType || 'image/png' });
        setSelectedBrandIconId(icon.id);
      } else {
        throw new Error("El activo no tiene una ruta de almacenamiento válida.");
      }
    } catch (err: any) {
      console.error("Error cargando activo:", err);
      setError(err.message || "Error de conexión al cargar el logo.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!productImage || !headline) return;
    
    setLoading(true);
    setError(null);
    setResultImage(null);
    setSaved(false);

    try {
      let currentPalette = colorPalette;
      
      if (currentPalette.length === 0) {
        setPaletteLoading(true);
        try {
          const generatedPalette = await generatePaletteFromContext(
            productImage.data,
            productImage.mime,
            productInfo
          );
          currentPalette = generatedPalette;
          setColorPalette(generatedPalette);
        } catch (pErr) {
          console.error("Error generating palette", pErr);
        } finally {
          setPaletteLoading(false);
        }
      }

      const result = await generateLandingBanner(
        productImage.data,
        productImage.mime,
        styleImage?.data || null,
        styleImage?.mime || null,
        headline,
        offer,
        cta,
        ratio,
        productInfo,
        currentPalette,
        brandLogo
      );
      setResultImage(result.url);
    } catch (err: any) {
      setError(err.message || "Error al generar el banner publicitario.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!resultImage) return;
    try {
      await saveWork('LANDING', resultImage, `Banner: ${headline}`, { headline, offer, ratio, productInfo, colorPalette });
      setSaved(true);
    } catch (err) {
      setError("Error al guardar en el historial.");
    }
  };

  const handleResetPalette = () => {
    setColorPalette([]);
    setError(null);
  };

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <LayoutTemplate className="w-6 h-6 text-indigo-400" />
            Landing Page & Banner Creator
          </h2>
          <p className="text-slate-400 mt-1 italic">Convierte tus productos en piezas publicitarias de alta conversión.</p>
        </div>
        
        {colorPalette.length > 0 && (
          <div className="flex items-center gap-4 bg-slate-800/50 p-3 rounded-2xl border border-slate-700 animate-in fade-in slide-in-from-right-4">
            <div className="flex flex-col items-end mr-2">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-tighter">Guía de Color</span>
              <button 
                onClick={handleResetPalette}
                className="text-[9px] text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-2 h-2" /> Reset
              </button>
            </div>
            <div className="flex -space-x-2">
              {colorPalette.map((color, idx) => (
                <div 
                  key={idx} 
                  className="w-8 h-8 rounded-full border-2 border-slate-900 shadow-lg transition-transform hover:scale-110 hover:z-10" 
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 space-y-6 max-h-[calc(100vh-160px)] overflow-y-auto pr-2 custom-scrollbar">
          
          <div className="space-y-4">
            <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
              <label className="text-xs font-bold text-indigo-400 uppercase mb-3 block flex items-center gap-2">
                <ShoppingBag className="w-3 h-3" /> Imagen del Producto *
              </label>
              {!productImage ? (
                <ImageUpload onImageSelected={(data, mime) => setProductImage({data, mime})} label="Subir Producto" />
              ) : (
                <div className="relative rounded-lg overflow-hidden border border-slate-600 aspect-video bg-slate-900">
                  <img src={`data:${productImage.mime};base64,${productImage.data}`} className="w-full h-full object-contain" />
                  <button onClick={() => setProductImage(null)} className="absolute top-2 right-2 bg-red-600 p-1 rounded-full text-white shadow-lg transition-transform hover:scale-110"><X className="w-3 h-3" /></button>
                </div>
              )}
            </div>

            <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
              <label className="text-xs font-bold text-slate-400 uppercase mb-3 block flex items-center gap-2">
                <FileText className="w-3 h-3 text-indigo-400" /> Información del Producto
              </label>
              <textarea
                value={productInfo}
                onChange={(e) => setProductInfo(e.target.value)}
                placeholder="Descripción, beneficios o características técnicas..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-300 h-32 resize-none outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
              <label className="text-xs font-bold text-slate-400 uppercase mb-3 block flex items-center gap-2">
                <Palette className="w-3 h-3" /> Identidad de Marca (Opcional)
              </label>
              <div className="grid grid-cols-5 gap-2">
                {iconsLoading ? (
                  <div className="col-span-5 flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-indigo-500" /></div>
                ) : brandIcons.length > 0 ? (
                  brandIcons.map((icon) => (
                    <button
                      key={icon.id}
                      onClick={() => handleSelectBrandIcon(icon)}
                      className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all bg-slate-900 flex items-center justify-center p-1 ${
                        selectedBrandIconId === icon.id 
                          ? 'border-indigo-500 ring-2 ring-indigo-500/20' 
                          : 'border-slate-700 grayscale opacity-60 hover:opacity-100 hover:grayscale-0'
                      }`}
                      title={icon.name}
                    >
                      <img src={icon.imageUrl} className="max-w-full max-h-full object-contain" alt={icon.name} />
                    </button>
                  ))
                ) : (
                  <div className="col-span-5 text-[10px] text-slate-500 text-center py-2 border border-dashed border-slate-700 rounded-lg">
                    Sin activos. Agrégalos en 'Analizar'.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
              <label className="text-xs font-bold text-slate-400 uppercase mb-3 block flex items-center gap-2">
                <Palette className="w-3 h-3" /> Estilo de Referencia (Opcional)
              </label>
              {!styleImage ? (
                <ImageUpload onImageSelected={(data, mime) => setStyleImage({data, mime})} label="Referencia Visual" />
              ) : (
                <div className="relative rounded-lg overflow-hidden border border-slate-600 aspect-video bg-slate-900">
                  <img src={`data:${styleImage.mime};base64,${styleImage.data}`} className="w-full h-full object-contain" />
                  <button onClick={() => setStyleImage(null)} className="absolute top-2 right-2 bg-slate-700 p-1 rounded-full text-white shadow-lg transition-transform hover:scale-110"><X className="w-3 h-3" /></button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 space-y-4 shadow-xl">
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
                  <Type className="w-3 h-3" /> Headline / Título *
                </label>
                <input 
                  type="text" 
                  value={headline} 
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Ej: Oferta Irresistible"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Oferta (Subtítulo)</label>
                <input 
                  type="text" 
                  value={offer} 
                  onChange={(e) => setOffer(e.target.value)}
                  placeholder="Ej: Solo por 24 horas"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">CTA (Botón)</label>
                <input 
                  type="text" 
                  value={cta} 
                  onChange={(e) => setCta(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Formato</label>
              <div className="flex flex-wrap gap-2">
                {[AspectRatio.LANDSCAPE_16_9, AspectRatio.SQUARE_1_1, AspectRatio.PORTRAIT_9_16].map((r) => (
                  <button 
                    key={r} 
                    onClick={() => setRatio(r)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${ratio === r ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!productImage || !headline || loading}
              className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                loading || !productImage || !headline
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 active:scale-[0.98]'
              }`}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              <span>{loading ? 'Diseñando Banner...' : 'Generar Banner'}</span>
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-8 h-full">
          <div className="bg-slate-800/30 rounded-3xl p-6 border border-slate-700 min-h-[600px] lg:h-[calc(100vh-160px)] flex flex-col items-center justify-center shadow-inner relative">
            {resultImage ? (
              <div className="w-full h-full flex flex-col items-center">
                <div className="relative group rounded-2xl overflow-hidden shadow-2xl border border-slate-800 transition-all hover:border-indigo-500/30 max-h-[85%] flex items-center">
                  <img src={resultImage} className="max-w-full h-auto object-contain max-h-full shadow-2xl" alt="Banner Generado" />
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => { const link = document.createElement('a'); link.href = resultImage; link.download = 'banner.png'; link.click(); }}
                      className="p-3 bg-indigo-600 hover:bg-indigo-500 rounded-full text-white shadow-xl transition-transform hover:scale-110"
                      title="Descargar"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="mt-6 flex gap-4">
                  <button
                    onClick={handleSave}
                    disabled={saved}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                      saved ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-emerald-500/10 shadow-lg' : 'bg-slate-700 hover:bg-slate-600 text-white shadow-lg shadow-black/20'
                    }`}
                  >
                    {saved ? <Check className="w-5 h-5" /> : <CloudUpload className="w-5 h-5" />}
                    {saved ? 'Guardado en Nube' : 'Guardar en Historial'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                {loading ? (
                  <div className="space-y-6">
                    <div className="relative w-24 h-24 mx-auto">
                       <Loader2 className="w-24 h-24 animate-spin text-indigo-500 opacity-20" />
                       <Sparkles className="absolute inset-0 w-8 h-8 m-auto text-indigo-400 animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-indigo-300 font-bold text-xl animate-pulse">
                        {paletteLoading ? 'Definiendo ADN de Marca...' : 'Renderizando Visual...'}
                      </p>
                      <p className="text-slate-500 text-sm">Optimizando rostros, vestimenta y gramática.</p>
                      {colorPalette.length > 0 && (
                        <div className="flex justify-center gap-1 mt-4">
                          {colorPalette.map((c, i) => <div key={i} className="w-2 h-2 rounded-full" style={{backgroundColor: c}} />)}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="max-w-md mx-auto">
                    <div className="w-20 h-20 bg-slate-700/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <Paintbrush className="w-10 h-10 text-slate-600 opacity-50" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-300 mb-2">Diseño Inteligente</h3>
                    <p className="text-slate-500 text-sm">
                      La primera generación extraerá tu paleta de colores corporativos automáticamente para mantener la uniformidad visual.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}</style>
    </div>
  );
};
