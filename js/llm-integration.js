/**
 * LLM Integration Layer
 *
 * Connects to AI APIs (OpenAI, Anthropic) for text generation
 * with built-in humanization prompts. User provides their own API key.
 * Includes adversarial refinement loop.
 */

const LLMIntegration = (() => {
  let config = {
    provider: 'openai', // 'openai' or 'anthropic'
    apiKey: '',
    model: '',
    temperature: 1.0,
    topP: 0.9,
  };

  const DEFAULT_MODELS = {
    openai: 'gpt-4o',
    anthropic: 'claude-sonnet-4-20250514',
  };

  /**
   * Configure the LLM integration
   */
  function configure(options) {
    config = { ...config, ...options };
    if (!config.model) {
      config.model = DEFAULT_MODELS[config.provider] || DEFAULT_MODELS.openai;
    }
  }

  /**
   * Generate text via OpenAI API
   */
  async function generateOpenAI(systemPrompt, userPrompt) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: config.temperature,
        top_p: config.topP,
        frequency_penalty: 0.3, // Reduce word repetition
        presence_penalty: 0.2, // Encourage topic diversity
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Generate text via Anthropic API
   */
  async function generateAnthropic(systemPrompt, userPrompt) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt },
        ],
        temperature: config.temperature,
        top_p: config.topP,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  /**
   * Generate text using the configured provider
   */
  async function generate(systemPrompt, userPrompt) {
    if (!config.apiKey) {
      throw new Error('API key not configured. Please enter your API key in Settings.');
    }

    if (config.provider === 'anthropic') {
      return generateAnthropic(systemPrompt, userPrompt);
    }
    return generateOpenAI(systemPrompt, userPrompt);
  }

  /**
   * Generate human-like text for a given topic
   */
  async function generateText(topic, contentType = 'general', additionalInstructions = '') {
    const { systemPrompt, userPrompt } = SystemPrompts.buildPrompt(
      contentType, topic, additionalInstructions
    );
    return generate(systemPrompt, userPrompt);
  }

  /**
   * Rewrite existing text to be more human-like via LLM
   */
  async function rewriteText(text, contentType = 'general') {
    const { systemPrompt, userPrompt } = SystemPrompts.getRewritePrompt(text, contentType);
    return generate(systemPrompt, userPrompt);
  }

  /**
   * Adversarial refinement loop:
   * 1. Generate/rewrite text
   * 2. Analyze with our detectors
   * 3. If score is low, request targeted improvements
   * 4. Repeat until score is acceptable or max iterations reached
   */
  async function generateWithRefinement(topic, contentType = 'general', options = {}) {
    const {
      targetScore = 75,
      maxIterations = 3,
      additionalInstructions = '',
      onProgress = () => {},
    } = options;

    let currentText;
    let iteration = 0;

    // Initial generation
    onProgress({ stage: 'generating', iteration: 0 });
    currentText = await generateText(topic, contentType, additionalInstructions);

    while (iteration < maxIterations) {
      iteration++;

      // Analyze current text
      onProgress({ stage: 'analyzing', iteration });
      const vocabAnalysis = VocabularyEngine.analyze(currentText);
      const structureAnalysis = SentenceAnalyzer.analyze(currentText);
      const overallScore = Math.round((vocabAnalysis.score + structureAnalysis.compositeScore) / 2);

      onProgress({
        stage: 'scored',
        iteration,
        score: overallScore,
        vocabScore: vocabAnalysis.score,
        structureScore: structureAnalysis.compositeScore,
      });

      // If score is good enough, stop
      if (overallScore >= targetScore) {
        return {
          text: currentText,
          score: overallScore,
          iterations: iteration,
          analysis: { vocab: vocabAnalysis, structure: structureAnalysis }
        };
      }

      // Build targeted improvement prompt
      const issues = [];

      if (vocabAnalysis.findings.length > 0) {
        const topIssues = vocabAnalysis.findings.slice(0, 5);
        issues.push(`VOCABULARY ISSUES: Replace these AI-typical words/phrases: ${topIssues.map(f => `"${f.word}" (use: ${f.replacements.slice(0, 2).join(' or ')})`).join('; ')}`);
      }

      if (vocabAnalysis.contractionAnalysis.isAILike) {
        issues.push('CONTRACTIONS: Use more contractions (don\'t, isn\'t, it\'s, etc.) — your text is too formal.');
      }

      if (structureAnalysis.burstiness.isAILike) {
        issues.push(`SENTENCE LENGTH: Your sentences are too uniform (CV: ${structureAnalysis.burstiness.cv}). Mix short punchy sentences (3-6 words) with longer ones (20-30 words).`);
      }

      if (structureAnalysis.sentenceTypes.isAILike) {
        issues.push('SENTENCE TYPES: Too many declarative sentences. Add questions, short fragments, or imperative sentences.');
      }

      if (structureAnalysis.paragraphStructure.isAILike) {
        issues.push('PARAGRAPH STRUCTURE: Paragraphs are too uniform in length. Vary them — some short (1-2 sentences), some longer (5-6).');
      }

      if (structureAnalysis.participial.isAILike) {
        issues.push('PARTICIPIAL CLAUSES: Too many -ing constructions. Restructure sentences to use simpler forms.');
      }

      if (issues.length === 0) break;

      // Request refinement
      onProgress({ stage: 'refining', iteration, issues: issues.length });

      const refinementPrompt = `Rewrite the following text, fixing these specific issues:

${issues.join('\n')}

IMPORTANT: Keep the same content and meaning. Change the WRITING STYLE to address the issues above. Make it sound more natural and human.

TEXT TO REWRITE:
${currentText}`;

      const systemPrompt = SystemPrompts.getPrompt(contentType);
      currentText = await generate(systemPrompt, refinementPrompt);
    }

    // Apply local humanization as final pass
    const localHumanized = HumanizerPipeline.humanize(currentText, {
      aggressiveness: 'medium',
      targetRegister: 'mixed',
    });

    const finalVocab = VocabularyEngine.analyze(localHumanized);
    const finalStructure = SentenceAnalyzer.analyze(localHumanized);
    const finalScore = Math.round((finalVocab.score + finalStructure.compositeScore) / 2);

    onProgress({ stage: 'complete', score: finalScore });

    return {
      text: localHumanized,
      score: finalScore,
      iterations: iteration,
      analysis: { vocab: finalVocab, structure: finalStructure }
    };
  }

  /**
   * Rewrite with adversarial refinement loop
   */
  async function rewriteWithRefinement(text, contentType = 'general', options = {}) {
    const {
      targetScore = 75,
      maxIterations = 3,
      onProgress = () => {},
    } = options;

    let currentText;
    let iteration = 0;

    // First: apply local humanization
    onProgress({ stage: 'local_humanize', iteration: 0 });
    currentText = HumanizerPipeline.humanize(text, {
      aggressiveness: 'medium',
      targetRegister: 'mixed',
    });

    // Check if local humanization is sufficient
    const localVocab = VocabularyEngine.analyze(currentText);
    const localStructure = SentenceAnalyzer.analyze(currentText);
    const localScore = Math.round((localVocab.score + localStructure.compositeScore) / 2);

    if (localScore >= targetScore) {
      onProgress({ stage: 'complete', score: localScore });
      return {
        text: currentText,
        score: localScore,
        iterations: 0,
        analysis: { vocab: localVocab, structure: localStructure },
        method: 'local_only'
      };
    }

    // If API key is available, use LLM rewriting
    if (config.apiKey) {
      onProgress({ stage: 'rewriting', iteration: 0 });
      currentText = await rewriteText(text, contentType);

      // Apply local humanization on top
      currentText = HumanizerPipeline.humanize(currentText, {
        aggressiveness: 'light',
        targetRegister: 'mixed',
      });

      while (iteration < maxIterations) {
        iteration++;

        const vocabAnalysis = VocabularyEngine.analyze(currentText);
        const structureAnalysis = SentenceAnalyzer.analyze(currentText);
        const score = Math.round((vocabAnalysis.score + structureAnalysis.compositeScore) / 2);

        onProgress({ stage: 'scored', iteration, score });

        if (score >= targetScore) {
          return {
            text: currentText,
            score,
            iterations: iteration,
            analysis: { vocab: vocabAnalysis, structure: structureAnalysis },
            method: 'llm_rewrite'
          };
        }

        if (iteration < maxIterations) {
          onProgress({ stage: 'refining', iteration });
          currentText = await rewriteText(currentText, contentType);
          currentText = HumanizerPipeline.humanize(currentText, {
            aggressiveness: 'light',
            targetRegister: 'mixed',
          });
        }
      }
    }

    // Final analysis
    const finalVocab = VocabularyEngine.analyze(currentText);
    const finalStructure = SentenceAnalyzer.analyze(currentText);
    const finalScore = Math.round((finalVocab.score + finalStructure.compositeScore) / 2);

    onProgress({ stage: 'complete', score: finalScore });

    return {
      text: currentText,
      score: finalScore,
      iterations: iteration,
      analysis: { vocab: finalVocab, structure: finalStructure },
      method: config.apiKey ? 'llm_rewrite' : 'local_only'
    };
  }

  /**
   * Check if the integration is configured
   */
  function isConfigured() {
    return !!config.apiKey;
  }

  function getConfig() {
    return { ...config, apiKey: config.apiKey ? '***' : '' };
  }

  return {
    configure,
    generate,
    generateText,
    rewriteText,
    generateWithRefinement,
    rewriteWithRefinement,
    isConfigured,
    getConfig,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LLMIntegration;
}
