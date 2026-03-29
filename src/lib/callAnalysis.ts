// No third-party imports needed for base64 — uses React Native's fetch polyfill
// which supports local file:// URIs and returns an ArrayBuffer on Hermes.

export const GEMINI_API_KEY = 'AIzaSyBG2Qki80GGvFRZp6-OD8YtCvtgkfqbH30'; // TODO: Paste your Gemini API key here
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

export interface ChunkAnalysisResponse {
  transcript: string;
  chunkRiskScore: number;
  reasons: string[];
  matchedSignals: string[];
  error?: string;
}

export async function analyzeAudioChunk(uri: string): Promise<ChunkAnalysisResponse> {
  const fallbackResponse: ChunkAnalysisResponse = { transcript: '', chunkRiskScore: 0, reasons: [], matchedSignals: [] };
  
  if (!GEMINI_API_KEY) {
    console.warn("No GEMINI_API_KEY provided.");
    return { ...fallbackResponse, error: 'NO_API_KEY' };
  }

  try {
    const fileRes = await fetch(uri);
    const buffer = await fileRes.arrayBuffer();
    const base64Audio = arrayBufferToBase64(buffer);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const promptText = `
You are evaluating a 15-second phone audio chunk to determine if it contains scam language, urgency, authority impersonation, or payment requests.
Wait for speech. If there is no speech, or if it is completely benign, keep the chunkRiskScore at 0. Evaluate only this chunk.
Return a valid JSON object ONLY containing:
{
  "transcript": "the precise transcribed text of the speakers (Speaker 1:, Speaker 2:, etc)",
  "chunkRiskScore": 0-100 integer (0 is benign, 100 is highly suspicious),
  "reasons": ["short reason why this chunk is suspicious"],
  "matchedSignals": ["signal name"]
}
If there are no reasons or signals, use empty arrays. Do not return markdown fences, just the JSON string.
    `.trim();

    const payload = {
      contents: [{
         parts: [
          { text: promptText },
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
      return { ...fallbackResponse, error: 'QUOTA_EXCEEDED' };
    }

    const result = await res.json();
    if (result.error) {
      console.error("Gemini Chunk Analysis Error:", result.error);
      if (result.error.code === 429) return { ...fallbackResponse, error: 'QUOTA_EXCEEDED' };
      return { ...fallbackResponse, error: 'API_ERROR' };
    }

    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    if (!rawText) return fallbackResponse;

    const jsonStr = rawText.replace(/```json\n?|\n?```/g, "").trim();
    
    try {
      const parsed = JSON.parse(jsonStr);
      return {
        transcript: parsed.transcript || "",
        chunkRiskScore: typeof parsed.chunkRiskScore === 'number' ? parsed.chunkRiskScore : 0,
        reasons: Array.isArray(parsed.reasons) ? parsed.reasons : [],
        matchedSignals: Array.isArray(parsed.matchedSignals) ? parsed.matchedSignals : [],
      };
    } catch (e) {
       console.error("Gemini JSON parse error:", e);
       // Fallback on JSON parse failure: return raw text as transcript, no score delta
       return { ...fallbackResponse, transcript: rawText };
    }

  } catch (err) {
    console.error("Error in analyzeAudioChunk:", err);
    return { ...fallbackResponse, error: 'NETWORK_ERROR' };
  }
}
