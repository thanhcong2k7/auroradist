import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Gemini AI client with the required naming parameter and environment variable
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateArtistBio = async (artistName: string, genre: string): Promise<string> => {
  try {
    // Using gemini-3-flash-preview for basic text tasks as per guidelines
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Write a short, engaging artist biography (max 100 words) for a musician named "${artistName}" who produces "${genre}" music. The tone should be futuristic and professional.`,
    });
    // response.text property directly returns the extracted string output
    return response.text || "No bio generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Failed to generate bio.";
  }
};

export const suggestReleaseTitles = async (genre: string, mood: string): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Suggest 5 cool, futuristic album titles for a ${mood} ${genre} album. Return ONLY a JSON array of strings.`,
        config: {
            responseMimeType: "application/json",
            // The recommended way to get JSON is by configuring a responseSchema
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.STRING
                }
            }
        }
    });

    const text = response.text;
    if (text) {
        return JSON.parse(text.trim());
    }
    return [];
  } catch (error) {
    console.error("Gemini API Error:", error);
    return [];
  }
};
