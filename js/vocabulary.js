/**
 * Vocabulary Engine
 *
 * Manages AI-overused word detection and replacement with natural human alternatives.
 * Based on CMU PNAS study (2025) and corpus frequency analysis.
 */

const VocabularyEngine = (() => {
  // Words that AI uses at 10-150x the rate of human writers
  // Format: { word: [replacement1, replacement2, ...] }
  const AI_OVERUSED_WORDS = {
    // Extremely overused (50-150x human rate)
    'delve': ['explore', 'dig into', 'look at', 'examine', 'get into'],
    'tapestry': ['mix', 'blend', 'collection', 'web', 'fabric'],
    'camaraderie': ['friendship', 'bond', 'closeness', 'team spirit', 'good vibes'],
    'testament': ['proof', 'sign', 'evidence', 'example', 'result'],
    'multifaceted': ['complex', 'varied', 'layered', 'many-sided'],
    'ever-evolving': ['changing', 'shifting', 'growing', 'developing'],
    'underscores': ['shows', 'highlights', 'points to', 'makes clear'],
    'pivotal': ['key', 'important', 'major', 'critical', 'big'],
    'nuance': ['detail', 'subtlety', 'fine point', 'shade of meaning'],
    'nuanced': ['detailed', 'subtle', 'complex', 'layered', 'thoughtful'],
    'holistic': ['complete', 'full', 'overall', 'broad', 'whole'],

    // Highly overused (20-50x human rate)
    'comprehensive': ['complete', 'full', 'thorough', 'wide-ranging', 'detailed'],
    'intricate': ['complex', 'detailed', 'involved', 'complicated'],
    'commendable': ['impressive', 'good', 'solid', 'noteworthy', 'praiseworthy'],
    'meticulous': ['careful', 'thorough', 'detailed', 'precise'],
    'noteworthy': ['important', 'interesting', 'worth mentioning', 'remarkable'],
    'invaluable': ['very useful', 'extremely helpful', 'essential', 'priceless'],
    'groundbreaking': ['new', 'innovative', 'original', 'pioneering'],
    'paramount': ['crucial', 'vital', 'essential', 'top priority', 'most important'],
    'embark': ['start', 'begin', 'set out on', 'launch into'],
    'foster': ['encourage', 'support', 'build', 'grow', 'promote'],
    'leverage': ['use', 'take advantage of', 'apply', 'harness'],
    'utilize': ['use', 'employ', 'apply', 'work with'],
    'facilitate': ['help', 'enable', 'make easier', 'support'],
    'streamline': ['simplify', 'improve', 'speed up', 'make efficient'],
    'optimize': ['improve', 'fine-tune', 'make better', 'enhance'],
    'synergy': ['teamwork', 'cooperation', 'combined effort', 'collaboration'],
    'paradigm': ['model', 'framework', 'approach', 'way of thinking'],
    'robust': ['strong', 'solid', 'reliable', 'sturdy'],
    'seamless': ['smooth', 'easy', 'effortless', 'uninterrupted'],
    'realm': ['area', 'field', 'domain', 'world', 'space'],

    // Moderately overused (10-20x human rate)
    'landscape': ['scene', 'field', 'area', 'environment', 'world'],
    'navigate': ['handle', 'deal with', 'work through', 'manage', 'get through'],
    'underscore': ['show', 'highlight', 'stress', 'emphasize'],
    'encompasses': ['includes', 'covers', 'takes in', 'spans'],
    'elevate': ['raise', 'improve', 'boost', 'lift'],
    'harness': ['use', 'tap into', 'channel', 'put to work'],
    'aligns': ['matches', 'fits', 'goes with', 'agrees with'],
    'resonates': ['connects', 'strikes a chord', 'hits home', 'speaks to'],
    'bolster': ['support', 'strengthen', 'back up', 'boost'],
    'endeavor': ['effort', 'attempt', 'try', 'project', 'venture'],
    'cultivate': ['build', 'develop', 'grow', 'nurture'],
    'illuminate': ['show', 'reveal', 'shed light on', 'clarify', 'explain'],
    'poignant': ['moving', 'touching', 'emotional', 'powerful'],
    'myriad': ['many', 'countless', 'a wide range of', 'tons of', 'lots of'],
    'plethora': ['many', 'lots of', 'a wide range of', 'plenty of'],
    'elucidate': ['explain', 'clarify', 'spell out', 'make clear'],
    'articulate': ['express', 'say', 'describe', 'put into words'],
    'juxtaposition': ['contrast', 'comparison', 'side-by-side look'],
    'quintessential': ['classic', 'typical', 'perfect example of'],
    'exemplify': ['show', 'demonstrate', 'illustrate', 'represent'],
    'epitomize': ['represent', 'embody', 'stand for', 'be a perfect example of'],
    'underscore': ['show', 'highlight', 'stress', 'emphasize'],
    'burgeoning': ['growing', 'expanding', 'rising', 'booming'],
    'propensity': ['tendency', 'leaning', 'habit', 'inclination'],
    'adept': ['skilled', 'good at', 'experienced', 'capable'],
    'discern': ['see', 'notice', 'spot', 'tell', 'recognize'],
    'pivotal': ['key', 'central', 'crucial', 'major'],
    'intrinsic': ['built-in', 'natural', 'core', 'inherent', 'basic'],
    'extrinsic': ['external', 'outside', 'outward'],
    'conundrum': ['puzzle', 'problem', 'dilemma', 'challenge'],
    'enigma': ['mystery', 'puzzle', 'riddle'],
    'dichotomy': ['split', 'divide', 'contrast', 'difference'],
    'amalgamation': ['mix', 'blend', 'combination', 'merger'],
    'ubiquitous': ['everywhere', 'widespread', 'common', 'all over'],
    'permeate': ['spread through', 'fill', 'seep into', 'run through'],
  };

  // Overused transition phrases
  const AI_TRANSITIONS = {
    'Furthermore': ['Also', 'Plus', 'On top of that', 'And', 'What\'s more'],
    'Moreover': ['Also', 'Plus', 'Besides', 'And', 'On top of that'],
    'Additionally': ['Also', 'Plus', 'And', 'On top of that', 'Beyond that'],
    'However': ['But', 'Still', 'That said', 'Then again', 'Yet'],
    'Nevertheless': ['Still', 'Even so', 'But', 'That said', 'Yet'],
    'Consequently': ['So', 'As a result', 'Because of this', 'That means'],
    'Subsequently': ['Then', 'After that', 'Next', 'Later'],
    'Notwithstanding': ['Despite this', 'Even so', 'Still', 'But'],
    'In conclusion': ['To wrap up', 'All in all', 'So', 'At the end of the day'],
    'It is important to note that': ['Worth noting:', 'Keep in mind', 'One thing—', 'Remember that'],
    'It is worth mentioning that': ['Also', 'One more thing:', 'I should mention', 'Side note:'],
    'This highlights the fact that': ['This shows', 'Which means', 'That tells us', 'So basically'],
    'In the realm of': ['In', 'When it comes to', 'For', 'In the world of'],
    'In light of': ['Given', 'Because of', 'With', 'Considering'],
    'It\'s important to remember that': ['Don\'t forget', 'Remember', 'Keep in mind', 'The thing is'],
    'plays a crucial role': ['matters a lot', 'is key', 'really matters', 'is essential'],
    'a wide range of': ['many', 'lots of', 'various', 'all kinds of', 'different'],
    'on the other hand': ['but then', 'then again', 'at the same time', 'though'],
  };

  // Overused AI sentence starters
  const AI_STARTERS = {
    'Notably,': ['', 'Interestingly,', 'Here\'s the thing:', 'What stands out is'],
    'Essentially,': ['Basically,', 'In short,', 'Really,', 'At its core,', ''],
    'Ultimately,': ['In the end,', 'When it comes down to it,', 'At the end of the day,', ''],
    'Interestingly,': ['', 'What\'s cool is', 'Funny enough,', 'Here\'s what caught my eye:'],
    'Significantly,': ['', 'This matters because', 'A big deal here:', 'Importantly,'],
    'Remarkably,': ['Surprisingly,', 'What\'s impressive is', '', 'Pretty amazing—'],
    'Undoubtedly,': ['No question,', 'Clearly,', 'For sure,', 'Without a doubt,'],
    'Evidently,': ['Clearly,', 'Obviously,', 'It\'s clear that', 'You can see that'],
  };

  // Overused em-dash constructions
  const EM_DASH_OVERUSE_THRESHOLD = 2; // per 500 words

  /**
   * Analyze text for AI vocabulary patterns
   * Returns a detailed report
   */
  function analyze(text) {
    const words = text.toLowerCase().split(/\s+/);
    const wordCount = words.length;
    const findings = [];
    let aiWordCount = 0;

    // Check for AI-overused words
    for (const [aiWord, replacements] of Object.entries(AI_OVERUSED_WORDS)) {
      const regex = new RegExp(`\\b${aiWord}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        aiWordCount += matches.length;
        findings.push({
          type: 'overused_word',
          word: aiWord,
          count: matches.length,
          replacements: replacements,
          severity: matches.length > 2 ? 'high' : matches.length > 1 ? 'medium' : 'low'
        });
      }
    }

    // Check for AI transitions
    for (const [transition, replacements] of Object.entries(AI_TRANSITIONS)) {
      const regex = new RegExp(transition.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = text.match(regex);
      if (matches) {
        aiWordCount += matches.length;
        findings.push({
          type: 'overused_transition',
          word: transition,
          count: matches.length,
          replacements: replacements,
          severity: matches.length > 1 ? 'high' : 'medium'
        });
      }
    }

    // Check for AI starters
    for (const [starter, replacements] of Object.entries(AI_STARTERS)) {
      const regex = new RegExp(`^${starter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gmi');
      const matches = text.match(regex);
      if (matches) {
        aiWordCount += matches.length;
        findings.push({
          type: 'overused_starter',
          word: starter,
          count: matches.length,
          replacements: replacements,
          severity: 'medium'
        });
      }
    }

    // Check em-dash overuse
    const emDashCount = (text.match(/—|--/g) || []).length;
    const emDashPer500 = (emDashCount / wordCount) * 500;
    if (emDashPer500 > EM_DASH_OVERUSE_THRESHOLD) {
      findings.push({
        type: 'em_dash_overuse',
        word: '— (em dash)',
        count: emDashCount,
        replacements: ['Use commas, parentheses, or restructure sentences'],
        severity: 'medium'
      });
    }

    // Check contraction usage (lack of contractions is AI signal)
    const contractionPatterns = /\b(don't|doesn't|won't|can't|isn't|aren't|wasn't|weren't|shouldn't|wouldn't|couldn't|hasn't|haven't|hadn't|it's|that's|there's|here's|who's|what's|I'm|I've|I'd|I'll|we're|we've|we'd|we'll|they're|they've|they'd|they'll|you're|you've|you'd|you'll|he's|she's|let's)\b/gi;
    const expandedPatterns = /\b(do not|does not|will not|cannot|is not|are not|was not|were not|should not|would not|could not|has not|have not|had not|it is|that is|there is|here is|who is|what is|I am|I have|I would|I will|we are|we have|we would|we will|they are|they have|they would|they will|you are|you have|you would|you will|he is|she is|let us)\b/gi;

    const contractions = (text.match(contractionPatterns) || []).length;
    const expanded = (text.match(expandedPatterns) || []).length;
    const totalContractionOpportunities = contractions + expanded;

    let contractionRate = 0;
    if (totalContractionOpportunities > 0) {
      contractionRate = contractions / totalContractionOpportunities;
    }

    // Human English typically has 60-80% contraction rate in informal writing
    const contractionAnalysis = {
      rate: contractionRate,
      contracted: contractions,
      expanded: expanded,
      isAILike: contractionRate < 0.4 && totalContractionOpportunities > 3
    };

    if (contractionAnalysis.isAILike) {
      findings.push({
        type: 'low_contractions',
        word: 'Formal expansions (do not, is not, etc.)',
        count: expanded,
        replacements: ['Use contractions more: don\'t, isn\'t, won\'t, etc.'],
        severity: 'high'
      });
    }

    const aiDensity = wordCount > 0 ? aiWordCount / wordCount : 0;

    return {
      wordCount,
      aiWordCount,
      aiDensity,
      aiDensityPercent: (aiDensity * 100).toFixed(2),
      findings: findings.sort((a, b) => {
        const severityOrder = { high: 0, medium: 1, low: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }),
      contractionAnalysis,
      score: calculateVocabScore(aiDensity, findings.length, contractionAnalysis)
    };
  }

  function calculateVocabScore(aiDensity, findingCount, contractionAnalysis) {
    let score = 100;

    // Penalize AI word density
    score -= aiDensity * 2000; // 1% density = -20 points

    // Penalize number of different AI patterns found
    score -= findingCount * 3;

    // Penalize low contraction rate
    if (contractionAnalysis.isAILike) {
      score -= 15;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Replace AI-overused vocabulary with human alternatives
   */
  function humanize(text) {
    let result = text;

    // Replace AI-overused words
    for (const [aiWord, replacements] of Object.entries(AI_OVERUSED_WORDS)) {
      const regex = new RegExp(`\\b${aiWord}\\b`, 'gi');
      result = result.replace(regex, (match) => {
        const replacement = replacements[Math.floor(Math.random() * replacements.length)];
        // Preserve original capitalization
        if (match[0] === match[0].toUpperCase()) {
          return replacement.charAt(0).toUpperCase() + replacement.slice(1);
        }
        return replacement;
      });
    }

    // Replace AI transitions
    for (const [transition, replacements] of Object.entries(AI_TRANSITIONS)) {
      const regex = new RegExp(transition.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      result = result.replace(regex, () => {
        return replacements[Math.floor(Math.random() * replacements.length)];
      });
    }

    // Replace AI starters
    for (const [starter, replacements] of Object.entries(AI_STARTERS)) {
      const regex = new RegExp(`^${starter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gmi');
      result = result.replace(regex, () => {
        return replacements[Math.floor(Math.random() * replacements.length)];
      });
    }

    // Add contractions where expanded forms exist
    const contractionMap = {
      'do not': 'don\'t', 'does not': 'doesn\'t', 'will not': 'won\'t',
      'cannot': 'can\'t', 'can not': 'can\'t', 'is not': 'isn\'t',
      'are not': 'aren\'t', 'was not': 'wasn\'t', 'were not': 'weren\'t',
      'should not': 'shouldn\'t', 'would not': 'wouldn\'t', 'could not': 'couldn\'t',
      'has not': 'hasn\'t', 'have not': 'haven\'t', 'had not': 'hadn\'t',
      'it is': 'it\'s', 'that is': 'that\'s', 'there is': 'there\'s',
      'I am': 'I\'m', 'I have': 'I\'ve', 'I would': 'I\'d', 'I will': 'I\'ll',
      'we are': 'we\'re', 'we have': 'we\'ve', 'they are': 'they\'re',
      'they have': 'they\'ve', 'you are': 'you\'re', 'you have': 'you\'ve',
      'he is': 'he\'s', 'she is': 'she\'s', 'let us': 'let\'s',
    };

    // Apply contractions with ~70% probability (humans don't always contract)
    for (const [expanded, contracted] of Object.entries(contractionMap)) {
      const regex = new RegExp(`\\b${expanded}\\b`, 'gi');
      result = result.replace(regex, (match) => {
        if (Math.random() < 0.7) {
          // Preserve capitalization
          if (match[0] === match[0].toUpperCase() && match[1] === match[1].toUpperCase()) {
            return contracted.toUpperCase();
          }
          if (match[0] === match[0].toUpperCase()) {
            return contracted.charAt(0).toUpperCase() + contracted.slice(1);
          }
          return contracted;
        }
        return match;
      });
    }

    return result;
  }

  /**
   * Get all AI-overused words for reference
   */
  function getBlocklist() {
    return {
      words: Object.keys(AI_OVERUSED_WORDS),
      transitions: Object.keys(AI_TRANSITIONS),
      starters: Object.keys(AI_STARTERS),
    };
  }

  return { analyze, humanize, getBlocklist };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = VocabularyEngine;
}
