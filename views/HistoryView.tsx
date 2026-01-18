
import React, { useEffect, useState } from 'react';
import { getHistory } from '../services/persistenceService';
import { SavedItem } from '../types';
import { History, Download, Calendar, ExternalLink, Loader2, RefreshCcw, Info } from 'lucide-react';

export const HistoryView: React.FC = () => {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await getHistory();
      setItems(data);
    } catch (err) {
      console.error("Error loading history:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (ts: any) => {
    if (!ts) return "Fecha desconocida";
    const date = new Date(ts);
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto p-6 space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-400" />
            Historial de Proyectos
          </h2>
          <p className="text-slate-400 mt-1">Tus creaciones guardadas localmente con respaldo de imágenes en Storage.</p>
        </div>
        <button 
          onClick={loadHistory}
          disabled={loading}
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all border border-slate-700"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
          Actualizar
        </button>
      </header>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
          <p className="animate-pulse">Cargando historial local...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-slate-800/20 rounded-3xl border border-dashed border-slate-700">
          <History className="w-16 h-16 mb-4 opacity-10" />
          <p className="text-lg font-medium text-slate-400">Sin proyectos guardados</p>
          <p className="text-sm text-slate-500">Tus creaciones aparecerán aquí cuando las guardes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => (
            <div key={item.id} className="group bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden flex flex-col hover:border-indigo-500/50 transition-all shadow-sm hover:shadow-xl hover:shadow-indigo-500/5">
              <div className="relative aspect-square bg-slate-900 overflow-hidden">
                <img 
                  src={item.imageUrl} 
                  alt={item.prompt} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute top-3 left-3">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold text-white shadow-lg ${
                    item.type === 'GENERATE' ? 'bg-indigo-600' : 
                    item.type === 'EDIT' ? 'bg-emerald-600' : 'bg-amber-600'
                  }`}>
                    {item.type}
                  </span>
                </div>
                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-[2px]">
                  <a 
                    href={item.imageUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="p-3 bg-indigo-600 rounded-full text-white hover:bg-indigo-500 transition-all hover:scale-110 shadow-lg"
                    title="Ver original"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                  <button 
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = item.imageUrl;
                      link.download = `optimedia-${item.id}.png`;
                      link.click();
                    }}
                    className="p-3 bg-slate-800 rounded-full text-white hover:bg-slate-700 transition-all hover:scale-110 shadow-lg"
                    title="Descargar"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center gap-2 text-slate-500 text-[10px] mb-3 font-medium uppercase tracking-wider">
                  <Calendar className="w-3 h-3" />
                  {formatDate(item.timestamp)}
                </div>
                <p className="text-xs text-slate-300 line-clamp-2 mb-4 italic leading-relaxed">
                  "{item.prompt}"
                </p>
                
                <div className="mt-auto pt-4 border-t border-slate-700/50 flex justify-between items-center">
                  <div className="flex gap-2">
                    {item.config?.size && (
                      <span className="text-[10px] bg-slate-700/50 px-2 py-0.5 rounded text-slate-400 border border-slate-600">
                        {item.config.size}
                      </span>
                    )}
                    {item.config?.ratio && (
                      <span className="text-[10px] bg-slate-700/50 px-2 py-0.5 rounded text-slate-400 border border-slate-600">
                        {item.config.ratio}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-8 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl max-w-md">
        <div className="flex gap-3 text-left">
          <Info className="w-5 h-5 text-indigo-400 flex-shrink-0" />
          <p className="text-[11px] text-slate-400 leading-normal">
            Los datos se guardan en el almacenamiento local de este navegador. Las imágenes se alojan en Firebase Storage para garantizar su persistencia.
          </p>
        </div>
      </div>
    </div>
  );
};
