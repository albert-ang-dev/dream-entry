<script setup>
  import {ref} from 'vue';
  import './App.css';


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

    function downloadFixedEssay() {
      if (!result.value?.fixedEssay) return;

      const blob = new Blob([result.value.fixedEssay], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = 'revised-essay.txt';
      link.click();

      URL.revokeObjectURL(url);
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

      try {
        // Call our own serverless function — the API key stays on the server.
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ essay: ta.value }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || `Request failed (${res.status})`);
        }

        result.value = data;
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
        <p v-if="result.fixedEssay">We have fixed your essay based on the feedback provided.</p>
        <p v-if="result.fixedEssay"><button @click="downloadFixedEssay">DOWNLOAD IT</button></p>

      </div>
    </div>
  </section>

  <footer class="site-footer">
    <a href="/privacy-policy.html">Privacy Policy</a>
  </footer>
</template>
