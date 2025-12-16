import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini AI client
// Note: In a real production app, ensure API_KEY is set in environment variables
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateArtistBio = async (artistName: string, genre: string): Promise<string> => {
  try {
    if (!process.env.API_KEY) return "AI Service Unavailable: Missing API Key";

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Write a short, engaging artist biography (max 100 words) for a musician named "${artistName}" who produces "${genre}" music. The tone should be futuristic and professional.`,
    });
    return response.text || "No bio generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Failed to generate bio.";
  }
};

export const suggestReleaseTitles = async (genre: string, mood: string): Promise<string[]> => {
  try {
    if (!process.env.API_KEY) return ["Error: No API Key"];

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Suggest 5 cool, futuristic album titles for a ${mood} ${genre} album. Return ONLY a JSON array of strings.`,
        config: {
            responseMimeType: "application/json"
        }
    });

    const text = response.text;
    if (text) {
        return JSON.parse(text);
    }
    return [];
  } catch (error) {
    console.error("Gemini API Error:", error);
    return [];
  }
};
