import express from "express";
import cors from "cors";
import multer from "multer";
import pdf from "pdf-parse";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = express();
const PORT = process.env.PORT || 3001;
const AI_PROVIDER = (process.env.AI_PROVIDER || "ollama").trim().toLowerCase();
const OLLAMA_URL = (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5-coder:3b";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.7-flash";
const GEMINI_RETRY_DELAYS_MS = [2000, 4000, 8000];
const GEMINI_RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.has(origin));
  },
}));
app.use(express.json({ limit: "2mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf")) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

const ANALYSIS_SCHEMA = {
  matchPercentage: "number 0-100",
  matchingSkills: "string[]",
  missingSkills: "string[]",
  relevantExperience: "string[]",
  relevantProjects: "string[]",
  keywordsFound: "string[]",
  keywordsMissing: "string[]",
  improvementSuggestions: "string[]",
  professionalSummary: "string",
};

function buildAnalysisPrompt(resumeText, jobDescription) {
  return `You are an expert ATS resume analyst and career coach. Analyze how well the resume matches the job description.

Return ONLY valid JSON with no markdown, no code fences, and no extra text. Use exactly these keys:
${JSON.stringify(Object.keys(ANALYSIS_SCHEMA))}

Field rules:
- matchPercentage: integer 0-100
- matchingSkills: skills from the resume that match the job (max 15 items)
- missingSkills: important skills from the job not clearly shown on the resume (max 15)
- relevantExperience: bullet points describing matching work experience (max 8)
- relevantProjects: bullet points describing matching projects (max 8)
- keywordsFound: ATS keywords present in both (max 20)
- keywordsMissing: important ATS keywords from the job missing from resume (max 20)
- improvementSuggestions: actionable resume edits (max 10)
- professionalSummary: 2-4 sentence ATS-friendly summary tailored to this job

JOB DESCRIPTION:
${jobDescription.slice(0, 12000)}

RESUME:
${resumeText.slice(0, 12000)}
`;
}

function extractJsonFromText(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Model did not return valid JSON");
  }
}

function normalizeAnalysis(raw) {
  const toArray = (v) => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);
  let match = Number(raw.matchPercentage);
  if (Number.isNaN(match)) match = 0;
  match = Math.min(100, Math.max(0, Math.round(match)));

  return {
    matchPercentage: match,
    matchingSkills: toArray(raw.matchingSkills),
    missingSkills: toArray(raw.missingSkills),
    relevantExperience: toArray(raw.relevantExperience),
    relevantProjects: toArray(raw.relevantProjects),
    keywordsFound: toArray(raw.keywordsFound),
    keywordsMissing: toArray(raw.keywordsMissing),
    improvementSuggestions: toArray(raw.improvementSuggestions),
    professionalSummary: String(raw.professionalSummary || "").trim(),
  };
}

async function callOllama(prompt) {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      format: "json",
      options: {
        temperature: 0.3,
        num_predict: 2048,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Ollama request failed (${response.status}). Is Ollama running at ${OLLAMA_URL}? ${body.slice(0, 200)}`
    );
  }

  const data = await response.json();
  if (!data.response) {
    throw new Error("Empty response from Ollama");
  }
  return data.response;
}

async function callGeminiModel(prompt, model) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 2048,
        },
      }),
    }
  );

  console.log(`Gemini model ${model} returned HTTP ${response.status}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error?.message || `Gemini request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }

  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }
  return text;
}

async function retryWithBackoff(operation, model) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const delay = GEMINI_RETRY_DELAYS_MS[attempt];
      if (!GEMINI_RETRYABLE_STATUSES.has(error.status) || delay === undefined) {
        throw error;
      }

      console.warn(
        `Gemini model ${model} retry ${attempt + 1}/${GEMINI_RETRY_DELAYS_MS.length} ` +
          `after HTTP ${error.status} in ${delay / 1000}s`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

async function callGemini(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  console.log(`Attempting Gemini primary model: ${GEMINI_MODEL}`);
  try {
    return await retryWithBackoff(() => callGeminiModel(prompt, GEMINI_MODEL), GEMINI_MODEL);
  } catch (primaryError) {
    if (!GEMINI_RETRYABLE_STATUSES.has(primaryError.status)) {
      throw primaryError;
    }

    console.warn(
      `Gemini primary model ${GEMINI_MODEL} exhausted retries after HTTP ${primaryError.status}; ` +
        `attempting fallback model: ${GEMINI_FALLBACK_MODEL}`
    );
    return callGeminiModel(prompt, GEMINI_FALLBACK_MODEL);
  }
}

async function callAIProvider(prompt) {
  if (AI_PROVIDER === "ollama") return callOllama(prompt);
  if (AI_PROVIDER === "gemini") return callGemini(prompt);
  throw new Error(`Unsupported AI_PROVIDER: ${AI_PROVIDER}`);
}

app.get("/api/health", async (_req, res) => {
  if (AI_PROVIDER === "gemini") {
    if (!GEMINI_API_KEY) {
      return res.status(503).json({ ok: false, provider: AI_PROVIDER, error: "GEMINI_API_KEY is not configured" });
    }
    return res.json({ ok: true, provider: AI_PROVIDER, model: GEMINI_MODEL });
  }

  if (AI_PROVIDER !== "ollama") {
    return res.status(503).json({ ok: false, provider: AI_PROVIDER, error: "Unsupported AI_PROVIDER" });
  }

  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`Ollama health check failed (${response.status})`);
    res.json({ ok: true, provider: AI_PROVIDER, model: OLLAMA_MODEL });
  } catch (e) {
    res.status(503).json({ ok: false, provider: AI_PROVIDER, error: e.message });
  }
});

app.post("/api/parse-pdf", upload.single("resume"), async (req, res) => {
  try {
    console.info("[parse-pdf] file received:", Boolean(req.file), "filename:", req.file?.originalname || null);
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }
    const data = await pdf(req.file.buffer);
    const text = (data.text || "").trim();
    console.info("[parse-pdf] extracted text length:", text.length);
    if (!text || text.length < 20) {
      return res.status(400).json({
        error: "Could not extract meaningful text from this PDF. Try a text-based PDF, not a scanned image.",
      });
    }
    res.json({ text, pages: data.numpages });
  } catch (err) {
    console.error("PDF parse error:", err);
    res.status(400).json({
      error: err.message?.includes("PDF") ? err.message : "Invalid or corrupted PDF file",
    });
  }
});

app.post("/api/analyze", async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body || {};

    if (!resumeText || typeof resumeText !== "string" || resumeText.trim().length < 50) {
      return res.status(400).json({ error: "Resume text is too short. Upload a PDF or ensure extraction succeeded." });
    }
    if (!jobDescription || typeof jobDescription !== "string" || jobDescription.trim().length < 30) {
      return res.status(400).json({ error: "Job description is too short. Paste the full job posting." });
    }

    const prompt = buildAnalysisPrompt(resumeText.trim(), jobDescription.trim());
    let rawResponse;
    try {
      rawResponse = await callAIProvider(prompt);
    } catch (providerErr) {
      if (AI_PROVIDER === "gemini") {
        console.error("Gemini request failed", providerErr.status ? `HTTP ${providerErr.status}` : "without an HTTP status");
      } else {
        console.error(`${AI_PROVIDER} error:`, providerErr);
      }
      return res.status(503).json({
        error: providerErr.message || "AI provider request failed.",
      });
    }

    let parsed;
    try {
      parsed = extractJsonFromText(rawResponse);
    } catch (parseErr) {
      console.error("JSON parse error:", rawResponse?.slice?.(0, 500));
      return res.status(502).json({ error: "AI returned invalid JSON. Try again or use a larger model." });
    }

    res.json(normalizeAnalysis(parsed));
  } catch (err) {
    console.error("Analyze error:", err);
    res.status(500).json({ error: "Analysis failed. Please try again." });
  }
});

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "PDF must be under 10 MB" });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err.message === "Only PDF files are allowed") {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: err.message || "Server error" });
});

app.listen(PORT, () => {
  const model = AI_PROVIDER === "gemini" ? GEMINI_MODEL : OLLAMA_MODEL;
  console.log(`Server listening on port ${PORT}`);
  console.log(`AI provider: ${AI_PROVIDER} | Model: ${model}`);
});
