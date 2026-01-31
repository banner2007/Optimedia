
import React, { useState, useEffect, useRef } from 'react';
import { editImage } from '../services/geminiService';
import { saveWork, getIconAssets, downloadBase64 } from '../services/persistenceService';
import { ImageUpload } from '../components/ImageUpload';
import { 
  Settings2, Wand2, Download, Palette, CloudUpload, AlertCircle, 
  Link as LinkIcon, Image as ImageIcon, 
  Loader2 as LoaderIcon, Check, Layers, X, MousePointer2,
  FileDown, FileType, Zap
} from 'lucide-react';
import { GeneratedImage, ImageSize, AspectRatio } from '../types';

export const EditView: React.FC = () => {
  const [sourceImage, setSourceImage] = useState<{data: string, mime: string} | null>(null);
  const [brandLogo, setBrandLogo] = useState<{data: string, mime: string} | null>(null);
  const [selectedBrandIconId, setSelectedBrandIconId] = useState<string | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [resultImages, setResultImages] = useState<GeneratedImage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [size, setSize] = useState<ImageSize>(ImageSize.SIZE_1K);
  const [selectedRatios, setSelectedRatios] = useState<AspectRatio[]>([AspectRatio.SQUARE_1_1]);
  const [variantCount, setVariantCount] = useState<number>(1); 

  // Estados de optimización
  const [exportFormat, setExportFormat] = useState<'image/webp' | 'image/jpeg' | 'image/png'>('image/webp');
  const [quality, setQuality] = useState(0.85);
  
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
      console.warn("Error cargando biblioteca:", err);
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
      }
    } catch (err: any) {
      setError("No se pudo cargar el activo. Verifica la conexión.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!sourceImage || !prompt.trim()) return;
    setLoading(true);
    setError(null);
    setResultImages([]);
    setSavedIds(new Set());
    try {
      const results = await editImage(
        sourceImage.data, 
        sourceImage.mime, 
        prompt, 
        variantCount, 
        size, 
        selectedRatios, 
        brandLogo,
        websiteUrl
      );
      setResultImages(results);
    } catch (err: any) {
      setError(err.message || "La edición falló.");
    } finally {
      setLoading(false);
    }
  };

  const downloadOptimized = (dataUrl: string, index: number) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      
      const optimizedUrl = canvas.toDataURL(exportFormat, quality);
      const link = document.createElement('a');
      const ext = exportFormat.split('/')[1];
      link.href = optimizedUrl;
      link.download = `optimedia-studio-${index}.${ext}`;
      link.click();
    };
    img.src = dataUrl;
  };

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto p-6 space-y-6">
       <header className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-indigo-400" />
            Editor & Optimizador Web
          </h2>
          <p className="text-slate-400 mt-1">Transformación de imágenes con exportación inteligente a WebP/JPG.</p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-full">
          <Zap className="w-3 h-3 text-indigo-400" />
          <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">CORS Activo</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <ImageIcon className="w-3 h-3 text-indigo-400" />
              1. Base de Trabajo
            </h3>
            {!sourceImage ? (
              <ImageUpload onImageSelected={(data, mime) => setSourceImage({ data, mime })} label="Imagen a optimizar" />
            ) : (
              <div className="relative group rounded-lg overflow-hidden border border-indigo-500/50 bg-slate-900 aspect-video flex items-center justify-center">
                <img src={`data:${sourceImage.mime};base64,${sourceImage.data}`} className="max-w-full max-h-full object-contain" alt="Base" />
                <button onClick={() => setSourceImage(null)} className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
              </div>
            )}
          </div>

          <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Palette className="w-3 h-3 text-indigo-400" />
              2. Activos de Marca
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {brandIcons.length > 0 ? (
                brandIcons.map((icon) => (
                  <button
                    key={icon.id}
                    onClick={() => handleSelectBrandIcon(icon)}
                    className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all bg-slate-900 flex items-center justify-center p-1 ${
                      selectedBrandIconId === icon.id ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-700 grayscale opacity-60 hover:opacity-100 hover:grayscale-0'
                    }`}
                  >
                    <img src={icon.imageUrl} className="max-w-full max-h-full object-contain" alt={icon.name} />
                  </button>
                ))
              ) : (
                <div className="col-span-5 text-[10px] text-slate-500 text-center py-4 border border-dashed border-slate-700 rounded-lg">Biblioteca vacía</div>
              )}
            </div>
          </div>

          <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700 space-y-4 shadow-xl">
             <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe la optimización o cambio visual..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm h-24 resize-none outline-none focus:ring-2 focus:ring-indigo-500"
             />
             <button
                onClick={handleEdit}
                disabled={!sourceImage || !prompt || loading}
                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                  loading ? 'bg-slate-700 text-slate-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg'
                }`}
              >
                {loading ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                <span>{loading ? 'Procesando...' : 'Aplicar Optimización'}</span>
              </button>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700 min-h-[500px] flex flex-col items-center justify-center relative shadow-inner">
            {resultImages.length > 0 ? (
              <div className="w-full space-y-6">
                <div className="flex flex-col items-center">
                   <img src={resultImages[0].url} className="max-w-full max-h-[500px] rounded-xl shadow-2xl border border-slate-700" alt="Resultado" />
                </div>
                
                <div className="bg-slate-900/80 backdrop-blur p-6 rounded-2xl border border-indigo-500/20 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-indigo-400 uppercase flex items-center gap-2">
                      <FileType className="w-4 h-4" /> Formato de Exportación
                    </h4>
                    <div className="flex gap-2">
                      {[
                        { label: 'WebP', mime: 'image/webp' },
                        { label: 'JPG', mime: 'image/jpeg' },
                        { label: 'PNG', mime: 'image/png' }
                      ].map((f) => (
                        <button 
                          key={f.mime} 
                          onClick={() => setExportFormat(f.mime as any)}
                          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${exportFormat === f.mime ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-indigo-400 uppercase">Calidad / Compresión</h4>
                      <span className="text-xs font-mono text-indigo-300">{Math.round(quality * 100)}%</span>
                    </div>
                    <input 
                      type="range" min="0.1" max="1" step="0.05" 
                      value={quality} 
                      onChange={(e) => setQuality(parseFloat(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                    <p className="text-[10px] text-slate-500 italic">WebP al 80% suele ser el equilibrio perfecto entre peso y nitidez.</p>
                  </div>

                  <div className="md:col-span-2 pt-4 border-t border-slate-800 flex justify-center">
                    <button 
                      onClick={() => downloadOptimized(resultImages[0].url, 0)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                    >
                      <FileDown className="w-5 h-5" />
                      Descargar Optimizado para Web
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center">
                {loading ? <LoaderIcon className="w-12 h-12 animate-spin text-indigo-500 mx-auto mb-4" /> : <Zap className="w-12 h-12 text-slate-700 mx-auto mb-4" />}
                <p className="text-slate-500 font-medium">{loading ? 'Optimizando píxeles...' : 'Sube una imagen para empezar la optimización'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
