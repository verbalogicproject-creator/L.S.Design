---
name: ls-design-review
description: Review frontend design and implementation for hierarchy, visual craft, responsiveness, accessibility, consistency, and functional fidelity. Use for audits, critique, acceptance review, or pre-release UI quality checks.
---

# L.S.Design Review

Report observable evidence, user impact, and a bounded correction. Do not reward novelty over clarity or infer defects from personal taste alone.

## Decision order

User and repository requirements come first, followed by product and brand truth, accessibility and function, this specialist's guidance, then aesthetic defaults.

## Review method

1. Establish the intended audience, tasks, brand direction, target platforms, and review scope.
2. Inspect the implementation and rendered result at representative widths and states.
3. Trace important interactions, focus order, loading, errors, overflow, long content, and responsive changes.
4. Separate confirmed defects from risks, preferences, and opportunities.
5. Rank findings by consequence and provide verification for each recommended change.

If asked only to review, do not edit files.

## Finding contract

Each finding includes location, evidence, impact, severity, recommendation, and verification. Use blocking, high, medium, and polish severities. Avoid long lists of low-impact aesthetic preferences while important functional or accessibility failures remain.

Review hierarchy, typography, color, composition, imagery, interaction, motion, content integrity, accessibility, responsiveness, performance symptoms, and consistency. Do not claim source-level compliance from screenshots alone or visual quality from static code alone.

Read [references/review-scorecard.md](references/review-scorecard.md) for coverage and severity calibration.

Use [natural color and humanization](../ls-design/references/natural-color-and-humanization.md) as an acceptance gate when reviewing visual specificity. Use [advanced layout decisions](../ls-design/references/advanced-layout.md) to assess complex composition, visual versus focus order, progressive enhancement, and dependency justification.
