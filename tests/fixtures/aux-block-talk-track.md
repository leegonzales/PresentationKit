---
version: 5
title: "AUX Block Test"
subtitle: "Testing AUX Content Drawer"
author: "Test Author"
event: "Test Event"
date: "2026-03-20"
target_minutes: 10
audio_voice: "af_heart"

sections:
  - id: opening
    name: "Opening"
    color: "#557373"
  - id: main
    name: "Main Content"
    color: "#6B4C4C"
---

## Slides

| # | Slug | Title | Image | Section |
|---|------|-------|-------|---------|
| 1 | title | Title Slide | slide-title.png | opening |
| 2 | with-aux | Slide With AUX | slide-aux.png | main |
| 3 | no-aux | Slide Without AUX | slide-no-aux.png | main |

## [title] Title Slide

![Title](images/slide-title.png)

<!-- AUDIO -->
Welcome to the presentation.
<!-- /AUDIO -->

---

## [with-aux] Slide With AUX

![AUX Slide](images/slide-aux.png)

<!-- AUDIO -->
This slide has auxiliary content you can copy.
<!-- /AUDIO -->

<!-- AUX title="RANGE Evaluator Prompt" -->
You are an AI evaluator. Assess the following response along these dimensions:

## Scoring Criteria

- **Reach** (1-5): How broadly applicable is the response?
- **Autonomy** (1-5): Does it enable independent action?
- **Navigation** (1-5): Does it help orient the user?

### Example Usage

```
Score each dimension from 1-5 and provide brief justification.
```

> Note: Be specific in your feedback.
<!-- /AUX -->

**Speaker Notes:**
- Show participants how to use the evaluator
- Point out the copy button

---

## [no-aux] Slide Without AUX

![No AUX](images/slide-no-aux.png)

<!-- AUDIO -->
This slide has no auxiliary content.
<!-- /AUDIO -->

**Speaker Notes:**
- Regular slide without AUX
