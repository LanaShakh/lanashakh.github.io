=== TRANSFER BLOCK START ===

TOPIC: Paraphrasing Tools vs AI Detectors: What Actually Gets Detected
LANGUAGE: EN
WORD COUNT: 2000-2500

PRIMARY KEYWORD: ai detector paraphraser
SECONDARY KEYWORDS: paraphrasing tool to avoid ai detection, paraphrase without ai detection, anti ai detector paraphraser, rewriter no ai detection, paraphrase ai detector

SOURCES:
[1] Paraphrasing evades detectors of AI-generated text, but retrieval is an effective defense | https://arxiv.org/abs/2303.13408 | paper | NeurIPS 2023 | DIRECT
[2] PADBen: A Comprehensive Benchmark for Evaluating AI Text Detectors Against Paraphrase Attacks | https://arxiv.org/html/2511.00416 | paper | Nov 2025 | DIRECT
[3] GPT detectors are biased against non-native English writers | https://pmc.ncbi.nlm.nih.gov/articles/PMC10382961/ | paper | Patterns, July 2023 | ADJACENT
[4] Adversarial Paraphrasing: A Universal Attack for Humanizing AI-Generated Text | https://arxiv.org/abs/2506.07001 | paper | NeurIPS 2025 | DIRECT
[5] DAMAGE: Detecting Adversarially Modified AI Generated Text | https://aclanthology.org/2025.genaidetect-1.9.pdf | paper | COLING 2025 | ADJACENT (humanizer taxonomy)

KEY QUOTES:
Q1 (source [1]): "DIPPER drops detection accuracy of DetectGPT from 70.3% to 4.6%" — but this was against an OLD detector without adversarial training
Q2 (source [1]): "retrieval-based method can detect 80% to 97% of paraphrased generations while only classifying 1% of human-written sequences as AI-generated"
Q3 (source [2]): "paraphrase attacks do not universally defeat detection systems — outcomes depend on text origin"
Q4 (source [3]): "GPT detectors consistently misclassify non-native English writing samples as AI-generated" — 61.3% false positive rate for TOEFL essays
Q5 (source [4]): difference between simple paraphrasing (30% drop) vs adversarial paraphrasing (87.88% drop) shows consumer tools are fundamentally limited

KEY FACTS:
1. DIPPER (11B param model) reduced DetectGPT from 70.3% to 4.6% — but retrieval defense catches 80-97% — source [1]
2. PADBen: 5-level text taxonomy from "original" to "deep laundered" — source [2]
3. 11 state-of-the-art detectors tested (4 zero-shot, 7 model-based) — source [2]
4. PADBen found: outcomes depend on text origin, not just the paraphrasing method — source [2]
5. Old perplexity-based detectors: 61.3% FPR for non-native English essays — source [3]
6. "Elevate the text by employing literary language" prompt bypasses perplexity-based detectors — but NOT modern sentence-level detectors — source [3]
7. Three-tier humanizer taxonomy: not all tools are equal, most are low quality — source [5]
8. Simple paraphrasing only reduces detection by ~30% — source [4]

EDITORIAL GUIDANCE:
- Position: Practical analysis. Paraphrasing tools work against OLD simple detectors (perplexity-based). They DO NOT reliably work against modern detectors with adversarial training and sentence-level analysis.
- Structure: Show the evolution: old detectors (vulnerable) → modern detectors (resistant) → defense mechanisms (retrieval-based)
- Key argument: The studies showing paraphrasing "beats" detectors tested against DetectGPT and similar 2023-era tools. Modern detectors (2024-2025) use sentence-level analysis, adversarial training, and ensemble methods — fundamentally different approach.
- Stanford bias study: acknowledge the problem EXISTS (for perplexity-based tools) but explain that modern detectors like Its-AI use different methods — sentence-level analysis, not just perplexity.
- Its-AI mention: Relevant here. Its-AI uses ensemble of segmentation models with sentence-level analysis → more resistant to paraphrasing than perplexity-only detectors. Cite ASAP 2.0 FPR of 0.8% to contrast with 61.3% from old detectors.
- Do NOT name specific paraphrasing tools as recommendations. Frame the analysis as "research shows X, but modern detectors have adapted."

=== TRANSFER BLOCK END ===
