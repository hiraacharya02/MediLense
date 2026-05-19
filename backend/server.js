import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import { findApprovedTopic, approvedContent } from "./data/approvedContent.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const MODEL = process.env.GEMINI_MODEL; 

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

app.use(cors({
  origin: "*"
}));

app.use(express.json({ limit: "1mb" }));

app.use(express.static(process.cwd(), { dotfiles: "ignore" }));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    app: "MediLense",
    aiConfigured: Boolean(process.env.GEMINI_API_KEY),
    topics: approvedContent.map(t => t.title)
  });
});

app.post("/api/generate", async (req, res) => {
  const { topic, mode } = req.body;
  console.log(`Received generate request for topic "${topic}" in mode "${mode}".`);

  if (!topic || !mode) {
    return res.status(400).json({
      error: "Missing topic or learning mode."
    });
  }

  const approvedTopic = findApprovedTopic(topic);

  if (!approvedTopic) {
    return res.json({
      fallback: true,
      content: buildUnknownTopicFallback(topic, mode),
      sources: [{
        title: "Prototype approved topic library",
        provider: "MediLense local library",
        type: "local approved source list",
        url: "",
        trustReason: "The prototype only contains approved content for cardiac cycle, diabetes basics, and respiratory system."
      }]
    });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.json({
      fallback: true,
      content: buildFallbackContent(approvedTopic, mode),
      sources: approvedTopic.sources
    });
  }

  try {
    const prompt = buildPrompt(approvedTopic, mode);

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        maxOutputTokens: 1200,
        responseMimeType: mode !== "visual" ? "application/json" : "text/html"
      }
    });

    res.json({
      fallback: false,
      content: response.text, 
      sources: approvedTopic.sources
    });
  } catch (error) {
    console.error("Gemini error:", error?.message || error);

    res.json({
      fallback: true,
      content: buildFallbackContent(approvedTopic, mode),
      sources: approvedTopic.sources,
      warning: "AI call failed, so the app used safe fallback content."
    });
  }
});

app.post("/api/chat", async (req, res) => {
  const { topic, mode, message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Missing chat message." });
  }

  const approvedTopic = findApprovedTopic(topic);
  const hasKey = Boolean(process.env.GEMINI_API_KEY);

  if (!approvedTopic || !hasKey) {
    return res.json({
      fallback: true,
      reply: `For the prototype, I can only answer from the approved MediLense topic library. Try one of: cardiac cycle, diabetes basics, or respiratory system.`
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: `
You are MediLense, a study-support AI tutor for medical students.

Rules:
- Use ONLY the approved source material below.
- Do not diagnose, prescribe, or give personal medical advice.
- Keep the answer to 2–4 beginner-friendly sentences.
- If the source does not contain the answer, say the approved sources do not contain enough information.

Current topic: ${approvedTopic.title}
Learning mode: ${mode}
Student question: ${message}

Approved source material:
${approvedTopic.approvedText}
      `,
      config: {
        maxOutputTokens: 350
      }
    });

    res.json({
      fallback: false,
      reply: response.text
    });
  } catch (error) {
    console.error("Gemini chat error:", error?.message || error);
    res.json({
      fallback: true,
      reply: `I had trouble connecting to the AI, but your approved topic is "${approvedTopic.title}". Review the trusted source card below the study output.`
    });
  }
});

function buildPrompt(topic, mode) {
  const sourceList = topic.sources
    .map(source => `- ${source.title} (${source.provider})`)
    .join("\n");

  const videoList = (topic.videos || [])
    .map(video => `- ${video.title} | ${video.channel} | ${video.url} | ${video.description}`)
    .join("\n");

  const commonRules = `
You are MediLense, an AI study assistant for medical students.

Very important rules:
- Use ONLY the approved source material provided.
- Do NOT search the web.
- Do NOT invent sources, URLs, statistics, treatments, or clinical guidelines.
- Do NOT give diagnosis, treatment, or personal medical advice.
- If the approved text is limited, say that this is a simplified prototype explanation.
- Keep the tone clear and beginner-friendly.

Approved topic:
${topic.title}

Approved source material:
${topic.approvedText}

Approved sources:
${sourceList}

Approved audio/video resources:
${videoList || "No approved video resources for this topic."}
  `;

  if (mode === "visual") {
    return `
${commonRules}

Return plain HTML only. Do not wrap it in markdown code blocks or code fences.

Use ONLY these tags/classes:
<h3>, <p>, <ul>, <li>, <div class="concept-box">, <span class="key-term">.

Create:
<h3>Overview</h3>
<p>2-3 sentence explanation.</p>
<h3>Visual pathway</h3>
<div class="concept-box">Use arrows or a step sequence.</div>
<h3>Key terms</h3>
<ul>...</ul>
<h3>Mini quiz</h3>
<ul>3 short questions</ul>
    `;
  }

  if (mode === "auditory") {
    return `
${commonRules}

Return raw JSON only. Do not wrap it in markdown code blocks or code fences.
Use ONLY the approved video resources listed above. Do not invent YouTube links.

Required JSON shape:
{
  "videos": [
    {
      "url": "approved URL only",
      "title": "approved or source-based title",
      "channel": "provider/channel",
      "description": "one sentence explaining why it helps"
    }
  ],
  "listeningGuide": [
    "point 1",
    "point 2",
    "point 3"
  ]
}
    `;
  }

  if (mode === "reading") {
    return `
${commonRules}

Return raw JSON only. Do not wrap it in markdown code blocks or code fences.

Required JSON shape:
{
  "article": {
    "title": "short title",
    "body": "3 short paragraphs separated by \\n\\n",
    "source": "MediLense approved source library"
  },
  "furtherReading": [
    {
      "title": "source title",
      "author": "source/provider",
      "note": "why it is useful"
    }
  ]
}
    `;
  }

  if (mode === "kinesthetic") {
    return `
${commonRules}

Return raw JSON only. Do not wrap it in markdown code blocks or code fences.

Required JSON shape:
{
  "exercises": [
    {
      "title": "short title",
      "prompt": "hands-on study task based only on approved text",
      "hint": "helpful hint",
      "modelAnswer": "safe model answer based only on approved text"
    }
  ]
}

Create 4 exercises:
1. recall
2. sequencing
3. teach-back
4. clinical connection without diagnosis/treatment advice
    `;
  }

  return commonRules;
}

function buildUnknownTopicFallback(topic, mode) {
  if (mode === "visual") {
    return `
<h3>Topic not in approved library</h3>
<p>MediLense currently has approved prototype content for <span class="key-term">cardiac cycle</span>, <span class="key-term">diabetes basics</span>, and <span class="key-term">respiratory system</span>.</p>
<div class="concept-box">Try typing one of those exact topics for the live demo.</div>
    `;
  }

  if (mode === "auditory") {
    return JSON.stringify({
      videos: [],
      listeningGuide: [
        "This topic is not in the approved prototype library yet.",
        "Try: cardiac cycle, diabetes basics, or respiratory system.",
        "In a full version, teachers/admins would approve more topics."
      ]
    });
  }

  if (mode === "reading") {
    return JSON.stringify({
      article: {
        title: "Topic not in approved library",
        body: `MediLense only answers from approved local content in this prototype.\n\nTry cardiac cycle, diabetes basics, or respiratory system.\n\nThis keeps the AI controlled and avoids open internet medical answers.`,
        source: "MediLense prototype library"
      },
      furtherReading: []
    });
  }

  return JSON.stringify({
    exercises: [
      {
        title: "Choose an approved topic",
        prompt: "Try entering cardiac cycle, diabetes basics, or respiratory system.",
        hint: "The prototype library is intentionally small.",
        modelAnswer: "A controlled source library helps prevent the AI from using unapproved medical content."
      }
    ]
  });
}

function buildFallbackContent(topic, mode) {
  if (mode === "visual") {
    return `
<h3>Overview</h3>
<p><span class="key-term">${escapeHtml(topic.title)}</span> is being shown from MediLense's approved local library because the live AI is unavailable or not configured.</p>
<div class="concept-box">${escapeHtml(topic.approvedText.trim()).replace(/\n/g, "<br>")}</div>
<h3>Key study idea</h3>
<ul>
  <li>Focus on the main mechanism.</li>
  <li>Connect the mechanism to why it matters in medicine.</li>
  <li>Use the trusted source card below to check where the content came from.</li>
</ul>
    `;
  }

  if (mode === "auditory") {
    return JSON.stringify({
      videos: topic.videos || [],
      listeningGuide: [
        `Listen for the main mechanism of ${topic.title}.`,
        "Pause and explain the concept in your own words.",
        "Use the trusted source cards to verify the resource."
      ]
    });
  }

  if (mode === "reading") {
    return JSON.stringify({
      article: {
        title: `Introduction to ${topic.title}`,
        body: `${topic.approvedText.trim()}\n\nThis is a simplified prototype article generated from the approved local content library.\n\nIn the full AI version, the backend would ask the AI to rewrite this same approved content in a clearer study format.`,
        source: "MediLense approved local library"
      },
      furtherReading: topic.sources.map(source => ({
        title: source.title,
        author: source.provider,
        note: source.trustReason
      }))
    });
  }

  return JSON.stringify({
    exercises: [
      {
        title: "Recall challenge",
        prompt: `Write the key idea of ${topic.title} in your own words.`,
        hint: "Start with the definition, then explain the mechanism.",
        modelAnswer: topic.approvedText.trim().split(".").slice(0, 2).join(".") + "."
      },
      {
        title: "Sequence task",
        prompt: `Create a step-by-step sequence for ${topic.title}.`,
        hint: "Look for process words such as first, then, and finally.",
        modelAnswer: "A good answer should describe the concept as a clear ordered process using only the approved source material."
      },
      {
        title: "Teach-back",
        prompt: `Explain ${topic.title} to a classmate in 60 seconds.`,
        hint: "Use simple language and avoid adding facts not in the source.",
        modelAnswer: "A strong teach-back answer is clear, short, and based on the approved text."
      },
      {
        title: "Clinical connection",
        prompt: `Explain why ${topic.title} matters for medical students without giving diagnosis or treatment advice.`,
        hint: "Connect the mechanism to general medical understanding.",
        modelAnswer: "This topic matters because it helps students understand normal function and how related medical problems can be studied."
      }
    ]
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

app.listen(PORT, () => {
  console.log(`MediLense running at http://localhost:${PORT}`);
});