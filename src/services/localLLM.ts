import { CreateMLCEngine, InitProgressCallback, MLCEngine } from "@mlc-ai/web-llm";

let engine: MLCEngine | null = null;
let isInitializing = false;

// Using a small, fast model suitable for browsers
export const LOCAL_MODEL_ID = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

export async function initLocalModel(onProgress?: InitProgressCallback): Promise<MLCEngine> {
  if (engine) return engine;
  if (isInitializing) throw new Error("Model is already initializing");
  
  isInitializing = true;
  try {
    engine = await CreateMLCEngine(
      LOCAL_MODEL_ID,
      { initProgressCallback: onProgress }
    );
    return engine;
  } finally {
    isInitializing = false;
  }
}

export function getLocalEngine(): MLCEngine | null {
  return engine;
}

export async function* generateLocalChatResponseStream(
  message: string,
  history: { role: "user" | "model"; parts: { text: string }[] }[],
  systemInstruction: string
) {
  if (!engine) {
    throw new Error("Local AI Core not initialized. Please download the model in Settings first.");
  }
  
  const messages = [
    { role: "system" as const, content: systemInstruction },
    ...history.map(h => ({
      role: h.role === "model" ? "assistant" as const : "user" as const,
      content: h.parts[0].text
    })),
    { role: "user" as const, content: message }
  ];

  const chunks = await engine.chat.completions.create({
    messages,
    stream: true,
  });

  for await (const chunk of chunks) {
    yield { text: chunk.choices[0]?.delta?.content || "" };
  }
}
