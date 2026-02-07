
import { GoogleGenAI, Type } from "@google/genai";
import { Primitive3D, ModelData, ArtisticStyle } from "../types";

/**
 * Generates an orthographic reference sheet for a character/object
 */
export const generateReferenceSheet = async (prompt: string, customApiKey?: string): Promise<string> => {
  // Use custom key if provided, otherwise fall back to environment key
  // Use custom key if provided, otherwise fall back to environment key
  const apiKey = customApiKey || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("API Key not found. Please set it in Settings.");

  const ai = new GoogleGenAI({ apiKey });

  const fullPrompt = `A high-quality professional 3D character design reference sheet of ${prompt}. 
  Strict horizontally-aligned 4-view orthographic layout showing: Front, Back, Left, Right views. 
  White background, clean lines, minimalist aesthetic, suitable for 3D modeling. 
  The character should be in a neutral T-pose or A-pose. 
  Views must be precisely aligned horizontally so the head and feet levels match across all views.`;

  const response = await ai.models.generateContent({
    model: 'imagen-3.0-generate-001',
    contents: {
      parts: [{ text: fullPrompt }]
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9"
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("Failed to generate reference image.");
};

/**
 * Uses spatial reasoning to convert a concept into a manifold 3D volume (Primitives)
 */
export const reconstruct3DVolume = async (prompt: string, imageBase64?: string, style: ArtisticStyle = 'STANDARD', customApiKey?: string): Promise<ModelData> => {
  const apiKey = customApiKey || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("API Key not found. Please set it in Settings.");

  const ai = new GoogleGenAI({ apiKey });

  let styleInstruction = "";
  switch (style) {
    case 'LOW_POLY':
      styleInstruction = "Use a Low Poly aesthetic. Favor 'BOX' primitives and faceted shapes. Avoid smooth curves. Ensure geometry looks like a 90s video game asset.";
      break;
    case 'ORGANIC':
      styleInstruction = "Use an Organic aesthetic. Favor 'SPHERE' and 'CAPSULE' primitives. Ensure smooth transitions between body parts. Avoid sharp corners.";
      break;
    case 'VOXEL':
      styleInstruction = "Use a Voxel aesthetic. All primitives should be 'BOX' types and ideally aligned to a loose grid. It should look like it's built from digital blocks.";
      break;
    case 'INDUSTRIAL':
      styleInstruction = "Use an Industrial aesthetic. Favor 'CYLINDER' and 'BOX' primitives. Focus on mechanical joints, piston-like limbs, and blocky structural components.";
      break;
    default:
      styleInstruction = "Use a standard professional 3D sculpting aesthetic. Balance primitive types to best represent the provided 2D concept.";
  }

  const systemInstruction = `You are a high-precision 3D Neural Sculptor. 
  Your task is to take a 2D design and decompose it into a set of basic 3D primitives (BOX, SPHERE, CAPSULE, CYLINDER). 
  ${styleInstruction}
  These primitives MUST overlap and intersect to form a single, solid, manifold volume suitable for 3D printing.
  Position (x,y,z) ranges from -5 to 5. 
  Scales should be realistic relative to each other.
  Use as many primitives as needed (up to 30) to capture the form.
  
  Format the response as a valid JSON object matching the provided schema.`;

  const userPrompt = `Deconstruct this character design into 3D primitives in the ${style} style: ${prompt}. 
  Focus on the main torso, limbs, head, and key features. 
  Ensure the parts are connected.`;

  const parts: any[] = [{ text: userPrompt }];
  if (imageBase64) {
    const data = imageBase64.split(',')[1];
    parts.push({
      inlineData: {
        mimeType: 'image/png',
        data: data
      }
    });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-1.5-pro',
    contents: { parts },
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          primitives: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, description: 'BOX, SPHERE, CAPSULE, or CYLINDER' },
                position: {
                  type: Type.ARRAY,
                  items: { type: Type.NUMBER },
                  description: '[x, y, z]'
                },
                rotation: {
                  type: Type.ARRAY,
                  items: { type: Type.NUMBER },
                  description: '[x, y, z] in radians'
                },
                scale: {
                  type: Type.ARRAY,
                  items: { type: Type.NUMBER },
                  description: '[x, y, z]'
                },
                color: { type: Type.STRING, description: 'Hex color' }
              },
              required: ['type', 'position', 'rotation', 'scale']
            }
          }
        },
        required: ['name', 'description', 'primitives']
      }
    }
  });

  const text = response.text || '{}';
  return JSON.parse(text) as ModelData;
};

/**
 * Refines an existing 3D model based on feedback
 */
export const refine3DVolume = async (currentModel: ModelData, feedback: string, style: ArtisticStyle, customApiKey?: string): Promise<ModelData> => {
  const apiKey = customApiKey || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("API Key not found. Please set it in Settings.");

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `You are a 3D Neural Sculptor refining an existing primitive-based model.
  You are given a list of primitives and user feedback. 
  Modify, add, or remove primitives to satisfy the feedback while maintaining the overall ${style} style.
  Ensure the model remains manifold and solid for 3D printing.
  Position (x,y,z) ranges from -5 to 5.
  
  Format the response as a valid JSON object.`;

  const userPrompt = `Current Model Primitives: ${JSON.stringify(currentModel.primitives)}
  
  User Feedback: "${feedback}"
  
  Please provide the updated list of primitives to satisfy this feedback.`;

  const response = await ai.models.generateContent({
    model: 'gemini-1.5-pro',
    contents: { parts: [{ text: userPrompt }] },
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          primitives: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                position: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                rotation: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                scale: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                color: { type: Type.STRING }
              },
              required: ['type', 'position', 'rotation', 'scale']
            }
          }
        },
        required: ['name', 'description', 'primitives']
      }
    }
  });

  const text = response.text || '{}';
  return JSON.parse(text) as ModelData;
};
