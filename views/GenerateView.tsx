import React, { useState } from 'react';
import { AspectRatio, ImageSize } from '../types';
import { generateImage } from '../services/geminiService';
import { saveWork } from '../services/persistenceService';
import { Sparkles, Download, AlertCircle, CloudUpload, CheckCircle } from 'lucide-react';

export const GenerateView: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [ratio, setRatio] = useState<AspectRatio>(AspectRatio.SQUARE_1_1);
  const [size, setSize] = useState<ImageSize>(ImageSize.SIZE_1K);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const result = await generateImage(prompt, ratio, size);
      setResultImage(result.url);
    } catch (err: any) {
      setError(err.message || "Error al generar la imagen");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToCloud = async () => {
    if (!resultImage || saving) return;
    setSaving(true);
    try {
      await saveWork('GENERATE', resultImage, prompt, { size, ratio });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError("Error al guardar en Firebase");
    } finally {
      setSaving(false);
    }
  };

  const downloadImage = () => {
    if (resultImage) {
      const link = document.createElement('a');
      link.href = resultImage;
      link.download = `generated-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto p-6 space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-indigo-400" />
          Generar Imagen
        </h2>
        <p className="text-slate-400 mt-1">Crea visuales impresionantes con Gemini 3.0 Pro.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-0">
        <div className="lg:col-span-1 space-y-6 bg-slate-800/50 p-6 rounded-2xl border border-slate-700 h-fit">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Prompt (Instrucción)</label>
            <textarea
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none h-32"
              placeholder="Una ciudad futurista..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Relación de Aspecto</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(AspectRatio).map((ar) => (
                <button
                  key={ar}
                  onClick={() => setRatio(ar)}
                  className={`px-3 py-2 rounded-lg text-sm border transition-all ${
                    ratio === ar
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {ar}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Tamaño</label>
            <div className="flex space-x-2">
              {Object.values(ImageSize).map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-all ${
                    size === s
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !prompt}
            className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 ${
              loading || !prompt ? 'bg-slate-700 text-slate-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Sparkles className="w-5 h-5" />}
            <span>{loading ? 'Generando...' : 'Generar'}</span>
          </button>

          {resultImage && (
            <button
              onClick={handleSaveToCloud}
              disabled={saving}
              className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-all ${
                saved 
                  ? 'bg-emerald-600/20 border border-emerald-500 text-emerald-400' 
                  : saving 
                    ? 'bg-slate-700 text-slate-500' 
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-100'
              }`}
            >
              {saving ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500"></div> : saved ? <CheckCircle className="w-5 h-5" /> : <CloudUpload className="w-5 h-5" />}
              <span>{saving ? 'Guardando...' : saved ? 'Guardado en Nube' : 'Guardar en Historial'}</span>
            </button>
          )}

          {error && (
             <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-start gap-2">
               <AlertCircle className="w-4 h-4 mt-0.5" />
               <p>{error}</p>
             </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-center relative overflow-hidden group">
          {resultImage ? (
            <>
              <img src={resultImage} alt="Generated" className="max-w-full max-h-full object-contain" />
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={downloadImage} className="bg-slate-900/80 backdrop-blur text-white p-3 rounded-full hover:bg-indigo-600 transition-colors">
                  <Download className="w-6 h-6" />
                </button>
              </div>
            </>
          ) : (
            <div className="text-center text-slate-500">
              <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>Ajusta los parámetros y genera una obra maestra.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};