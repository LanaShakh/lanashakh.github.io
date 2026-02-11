/**
 * HumanWriter AI Agent — Main Application
 *
 * Orchestrates the UI, connects all engines, and manages state.
 */

document.addEventListener('DOMContentLoaded', () => {

  // ---- State ----
  const state = {
    activeTab: 'humanize',
    isProcessing: false,
    lastAnalysis: null,
  };

  // ---- DOM Elements ----
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // Tabs
  const navTabs = $$('.nav-tab');
  const tabContents = $$('.tab-content');

  // Humanize tab
  const inputText = $('#input-text');
  const outputText = $('#output-text');
  const contentTypeSelect = $('#content-type');
  const aggressivenessSelect = $('#aggressiveness');
  const btnAnalyze = $('#btn-analyze');
  const btnHumanize = $('#btn-humanize');
  const btnHumanizeLLM = $('#btn-humanize-llm');
  const btnCopyOutput = $('#btn-copy-output');
  const btnClearInput = $('#btn-clear-input');
  const inputWordCount = $('#input-word-count');
  const outputWordCount = $('#output-word-count');

  // Generate tab
  const topicInput = $('#topic-input');
  const generateTypeSelect = $('#generate-type');
  const instructionsInput = $('#instructions-input');
  const btnGenerate = $('#btn-generate');
  const generateOutput = $('#generate-output');
  const generateWordCount = $('#generate-word-count');
  const btnCopyGenerated = $('#btn-copy-generated');

  // Analysis display
  const analysisContainer = $('#analysis-container');
  const scoreDisplay = $('#score-display');

  // Settings
  const providerSelect = $('#provider-select');
  const apiKeyInput = $('#api-key-input');
  const modelInput = $('#model-input');
  const temperatureInput = $('#temperature-input');
  const btnSaveSettings = $('#btn-save-settings');

  // Status bar
  const statusText = $('#status-text');
  const statusIndicator = $('#status-indicator');

  // Log
  const logContainer = $('#log-container');

  // ---- Tab Navigation ----
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      navTabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));
      tab.classList.add('active');
      $(`#tab-${targetTab}`).classList.add('active');
      state.activeTab = targetTab;
    });
  });

  // ---- Word Count Updates ----
  function countWords(text) {
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  }

  if (inputText) {
    inputText.addEventListener('input', () => {
      inputWordCount.textContent = `${countWords(inputText.value)} words`;
    });
  }

  if (outputText) {
    // outputText is readonly, updated programmatically
  }

  if (topicInput) {
    topicInput.addEventListener('input', () => {
      // Topic is usually short, no word count needed
    });
  }

  // ---- Logging ----
  function log(message, level = 'info') {
    if (!logContainer) return;
    const entry = document.createElement('div');
    entry.className = `log-entry ${level}`;
    const time = new Date().toLocaleTimeString();
    entry.textContent = `[${time}] ${message}`;
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
  }

  // ---- Status Updates ----
  function setStatus(text, busy = false) {
    if (statusText) statusText.textContent = text;
    if (statusIndicator) {
      statusIndicator.classList.toggle('busy', busy);
    }
    state.isProcessing = busy;
    updateButtonStates();
  }

  function updateButtonStates() {
    const disabled = state.isProcessing;
    if (btnAnalyze) btnAnalyze.disabled = disabled;
    if (btnHumanize) btnHumanize.disabled = disabled;
    if (btnHumanizeLLM) btnHumanizeLLM.disabled = disabled;
    if (btnGenerate) btnGenerate.disabled = disabled;
  }

  // ---- Score Display ----
  function displayScore(score, label, message) {
    if (!scoreDisplay) return;
    const scoreClass = score >= 70 ? 'score-high' : score >= 45 ? 'score-mid' : 'score-low';
    scoreDisplay.innerHTML = `
      <div class="score-circle ${scoreClass}">${score}</div>
      <div class="score-details">
        <div class="score-label">${label}</div>
        <div class="score-message">${message}</div>
      </div>
    `;
    scoreDisplay.classList.remove('hidden');
  }

  // ---- Analysis Display ----
  function displayAnalysis(vocabAnalysis, structureAnalysis) {
    if (!analysisContainer) return;

    const overallScore = Math.round((vocabAnalysis.score + structureAnalysis.compositeScore) / 2);

    displayScore(
      overallScore,
      'Humanness Score',
      overallScore >= 70
        ? 'Text looks largely human-like. Good to go.'
        : overallScore >= 45
          ? 'Some AI patterns detected. Consider humanizing.'
          : 'Strong AI signals. Humanization recommended.'
    );

    let html = '';

    // Vocabulary section
    html += buildAnalysisSection(
      'Vocabulary',
      vocabAnalysis.score,
      buildVocabDetails(vocabAnalysis)
    );

    // Burstiness section
    html += buildAnalysisSection(
      'Sentence Length Variation (Burstiness)',
      structureAnalysis.burstiness.score,
      `<p>${structureAnalysis.burstiness.message}</p>
       <p>Coefficient of variation: <code>${structureAnalysis.burstiness.cv}</code>
       (human: 0.5-0.9, AI: 0.2-0.4)</p>
       <p>Sentence count: ${structureAnalysis.burstiness.sentenceCount},
       Mean length: ${structureAnalysis.burstiness.mean} words,
       Range: ${structureAnalysis.burstiness.min}-${structureAnalysis.burstiness.max}</p>
       <p>Adjacent sentences with similar length: ${structureAnalysis.burstiness.similarAdjacentRate}%</p>`
    );

    // Sentence types
    html += buildAnalysisSection(
      'Sentence Type Diversity',
      structureAnalysis.sentenceTypes.score,
      `<p>${structureAnalysis.sentenceTypes.message}</p>
       <p>Declarative: ${structureAnalysis.sentenceTypes.declarative}
       (${structureAnalysis.sentenceTypes.declarativeRate}%),
       Questions: ${structureAnalysis.sentenceTypes.interrogative},
       Exclamatory: ${structureAnalysis.sentenceTypes.exclamatory},
       Imperative: ${structureAnalysis.sentenceTypes.imperative},
       Fragments: ${structureAnalysis.sentenceTypes.fragment}</p>`
    );

    // Paragraph structure
    html += buildAnalysisSection(
      'Paragraph Structure',
      structureAnalysis.paragraphStructure.score,
      `<p>${structureAnalysis.paragraphStructure.message}</p>
       <p>Paragraphs: ${structureAnalysis.paragraphStructure.paragraphCount || 'N/A'},
       Length CV: ${structureAnalysis.paragraphStructure.lengthCV || 'N/A'},
       Sentence count CV: ${structureAnalysis.paragraphStructure.sentenceCV || 'N/A'}</p>`
    );

    // Participial clauses
    html += buildAnalysisSection(
      'Participial Clauses',
      structureAnalysis.participial.score,
      `<p>${structureAnalysis.participial.message}</p>
       <p>Rate: ${structureAnalysis.participial.rate} per sentence
       (human: 0.1-0.2, AI: 0.3-0.6)</p>
       ${structureAnalysis.participial.found.length > 0
        ? `<p>Examples: ${structureAnalysis.participial.found.map(f => `<code>${f}</code>`).join(', ')}</p>`
        : ''}`
    );

    // Nominalizations
    html += buildAnalysisSection(
      'Nominalizations',
      structureAnalysis.nominalization.score,
      `<p>${structureAnalysis.nominalization.message}</p>
       <p>Abstract suffix density: ${structureAnalysis.nominalization.suffixDensity}%
       (target: &lt;5%)</p>
       ${structureAnalysis.nominalization.found.length > 0
        ? `<p>Found: ${structureAnalysis.nominalization.found.map(f =>
          `<code>${f.noun}</code> → try "<em>${f.verb}</em>"`).join(', ')}</p>`
        : ''}`
    );

    analysisContainer.innerHTML = html;

    // Add toggle listeners
    analysisContainer.querySelectorAll('.analysis-header').forEach(header => {
      header.addEventListener('click', () => {
        const body = header.nextElementSibling;
        body.classList.toggle('open');
      });
    });
  }

  function buildAnalysisSection(title, score, content) {
    const scoreClass = score >= 70 ? 'score-high' : score >= 45 ? 'score-mid' : 'score-low';
    return `
      <div class="analysis-section">
        <div class="analysis-header">
          <span class="analysis-title">${title}</span>
          <span class="analysis-score ${scoreClass}">${score}/100</span>
        </div>
        <div class="analysis-body">${content}</div>
      </div>
    `;
  }

  function buildVocabDetails(analysis) {
    let html = `<p>AI word density: ${analysis.aiDensityPercent}%
    (${analysis.aiWordCount} AI-typical words in ${analysis.wordCount} total)</p>`;

    if (analysis.contractionAnalysis.isAILike) {
      html += `<p style="color: var(--accent-yellow);">Low contraction rate:
      ${analysis.contractionAnalysis.contracted} contractions vs
      ${analysis.contractionAnalysis.expanded} expanded forms.
      Human writing typically contracts 60-80% of the time.</p>`;
    }

    if (analysis.findings.length > 0) {
      html += '<div style="margin-top: 0.5rem;">';
      for (const finding of analysis.findings.slice(0, 15)) {
        html += `
          <div class="finding-item">
            <div class="finding-severity ${finding.severity}"></div>
            <div>
              <span class="finding-word">${finding.word}</span>
              ${finding.count > 1 ? ` (×${finding.count})` : ''}
              <br>
              <span class="finding-replacements">→ ${finding.replacements.slice(0, 3).join(', ')}</span>
            </div>
          </div>
        `;
      }
      if (analysis.findings.length > 15) {
        html += `<p style="color: var(--text-muted); margin-top: 0.5rem;">
          ...and ${analysis.findings.length - 15} more findings</p>`;
      }
      html += '</div>';
    } else {
      html += '<p style="color: var(--accent-green);">No AI-typical vocabulary detected.</p>';
    }

    return html;
  }

  // ---- Analyze Button ----
  if (btnAnalyze) {
    btnAnalyze.addEventListener('click', () => {
      const text = inputText.value.trim();
      if (!text) {
        log('No text to analyze.', 'warning');
        return;
      }

      setStatus('Analyzing text...', true);
      log('Running analysis...');

      // Use setTimeout to let UI update
      setTimeout(() => {
        try {
          const vocabAnalysis = VocabularyEngine.analyze(text);
          const structureAnalysis = SentenceAnalyzer.analyze(text);

          displayAnalysis(vocabAnalysis, structureAnalysis);
          state.lastAnalysis = { vocab: vocabAnalysis, structure: structureAnalysis };

          const score = Math.round((vocabAnalysis.score + structureAnalysis.compositeScore) / 2);
          log(`Analysis complete. Humanness score: ${score}/100`, score >= 70 ? 'success' : 'warning');
          setStatus(`Analysis complete — Score: ${score}/100`);
        } catch (err) {
          log(`Analysis error: ${err.message}`, 'error');
          setStatus('Analysis failed');
        }
      }, 50);
    });
  }

  // ---- Humanize (Local) Button ----
  if (btnHumanize) {
    btnHumanize.addEventListener('click', () => {
      const text = inputText.value.trim();
      if (!text) {
        log('No text to humanize.', 'warning');
        return;
      }

      setStatus('Humanizing text (local)...', true);
      log('Running local humanization pipeline...');

      setTimeout(() => {
        try {
          const aggressiveness = aggressivenessSelect ? aggressivenessSelect.value : 'medium';
          const humanized = HumanizerPipeline.humanize(text, {
            aggressiveness,
            targetRegister: 'mixed',
          });

          outputText.value = humanized;
          outputWordCount.textContent = `${countWords(humanized)} words`;

          // Auto-analyze the result
          const vocabAnalysis = VocabularyEngine.analyze(humanized);
          const structureAnalysis = SentenceAnalyzer.analyze(humanized);
          displayAnalysis(vocabAnalysis, structureAnalysis);

          const score = Math.round((vocabAnalysis.score + structureAnalysis.compositeScore) / 2);
          log(`Local humanization complete. New score: ${score}/100`, 'success');
          setStatus(`Humanization complete — Score: ${score}/100`);
        } catch (err) {
          log(`Humanization error: ${err.message}`, 'error');
          setStatus('Humanization failed');
        }
      }, 50);
    });
  }

  // ---- Humanize (LLM) Button ----
  if (btnHumanizeLLM) {
    btnHumanizeLLM.addEventListener('click', async () => {
      const text = inputText.value.trim();
      if (!text) {
        log('No text to humanize.', 'warning');
        return;
      }

      if (!LLMIntegration.isConfigured()) {
        log('API key not set. Go to Settings to configure.', 'error');
        setStatus('API key required — check Settings');
        return;
      }

      setStatus('Humanizing with LLM + local pipeline...', true);
      log('Starting adversarial refinement loop...');

      try {
        const contentType = contentTypeSelect ? contentTypeSelect.value : 'general';
        const result = await LLMIntegration.rewriteWithRefinement(text, contentType, {
          targetScore: 75,
          maxIterations: 3,
          onProgress: (progress) => {
            log(`[${progress.stage}] iteration: ${progress.iteration || 0}, score: ${progress.score || '...'}`,
              progress.stage === 'complete' ? 'success' : 'info');
            setStatus(`Refining (${progress.stage})...`, true);
          }
        });

        outputText.value = result.text;
        outputWordCount.textContent = `${countWords(result.text)} words`;

        displayAnalysis(result.analysis.vocab, result.analysis.structure);

        log(`LLM humanization complete. Score: ${result.score}/100, Iterations: ${result.iterations}, Method: ${result.method}`, 'success');
        setStatus(`LLM humanization complete — Score: ${result.score}/100`);
      } catch (err) {
        log(`LLM humanization error: ${err.message}`, 'error');
        setStatus('LLM humanization failed');
      }
    });
  }

  // ---- Generate Button ----
  if (btnGenerate) {
    btnGenerate.addEventListener('click', async () => {
      const topic = topicInput.value.trim();
      if (!topic) {
        log('Please enter a topic.', 'warning');
        return;
      }

      if (!LLMIntegration.isConfigured()) {
        log('API key not set. Go to Settings to configure.', 'error');
        setStatus('API key required — check Settings');
        return;
      }

      setStatus('Generating human-like text...', true);
      log(`Generating text about: "${topic.substring(0, 50)}..."`);

      try {
        const contentType = generateTypeSelect ? generateTypeSelect.value : 'general';
        const instructions = instructionsInput ? instructionsInput.value : '';

        const result = await LLMIntegration.generateWithRefinement(topic, contentType, {
          targetScore: 75,
          maxIterations: 3,
          additionalInstructions: instructions,
          onProgress: (progress) => {
            log(`[${progress.stage}] iteration: ${progress.iteration || 0}, score: ${progress.score || '...'}`,
              progress.stage === 'complete' ? 'success' : 'info');
            setStatus(`Generating (${progress.stage})...`, true);
          }
        });

        generateOutput.value = result.text;
        generateWordCount.textContent = `${countWords(result.text)} words`;

        displayAnalysis(result.analysis.vocab, result.analysis.structure);

        log(`Generation complete. Score: ${result.score}/100, Iterations: ${result.iterations}`, 'success');
        setStatus(`Generation complete — Score: ${result.score}/100`);
      } catch (err) {
        log(`Generation error: ${err.message}`, 'error');
        setStatus('Generation failed');
      }
    });
  }

  // ---- Copy Buttons ----
  function setupCopyButton(btn, textSource) {
    if (!btn) return;
    btn.addEventListener('click', () => {
      const text = typeof textSource === 'function' ? textSource() : textSource.value;
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = originalText; }, 1500);
      });
    });
  }

  setupCopyButton(btnCopyOutput, outputText);
  setupCopyButton(btnCopyGenerated, generateOutput);

  // ---- Clear Button ----
  if (btnClearInput) {
    btnClearInput.addEventListener('click', () => {
      inputText.value = '';
      outputText.value = '';
      inputWordCount.textContent = '0 words';
      outputWordCount.textContent = '0 words';
      if (analysisContainer) analysisContainer.innerHTML = '';
      if (scoreDisplay) scoreDisplay.classList.add('hidden');
      log('Cleared input and output.', 'info');
    });
  }

  // ---- Settings ----
  if (btnSaveSettings) {
    btnSaveSettings.addEventListener('click', () => {
      const provider = providerSelect ? providerSelect.value : 'openai';
      const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';
      const model = modelInput ? modelInput.value.trim() : '';
      const temperature = temperatureInput ? parseFloat(temperatureInput.value) : 1.0;

      LLMIntegration.configure({
        provider,
        apiKey,
        model: model || undefined,
        temperature: isNaN(temperature) ? 1.0 : temperature,
      });

      // Save to localStorage (key is stored encrypted-ish)
      if (apiKey) {
        try {
          localStorage.setItem('hw_provider', provider);
          localStorage.setItem('hw_api_key', btoa(apiKey));
          localStorage.setItem('hw_model', model);
          localStorage.setItem('hw_temperature', temperature.toString());
        } catch (e) {
          // localStorage not available
        }
      }

      log(`Settings saved. Provider: ${provider}, Model: ${model || 'default'}`, 'success');
      setStatus('Settings saved');
    });
  }

  // Load saved settings
  function loadSettings() {
    try {
      const provider = localStorage.getItem('hw_provider') || 'openai';
      const apiKeyB64 = localStorage.getItem('hw_api_key');
      const model = localStorage.getItem('hw_model') || '';
      const temperature = parseFloat(localStorage.getItem('hw_temperature')) || 1.0;

      if (providerSelect) providerSelect.value = provider;
      if (modelInput) modelInput.value = model;
      if (temperatureInput) temperatureInput.value = temperature;

      if (apiKeyB64) {
        const apiKey = atob(apiKeyB64);
        if (apiKeyInput) apiKeyInput.value = apiKey;
        LLMIntegration.configure({ provider, apiKey, model: model || undefined, temperature });
        log('Settings loaded from storage.', 'info');
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  // ---- Provider change updates model placeholder ----
  if (providerSelect) {
    providerSelect.addEventListener('change', () => {
      const defaults = { openai: 'gpt-4o', anthropic: 'claude-sonnet-4-20250514' };
      if (modelInput) {
        modelInput.placeholder = defaults[providerSelect.value] || 'model name';
      }
    });
  }

  // ---- Initialize ----
  loadSettings();
  setStatus('Ready');
  log('HumanWriter AI Agent initialized.', 'success');

  // Populate content type selects
  function populateContentTypes(selectEl) {
    if (!selectEl) return;
    const types = SystemPrompts.getContentTypes();
    selectEl.innerHTML = '';
    for (const type of types) {
      const option = document.createElement('option');
      option.value = type.id;
      option.textContent = `${type.name} — ${type.description}`;
      selectEl.appendChild(option);
    }
  }

  populateContentTypes(contentTypeSelect);
  populateContentTypes(generateTypeSelect);
});
