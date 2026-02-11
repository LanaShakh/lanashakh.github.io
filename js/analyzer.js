/**
 * Sentence Structure Analyzer
 *
 * Analyzes text for AI-typical structural patterns:
 * - Sentence length uniformity (low burstiness)
 * - Participial clause overuse
 * - Nominalization density
 * - Paragraph uniformity
 * - Structural predictability
 */

const SentenceAnalyzer = (() => {

  /**
   * Split text into sentences (handles abbreviations, decimals, etc.)
   */
  function splitSentences(text) {
    // Simple but effective sentence splitter
    const raw = text.replace(/([.!?])\s+/g, '$1|SPLIT|').split('|SPLIT|');
    return raw.filter(s => s.trim().length > 0).map(s => s.trim());
  }

  /**
   * Split text into paragraphs
   */
  function splitParagraphs(text) {
    return text.split(/\n\s*\n/).filter(p => p.trim().length > 0).map(p => p.trim());
  }

  /**
   * Count words in a string
   */
  function wordCount(str) {
    return str.split(/\s+/).filter(w => w.length > 0).length;
  }

  /**
   * Calculate standard deviation
   */
  function stdDev(arr) {
    if (arr.length < 2) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const squaredDiffs = arr.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / arr.length);
  }

  /**
   * Calculate coefficient of variation (normalized measure)
   */
  function coefficientOfVariation(arr) {
    if (arr.length < 2) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    if (mean === 0) return 0;
    return stdDev(arr) / mean;
  }

  /**
   * Analyze burstiness (sentence length variation)
   * Human writing: CV typically 0.5-0.9
   * AI writing: CV typically 0.2-0.4
   */
  function analyzeBurstiness(text) {
    const sentences = splitSentences(text);
    const lengths = sentences.map(s => wordCount(s));

    if (lengths.length < 3) {
      return { score: 50, cv: 0, message: 'Too few sentences to analyze burstiness' };
    }

    const cv = coefficientOfVariation(lengths);
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const sd = stdDev(lengths);
    const min = Math.min(...lengths);
    const max = Math.max(...lengths);

    // Check for consecutive same-length sentences
    let sameLength = 0;
    for (let i = 1; i < lengths.length; i++) {
      if (Math.abs(lengths[i] - lengths[i - 1]) <= 3) {
        sameLength++;
      }
    }
    const similarAdjacentRate = sameLength / (lengths.length - 1);

    // Score: higher is more human-like
    let score;
    if (cv >= 0.6) score = 90;
    else if (cv >= 0.5) score = 80;
    else if (cv >= 0.4) score = 65;
    else if (cv >= 0.3) score = 45;
    else if (cv >= 0.2) score = 30;
    else score = 15;

    // Penalize high similarity between adjacent sentences
    if (similarAdjacentRate > 0.6) score -= 15;
    else if (similarAdjacentRate > 0.4) score -= 8;

    score = Math.max(0, Math.min(100, score));

    return {
      score,
      cv: cv.toFixed(3),
      mean: mean.toFixed(1),
      stdDev: sd.toFixed(1),
      min,
      max,
      sentenceCount: lengths.length,
      similarAdjacentRate: (similarAdjacentRate * 100).toFixed(1),
      lengths,
      isAILike: cv < 0.4,
      message: cv < 0.3
        ? 'Very uniform sentence lengths — strong AI signal'
        : cv < 0.4
          ? 'Somewhat uniform — mild AI signal'
          : cv < 0.5
            ? 'Moderate variation — borderline'
            : 'Good variation — reads more human'
    };
  }

  /**
   * Detect participial clause overuse
   * AI uses participial clauses at 2-5x human rate
   */
  function analyzeParticipialClauses(text) {
    const sentences = splitSentences(text);
    const totalSentences = sentences.length;
    if (totalSentences === 0) return { score: 100, rate: 0, count: 0 };

    // Patterns for participial clauses
    const patterns = [
      /\b\w+ing\s+(the|a|an|their|his|her|its|our|my|your)\b/gi,  // "Leveraging the..."
      /^[A-Z]\w+ing\s/gm,                                          // Sentence starting with -ing
      /,\s*\w+ing\s/gi,                                             // ", creating..."
      /,\s*\w+ed\s+by\b/gi,                                        // ", followed by..."
    ];

    let count = 0;
    const found = [];
    for (const sentence of sentences) {
      for (const pattern of patterns) {
        pattern.lastIndex = 0;
        const matches = sentence.match(pattern);
        if (matches) {
          count += matches.length;
          found.push(...matches.map(m => m.trim()));
        }
      }
    }

    const rate = count / totalSentences;
    // Human rate is ~0.1-0.2 participial clauses per sentence
    // AI rate is ~0.3-0.6
    let score;
    if (rate <= 0.15) score = 95;
    else if (rate <= 0.25) score = 80;
    else if (rate <= 0.35) score = 60;
    else if (rate <= 0.5) score = 40;
    else score = 20;

    return {
      score,
      count,
      rate: rate.toFixed(3),
      found: found.slice(0, 10), // Show first 10
      isAILike: rate > 0.3,
      message: rate > 0.3
        ? 'High participial clause usage — AI signal'
        : 'Normal participial clause usage'
    };
  }

  /**
   * Detect nominalization overuse
   * AI converts verbs to noun forms at higher rates
   */
  function analyzeNominalizations(text) {
    const nominalizations = [
      { noun: 'utilization', verb: 'use' },
      { noun: 'implementation', verb: 'implement' },
      { noun: 'optimization', verb: 'optimize' },
      { noun: 'facilitation', verb: 'help' },
      { noun: 'determination', verb: 'determine' },
      { noun: 'establishment', verb: 'establish' },
      { noun: 'consideration', verb: 'consider' },
      { noun: 'examination', verb: 'examine' },
      { noun: 'demonstration', verb: 'show' },
      { noun: 'communication', verb: 'communicate' },
      { noun: 'participation', verb: 'participate' },
      { noun: 'recommendation', verb: 'recommend' },
      { noun: 'investigation', verb: 'investigate' },
      { noun: 'exploration', verb: 'explore' },
      { noun: 'collaboration', verb: 'work together' },
      { noun: 'transformation', verb: 'transform' },
      { noun: 'maximization', verb: 'maximize' },
      { noun: 'minimization', verb: 'minimize' },
      { noun: 'conceptualization', verb: 'think of' },
      { noun: 'prioritization', verb: 'prioritize' },
      { noun: 'visualization', verb: 'picture' },
      { noun: 'actualization', verb: 'achieve' },
      { noun: 'formalization', verb: 'formalize' },
      { noun: 'operationalization', verb: 'put into practice' },
      { noun: 'standardization', verb: 'standardize' },
    ];

    const words = text.toLowerCase().split(/\s+/);
    const totalWords = words.length;
    let count = 0;
    const found = [];

    for (const { noun, verb } of nominalizations) {
      const regex = new RegExp(`\\b${noun}s?\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        count += matches.length;
        found.push({ noun, verb, count: matches.length });
      }
    }

    // Also check -tion, -ment, -ness suffixes density
    const suffixPattern = /\b\w{6,}(tion|ment|ness|ance|ence)\b/gi;
    const suffixMatches = text.match(suffixPattern) || [];
    const suffixDensity = totalWords > 0 ? suffixMatches.length / totalWords : 0;

    const nominalizationDensity = totalWords > 0 ? count / totalWords : 0;

    let score;
    if (suffixDensity <= 0.03) score = 90;
    else if (suffixDensity <= 0.05) score = 75;
    else if (suffixDensity <= 0.07) score = 55;
    else if (suffixDensity <= 0.1) score = 35;
    else score = 15;

    // Additional penalty for specific AI nominalizations
    score -= count * 3;
    score = Math.max(0, Math.min(100, score));

    return {
      score,
      count,
      found,
      suffixDensity: (suffixDensity * 100).toFixed(2),
      suffixCount: suffixMatches.length,
      isAILike: suffixDensity > 0.06 || count > 3,
      message: suffixDensity > 0.06
        ? 'High nominalization density — AI signal'
        : 'Normal nominalization usage'
    };
  }

  /**
   * Analyze paragraph structure uniformity
   */
  function analyzeParagraphStructure(text) {
    const paragraphs = splitParagraphs(text);
    if (paragraphs.length < 3) {
      return { score: 50, message: 'Too few paragraphs to analyze' };
    }

    const lengths = paragraphs.map(p => wordCount(p));
    const sentenceCounts = paragraphs.map(p => splitSentences(p).length);

    const lengthCV = coefficientOfVariation(lengths);
    const sentenceCV = coefficientOfVariation(sentenceCounts);

    // Check if all paragraphs have similar sentence count (AI pattern)
    let score;
    const avgCV = (lengthCV + sentenceCV) / 2;

    if (avgCV >= 0.5) score = 90;
    else if (avgCV >= 0.4) score = 75;
    else if (avgCV >= 0.3) score = 55;
    else if (avgCV >= 0.2) score = 35;
    else score = 20;

    return {
      score,
      paragraphCount: paragraphs.length,
      lengthCV: lengthCV.toFixed(3),
      sentenceCV: sentenceCV.toFixed(3),
      paragraphLengths: lengths,
      sentencesPerParagraph: sentenceCounts,
      isAILike: avgCV < 0.3,
      message: avgCV < 0.3
        ? 'Very uniform paragraph structure — AI signal'
        : 'Adequate paragraph variation'
    };
  }

  /**
   * Detect sentence type distribution
   * AI overuses declarative sentences; humans mix in questions, fragments, exclamations
   */
  function analyzeSentenceTypes(text) {
    const sentences = splitSentences(text);
    if (sentences.length < 5) {
      return { score: 50, message: 'Too few sentences to analyze types' };
    }

    let declarative = 0;
    let interrogative = 0;
    let exclamatory = 0;
    let imperative = 0;
    let fragment = 0;

    for (const s of sentences) {
      const trimmed = s.trim();
      if (trimmed.endsWith('?')) interrogative++;
      else if (trimmed.endsWith('!')) exclamatory++;
      else if (wordCount(trimmed) <= 4) fragment++;
      else if (/^(do|don't|try|look|see|think|consider|note|remember|check|go|stop|start|make|let)/i.test(trimmed)) {
        imperative++;
      } else {
        declarative++;
      }
    }

    const total = sentences.length;
    const declarativeRate = declarative / total;

    // Human writing typically has 70-85% declarative
    // AI writing typically has 90-100% declarative
    let score;
    if (declarativeRate <= 0.75) score = 95;
    else if (declarativeRate <= 0.82) score = 85;
    else if (declarativeRate <= 0.88) score = 70;
    else if (declarativeRate <= 0.93) score = 50;
    else score = 25;

    return {
      score,
      total,
      declarative,
      interrogative,
      exclamatory,
      imperative,
      fragment,
      declarativeRate: (declarativeRate * 100).toFixed(1),
      isAILike: declarativeRate > 0.9,
      message: declarativeRate > 0.9
        ? 'Almost all declarative sentences — AI signal. Mix in questions and shorter phrases.'
        : 'Good sentence type variety'
    };
  }

  /**
   * Full structural analysis
   */
  function analyze(text) {
    const burstiness = analyzeBurstiness(text);
    const participial = analyzeParticipialClauses(text);
    const nominalization = analyzeNominalizations(text);
    const paragraphStructure = analyzeParagraphStructure(text);
    const sentenceTypes = analyzeSentenceTypes(text);

    // Weighted composite score
    const compositeScore = Math.round(
      burstiness.score * 0.30 +
      participial.score * 0.15 +
      nominalization.score * 0.15 +
      paragraphStructure.score * 0.20 +
      sentenceTypes.score * 0.20
    );

    return {
      compositeScore,
      burstiness,
      participial,
      nominalization,
      paragraphStructure,
      sentenceTypes,
      isAILike: compositeScore < 50,
      overallMessage: compositeScore < 30
        ? 'Strong AI writing patterns detected across multiple dimensions'
        : compositeScore < 50
          ? 'Moderate AI patterns — needs work on structure variation'
          : compositeScore < 70
            ? 'Some AI patterns remain — minor improvements recommended'
            : 'Text structure looks largely human-like'
    };
  }

  return {
    analyze,
    analyzeBurstiness,
    analyzeParticipialClauses,
    analyzeNominalizations,
    analyzeParagraphStructure,
    analyzeSentenceTypes,
    splitSentences,
    splitParagraphs,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SentenceAnalyzer;
}
