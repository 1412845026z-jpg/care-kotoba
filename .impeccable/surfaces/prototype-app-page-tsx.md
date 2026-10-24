---
version: 1
slug: "prototype-app-page-tsx"
primary_target: "prototype/app/page.tsx"
related_targets: ["prototype/components/practice.tsx","prototype/components/ui.tsx","prototype/app/globals.css"]
---

# Learner app (home, scenes, practice, feedback, notes, record)

Scope: the learner-facing PWA, mobile-first (390px), desktop as a widened shell. Mode: Operate. Audience: foreign care workers (about N4) practising one conversation in a 3-minute break; Japanese UI with furigana and zh/en support lines. Constraints: WCAG AA, 24px+ targets, fictional scenes, no competence scores, calm non-punitive tone (PRODUCT.md).

## Direction contract

THESIS: Every screen first hands the learner the next line someone will say to them on the floor. It refuses the AI-learning-app default: slogan hero, glowing orb on the home, tinted icon tiles, progress rings, English micro-labels.

OWN-WORLD: The facility's 申し送りノート and 連絡帳: unbleached paper ground (#f6f1e8), plum-black ink (#2a2230), deep violet for the one action (#55398a), mint for what got across (#2e6650 on #e2f0e8), coral only for ここがポイント (#a1452c on #fbebe2). BIZ UDPMincho for headings and quoted lines, BIZ UDPGothic for everything else. Hairline rules, 12px corners, quiet lift only on the today card. The conversation stays a plum stage (#2c1f33) with one waveform.

STORY: On a break the learner sees today's moment and the resident's exact words, taps once, practises, gets their own sentence back beside a better one, and retries just that line.

FIRST VIEWPORT: Date line; heading 次の声かけを、ここで。 in mincho; today card with field and minutes, scene title, the partner's first line as a large mincho quote under a speaker caption, two short rows (こんな場面 / 今回の目標), full-width violet button 「N分、練習する」 at the card's foot. Below: 前回のひとこと, scenes as quote cards, the eight fields as a plain list.

FORM: The user pinned design/ui_concept.png on 2026-10-24 ("按你的概念图方向"); no concept roll. Code-led because the surface is Operate. Signature move: the partner's line as the hero object on home, scene cards and the stage. seed: none (unavailable)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved
- Real photographs or illustrations of fictional care scenes (concept shows a photo); none shipped until assets with licences exist.
