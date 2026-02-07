
/**
 * Service to interact with Runware.ai API
 */
export const generateRunwareReferenceSheet = async (prompt: string, apiKey: string): Promise<string> => {
  const fullPrompt = `A high-quality professional 3D character design reference sheet of ${prompt}. 
  Strict horizontally-aligned 4-view orthographic layout showing: Front, Back, Left, Right views. 
  White background, clean lines, minimalist aesthetic. Precisely aligned heads and feet across views.`;

  try {
    const response = await fetch("https://api.runware.ai/v1", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        {
          action: "image_inference",
          model: "runware:100@1", // Using Flux or high-quality default
          prompt: fullPrompt,
          negativePrompt: "low quality, blurry, distorted, 3d render, shading, shadows, complex background",
          numberResults: 1,
          width: 1024,
          height: 576,
          apiKey: apiKey
        }
      ]),
    });

    const result = await response.json();
    
    if (result.error) {
      throw new Error(result.error.message || "Runware API Error");
    }

    if (result.data && result.data[0] && result.data[0].imageURL) {
      return result.data[0].imageURL;
    }

    throw new Error("No image returned from Runware.");
  } catch (error: any) {
    console.error("Runware Generation Failed:", error);
    throw new Error(error.message || "Failed to generate image with Runware.");
  }
};
