
// @google/genai Gemini Service for OptiMedia Studio
import { GoogleGenAI } from "@google/genai";
import { AspectRatio, ImageSize, GeneratedImage } from "../types";

const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const handleApiError = async (error: any) => {
  console.error("Gemini API Error:", error);
  if (error?.message?.includes("Requested entity was not found.") && window.aistudio) {
    await window.aistudio.openSelectKey();
    throw new Error("Clave de API no válida o proyecto no encontrado.");
  }
  throw error;
};

export const analyzeImage = async (base64Data: string, mimeType: string, prompt: string) => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: prompt || "Analiza esta imagen para uso web/social media." }
        ]
      },
      config: {
        thinkingConfig: { thinkingBudget: 512 } 
      }
    });
    return response.text || "No se generó ningún análisis.";
  } catch (error) {
    return handleApiError(error);
  }
};

export const generatePaletteFromContext = async (
  productBase64: string,
  productMime: string,
  productInfo: string
) => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: productMime, data: productBase64 } },
          { text: `Based on this product and info: "${productInfo}", provide a professional marketing color palette. 
          Return ONLY a JSON array of 5 hex codes. Example: ["#FFFFFF", "#000000", ...]` }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });
    
    const text = response.text || "[]";
    return JSON.parse(text) as string[];
  } catch (error) {
    console.warn("No se pudo generar paleta automática, usando default.");
    return ["#4F46E5", "#06B6D4", "#1E293B", "#F8FAFC", "#6366F1"];
  }
};

export const generateImage = async (
  prompt: string,
  aspectRatio: AspectRatio,
  size: ImageSize
) => {
  try {
    const ai = getAIClient();
    const model = (size === ImageSize.SIZE_2K || size === ImageSize.SIZE_4K) 
      ? 'gemini-3-pro-image-preview' 
      : 'gemini-2.5-flash-image';
    
    const imageSizeConfig = size === ImageSize.SIZE_4K ? "4K" : size === ImageSize.SIZE_2K ? "2K" : "1K";

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any,
          ...(model === 'gemini-3-pro-image-preview' ? { imageSize: imageSizeConfig } : {})
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return {
          url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
          mimeType: part.inlineData.mimeType
        };
      }
    }
    throw new Error("No se generó ninguna imagen.");
  } catch (error) {
    return handleApiError(error);
  }
};

export const editImage = async (
  sourceBase64: string,
  sourceMime: string,
  prompt: string,
  variantCount: number,
  size: ImageSize,
  ratios: AspectRatio[],
  brandLogo: { data: string, mime: string } | null,
  websiteUrl: string
): Promise<GeneratedImage[]> => {
  try {
    const ai = getAIClient();
    const results: GeneratedImage[] = [];
    const model = (size === ImageSize.SIZE_2K || size === ImageSize.SIZE_4K) 
      ? 'gemini-3-pro-image-preview' 
      : 'gemini-2.5-flash-image';
    const imageSizeConfig = size === ImageSize.SIZE_4K ? "4K" : size === ImageSize.SIZE_2K ? "2K" : "1K";
    const ratio = ratios[0] || AspectRatio.SQUARE_1_1;

    for (let i = 0; i < variantCount; i++) {
      const parts: any[] = [{ inlineData: { mimeType: sourceMime, data: sourceBase64 } }];
      if (brandLogo) parts.push({ inlineData: { mimeType: brandLogo.mime, data: brandLogo.data } });
      
      let finalPrompt = `${prompt}. Ensure a high-end commercial aesthetic.`;
      if (brandLogo) finalPrompt += " Seamlessly integrate the brand logo into a natural position in the scene.";
      if (websiteUrl) finalPrompt += ` Match the visual mood of ${websiteUrl}.`;
      parts.push({ text: finalPrompt });

      const response = await ai.models.generateContent({
        model,
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: ratio as any,
            ...(model === 'gemini-3-pro-image-preview' ? { imageSize: imageSizeConfig } : {})
          }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          results.push({
            url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
            mimeType: part.inlineData.mimeType
          });
          break;
        }
      }
    }
    return results;
  } catch (error) {
    return handleApiError(error);
  }
};

export const generateLandingBanner = async (
  productBase64: string,
  productMime: string,
  styleBase64: string | null,
  styleMime: string | null,
  headline: string,
  offer: string,
  cta: string,
  aspectRatio: AspectRatio,
  productInfo: string = "",
  palette: string[] = [],
  brandLogo: { data: string, mime: string } | null = null
) => {
  try {
    const ai = getAIClient();
    const parts: any[] = [{ inlineData: { mimeType: productMime, data: productBase64 } }];
    if (styleBase64) parts.push({ inlineData: { mimeType: styleMime, data: styleBase64 } });
    if (brandLogo) parts.push({ inlineData: { mimeType: brandLogo.mime, data: brandLogo.data } });

    const paletteStr = palette.length > 0 ? `Color Theme: ${palette.join(', ')}.` : '';

    // PROMPT DE MARKETING AVANZADO
    const marketingPrompt = `Task: Create an IRRESISTIBLE and CONVINCING high-conversion advertising banner.
    
    PRODUCT ANALYSIS FROM PROVIDED INFO:
    "${productInfo}"
    
    SCENE REQUIREMENTS:
    1. VISUAL STORYTELLING: Do not just show the product. Based on the product info, create a scene that solves a problem or fulfils a dream. 
       - If the info implies 'Energy', use dynamic lighting and motion blur.
       - If it implies 'Luxury', use rich bokeh, golden hour lighting, and premium textures.
       - If it's 'Tech', use clean, futuristic, and sharp laboratory-style lighting.
    2. EMOTIONAL IMPACT: The lighting, background, and props must make the viewer feel the benefits of the product described in the text.
    3. BRAND INTEGRATION: ${brandLogo ? 'Expertly place the provided brand logo to look like a high-budget professional campaign.' : 'Maintain a clean, high-end professional look.'}
    4. COLOR PSYCHOLOGY: ${paletteStr} Use these colors to influence mood and legibility.
    
    OVERLAY TEXT (Render professionally within the image):
    - Headline: "${headline}" (Bold, high-impact typography)
    - Offer: "${offer}" (Secondary focus, elegant)
    - CTA Button: "${cta}" (Vibrant, high-contrast, looks clickable)
    
    STYLE: Modern high-end photography. If a style reference image is provided, blend its soul and aesthetic with the new composition, but make the result UNIQUE and IRRESISTIBLE.`;

    parts.push({ text: marketingPrompt });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: {
        imageConfig: { aspectRatio: aspectRatio as any }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return {
          url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
          mimeType: part.inlineData.mimeType
        };
      }
    }
    throw new Error("No se pudo generar el banner.");
  } catch (error) {
    return handleApiError(error);
  }
};
