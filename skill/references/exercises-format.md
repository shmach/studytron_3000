# Exercises and correction

## Exercise sets (`exercises/<topic-id>-<slug>.md`)

```markdown
---
course: "java-backend"
topic: "2.3"
generated: 2026-08-29
difficulty_target: 2      # 1–5, see calibration below
---

# Exercises — 2.3 <Topic title>

## Warm-up (1–2 items)
Recall/comprehension questions answerable straight from the lesson.

## Core (3–5 items)
Application: small problems requiring the topic's skills. For programming,
write-code tasks; for languages, translation/production tasks; for theory,
scenario questions.

## Challenge (1 item)
One harder problem combining this topic with earlier ones. Label which
earlier topics it draws on.
```

Do not include answers in the exercise file. Answers appear only in
correction (attempt) files.

### Difficulty calibration

`difficulty_target` starts at 2 for a topic's first exercise set. Adjust
based on the user's attempt history across the course:

- Mostly correct, called it easy → +1 next time (cap 5)
- Mixed results → keep
- Struggled or `perceived_difficulty: hard` on related topics → −1 (floor 1),
  and bias the Core section toward the flagged weak_points

## Attempts and correction (`exercises/<topic-id>-attempt-<n>.md`)

When the user submits answers (pasted in chat or written into a file):

1. Grade each item: correct / partially correct / incorrect, with feedback
   that names the underlying concept, not just the right answer.
2. Save the attempt record:

```markdown
---
course: "java-backend"
topic: "2.3"
attempt: 1
date: 2026-08-29
score: "4/7"
result: mixed             # good | mixed | weak
weak_points: ["difference between NPN and PNP wiring"]
---

# Attempt 1 — 2.3 <Topic title>

## Item-by-item
### 1. <question summary>
**User's answer:** ...
**Verdict:** partially correct
**Feedback:** ...
**Reference answer:** ...
...
```

3. Update the topic's `topic-meta` block in `00-curriculum.md`:
   - `perceived_difficulty` from the overall result
   - merge new `weak_points` (keep them short and specific)
   - `status: review` if result is `weak`, or `completed` if `good`
4. In chat, give a one-paragraph summary: strongest area, weakest area, and
   what the reinforcement in the next lesson will cover. Encouraging but
   honest — never inflate scores.

Weak points feed the reinforcement loop (SKILL.md, Workflow 2): they are the
bridge between correction and future lessons, so write them as concrete,
teachable gaps ("confuses `==` with `.equals()`"), not vague labels ("syntax").
