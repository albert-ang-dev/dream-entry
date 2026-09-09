import { GoogleGenerativeAI } from "@google/generative-ai";

// Vercel Serverless Function — runs on the server, so the API key is never
// exposed to the browser. Set GEMINI_API_KEY (NO "VITE_" prefix) in your
// Vercel project's Environment Variables.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error:
        "Server is missing GEMINI_API_KEY. Add it in Vercel → Settings → Environment Variables (without the VITE_ prefix) and redeploy.",
    });
  }

  // req.body is auto-parsed when sent as application/json, but guard anyway.
  const body =
    typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const essay = (body.essay || "").trim();

  if (!essay) {
    return res.status(400).json({ error: "No essay provided." });
  }

  const prompt = `
You are an expert college admissions counselor. Analyze the following college application essay
and return ONLY a raw JSON object. No markdown, no backticks, no explanation — just the JSON.

The JSON must follow this exact structure:

{
  "overallAssessment": {
    "score": <number 1-10>,
    "summary": "<3-4 sentence overall assessment of the essay>"
  },
  "fixedEssay": "<the full essay, rewritten to address the feedback below — preserve the student's voice and story, just tighten prose, fix grammar, and strengthen weak spots>",
  "criteria": [
    {
      "title": "Authentic Voice",
      "description": "<2-3 sentences evaluating how genuine and unique the student's voice is>",
      "score": <number 1-10>
    },
    {
      "title": "Central Message",
      "description": "<2-3 sentences evaluating how clear and focused the main idea is>",
      "score": <number 1-10>
    },
    {
      "title": "Reflection & Insight",
      "description": "<2-3 sentences evaluating the depth of self-reflection and lessons learned>",
      "score": <number 1-10>
    },
    {
      "title": "Specific Details",
      "description": "<2-3 sentences evaluating the use of concrete, vivid, specific storytelling>",
      "score": <number 1-10>
    },
    {
      "title": "Structure & Clarity",
      "description": "<2-3 sentences evaluating the essay's opening, flow, transitions, and conclusion>",
      "score": <number 1-10>
    }
  ]
}

Essay:
"""
${essay}
"""
`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const response = await model.generateContent(prompt);
    const text = response.response.text();

    // Strip markdown fences just in case Gemini adds them
    const clean = text.replace(/```json|```/g, "").trim();
    const data = JSON.parse(clean);

    return res.status(200).json(data);
  } catch (error) {
    console.error("Gemini API error:", error);
    return res
      .status(502)
      .json({ error: error?.message || "Failed to analyze essay." });
  }
}
