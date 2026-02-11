/**
 * Humanizer Pipeline
 *
 * Multi-pass text transformation that converts AI-generated text
 * into more human-like prose. Applies transformations in order:
 *
 * 1. Vocabulary replacement (AI words → human alternatives)
 * 2. Sentence restructuring (vary lengths, break uniformity)
 * 3. Register modulation (mix formal/informal)
 * 4. Structural variation (paragraph lengths, topic sentence position)
 * 5. Natural imperfections (contractions, casual connectors)
 */

const HumanizerPipeline = (() => {

  /**
   * Main humanization function
   * Takes raw text and returns humanized version
   */
  function humanize(text, options = {}) {
    const {
      aggressiveness = 'medium', // 'light', 'medium', 'aggressive'
      preserveMeaning = true,
      targetRegister = 'mixed', // 'formal', 'informal', 'mixed'
    } = options;

    let result = text;

    // Pass 1: Vocabulary replacement
    result = VocabularyEngine.humanize(result);

    // Pass 2: Sentence restructuring
    result = restructureSentences(result, aggressiveness);

    // Pass 3: Register modulation
    result = modulateRegister(result, targetRegister);

    // Pass 4: Structural variation
    result = varyStructure(result, aggressiveness);

    // Pass 5: Natural patterns
    result = addNaturalPatterns(result, aggressiveness);

    // Clean up double spaces, trailing whitespace
    result = result.replace(/  +/g, ' ').replace(/ +\n/g, '\n').trim();

    return result;
  }

  /**
   * Pass 2: Sentence restructuring
   * Breaks uniformity in sentence lengths
   */
  function restructureSentences(text, aggressiveness) {
    const paragraphs = text.split(/\n\s*\n/);

    return paragraphs.map(paragraph => {
      const sentences = splitIntoSentences(paragraph);
      if (sentences.length < 3) return paragraph;

      const result = [];
      for (let i = 0; i < sentences.length; i++) {
        let sentence = sentences[i];
        const words = sentence.split(/\s+/);

        // Occasionally merge short adjacent sentences
        if (words.length < 8 && i + 1 < sentences.length) {
          const nextWords = sentences[i + 1].split(/\s+/);
          if (nextWords.length < 10 && Math.random() < 0.3) {
            // Merge with connector
            const connectors = [' — and ', ', and ', '; ', ' — '];
            const connector = connectors[Math.floor(Math.random() * connectors.length)];
            sentence = sentence.replace(/[.!]$/, '') + connector +
              sentences[i + 1].charAt(0).toLowerCase() + sentences[i + 1].slice(1);
            i++; // Skip next sentence
          }
        }

        // Occasionally split very long sentences
        if (words.length > 30 && aggressiveness !== 'light') {
          const splitPoint = findNaturalSplitPoint(sentence);
          if (splitPoint > -1) {
            const part1 = sentence.substring(0, splitPoint).trim();
            const part2 = sentence.substring(splitPoint).trim();
            // Remove connector from start of part2
            const cleaned = part2.replace(/^(,\s*|;\s*|and\s+|but\s+|which\s+|that\s+)/, '');
            if (cleaned.length > 0) {
              result.push(part1 + '.');
              result.push(cleaned.charAt(0).toUpperCase() + cleaned.slice(1));
              continue;
            }
          }
        }

        // Add occasional short interjections between sentences
        if (aggressiveness === 'aggressive' && Math.random() < 0.08 && i > 0) {
          const interjections = [
            'Right.', 'Think about it.', 'Makes sense.', 'Pretty clear.',
            'That matters.', 'Big difference.', 'Worth noting.',
            'Here\'s the thing.', 'Look.',
          ];
          result.push(interjections[Math.floor(Math.random() * interjections.length)]);
        }

        result.push(sentence);
      }

      return result.join(' ');
    }).join('\n\n');
  }

  /**
   * Find a natural point to split a long sentence
   */
  function findNaturalSplitPoint(sentence) {
    // Look for natural break points: semicolons, "which", "but", "and" after a comma
    const patterns = [
      /;\s/g,
      /,\s+which\s/gi,
      /,\s+but\s/gi,
      /,\s+and\s/gi,
      /,\s+so\s/gi,
    ];

    const midpoint = sentence.length / 2;
    let bestSplit = -1;
    let bestDistance = Infinity;

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(sentence)) !== null) {
        const distance = Math.abs(match.index - midpoint);
        if (distance < bestDistance && match.index > sentence.length * 0.25 && match.index < sentence.length * 0.75) {
          bestDistance = distance;
          bestSplit = match.index;
        }
      }
    }

    return bestSplit;
  }

  /**
   * Pass 3: Register modulation
   * Shifts between formal and informal within the text
   */
  function modulateRegister(text, targetRegister) {
    if (targetRegister === 'formal') return text;

    let result = text;

    // Informal replacements (applied probabilistically)
    const informalSwaps = [
      { formal: /\bIn addition\b/g, informal: ['Also', 'Plus', 'And'] },
      { formal: /\bFor example\b/g, informal: ['Like', 'Say', 'For instance', 'Take'] },
      { formal: /\bHowever\b/g, informal: ['But', 'Though', 'Still', 'That said'] },
      { formal: /\bTherefore\b/g, informal: ['So', 'That\'s why', 'Which means'] },
      { formal: /\bNevertheless\b/g, informal: ['Still', 'Even so', 'But still'] },
      { formal: /\bFurthermore\b/g, informal: ['Plus', 'Also', 'And'] },
      { formal: /\bConsequently\b/g, informal: ['So', 'As a result', 'That means'] },
      { formal: /\bsubsequently\b/g, informal: ['then', 'after that', 'later'] },
      { formal: /\bprior to\b/g, informal: ['before'] },
      { formal: /\bin order to\b/g, informal: ['to'] },
      { formal: /\bat this point in time\b/g, informal: ['now', 'right now'] },
      { formal: /\bdue to the fact that\b/g, informal: ['because', 'since'] },
      { formal: /\bin spite of the fact that\b/g, informal: ['even though', 'despite'] },
      { formal: /\bfor the purpose of\b/g, informal: ['to', 'for'] },
      { formal: /\bwith regard to\b/g, informal: ['about', 'regarding'] },
      { formal: /\bin the event that\b/g, informal: ['if'] },
      { formal: /\ba significant number of\b/g, informal: ['many', 'a lot of', 'plenty of'] },
      { formal: /\bin the context of\b/g, informal: ['in', 'for', 'when it comes to'] },
    ];

    const swapProbability = targetRegister === 'informal' ? 0.8 : 0.5;

    for (const { formal, informal } of informalSwaps) {
      result = result.replace(formal, (match) => {
        if (Math.random() < swapProbability) {
          const choice = informal[Math.floor(Math.random() * informal.length)];
          // Preserve capitalization
          if (match[0] === match[0].toUpperCase()) {
            return choice.charAt(0).toUpperCase() + choice.slice(1);
          }
          return choice;
        }
        return match;
      });
    }

    return result;
  }

  /**
   * Pass 4: Structural variation
   * Vary paragraph lengths and structures
   */
  function varyStructure(text, aggressiveness) {
    const paragraphs = text.split(/\n\s*\n/);
    if (paragraphs.length < 3) return text;

    const result = [];

    for (let i = 0; i < paragraphs.length; i++) {
      let para = paragraphs[i];
      const sentences = splitIntoSentences(para);

      // Occasionally split long paragraphs (>6 sentences)
      if (sentences.length > 6 && Math.random() < 0.5) {
        const splitAt = Math.floor(sentences.length * (0.4 + Math.random() * 0.2));
        result.push(sentences.slice(0, splitAt).join(' '));
        result.push(sentences.slice(splitAt).join(' '));
        continue;
      }

      // Occasionally merge short adjacent paragraphs
      if (sentences.length <= 2 && i + 1 < paragraphs.length && Math.random() < 0.3) {
        const nextSentences = splitIntoSentences(paragraphs[i + 1]);
        if (nextSentences.length <= 3) {
          result.push(para + ' ' + paragraphs[i + 1]);
          i++; // Skip next paragraph
          continue;
        }
      }

      result.push(para);
    }

    return result.join('\n\n');
  }

  /**
   * Pass 5: Add natural human patterns
   */
  function addNaturalPatterns(text, aggressiveness) {
    let result = text;

    // Remove overly balanced "on one hand... on the other hand" constructions
    // when present in the same paragraph
    result = result.replace(
      /On one hand,([^.]+)\.\s*On the other hand,([^.]+)\./gi,
      (match, p1, p2) => {
        if (Math.random() < 0.5) {
          return `Sure,${p1}. But${p2}.`;
        }
        return `${p1.trim().charAt(0).toUpperCase() + p1.trim().slice(1)}. Then again,${p2}.`;
      }
    );

    // Replace "It is important to note that X" → more natural forms
    result = result.replace(
      /It is important to note that ([^.]+)\./gi,
      (match, content) => {
        const alternatives = [
          `${content.charAt(0).toUpperCase() + content.slice(1)} — that part matters.`,
          `Here's what people miss: ${content}.`,
          `Don't overlook this: ${content}.`,
          `${content.charAt(0).toUpperCase() + content.slice(1)}.`,
        ];
        return alternatives[Math.floor(Math.random() * alternatives.length)];
      }
    );

    // Reduce consecutive sentences starting with "This" or "It" or "The"
    result = reduceRepetitiveStarters(result);

    // Add occasional personal touch (first person) in aggressive mode
    if (aggressiveness === 'aggressive') {
      result = addPersonalVoice(result);
    }

    return result;
  }

  /**
   * Reduce sentences that start with the same word
   */
  function reduceRepetitiveStarters(text) {
    const paragraphs = text.split(/\n\s*\n/);

    return paragraphs.map(paragraph => {
      const sentences = splitIntoSentences(paragraph);
      if (sentences.length < 3) return paragraph;

      for (let i = 1; i < sentences.length; i++) {
        const prevFirst = getFirstWord(sentences[i - 1]);
        const currFirst = getFirstWord(sentences[i]);

        if (prevFirst === currFirst && ['This', 'The', 'It', 'These', 'There'].includes(currFirst)) {
          // Try to restructure the sentence
          const alternatives = {
            'This': ['That', 'Which', 'And this', 'What\'s more, this'],
            'The': ['That', 'A', 'And the', 'Meanwhile, the'],
            'It': ['That', 'And it', 'Which'],
            'These': ['Those', 'Such', 'All these'],
            'There': ['Here', 'And there', 'You\'ll find'],
          };

          const options = alternatives[currFirst] || [];
          if (options.length > 0 && Math.random() < 0.6) {
            const replacement = options[Math.floor(Math.random() * options.length)];
            sentences[i] = replacement + sentences[i].substring(currFirst.length);
          }
        }
      }

      return sentences.join(' ');
    }).join('\n\n');
  }

  function getFirstWord(sentence) {
    const match = sentence.match(/^(\w+)/);
    return match ? match[1] : '';
  }

  /**
   * Add occasional first-person perspective
   */
  function addPersonalVoice(text) {
    const paragraphs = text.split(/\n\s*\n/);
    const totalParagraphs = paragraphs.length;

    // Add personal voice to ~10-15% of paragraphs
    const targetCount = Math.max(1, Math.floor(totalParagraphs * 0.12));
    const indices = new Set();

    while (indices.size < targetCount && indices.size < totalParagraphs) {
      indices.add(Math.floor(Math.random() * totalParagraphs));
    }

    const personalPhrases = [
      'I think ',
      'In my experience, ',
      'The way I see it, ',
      'From what I\'ve seen, ',
      'I\'ve found that ',
      'Honestly, ',
      'If you ask me, ',
    ];

    return paragraphs.map((para, i) => {
      if (indices.has(i)) {
        const sentences = splitIntoSentences(para);
        if (sentences.length > 1) {
          // Insert personal phrase in a random sentence (not the first)
          const targetSentence = 1 + Math.floor(Math.random() * (sentences.length - 1));
          const phrase = personalPhrases[Math.floor(Math.random() * personalPhrases.length)];
          sentences[targetSentence] = phrase +
            sentences[targetSentence].charAt(0).toLowerCase() +
            sentences[targetSentence].slice(1);
          return sentences.join(' ');
        }
      }
      return para;
    }).join('\n\n');
  }

  /**
   * Simple sentence splitter
   */
  function splitIntoSentences(text) {
    return text
      .replace(/([.!?])\s+/g, '$1|SPLIT|')
      .split('|SPLIT|')
      .filter(s => s.trim().length > 0)
      .map(s => s.trim());
  }

  /**
   * Generate a humanness report showing before/after analysis
   */
  function generateReport(originalText, humanizedText) {
    const originalVocab = VocabularyEngine.analyze(originalText);
    const humanizedVocab = VocabularyEngine.analyze(humanizedText);

    const originalStructure = SentenceAnalyzer.analyze(originalText);
    const humanizedStructure = SentenceAnalyzer.analyze(humanizedText);

    return {
      original: {
        vocabScore: originalVocab.score,
        structureScore: originalStructure.compositeScore,
        overallScore: Math.round((originalVocab.score + originalStructure.compositeScore) / 2),
        details: { vocab: originalVocab, structure: originalStructure }
      },
      humanized: {
        vocabScore: humanizedVocab.score,
        structureScore: humanizedStructure.compositeScore,
        overallScore: Math.round((humanizedVocab.score + humanizedStructure.compositeScore) / 2),
        details: { vocab: humanizedVocab, structure: humanizedStructure }
      },
      improvement: {
        vocabDelta: humanizedVocab.score - originalVocab.score,
        structureDelta: humanizedStructure.compositeScore - originalStructure.compositeScore,
        overallDelta: Math.round(
          ((humanizedVocab.score + humanizedStructure.compositeScore) / 2) -
          ((originalVocab.score + originalStructure.compositeScore) / 2)
        )
      }
    };
  }

  return {
    humanize,
    generateReport,
    restructureSentences,
    modulateRegister,
    varyStructure,
    addNaturalPatterns,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = HumanizerPipeline;
}
