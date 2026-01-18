export enum AppMode {
  ANALYZE = 'ANALYZE',
  EDIT = 'EDIT',
  HISTORY = 'HISTORY',
}

export enum AspectRatio {
  SQUARE_1_1 = '1:1',
  PORTRAIT_3_4 = '3:4',
  LANDSCAPE_4_3 = '4:3',
  PORTRAIT_9_16 = '9:16',
  LANDSCAPE_16_9 = '16:9',
  PORTRAIT_2_3 = '2:3', 
  LANDSCAPE_3_2 = '3:2',
  CINEMATIC_21_9 = '21:9',
}

// ImageSize se elimina ya que el redimensionamiento ahora será personalizado en la vista de edición.
// export enum ImageSize {
//   SIZE_1K = '1K',
//   SIZE_2K = '2K',
//   SIZE_4K = '4K',
// }

export interface GeneratedImage {
  url: string;
  mimeType: string;
}

export interface SavedItem {
  id: string;
  type: 'EDIT' | 'ANALYZE'; // Se elimina 'GENERATE'
  imageUrl: string;
  prompt: string; // Esto podría convertirse en 'notes' o 'description' en el futuro
  timestamp: any;
  config?: {
    // Los campos de configuración se adaptarán a las nuevas funcionalidades de edición
    width?: number;
    height?: number;
    format?: string;
    quality?: number;
    ratio?: string;
  };
}

// AIStudio global interface se elimina ya que la app no requiere API Key
// declare global {
//   interface AIStudio {
//     hasSelectedApiKey: () => Promise<boolean>;
//     openSelectKey: () => Promise<void>;
//   }

//   interface Window {
//     aistudio?: AIStudio;
//   }
// }