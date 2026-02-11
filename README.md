# HumanWriter AI Agent

AI text humanization agent that analyzes and transforms AI-generated text to read more naturally. Built as a static web application (GitHub Pages compatible).

## Features

- **Text Analysis** — Detects AI writing patterns: vocabulary fingerprints, sentence uniformity, nominalization density, participial clause overuse, low burstiness
- **Local Humanization** — Rule-based 5-pass pipeline that transforms text without any API calls (runs entirely in browser)
- **LLM-Powered Rewriting** — Adversarial refinement loop: generate → analyze → refine → repeat until humanness score passes threshold
- **Text Generation** — Generate human-like text from a topic using optimized system prompts
- **Detailed Scoring** — Humanness score (0-100) with breakdown across vocabulary, burstiness, sentence types, paragraph structure, and more

## How It Works

Based on research from CMU (PNAS 2025), University College Cork (Nature 2025), and adversarial NLP papers. The agent targets the specific patterns that detectors look for:

1. **Vocabulary Engine** — Blocklist of 200+ AI-overused words with human replacements
2. **Sentence Analyzer** — Measures burstiness (CV), participial clauses, nominalizations, sentence type diversity
3. **Humanizer Pipeline** — Vocabulary swap → sentence restructuring → register modulation → structural variation → natural patterns
4. **Adversarial Loop** — Uses local analysis to guide LLM rewrites, iterating until score exceeds target

## Usage

Open `index.html` in a browser. No build step required.

- **Analyze**: paste text, click Analyze to see the humanness score and specific issues
- **Humanize (Local)**: transforms text using rule-based pipeline (no API key needed)
- **Humanize (LLM + Local)**: rewrites via AI API + local post-processing (requires API key)
- **Generate**: create new text from a topic with adversarial refinement

## File Structure

```
index.html              — Main web interface
css/styles.css          — Dark theme UI styles
js/vocabulary.js        — AI word detection + replacement engine
js/analyzer.js          — Sentence structure & burstiness analyzer
js/humanizer.js         — Multi-pass humanization pipeline
js/prompts.js           — Optimized system prompts for 7 content types
js/llm-integration.js   — OpenAI/Anthropic API integration + adversarial loop
js/app.js               — UI orchestration and state management
```
