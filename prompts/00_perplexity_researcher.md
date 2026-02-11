# Perplexity Research Prompt for Its-AI Blog

## Как пользоваться

1. Открой perplexity.ai
2. Скопируй промпт ниже
3. Замени `[ТЕМА]` и `[КЛЮЧЕВЫЕ СЛОВА]` на свои
4. Получи список источников с цитатами
5. Проверь источники (кликни по ссылкам — убедись что они реальные и про нужную тему)
6. Скопируй TRANSFER BLOCK → вставь в чат с AI-агентом (Gemini Gem / Custom GPT / Claude Project)

---
СКОПИРУЙ ВСЁ НИЖЕ В PERPLEXITY:
---

Find 5-8 high-quality sources for a blog article.

TOPIC: [ТЕМА]
KEYWORDS: [КЛЮЧЕВЫЕ СЛОВА]

## What I need

For each source provide:
1. Full title
2. URL
3. Type: academic paper / official report / reputable news / conference talk / benchmark / statistics
4. Publication date
5. One exact quote from the source that proves it discusses the topic (IMPORTANT: the quote must show the source is specifically about the topic, not just tangentially related)
6. 1-3 key facts or statistics from the source
7. Category: DIRECT (specifically about the topic) or ADJACENT (broader topic — explain the connection)

## Source quality rules

ACCEPTED sources (use ONLY these):
- Academic papers from peer-reviewed journals (NLP, AI, education)
- Independent benchmarks and evaluations (MGTD, RAID, etc.)
- Official reports from governments, universities, institutions (UNESCO, EU AI Act, etc.)
- Conference talks from NeurIPS, ACL, EMNLP, AAAI
- Official documentation from major AI companies (OpenAI, Anthropic, Google) — as factual reference
- Reputable established news: NYT, BBC, Reuters, Wired, MIT Technology Review, The Verge, TechCrunch, Ars Technica
- Statistics from research organizations: Pew, Gartner, Stanford AI Index, McKinsey

REJECTED sources (NEVER include these):
- GPTZero, Originality.ai, Copyleaks, Turnitin AI, ZeroGPT, Sapling, Winston AI, Crossplag, or ANY other AI detector company website/blog
- "AI humanizer" or "bypass AI detection" tools: Undetectable AI, StealthWriter, HIX Bypass, etc.
- Random blogs and personal websites with unclear authorship
- SEO listicles from unknown sites ("Top 10 AI detectors", "Best AI tools 2026")
- Social media (Reddit, Twitter/X, Quora) as primary sources
- Marketing materials from any company

## Relevance check (CRITICAL)

Before including a source, verify:
- Does it ACTUALLY discuss the topic? A source about "AI in education" is NOT the same as "AI detection in education" unless it specifically mentions AI detection/AI-generated text detection.
- If a source is about a different topic (robotics, general AI, unrelated subject) — do NOT include it, even if it seems broadly relevant.
- 5 verified relevant sources are better than 8 where 3 are off-topic.

## Output format

Organize sources as a numbered list, then generate this transfer block at the end:

```
=== TRANSFER BLOCK START ===

TOPIC: [topic]
KEYWORDS: [keywords]

SOURCES:
[1] [Title] | [URL] | [DIRECT/ADJACENT]
[2] [Title] | [URL] | [DIRECT/ADJACENT]
[3] [Title] | [URL] | [DIRECT/ADJACENT]
...

KEY QUOTES (exact text from sources):
Q1 (source [#]): "[exact quote]"
Q2 (source [#]): "[exact quote]"
Q3 (source [#]): "[exact quote]"
...up to 10 quotes

KEY FACTS:
1. [fact + specific number/date] — source [#]
2. [fact + specific number/date] — source [#]
...up to 10 facts

GAPS: [topics/data NOT found that would be valuable]

=== TRANSFER BLOCK END ===
```

Prioritize recent sources (2024-2026). Focus on finding sources with specific numbers, statistics, and quotable facts.
