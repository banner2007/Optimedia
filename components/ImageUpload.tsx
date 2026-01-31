
import React, { useCallback } from 'react';
import { Upload, AlertCircle } from 'lucide-react';

interface ImageUploadProps {
  onImageSelected: (base64: string, mimeType: string) => void;
  label?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ onImageSelected, label = "Subir Imagen" }) => {
  
  const processImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Crear un canvas para normalizar la imagen a PNG
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Opcional: Redimensionar si es extremadamente grande para ahorrar tokens/ancho de banda
        const MAX_SIZE = 2048;
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // Dibujar la imagen en el canvas
          ctx.drawImage(img, 0, 0, width, height);
          
          // Exportar siempre como image/png (formato universalmente aceptado por Gemini)
          const dataUrl = canvas.toDataURL('image/png');
          const base64Data = dataUrl.split(',')[1];
          onImageSelected(base64Data, 'image/png');
        }
      };
      img.onerror = () => {
        console.error("Error al cargar la imagen para procesamiento.");
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processImage(file);
    }
  }, [onImageSelected]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="w-full">
      <label 
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer hover:bg-slate-800 border-slate-600 hover:border-indigo-500 transition-all group"
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <Upload className="w-10 h-10 mb-3 text-slate-400 group-hover:text-indigo-400" />
          <p className="mb-2 text-sm text-slate-400 group-hover:text-indigo-300">
            <span className="font-semibold">{label}</span>
          </p>
          <p className="text-xs text-slate-500">PNG, JPG, WEBP, AVIF (Autoconvertido)</p>
        </div>
        <input 
          type="file" 
          className="hidden" 
          accept="image/*" 
          onChange={handleFileChange}
        />
      </label>
    </div>
  );
};
