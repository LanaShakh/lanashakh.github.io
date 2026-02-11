=== TRANSFER BLOCK START ===

TOPIC: AI Humanizers Tested: Can They Really Fool Detectors?
LANGUAGE: EN
WORD COUNT: 2000-2500

PRIMARY KEYWORD: detect ai humanizer
SECONDARY KEYWORDS: ai detector humanize, free ai detector and humanizer, gptzero humanizer, zerogpt humanizer, undetectable ai writer

SOURCES:
[1] DAMAGE: Detecting Adversarially Modified AI Generated Text | https://aclanthology.org/2025.genaidetect-1.9.pdf | paper | COLING 2025 | DIRECT
[2] Adversarial Paraphrasing: A Universal Attack for Humanizing AI-Generated Text | https://arxiv.org/abs/2506.07001 | paper | NeurIPS 2025 | DIRECT
[3] Detecting AI-Generated Text by Quantifying Adversarial... (ModernBERT) | https://arxiv.org/pdf/2510.02319 | paper | 2025 | DIRECT
[4] RAID: A Shared Benchmark for Robust Evaluation of Machine-Generated Text Detectors | https://aclanthology.org/2024.acl-long.674/ | paper | ACL 2024 | ADJACENT (benchmark context)
[5] AI-generated text is overwhelming institutions | https://theconversation.com/ai-generated-text-is-overwhelming-institutions-setting-off-a-no-win-arms-race-with-ai-detectors-274720 | news | The Conversation, Feb 2026 | ADJACENT (societal context)

KEY QUOTES:
Q1 (source [1]): "many existing AI detectors fail to detect humanized text" — but augmenting training data with humanizer outputs improves robustness
Q2 (source [2]): "simple paraphrasing leads to only a 30.27% relative drop in T@1%F" — consumer humanizers use simple paraphrasing, not adversarial
Q3 (source [3]): "ModernBERT achieved the highest AUROC of 0.994 and a TPR of 0.943 at a stringent FPR of 1%" — even against adversarial text
Q4 (source [4]): "different adversarial attacks impact machine-generated text detectors disparately, with some attacks surprisingly improving detection"
Q5 (source [5]): "rapid, adversarial iteration to apply a common technology to opposing purposes" — Schneier & Sanders (Harvard) on the arms race

KEY FACTS:
1. 19 humanizer tools tested and classified into three quality tiers — source [1]
2. Simple paraphrasing reduces detection by only 30%, not enough to reliably bypass — source [2]
3. Adversarial paraphrasing (with detector access) reduces detection by 87.88% — but requires white/gray-box access normal users don't have — source [2]
4. ModernBERT with adversarial training: AUROC 0.994, TPR 94.3% at 1% FPR — source [3]
5. Data-centric augmentation (training on humanizer outputs) restores detector performance — source [1]
6. RAID tested 11 adversarial attack types across 6M+ generations — source [4]
7. Some paraphrasing attacks paradoxically IMPROVED detection accuracy for certain detectors — source [4]

EDITORIAL GUIDANCE:
- Position: Humanizer tools are the consumer-grade version of academic adversarial attacks. Lab attacks work when researchers have access to the detector's internals. Free humanizer tools don't have this access — their effectiveness is random and unpredictable.
- Key argument: Detectors with adversarial training (like Its-AI) are specifically trained AGAINST humanized text. The arms race favors detectors because they can train on humanizer outputs.
- Mention Its-AI accuracy data where appropriate (RAID #1, 98.3% accuracy). This article is directly about detector accuracy vs humanizers — benchmarks are relevant here.
- Do NOT name specific humanizer tools as recommendations. Frame them as unreliable.
- Tone: "We tested the science behind humanizers. Here's what the research actually shows."

=== TRANSFER BLOCK END ===
