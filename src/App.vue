<script setup>
  import {ref} from 'vue';
  import { GoogleGenerativeAI } from "@google/generative-ai";


    const result = ref(null);
    const errorMsg = ref('');
    const analyzeButtonState = ref(true);

    function scoreColor(score) {
      // score out of 10 → red/amber/green accent
      if (score >= 8) return '#28C840';
      if (score >= 5) return '#FEBC2E';
      return '#FF5F57';
    }
    function countWords(str) {
      return str.trim() === '' ? 0 : str.trim().split(/\s+/).length;
    }

    function updateCount() {
      const ta = document.getElementById('essayInput');
      const wc = countWords(ta.value);
      document.getElementById('wordCount').textContent = `${wc} / 650 words`;
    }

    async function handleAnalyze() {
      const ta = document.getElementById('essayInput');
      if (!ta.value.trim()) {
        ta.focus();
        ta.placeholder = 'Please paste your essay before analyzing…';
        return;
      }

      analyzeButtonState.value = false;
      errorMsg.value = '';

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        errorMsg.value = 'No API key found. Add VITE_GEMINI_API_KEY to your .env file and restart the dev server (Vite only reads .env at startup).';
        analyzeButtonState.value = true;
        return;
      }

      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
        const prompt = `
You are an expert college admissions counselor. Analyze the following college application essay
and return ONLY a raw JSON object. No markdown, no backticks, no explanation — just the JSON.

The JSON must follow this exact structure:

{
  "overallAssessment": {
    "score": <number 1-10>,
    "summary": "<3-4 sentence overall assessment of the essay>"
  },
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
${ta.value}
"""
  `;

        const response = await model.generateContent(prompt);
        const text = response.response.text();

        // Strip markdown fences just in case Gemini adds them
        const clean = text.replace(/```json|```/g, "").trim();
        const rr = JSON.parse(clean);

        result.value = rr;
        analyzeButtonState.value = true;

        // Scroll the results into view
        requestAnimationFrame(() => {
          document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
        });

      } catch (error) {
        console.error('API Error:', error);
        errorMsg.value = error?.message
          ? `Analysis failed: ${error.message}`
          : 'Analysis failed. Check the browser console for details.';
        analyzeButtonState.value = true;
      }
    }

</script>

<template>

  <section class="hero">

    <p class="hero__eyebrow">College Essay Assistant</p>

    <h1 class="hero__headline">Write the Essay That Gets You In.</h1>

    <p class="hero__sub">
      AI-powered essay feedback and generation built for college applicants —
      so you can focus on telling your story, not stressing about the blank page
    </p>

    <!-- Editor Card -->
    <div class="editor-card">
      <div class="editor-card__toolbar">
        <span class="toolbar-dot toolbar-dot--red"></span>
        <span class="toolbar-dot toolbar-dot--amber"></span>
        <span class="toolbar-dot toolbar-dot--green"></span>
        <span class="editor-card__label">Dream Entry</span>
      </div>

      <div class="editor-card__body">
        <textarea
          class="essay-textarea"
          placeholder="Type or paste your essay here…"
          id="essayInput"
          @input="updateCount()"

        ></textarea>
      </div>

      <div class="editor-card__footer">
        <span class="word-count" id="wordCount">0 / 650 words</span>
        <button class="btn-analyze" @click="handleAnalyze" v-if="analyzeButtonState">
          Analyze My Essay →
        </button>
        <button class="btn-analyze btn-analyze--loading" disabled v-else>
          <span class="spinner"></span> Analyzing…
        </button>
      </div>

      <p class="editor-card__error" v-if="errorMsg">⚠ {{ errorMsg }}</p>
    </div>
  </section>


  <!-- RESULT -->
  <section class="results" id="results" v-if="result">
    <div class="results__head">
      <p class="results__eyebrow">Your Feedback</p>
      <h2 class="results__title">Essay Analysis</h2>
    </div>

    <div class="results__grid">
      <!-- Left: Gradings + criteria -->
      <div class="result-card grading-card">
        <h3 class="result-card__title">Gradings</h3>

        <div
          class="criterion"
          v-for="c in result.criteria"
          :key="c.title"
        >
          <div class="criterion__head">
            <h4 class="criterion__title">{{ c.title }}</h4>
            <span class="criterion__score" :style="{ color: scoreColor(c.score) }">
              {{ c.score }}<span class="criterion__score-max">/10</span>
            </span>
          </div>

          <div class="criterion__bar">
            <div
              class="criterion__bar-fill"
              :style="{ width: (c.score * 10) + '%', background: scoreColor(c.score) }"
            ></div>
          </div>

          <p class="criterion__desc">{{ c.description }}</p>
        </div>
      </div>

      <!-- Right: Overall assessment -->
      <div class="result-card overall-card">
        <h3 class="result-card__title">Overall</h3>

        <div class="overall-card__score">
          <span class="overall-card__num" :style="{ color: scoreColor(result.overallAssessment.score) }">
            {{ result.overallAssessment.score }}
          </span>
          <span class="overall-card__num-max">/ 10</span>
        </div>

        <p class="overall-card__summary">{{ result.overallAssessment.summary }}</p>
      </div>
    </div>
  </section>
</template>

<style >
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', sans-serif;
      min-height: 100vh;
      background: linear-gradient(
        180deg,
        #5bb8d8 0%,
        #7ecde8 18%,
        #a8dff0 36%,
        #c8eef6 52%,
        #d8f3f0 66%,
        #e5f8f0 80%,
        #ffffff 100%
      );
    }

    /* ─── HERO ─────────────────────────────── */
    .hero {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding-top: clamp(120px, 18vh, 180px);
      padding-bottom: 80px;
      text-align: center;
      padding-left: 16px;
      padding-right: 16px;
    }

    .hero__eyebrow {
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.75);
      margin-bottom: 18px;
    }

    .hero__headline {
      font-size: clamp(2rem, 5vw, 3rem);
      font-weight: 800;
      color: #ffffff;
      line-height: 1.1;
      letter-spacing: -0.02em;
      max-width: 660px;
    }

    .hero__sub {
      font-size: clamp(1rem, 2vw, 1.2rem);
      font-weight: 600;
      color: rgba(255,255,255,0.9);
      line-height: 1.45;
      max-width: 500px;
      margin-top: 10px;
    }

    /* ─── EDITOR CARD ───────────────────────── */
    .editor-card {
      width: 100%;
      max-width: 800px;
      margin-top: 28px;
      background: #ffffff;
      border-radius: 18px;
      box-shadow: 0 6px 40px rgba(0,0,0,0.18);
      overflow: hidden;
    }

    .editor-card__toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px 20px;
      border-bottom: 1px solid #f0f0f0;
      background: #fafafa;
    }

    .toolbar-dot {
      width: 11px;
      height: 11px;
      border-radius: 50%;
    }
    .toolbar-dot--red   { background: #FF5F57; }
    .toolbar-dot--amber { background: #FEBC2E; }
    .toolbar-dot--green { background: #28C840; }

    .editor-card__label {
      margin-left: auto;
      font-size: 0.7rem;
      font-weight: 600;
      color: #aaa;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .editor-card__body {
      padding: 24px;
    }

    .essay-textarea {
      width: 100%;
      min-height: 280px;
      border: none;
      outline: none;
      resize: none;
      font-family: 'Inter', sans-serif;
      font-size: 0.92rem;
      color: #222;
      line-height: 1.7;
      background: transparent;
      caret-color: #5bb8d8;
    }

    .essay-textarea::placeholder {
      color: #bbb;
    }

    .editor-card__footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 24px 18px;
      border-top: 1px solid #f0f0f0;
    }

    .word-count {
      font-size: 0.78rem;
      color: #bbb;
      font-weight: 500;
    }

    .btn-analyze {
      background: linear-gradient(135deg, #5bb8d8 0%, #3da8cf 100%);
      color: #fff;
      border: none;
      border-radius: 10px;
      padding: 10px 26px;
      font-size: 0.88rem;
      font-weight: 700;
      letter-spacing: 0.01em;
      cursor: pointer;
      transition: opacity 0.18s, transform 0.18s;
      box-shadow: 0 3px 14px rgba(91,184,216,0.38);
    }

    .btn-analyze:hover {
      opacity: 0.88;
      transform: translateY(-1px);
    }

    .btn-analyze:active {
      transform: translateY(0);
    }

    .btn-analyze--loading {
      cursor: default;
      opacity: 0.9;
      display: inline-flex;
      align-items: center;
      gap: 9px;
    }
    .btn-analyze--loading:hover { transform: none; opacity: 0.9; }

    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.45);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .editor-card__error {
      margin: 0 24px 18px;
      padding: 12px 16px;
      background: #fff2f1;
      border: 1px solid #ffd4d0;
      border-radius: 10px;
      color: #c0392b;
      font-size: 0.84rem;
      font-weight: 500;
      line-height: 1.5;
    }

    /* ─── RESULTS ──────────────────────────── */
    .results {
      max-width: 1040px;
      margin: 0 auto;
      padding: 20px 16px 100px;
    }

    .results__head {
      text-align: center;
      margin-bottom: 30px;
    }

    .results__eyebrow {
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #3da8cf;
      margin-bottom: 8px;
    }

    .results__title {
      font-size: clamp(1.6rem, 4vw, 2.2rem);
      font-weight: 800;
      color: #1c3d49;
      letter-spacing: -0.02em;
    }

    .results__grid {
      display: grid;
      grid-template-columns: 5fr 4fr;
      gap: 22px;
      align-items: start;
    }

    .result-card {
      background: #ffffff;
      border-radius: 18px;
      box-shadow: 0 6px 40px rgba(0,0,0,0.12);
      padding: 26px 26px 28px;
    }

    .result-card__title {
      font-size: 1.15rem;
      font-weight: 800;
      color: #1c3d49;
      margin-bottom: 20px;
      padding-bottom: 14px;
      border-bottom: 1px solid #eef1f3;
      letter-spacing: -0.01em;
    }

    /* Criterion rows */
    .criterion {
      padding: 16px 0;
      border-bottom: 1px solid #f3f5f6;
    }
    .criterion:last-child { border-bottom: none; padding-bottom: 0; }

    .criterion__head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
    }

    .criterion__title {
      font-size: 0.98rem;
      font-weight: 700;
      color: #213b45;
    }

    .criterion__score {
      font-size: 1.05rem;
      font-weight: 800;
      flex-shrink: 0;
    }
    .criterion__score-max {
      font-size: 0.72rem;
      font-weight: 600;
      color: #b6c2c8;
      margin-left: 1px;
    }

    .criterion__bar {
      height: 7px;
      border-radius: 99px;
      background: #eef2f4;
      overflow: hidden;
      margin-bottom: 11px;
    }
    .criterion__bar-fill {
      height: 100%;
      border-radius: 99px;
      transition: width 0.5s ease;
    }

    .criterion__desc {
      font-size: 0.86rem;
      line-height: 1.6;
      color: #5e6f76;
    }

    /* Overall card */
    .overall-card {
      position: sticky;
      top: 24px;
      background: linear-gradient(165deg, #ffffff 0%, #f3fbfd 100%);
    }

    .overall-card__score {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 18px;
    }
    .overall-card__num {
      font-size: 3.4rem;
      font-weight: 800;
      line-height: 1;
      letter-spacing: -0.03em;
    }
    .overall-card__num-max {
      font-size: 1.1rem;
      font-weight: 700;
      color: #b6c2c8;
    }

    .overall-card__summary {
      font-size: 0.92rem;
      line-height: 1.7;
      color: #4a5b62;
    }


    /* ─── RESPONSIVE ───────────────────────── */
    @media (max-width: 768px) {
      .results__grid {
        grid-template-columns: 1fr;
      }
      .overall-card { position: static; }
    }

    @media (max-width: 576px) {
      .editor-card__footer {
        flex-direction: column;
        gap: 12px;
        align-items: stretch;
      }
      .btn-analyze { text-align: center; }
    }
</style>
