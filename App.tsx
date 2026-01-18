
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { AnalyzeView } from './views/AnalyzeView';
import { GenerateView } from './views/GenerateView';
import { EditView } from './views/EditView';
import { HistoryView } from './views/HistoryView';
import { AppMode } from './types';
import { Key, ShieldAlert, ExternalLink, ArrowRight } from 'lucide-react';

const ApiKeyGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } else {
        setHasKey(true); 
      }
    };
    checkKey();
  }, []);

  const handleOpenKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  if (hasKey === null) return null;

  if (!hasKey) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
            <Key className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-center mb-2">Configuración de Gemini</h1>
          <p className="text-slate-400 text-center mb-8 text-sm">
            Para disfrutar de la velocidad de <span className="text-indigo-300 font-mono">Gemini 3 Flash</span>, selecciona tu clave de API de un proyecto con facturación habilitada.
          </p>
          
          <div className="space-y-4">
            <button
              onClick={handleOpenKey}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 group"
            >
              Seleccionar API Key
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noreferrer"
              className="w-full py-3 border border-slate-700 hover:bg-slate-800 rounded-xl text-slate-400 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
            >
              Documentación de Facturación
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          
          <p className="mt-8 text-[10px] text-slate-500 text-center uppercase tracking-widest font-bold">
            OptiMedia Studio • Powered by Gemini 3 Flash
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.ANALYZE);

  return (
    <ApiKeyGuard>
      <div className="flex h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">
        <Sidebar currentMode={mode} onModeChange={setMode} />
        
        <main className="flex-1 overflow-auto relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/10 via-slate-900/0 to-slate-900/0 pointer-events-none" />
          
          <div className="relative z-10 h-full">
            {mode === AppMode.ANALYZE && <AnalyzeView />}
            {mode === AppMode.GENERATE && <GenerateView />}
            {mode === AppMode.EDIT && <EditView />}
            {mode === AppMode.HISTORY && <HistoryView />}
          </div>
        </main>
      </div>
    </ApiKeyGuard>
  );
}

export default App;
