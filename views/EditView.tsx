
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { saveWork, getIconAssets } from '../services/persistenceService';
import { ImageUpload } from '../components/ImageUpload';
import { 
  Settings2, Wand2, Download, RefreshCw, CheckCircle2, 
  Circle, LayoutGrid, Palette, CloudUpload, AlertCircle, 
  Globe, Link as LinkIcon, Image as ImageIcon, 
  Loader2 as LoaderIcon, Check, Info, Instagram, Facebook,
  Crop, Maximize, Scissors, Film
} from 'lucide-react';
import { GeneratedImage, AspectRatio } from '../types';

interface Cropper {
  x: number;
  y: number;
  width: number;
  height: number;
  isDragging: boolean;
  startX: number;
  startY: number;
}

export const EditView: React.FC = () => {
  const [sourceImage, setSourceImage] = useState<{data: string, mime: string, url: string} | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [brandLogo, setBrandLogo] = useState<{data: string, mime: string, url: string} | null>(null);
  const [selectedBrandIconId, setSelectedBrandIconId] = useState<string | null>(null);
  const [notes, setNotes] = useState(''); // Renombrado de prompt a notes
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edición
  const [targetWidth, setTargetWidth] = useState<number | ''>('');
  const [targetHeight, setTargetHeight] = useState<number | ''>('');
  const [outputFormat, setOutputFormat] = useState<string>('image/webp');
  const [outputQuality, setOutputQuality] = useState<number>(90); // Para JPEG/WebP
  const [currentAspectRatio, setCurrentAspectRatio] = useState<AspectRatio | 'custom'>(AspectRatio.SQUARE_1_1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [cropper, setCropper] = useState<Cropper | null>(null);
  const [isCropping, setIsCropping] = useState(false);

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

  const handleImageUpload = useCallback((data: string, mime: string) => {
    const imageUrl = `data:${mime};base64,${data}`;
    setSourceImage({ data, mime, url: imageUrl });
    setEditedImage(imageUrl); // Initialize edited image with source
    setNotes('');
    // Removed setAnalysisResult as this state is not managed in EditView
    setTargetWidth('');
    setTargetHeight('');
    setCropper(null);
    setIsCropping(false);
  }, []);

  const handleBrandLogoSelected = useCallback(async (icon: any) => {
    if (selectedBrandIconId === icon.id) {
      setSelectedBrandIconId(null);
      setBrandLogo(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let logoDataUrl = icon.imageUrl;
      let logoMimeType = icon.imageUrl.match(/^data:(.+);base64,/) ? icon.imageUrl.match(/^data:(.+);base64,/)[1] : 'image/png'; // Default to png if no match

      if (!icon.imageUrl.startsWith('data:')) {
        // Fetch external image URL and convert to Data URL
        const response = await fetch(icon.imageUrl, { mode: 'cors' });
        const blob = await response.blob();
        logoDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        logoMimeType = blob.type;
      }
      
      const match = logoDataUrl.match(/^data:(.+);base64,(.+)$/);
      if (match) {
        setBrandLogo({ data: match[2], mime: match[1], url: logoDataUrl });
        setSelectedBrandIconId(icon.id);
      } else {
        throw new Error("Formato de logo inválido.");
      }
    } catch (err: any) {
      console.error("Failed to process brand icon", err);
      setError(err.message || "Error al cargar activo de marca.");
      setSelectedBrandIconId(null);
      setBrandLogo(null);
    } finally {
      setLoading(false);
    }
  }, [selectedBrandIconId]);


  const applyTransformations = useCallback(async () => {
    if (!sourceImage || !canvasRef.current) return;

    setLoading(true);
    setError(null);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) { setLoading(false); return; }

    const img = new Image();
    img.src = sourceImage.url;
    img.onload = async () => {
      let finalWidth = targetWidth === '' ? img.width : Number(targetWidth);
      let finalHeight = targetHeight === '' ? img.height : Number(targetHeight);

      // Apply cropping first
      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = img.width;
      let sourceHeight = img.height;

      if (cropper) {
        sourceX = cropper.x;
        sourceY = cropper.y;
        sourceWidth = cropper.width;
        sourceHeight = cropper.height;
        // If cropping, the new dimensions might be derived from the crop area
        if (targetWidth === '') finalWidth = cropper.width;
        if (targetHeight === '') finalHeight = cropper.height;
      }

      // If only one dimension is set, calculate the other to maintain aspect ratio
      if (targetWidth === '' && targetHeight !== '') {
        finalWidth = Math.round(finalHeight * (sourceWidth / sourceHeight));
      } else if (targetHeight === '' && targetWidth !== '') {
        finalHeight = Math.round(finalWidth * (sourceHeight / sourceWidth));
      } else if (targetWidth === '' && targetHeight === '') {
        // If no target dimensions, use source or cropped dimensions
        finalWidth = sourceWidth;
        finalHeight = sourceHeight;
      }
      
      canvas.width = finalWidth;
      canvas.height = finalHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, finalWidth, finalHeight);

      // Overlay brand logo
      if (brandLogo) {
        const logoImg = new Image();
        logoImg.src = brandLogo.url;
        await new Promise(resolve => logoImg.onload = resolve);
        // Simple overlay: place at bottom-right, resize to 10% of image width
        const logoWidth = canvas.width * 0.15; 
        const logoHeight = logoImg.height * (logoWidth / logoImg.width);
        ctx.drawImage(logoImg, canvas.width - logoWidth - 20, canvas.height - logoHeight - 20, logoWidth, logoHeight);
      }

      const quality = outputFormat === 'image/jpeg' || outputFormat === 'image/webp' ? outputQuality / 100 : 1;
      const newEditedImage = canvas.toDataURL(outputFormat, quality);
      setEditedImage(newEditedImage);
      setLoading(false);
    };
    img.onerror = (e) => {
      setError("Error al cargar la imagen de origen para transformaciones.");
      setLoading(false);
      console.error(e);
    };
  }, [sourceImage, targetWidth, targetHeight, outputFormat, outputQuality, brandLogo, cropper]);

  useEffect(() => {
    if (sourceImage) {
      applyTransformations();
    }
  }, [sourceImage, targetWidth, targetHeight, outputFormat, outputQuality, brandLogo, cropper, applyTransformations]);


  const handleSaveToCloud = async () => {
    if (!editedImage || saving) return;
    setSaving(true);
    setError(null);
    try {
      await saveWork('EDIT', editedImage, notes, { 
        width: targetWidth || (cropper ? cropper.width : imgRef.current?.naturalWidth), 
        height: targetHeight || (cropper ? cropper.height : imgRef.current?.naturalHeight), 
        format: outputFormat, 
        quality: outputQuality,
        ratio: currentAspectRatio === 'custom' ? 'custom' : currentAspectRatio,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const downloadImage = () => {
    if (editedImage) {
      const link = document.createElement('a');
      link.href = editedImage;
      link.download = `optimedia-edited-${Date.now()}.${outputFormat.split('/')[1]}`;
      link.click();
    }
  };

  const handleShare = (platform: 'facebook' | 'instagram', url: string) => {
    // For client-side edited images, direct share is complex without uploading.
    // For now, prompt user to download first.
    // Or share a placeholder/link to the app itself.
    if (platform === 'facebook') {
      alert("Por favor, descarga la imagen primero y luego súbela a Facebook.");
      // window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank');
    } else {
      alert("Por favor, descarga la imagen primero y luego súbela a Instagram.");
      // window.open('https://www.instagram.com/', '_blank'); // Instagram doesn't have direct web share for images
    }
  };

  const resetAll = () => {
    setSourceImage(null);
    setEditedImage(null);
    setBrandLogo(null);
    setSelectedBrandIconId(null);
    setNotes('');
    setTargetWidth('');
    setTargetHeight('');
    setOutputFormat('image/webp');
    setOutputQuality(90);
    setCropper(null);
    setIsCropping(false);
    setError(null);
    setLoading(false);
    setSaving(false);
    setSaved(false);
  };

  // Cropper logic
  const onMouseDown = (e: React.MouseEvent) => {
    if (!isCropping || !canvasRef.current || !imgRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const scaleX = imgRef.current.naturalWidth / canvas.offsetWidth;
    const scaleY = imgRef.current.naturalHeight / canvas.offsetHeight;
    
    setCropper({
      x: x * scaleX,
      y: y * scaleY,
      width: 0,
      height: 0,
      isDragging: true,
      startX: x * scaleX,
      startY: y * scaleY,
    });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isCropping || !cropper || !cropper.isDragging || !canvasRef.current || !imgRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const scaleX = imgRef.current.naturalWidth / canvas.offsetWidth;
    const scaleY = imgRef.current.naturalHeight / canvas.offsetHeight;

    const newWidth = (x * scaleX) - cropper.startX;
    const newHeight = (y * scaleY) - cropper.startY;
    
    let constrainedWidth = newWidth;
    let constrainedHeight = newHeight;

    if (currentAspectRatio !== 'custom') {
      const [ratioX, ratioY] = currentAspectRatio.split(':').map(Number);
      if (newWidth / newHeight > ratioX / ratioY) {
        constrainedWidth = newHeight * (ratioX / ratioY);
      } else {
        constrainedHeight = newWidth * (ratioY / ratioX);
      }
    }

    setCropper(prev => ({
      ...prev!,
      width: Math.max(0, constrainedWidth),
      height: Math.max(0, constrainedHeight),
    }));
  };

  const onMouseUp = () => {
    if (!isCropping || !cropper || !cropper.isDragging) return;
    setCropper(prev => ({ ...prev!, isDragging: false }));
    // Automatically apply crop after selection if desired
    // applyTransformations(); 
  };

  const drawCropperRect = useCallback(() => {
    if (!canvasRef.current || !cropper || !isCropping || !imgRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear previous overlay
    applyTransformations(); // Redraw base image without crop overlay

    // Draw overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw transparent rectangle for crop area
    const scaleX = canvas.offsetWidth / imgRef.current.naturalWidth;
    const scaleY = canvas.offsetHeight / imgRef.current.naturalHeight;

    ctx.clearRect(cropper.x * scaleX, cropper.y * scaleY, cropper.width * scaleX, cropper.height * scaleY);

    // Draw crop handles (optional)
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropper.x * scaleX, cropper.y * scaleY, cropper.width * scaleX, cropper.height * scaleY);

  }, [cropper, isCropping, applyTransformations]);

  useEffect(() => {
    if (isCropping && cropper) {
      drawCropperRect();
    }
  }, [cropper, isCropping, drawCropperRect]);


  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto p-6 space-y-6">
       <header>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings2 className="w-6 h-6 text-indigo-400" />
          Editar y Optimizar Imágenes
        </h2>
        <p className="text-slate-400 mt-1">Redimensiona, recorta, comprime y convierte tus imágenes para cualquier plataforma.</p>
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
                    onClick={() => handleBrandLogoSelected(icon)}
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
                  <Info className="w-3 h-3" /> El logo se superpondrá en la esquina inferior derecha.
                </p>
              </div>
            )}
            {error && !loading && ( 
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
              <ImageUpload onImageSelected={handleImageUpload} label="Cargar imagen para editar" />
            ) : (
              <div className="relative group rounded-lg overflow-hidden bg-slate-900 border border-slate-700">
                 <img ref={imgRef} src={sourceImage.url} className="w-full max-h-[200px] object-contain" alt="Source" />
                 <button onClick={resetAll} className="absolute top-2 right-2 bg-slate-900/90 p-2 rounded-full hover:bg-slate-700 transition-colors opacity-0 group-hover:opacity-100 border border-slate-700"><RefreshCw className="w-4 h-4 text-white" /></button>
              </div>
            )}
          </div>

          <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700 space-y-4 shadow-xl">
            <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Wand2 className="w-3 h-3" /> Notas de Edición
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Logo para campaña de verano..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm h-24 resize-none outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
                />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Maximize className="w-3 h-3" /> Redimensionar
              </label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  placeholder="Ancho" 
                  value={targetWidth} 
                  onChange={(e) => setTargetWidth(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-1/2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                />
                <input 
                  type="number" 
                  placeholder="Alto" 
                  value={targetHeight} 
                  onChange={(e) => setTargetHeight(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-1/2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Deja vacío para mantener la dimensión original o proporcional.</p>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Crop className="w-3 h-3" /> Recortar
                <button 
                  onClick={() => setIsCropping(!isCropping)} 
                  className={`ml-2 px-3 py-1 rounded-full text-[10px] font-medium transition-colors ${
                    isCropping ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {isCropping ? 'Modo Recorte ON' : 'Activar Recorte'}
                </button>
              </label>
              {isCropping && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                   <button onClick={() => setCurrentAspectRatio(AspectRatio.SQUARE_1_1)} className={`px-2 py-2 rounded-lg text-[10px] border transition-all ${currentAspectRatio === AspectRatio.SQUARE_1_1 ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>1:1</button>
                   <button onClick={() => setCurrentAspectRatio(AspectRatio.LANDSCAPE_16_9)} className={`px-2 py-2 rounded-lg text-[10px] border transition-all ${currentAspectRatio === AspectRatio.LANDSCAPE_16_9 ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>16:9</button>
                   <button onClick={() => setCurrentAspectRatio('custom')} className={`px-2 py-2 rounded-lg text-[10px] border transition-all ${currentAspectRatio === 'custom' ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>Libre</button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Film className="w-3 h-3" /> Formato de Salida
              </label>
              <select 
                value={outputFormat} 
                onChange={(e) => setOutputFormat(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="image/webp">WebP</option>
                <option value="image/jpeg">JPEG</option>
                <option value="image/png">PNG</option>
              </select>
            </div>

            { (outputFormat === 'image/jpeg' || outputFormat === 'image/webp') && (
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Scissors className="w-3 h-3" /> Calidad ({outputQuality}%)
                </label>
                <input 
                  type="range" 
                  min="10" 
                  max="100" 
                  value={outputQuality} 
                  onChange={(e) => setOutputQuality(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">Afecta el tamaño del archivo y la calidad visual.</p>
              </div>
            )}
             
             <button
                onClick={applyTransformations}
                disabled={!sourceImage || loading}
                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                  loading ? 'bg-indigo-600/50 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20 text-white active:scale-[0.98]'
                }`}
              >
                {loading ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                <span>{loading ? 'Aplicando Ediciones...' : 'Aplicar y Previsualizar'}</span>
              </button>
              
              {editedImage && (
                <button
                  onClick={handleSaveToCloud}
                  disabled={saving}
                  className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 border transition-all ${
                    saved 
                      ? 'bg-emerald-600/20 border border-emerald-500 text-emerald-400' 
                      : saving 
                        ? 'bg-slate-800 border-slate-700 text-slate-500' 
                        : 'bg-slate-700 hover:bg-slate-600 text-indigo-400 border-indigo-500/30'
                  }`}
                >
                  {saving ? <LoaderIcon className="h-4 w-4 animate-spin text-indigo-500" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <CloudUpload className="w-4 h-4" />}
                  <span>{saving ? 'Guardando...' : saved ? 'Guardado en Nube' : 'Guardar en Historial'}</span>
                </button>
              )}

              {error && !loading && <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-[10px] flex gap-2 animate-in fade-in slide-in-from-top-1"><AlertCircle className="w-3 h-3 flex-shrink-0" />{error}</div>}
          </div>
        </div>

        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700 min-h-[600px] flex flex-col shadow-inner overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-300 flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-indigo-400" />
                Previsualización de Edición
              </h3>
              {editedImage && (
                 <button onClick={downloadImage} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95">
                  <Download className="w-4 h-4" /> Descargar
                </button>
              )}
            </div>
            
            <div className="flex-1 overflow-hidden pr-2 custom-scrollbar flex items-center justify-center relative">
               {editedImage ? (
                 <div className="relative w-full h-full flex items-center justify-center p-4">
                    <canvas 
                      ref={canvasRef} 
                      className={`max-w-full max-h-full object-contain bg-slate-900 rounded-lg border border-slate-700 ${isCropping ? 'cursor-crosshair' : ''}`}
                      onMouseDown={onMouseDown}
                      onMouseMove={onMouseMove}
                      onMouseUp={onMouseUp}
                    />
                 </div>
               ) : (
                 <div className="h-full flex flex-col items-center justify-center text-slate-600 min-h-[500px] border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/10">
                   {loading ? (
                     <div className="text-center space-y-4">
                        <div className="relative">
                          <LoaderIcon className="w-16 h-16 text-indigo-500 animate-spin mx-auto opacity-20" />
                          <Wand2 className="w-6 h-6 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
                        </div>
                        <p className="text-slate-400 animate-pulse font-medium">Aplicando transformaciones...</p>
                        <p className="text-slate-600 text-xs">Ajustando redimensionado, recorte y calidad...</p>
                     </div>
                   ) : (
                     <div className="text-center space-y-4 opacity-20">
                        <ImageIcon className="w-20 h-20 mx-auto" />
                        <p className="text-xl font-medium">Previsualización de Edición</p>
                        <p className="text-sm max-w-xs mx-auto">Sube una imagen para empezar a editarla y optimizarla.</p>
                     </div>
                   )}
                 </div>
               )}
            </div>
             {editedImage && (
                <div className="flex justify-center gap-4 mt-6">
                  <button 
                    onClick={() => handleShare('facebook', editedImage)}
                    className="p-3 bg-blue-600 hover:bg-blue-500 rounded-full text-white transition-all shadow-lg"
                    title="Compartir en Facebook"
                  >
                    <Facebook className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleShare('instagram', editedImage)}
                    className="p-3 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 hover:from-yellow-300 hover:via-pink-400 hover:to-purple-500 rounded-full text-white transition-all shadow-lg"
                    title="Compartir en Instagram"
                  >
                    <Instagram className="w-5 h-5" />
                  </button>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};