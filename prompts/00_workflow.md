# Content Pipeline: Workflow Guide

## Overview

This is a 5-step content pipeline for producing expert SEO articles for its-ai.org/blog.
Each step uses a specialized AI prompt (role). You run them sequentially, with human checkpoints.

```
Step 1: Researcher         → finds & organizes sources
   ↓
   [YOU: approve/reject sources]
   ↓
Step 2: SEO Strategist     → creates content brief with keywords & structure
   ↓
   [YOU: review brief, adjust keywords if needed]
   ↓
Step 3: Copywriter          → writes the article draft with citations
   ↓
Step 4: Editor              → analyzes AI patterns + rewrites for human voice
   ↓
   [YOU: check via its-ai.org, manually fix any remaining flagged sentences]
   ↓
Step 5: Chief Editor        → fact-checks, SEO audit, final polish
   ↓
   [YOU: final approval → publish]
```

## Detailed Steps

### Step 1: Research (prompt: `01_researcher.md`)

**Open a NEW chat.** Paste the full prompt from `01_researcher.md`, then add:

```
TOPIC: How AI Detection Works: A Technical Guide for Educators
TARGET KEYWORDS: AI detection, AI detector, how AI detection works, AI content detection
LANGUAGE: EN
```

**What you get:** A structured research report with 5-10 verified sources, exact quotes, video timestamps, and key facts.

**Your action:** Review every source. Remove any you do not trust. Add sources you know about. This is CRITICAL — all claims in the final article come from these sources.

---

### Step 2: SEO Strategy (prompt: `02_seo_strategist.md`)

**Open a NEW chat.** Paste the full prompt from `02_seo_strategist.md`, then add:

```
TOPIC: How AI Detection Works: A Technical Guide for Educators
TARGET KEYWORDS: AI detection, AI detector, how AI detection works, AI content detection
APPROVED SOURCES: [paste your approved sources from Step 1]
EXISTING BLOG ARTICLES: [list any existing article URLs from its-ai.org/blog for internal linking]
LANGUAGE: EN
```

**What you get:** A detailed SEO brief with keyword placement, article structure (H1/H2s), FAQ questions, meta tags, and competitive analysis.

**Your action:** Review the structure. Does the outline cover what your audience needs? Adjust keywords or structure if needed.

---

### Step 3: Write Draft (prompt: `03_copywriter.md`)

**Open a NEW chat.** Paste the full prompt from `03_copywriter.md`, then add:

```
SEO BRIEF: [paste the full SEO brief from Step 2]
APPROVED SOURCES: [paste approved sources from Step 1]
LANGUAGE: EN
WORD COUNT TARGET: 2000-2500 words
```

**What you get:** A complete article draft with inline citations, video timestamps, SEO keywords integrated, and anti-AI-detection writing applied.

**Your action:** Quick read-through. Does the content make sense? Are sources used correctly? No need to edit heavily — that is the next step.

---

### Step 4: Edit & Humanize (prompt: `04_editor.md`)

**Open a NEW chat.** Paste the full prompt from `04_editor.md`, then add:

```
ARTICLE DRAFT: [paste the full draft from Step 3]
TARGET KEYWORDS: AI detection, AI detector, how AI detection works, AI content detection
AUTHOR VOICE NOTES: Direct, knowledgeable, slightly conversational. Prefer concrete examples over abstract theory. Occasional dry humor is fine.
LANGUAGE: EN
```

**What you get:**
1. An AI Pattern Analysis Report (shows which sentences are likely to get flagged)
2. A fully rewritten version with human voice, varied rhythm, and natural imperfections

**Your action (CRITICAL):**
1. Take the rewritten version
2. Go to its-ai.org and paste it into the detector
3. Look at the heatmap — any sentences marked as AI?
4. Manually rewrite those specific sentences in your own words
5. Re-check until the text passes

**Tips for manual fixes:**
- Replace flagged sentences entirely — do not just swap words
- Add a personal opinion or reaction
- Make it shorter or longer than the surrounding sentences
- Start with something unexpected ("Honestly?", "I tested this myself.", "Three words: it depends.")

---

### Step 5: Final Review (prompt: `05_chief_editor.md`)

**Open a NEW chat.** Paste the full prompt from `05_chief_editor.md`, then add:

```
ARTICLE: [paste the article after your Its-AI check and manual fixes from Step 4]
SEO BRIEF: [paste the SEO brief from Step 2]
TARGET KEYWORDS: AI detection, AI detector, how AI detection works, AI content detection
LANGUAGE: EN
```

**What you get:** Fact-check report, SEO compliance report, publication decision, and final polished version.

**Your action:** Review the reports. Fix any remaining issues. Publish!

---

## Time Estimate Per Article

| Step | AI Time | Your Time | Total |
|------|---------|-----------|-------|
| 1. Research | ~2 min | ~5 min (approve sources) | ~7 min |
| 2. SEO Brief | ~2 min | ~3 min (review structure) | ~5 min |
| 3. Draft | ~3 min | ~5 min (quick review) | ~8 min |
| 4. Edit + Its-AI check | ~3 min | ~20-40 min (detector + fixes) | ~25-45 min |
| 5. Chief Editor | ~2 min | ~5 min (final check) | ~7 min |
| **TOTAL** | **~12 min** | **~38-58 min** | **~50-70 min** |

---

## Tips for Best Results

1. **Always use a NEW chat for each step.** This gives the AI a clean context and prevents confusion between roles.

2. **Copy-paste the FULL output from one step to the next.** Do not summarize — the next role needs all the detail.

3. **The Editor step (4) is where you invest the most time.** This is what makes the difference between AI-detected and human-passing content.

4. **Build a voice profile over time.** After a few articles, you will know which phrases and patterns Its-AI flags. Create a personal "do not use" list.

5. **Batch your work:** Run Steps 1-3 for 3-4 articles at once (mostly AI work). Then spend a focused block on Step 4 (your main effort). Then batch Step 5.

6. **Track what works.** After each article, note: what Its-AI flagged, what your manual fixes were, and what passed. This builds your editing intuition.

## Prompt Files

| File | Role | Purpose |
|------|------|---------|
| `01_researcher.md` | Senior Research Analyst | Find & verify official sources |
| `02_seo_strategist.md` | SEO Content Strategist | Create keyword-optimized content brief |
| `03_copywriter.md` | Expert Tech Copywriter | Write the article draft with citations |
| `04_editor.md` | Human-Voice Editor | Analyze AI patterns + rewrite for human voice |
| `05_chief_editor.md` | Chief Editor | Fact-check, SEO audit, final approval |
