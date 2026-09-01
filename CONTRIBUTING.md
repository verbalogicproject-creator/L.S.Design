# Contributing to L.S.Design

Thank you for helping improve L.S.Design. Contributions should make design decisions clearer, safer, or more useful across real projects.

## Before you start

- Search existing issues before opening a new one.
- Use an issue to discuss large behavior, naming, or installation changes.
- Keep a change focused on one problem.
- Do not copy proprietary prompts, design systems, fonts, images, or code.
- Confirm that reused open-source material permits redistribution and add the required notice.

## Design-guidance standard

A good rule changes an important decision. It should explain when it applies and should not turn one example or personal preference into a universal requirement.

Preserve the suite decision order:

1. User and repository requirements
2. Product, platform, data, and brand truth
3. Accessibility, usability, and functional correctness
4. Specialist guidance
5. Aesthetic defaults and anti-pattern warnings

Classify strong guidance correctly:

- Invariant: required for safety, accessibility, function, or coherence
- Contextual default: a strong starting point that may yield to product evidence
- Anti-pattern warning: a reason to inspect intent and execution
- User-overridable preference: a taste choice the user may select

## Skill changes

- Keep the skill name lowercase and hyphenated.
- Keep the folder name equal to the frontmatter `name`.
- Use only `name` and `description` frontmatter in canonical skills.
- Make the description clear enough for correct automatic selection.
- Keep common constraints in `SKILL.md` and conditional detail in a focused reference.
- Link every reference from the skill entrypoint.
- Avoid provider-specific commands and unavailable sibling skills.
- Do not add fixed performance caps unless they are part of a measured project requirement.

## Local validation

Run before submitting:

```sh
python scripts/validate.py
python -m unittest discover -s tests -v
python scripts/scan_sources.py skills
```

If you adapt external reference material, scan its source separately and review every finding.

## Pull requests

Describe:

- The problem
- The intended behavior
- Why the guidance belongs in this suite
- What was tested
- Any compatibility or attribution impact

Small documentation fixes may be submitted directly. Larger skill behavior changes should include a realistic example that demonstrates the failure and the improvement.

By contributing, you agree that your contribution is licensed under Apache License 2.0.
