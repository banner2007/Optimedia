
import { GoogleGenAI } from "@google/genai";
import { AspectRatio, ImageSize } from "../types";

/**
 * Re-initiates the API client to ensure it uses the most current API_KEY.
 */
const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Resets key selection if a specific error occurs.
 */
const handleApiError = async (error: any) => {
  console.error("Gemini API Error:", error);
  if (error?.message?.includes("Requested entity was not found.") && window.aistudio) {
    await window.aistudio.openSelectKey();
    throw new Error("Clave de API no válida o proyecto no encontrado. Por favor, selecciona una clave de un proyecto con facturación.");
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
          { text: prompt || "Analiza esta imagen en detalle. Describe el contenido, estilo y uso potencial para web o redes sociales." }
        ]
      },
      config: {
        // Flash supports thinking but we keep budget balanced for speed
        thinkingConfig: { thinkingBudget: 2000 }
      }
    });
    return response.text || "No se generó ningún análisis.";
  } catch (error) {
    return handleApiError(error);
  }
};

export const generateImage = async (
  prompt: string,
  aspectRatio: AspectRatio,
  size: ImageSize
) => {
  try {
    const ai = getAIClient();
    let apiRatio = aspectRatio;
    if (aspectRatio === AspectRatio.PORTRAIT_2_3) apiRatio = AspectRatio.PORTRAIT_3_4;
    if (aspectRatio === AspectRatio.LANDSCAPE_3_2) apiRatio = AspectRatio.LANDSCAPE_4_3;
    if (aspectRatio === AspectRatio.CINEMATIC_21_9) apiRatio = AspectRatio.LANDSCAPE_16_9;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: apiRatio as any,
          // imageSize is only for Pro models, omitting for Flash
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
    throw new Error("No se generó ninguna imagen en la respuesta.");
  } catch (error) {
    return handleApiError(error);
  }
};

export const editImage = async (
  base64Data: string,
  mimeType: string,
  prompt: string,
  count: number = 4,
  size: ImageSize = ImageSize.SIZE_1K,
  aspectRatios: AspectRatio[] = [AspectRatio.SQUARE_1_1],
  brandLogo: { data: string; mime: string } | null = null,
  websiteUrl: string = ""
) => {
  const generateVariation = async (targetRatio: AspectRatio) => {
    try {
      const ai = getAIClient();
      let apiRatio = targetRatio;
      if (targetRatio === AspectRatio.PORTRAIT_2_3) apiRatio = AspectRatio.PORTRAIT_3_4;
      if (targetRatio === AspectRatio.LANDSCAPE_3_2) apiRatio = AspectRatio.LANDSCAPE_4_3;
      if (targetRatio === AspectRatio.CINEMATIC_21_9) apiRatio = AspectRatio.LANDSCAPE_16_9;

      const parts: any[] = [
        { inlineData: { mimeType, data: base64Data } }
      ];

      let finalPrompt = "";
      
      if (websiteUrl) {
        finalPrompt = `OBJETIVO: Crear un diseño optimizado basado en el branding de ${websiteUrl}.\n`;
        finalPrompt += `INSTRUCCIONES: Integra el estilo visual del sitio. Si es un anuncio, incluye un Call to Action claro.\n`;
      }

      if (brandLogo) {
        parts.push({ inlineData: { mimeType: brandLogo.mime, data: brandLogo.data } });
        finalPrompt += `\nESTILO DE MARCA: Usa los colores y estética del logo adjunto. Integra el logo de forma natural y equilibrada en la composición final.`;
      }

      finalPrompt += `\nINSTRUCCIÓN DE EDICIÓN: ${prompt}`;
      
      parts.push({ text: finalPrompt });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: apiRatio as any
          }
          // tools like googleSearch are only for Pro image models
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
      return null;
    } catch (error) {
      console.warn("Error en generación de variante", error);
      return null;
    }
  };

  const promises = Array(count).fill(null).map((_, index) => {
    const ratioToUse = aspectRatios[index % aspectRatios.length];
    return generateVariation(ratioToUse);
  });
  
  const results = await Promise.all(promises);
  const validImages = results.filter((img): img is { url: string; mimeType: string } => img !== null);

  if (validImages.length === 0) {
    throw new Error("No se pudieron generar las variantes.");
  }

  return validImages;
};
