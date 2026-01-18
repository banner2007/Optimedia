
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
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: prompt || "Analiza esta imagen en detalle. Describe el contenido, estilo y uso potencial para web o redes sociales." }
        ]
      },
      config: {
        thinkingConfig: { thinkingBudget: 4000 }
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
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: apiRatio as any,
          imageSize: size
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
        finalPrompt = `OBJETIVO: Crear un anuncio visual de alto impacto basado en este sitio web: ${websiteUrl}.\n`;
        finalPrompt += `INSTRUCCIONES DE DISEÑO:\n1. INVESTIGACIÓN: Busca el producto principal y su PRECIO real.\n2. ELEMENTOS: Incluye un HOOK, el PRECIO y un CTA ('¡Compra Ahora!').\n3. ESTILO: Adapta el branding al sitio web proporcionado.\n`;
      }

      if (brandLogo) {
        parts.push({ inlineData: { mimeType: brandLogo.mime, data: brandLogo.data } });
        finalPrompt += `\nESTILO DE MARCA REQUERIDO:
        1. PALETA DE COLORES: Extrae los colores exactos del icono/logo adjunto y aplícalos en toda la imagen (fondos, textos, elementos decorativos).
        2. INTEGRACIÓN DEL LOGO: Puedes colocar el logo gráficamente en la composición si mejora el diseño. 
        3. REGLA CRÍTICA: El logo NO debe repetirse. Solo una instancia clara por imagen. No modifiques sus colores ni formas originales.`;
      }

      finalPrompt += `\nINSTRUCCIÓN ADICIONAL DEL USUARIO: ${prompt}`;
      
      parts.push({ text: finalPrompt });

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts },
        config: {
          imageConfig: {
            imageSize: size,
            aspectRatio: apiRatio as any
          },
          tools: websiteUrl ? [{ googleSearch: {} }] : []
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
