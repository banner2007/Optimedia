
import React from 'react';
import { AppMode } from '../types';
import { Image, ImagePlus, ScanSearch, Settings2, History, LayoutTemplate } from 'lucide-react';

interface SidebarProps {
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentMode, onModeChange }) => {
  const navItems = [
    { mode: AppMode.ANALYZE, label: 'Analizar', icon: ScanSearch, desc: 'Entender y Etiquetar' },
    { mode: AppMode.GENERATE, label: 'Generar', icon: ImagePlus, desc: 'Crear Arte Nuevo' },
    { mode: AppMode.EDIT, label: 'Editar y Optimizar', icon: Settings2, desc: 'Refinar y Convertir' },
    { mode: AppMode.LANDING, label: 'Landing/Banners', icon: LayoutTemplate, desc: 'Generador Ecommerce' },
    { mode: AppMode.HISTORY, label: 'Historial', icon: History, desc: 'Tus Creaciones' },
  ];

  return (
    <div className="w-20 md:w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col items-center md:items-stretch py-6 space-y-2">
      <div className="px-4 mb-8 flex items-center justify-center md:justify-start space-x-3">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
          <Image className="text-white w-5 h-5" />
        </div>
        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400 hidden md:block">
          OptiMedia
        </span>
      </div>

      {navItems.map((item) => {
        const isActive = currentMode === item.mode;
        return (
          <button
            key={item.mode}
            onClick={() => onModeChange(item.mode)}
            className={`w-full px-4 py-3 flex items-center space-x-3 transition-colors relative
              ${isActive ? 'text-indigo-400 bg-slate-800/50' : 'text-slate-400 hover:text-indigo-300 hover:bg-slate-800/30'}
            `}
          >
            {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r-full" />}
            <item.icon className={`w-6 h-6 ${isActive ? 'text-indigo-400' : ''}`} />
            <div className="flex-col items-start hidden md:flex">
              <span className={`text-sm font-medium ${isActive ? 'text-white' : ''}`}>{item.label}</span>
              <span className="text-xs text-slate-500">{item.desc}</span>
            </div>
          </button>
        );
      })}

      <div className="mt-auto px-4">
        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 hidden md:block">
          <h3 className="text-xs font-semibold text-slate-300 mb-1">Personal Studio</h3>
          <p className="text-[10px] text-slate-500">Mínimo costo, máxima potencia.</p>
        </div>
      </div>
    </div>
  );
};
