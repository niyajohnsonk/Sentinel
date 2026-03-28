// No third-party imports needed for base64 — uses React Native's fetch polyfill
// which supports local file:// URIs and returns an ArrayBuffer on Hermes.

export const GEMINI_API_KEY = 'AIzaSyDqSAdFbHPkp-7eUGbd8CiAG3q2NYiAjS0'; // TODO: Paste your Gemini API key here
export const GEMINI_MODEL = 'gemini-2.5-flash';

export interface CallAnalysisResult {
  score: number;
  label: "Safe" | "Suspicious" | "High Risk Scam";
  reasons: string[];
  matchedSignals: string[];
}

export interface ApiError {
  error: string;
}

/** Convert an ArrayBuffer to a base64 string without FileReader or atob. */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...(bytes.subarray(i, i + CHUNK) as unknown as number[]));
  }
  return btoa(binary);
}

export async function transcribeAudioChunk(uri: string): Promise<{ text?: string, error?: string }> {
  if (!GEMINI_API_KEY) {
    console.warn("No GEMINI_API_KEY provided.");
    return { error: 'NO_API_KEY' };
  }

  try {
    // React Native's fetch polyfill supports local file:// URIs on both platforms.
    const fileRes = await fetch(uri);
    const buffer = await fileRes.arrayBuffer();
    const base64Audio = arrayBufferToBase64(buffer);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const payload = {
      contents: [{
         parts: [
          { text: "Transcribe this audio chunk. Identify and separate the speakers, labeling them as 'Speaker 1:' and 'Speaker 2:' or similar. If there is only one speaker, just label 'Speaker 1:'. If no speech is detected, return an empty string. Only return the transcribed text." },
          {
            inline_data: {
              mime_type: "audio/mp4",
              data: base64Audio,
            },
          },
        ],
      }],
      generationConfig: {
        temperature: 0.1,
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.status === 429) {
      return { error: 'QUOTA_EXCEEDED' };
    }

    const result = await res.json();
    if (result.error) {
      console.error("Gemini Transcription Error:", result.error);
      if (result.error.code === 429) return { error: 'QUOTA_EXCEEDED' };
      return { error: 'API_ERROR' };
    }

    return { text: result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "" };
  } catch (err) {
    console.error("Error in transcribeAudioChunk:", err);
    return { error: 'NETWORK_ERROR' };
  }
} // Replaced batch transcriber as we reverted to 15s monolithic sliding chunks

export async function analyzeConversation(history: string[]): Promise<CallAnalysisResult | ApiError | null> {
  if (!GEMINI_API_KEY) {
    return { error: 'NO_API_KEY' };
  }

  const transcriptText = history.join("\n");
  if (!transcriptText.trim()) return null;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const promptText = `
You are evaluating a phone conversation to determine if it is a safe interaction or a scam attempt. The transcript is labeled with 'You:' (the local user) and 'Caller:' (the remote speaker). Assess the conversation objectively. It may be completely benign. Start the risk score low and only escalate it (above 40) if clear signs of digital fraud, authority impersonation, urgency, payment coercion, or fear tactics emerge. Do not flag generic greetings as high risk. Return a JSON object with: score (0-100), label (Safe/Suspicious/High Risk Scam), reasons (array of strings), matchedSignals (array of strings). Return only JSON, no other text.

Transcript:
${transcriptText}
    `.trim();

    const payload = {
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: 0.1,
      }
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.status === 429) {
      return { error: 'QUOTA_EXCEEDED' };
    }

    const result = await res.json();
    if (result.error) {
       console.error("Gemini Analysis Error:", result.error);
       if (result.error.code === 429) return { error: 'QUOTA_EXCEEDED' };
       return { error: 'API_ERROR' };
    }

    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    // Remove potential markdown fences
    const jsonStr = rawText.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(jsonStr) as CallAnalysisResult;
    return parsed;
  } catch (err) {
    console.error("Error in analyzeConversation:", err);
    return { error: 'NETWORK_ERROR' };
  }
}
