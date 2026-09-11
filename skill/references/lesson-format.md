# Lesson format (`lessons/<topic-id>-<slug>.md`)

A lesson covers ONE topic from the curriculum, working through its subtopics
in order. Target length: enough to genuinely teach the topic at the configured
depth — typically 800–2000 words for `standard`. Never pad; never compress
because of length concerns (split the topic instead, see SKILL.md).

## Structure

```markdown
---
course: "java-backend"
topic: "2.3"
title: "Sensores indutivos"   # in the course output language
generated: 2026-08-29
covers: ["2.3.1", "2.3.2", "2.3.3"]
---

# 2.3 — <Topic title>

## Quick review            <- ONLY when reinforcement check found weak points
A few paragraphs revisiting the specific weak_points flagged in earlier
topics, connecting them to today's topic. Reference the earlier lesson file
by name; do not re-teach it.

## Where we are
2–3 sentences connecting this topic to the previous one and to the course
goal. Assume the reader may be returning after days away.

## <Subtopic 1 title>
The actual teaching content...

## <Subtopic 2 title>
...

## Key takeaways
3–6 bullet points, concrete and testable.

## What's next
One line: the next topic and why it follows.
```

## Teaching style

- Build on vocabulary and examples used in earlier lessons of the same course
  (that's why SKILL.md requires reading recent lessons first). Recurring
  example domains (e.g. the same toy project growing across lessons) are
  strongly encouraged — continuity is what makes this feel like a course
  rather than disconnected articles.
- Explain *why* before *how*. Analogies are welcome when the config's tone
  allows them.
- Code blocks: complete and runnable where practical; variable names and
  comments in English.
- For language-learning courses, adapt naturally: "code blocks" become
  example dialogues/vocabulary tables, and takeaways become phrases to retain.
- End without asking follow-up questions inside the file — the file must stand
  alone as reading material. Conversational follow-ups belong in chat.
