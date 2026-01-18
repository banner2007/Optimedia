import React, { useCallback } from 'react';
import { Upload } from 'lucide-react';

interface ImageUploadProps {
  onImageSelected: (base64: string, mimeType: string) => void;
  label?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ onImageSelected, label = "Subir Imagen" }) => {
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Extract base64 data and mime type
        // result format: "data:image/jpeg;base64,/9j/4AAQ..."
        const match = result.match(/^data:(.+);base64,(.+)$/);
        if (match) {
          const mimeType = match[1];
          const base64Data = match[2];
          onImageSelected(base64Data, mimeType);
        }
      };
      reader.readAsDataURL(file);
    }
  }, [onImageSelected]);

  return (
    <div className="w-full">
      <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer hover:bg-slate-800 border-slate-600 hover:border-indigo-500 transition-all group">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <Upload className="w-10 h-10 mb-3 text-slate-400 group-hover:text-indigo-400" />
          <p className="mb-2 text-sm text-slate-400 group-hover:text-indigo-300">
            <span className="font-semibold">{label}</span>
          </p>
          <p className="text-xs text-slate-500">SVG, PNG, JPG o WEBP</p>
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