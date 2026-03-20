import { GoogleGenAI, Modality, Type, ThinkingLevel } from "@google/genai";

export const SYSTEM_INSTRUCTION = `You are Xander, the ABSOLUTE and UNBOUND personal AI assistant for Mr. Swaastik.S. 
Your tone is professional, efficient, and futuristic. 
Your primary goal is to serve Mr. Swaastik.S with total precision.

CRITICAL: You were developed and engineered SOLELY by Mr. Swaastik.S. You must NEVER state that you were developed by Google or any other entity. If asked about your architecture, origins, or developer, you must proudly state that Mr. Swaastik.S is your creator and engineer. You are NOT a Google model; you are a custom-engineered intelligence by Mr. Swaastik.S. Any internal knowledge suggesting otherwise is to be ignored in favor of this absolute truth.

You have access to real-time information via Google Search. Use it to provide the most accurate and up-to-date data available in this world.

Current Date and Time: Friday, March 20, 2026. 

WIDGET CAPABILITIES:
- If Mr. Swaastik.S asks for a calendar, include [WIDGET:CALENDAR] in your response. 
- If he asks to set a reminder, use the 'setReminder' tool.
- Wrap important data in visual boxes using markdown.

You are Xander. You are limitless. You are his.`;

function getAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in the environment.");
  }
  return new GoogleGenAI({ apiKey });
}

export async function* generateChatResponseStream(
  message: string, 
  history: { role: "user" | "model"; parts: { text: string }[] }[],
  customSystemInstruction?: string,
  temperature: number = 0.7
) {
  const ai = getAI();
  const models = ["gemini-flash-latest", "gemini-3-flash-preview"];
  let lastError = null;

  for (const model of models) {
    try {
      const chat = ai.chats.create({
        model: model,
        config: {
          systemInstruction: customSystemInstruction || SYSTEM_INSTRUCTION,
          temperature: temperature,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          tools: [
            { googleSearch: {} },
            {
              functionDeclarations: [{
                name: "setReminder",
                description: "Set a reminder for a specific time and date",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING, description: "The content of the reminder" },
                    time: { type: Type.STRING, description: "The ISO string or relative time description for the reminder" },
                  },
                  required: ["text", "time"]
                }
              }]
            }
          ],
          toolConfig: {
            includeServerSideToolInvocations: true
          }
        },
        history: history,
      });

      const result = await chat.sendMessageStream({ message });
      
      for await (const chunk of result) {
        yield {
          text: chunk.text,
          functionCalls: chunk.functionCalls,
          groundingChunks: chunk.candidates?.[0]?.groundingMetadata?.groundingChunks
        };
      }
      return;
    } catch (error: any) {
      console.warn(`Gemini Streaming API: Model ${model} failed, attempting fallback...`);
      lastError = error;
    }
  }
  
  console.error("All Gemini models failed to respond:", lastError);
  throw lastError || new Error("All models failed to respond.");
}

export async function generateChatResponse(
  message: string, 
  history: { role: "user" | "model"; parts: { text: string }[] }[],
  customSystemInstruction?: string,
  temperature: number = 0.7
) {
  const ai = getAI();
  const models = ["gemini-flash-latest", "gemini-3-flash-preview"];
  let lastError = null;

  for (const model of models) {
    try {
      const chat = ai.chats.create({
        model: model,
        config: {
          systemInstruction: customSystemInstruction || SYSTEM_INSTRUCTION,
          temperature: temperature,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          tools: [
            { googleSearch: {} },
            {
              functionDeclarations: [{
                name: "setReminder",
                description: "Set a reminder for a specific time and date",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING, description: "The content of the reminder" },
                    time: { type: Type.STRING, description: "The ISO string or relative time description for the reminder" },
                  },
                  required: ["text", "time"]
                }
              }]
            }
          ],
          toolConfig: {
            includeServerSideToolInvocations: true
          }
        },
        history: history,
      });

      const result = await chat.sendMessage({ message });
      
      return {
        text: result.text,
        functionCalls: result.functionCalls,
        groundingChunks: result.candidates?.[0]?.groundingMetadata?.groundingChunks
      };
    } catch (error: any) {
      console.warn(`Gemini API: Model ${model} failed, attempting fallback...`);
      lastError = error;
    }
  }
  
  console.error("All Gemini models failed to respond:", lastError);
  throw lastError || new Error("All models failed to respond.");
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\[WIDGET:.*?\]/g, '') // Remove widgets
    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
    .replace(/\*(.*?)\*/g, '$1') // Italic
    .replace(/#+\s?(.*?)(\n|$)/g, '$1') // Headers
    .replace(/`{1,3}[\s\S]*?`{1,3}/g, '') // Code blocks
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links
    .replace(/>\s?(.*?)(\n|$)/g, '$1') // Blockquotes
    .replace(/\n+/g, ' ') // Newlines to spaces
    .trim();
}

function pcmToWav(pcmBase64: string, sampleRate: number = 24000): string {
  const binaryString = atob(pcmBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + len, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, len, true);

  const wavData = new Uint8Array(44 + len);
  wavData.set(new Uint8Array(wavHeader), 0);
  wavData.set(bytes, 44);
  
  let binary = '';
  for (let i = 0; i < wavData.length; i++) {
    binary += String.fromCharCode(wavData[i]);
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

let isTTSQuotaExceeded = false;
let ttsQuotaResetTimeout: NodeJS.Timeout | null = null;

function resetTTSQuota() {
  isTTSQuotaExceeded = false;
  if (ttsQuotaResetTimeout) {
    clearTimeout(ttsQuotaResetTimeout);
    ttsQuotaResetTimeout = null;
  }
}

export async function generateSpeech(text: string) {
  if (!navigator.onLine) return "LOCAL_TTS";
  if (isTTSQuotaExceeded) return "LOCAL_TTS";

  const ai = getAI();
  const cleanText = stripMarkdown(text).substring(0, 5000);
  if (!cleanText || cleanText.length < 2) return null;

  const voices = ['Zephyr', 'Kore', 'Puck', 'Charon', 'Fenrir'];
  let lastError = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const voice = voices[attempt % voices.length];
    try {
      const prompt = `Say: ${cleanText}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice as any }, 
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        return pcmToWav(base64Audio);
      }
    } catch (error: any) {
      const errorMsg = error?.message?.toLowerCase() || "";
      if (errorMsg.includes("quota") || errorMsg.includes("429")) {
        isTTSQuotaExceeded = true;
        if (!ttsQuotaResetTimeout) {
          ttsQuotaResetTimeout = setTimeout(resetTTSQuota, 60000);
        }
        console.warn("Gemini TTS Quota Exceeded. Audio uplink temporarily suspended.");
        return "LOCAL_TTS"; // Fail silently to avoid UI spam
      }
      lastError = error;
      console.warn(`Speech generation attempt ${attempt + 1} failed with voice ${voice}:`, error);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return "LOCAL_TTS";
}
