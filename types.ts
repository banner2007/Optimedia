export enum AppMode {
  ANALYZE = 'ANALYZE',
  GENERATE = 'GENERATE',
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

export enum ImageSize {
  SIZE_1K = '1K',
  SIZE_2K = '2K',
  SIZE_4K = '4K',
}

export interface GeneratedImage {
  url: string;
  mimeType: string;
}

export interface SavedItem {
  id: string;
  type: 'GENERATE' | 'EDIT' | 'ANALYZE';
  imageUrl: string;
  prompt: string;
  timestamp: any;
  config?: {
    size?: string;
    ratio?: string;
  };
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}