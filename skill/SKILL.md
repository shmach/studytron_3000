---
name: course-builder
description: >
  Generate and manage structured, multi-session study courses on any topic
  (programming, mechatronics, languages, or anything else). Creates a course
  skeleton (curriculum with modules, topics and subtopics) first, then generates
  individual lessons and exercises on demand in later sessions, tracking
  progress, correcting exercises, and reinforcing weak topics. Use this skill
  whenever the user wants to learn a subject in a structured way, asks to
  "create a course", "generate a curriculum/cronograma", "generate a lesson/aula",
  "give me exercises", "correct my exercise", or asks about their study progress
  on an existing course — even if they don't mention the word "course".
---

# Course Builder

A skill for building personal study courses that persist across sessions.
The core idea: **never generate a whole course at once**. First build a
curriculum skeleton, then generate lessons and exercises on demand, always
reading the stored state first so every session knows what was already taught.

## Storage model

All state lives in Markdown files managed through a **storage adapter**.
Read `references/storage-adapters.md` before any read/write operation to
resolve where files live. The default adapter is `local` (an Obsidian vault
or any local folder). A `remote` adapter (SaaS API) may be configured later —
the workflows below are storage-agnostic on purpose: they say *what* to read
and write, the adapter says *where and how*.

Course layout (paths relative to the configured courses root):

```
<courses_root>/
  config.yaml                <- global defaults (see assets/config-template.yaml)
  <course-slug>/
    config.yaml              <- optional per-course overrides
    00-curriculum.md         <- the skeleton + progress state (single source of truth)
    lessons/
      <topic-id>-<slug>.md
    exercises/
      <topic-id>-<slug>.md           <- exercise sets
      <topic-id>-attempt-<n>.md      <- user attempts + corrections
```

## Deciding what the user wants

Map the request to one of five workflows:

1. **New course** — "I want to learn X", "create a course about X"
2. **Generate a lesson** — "next lesson", "generate the lesson for topic 2.3"
3. **Generate exercises** — "give me exercises on <topic>"
4. **Correct an attempt** — user submits answers to previously generated exercises
5. **Progress / review** — "how am I doing?", "what should I review?"

For workflows 2–5, ALWAYS start by reading `00-curriculum.md` of the course in
question. If the user doesn't name the course and more than one exists, list
the available courses and ask. Never guess course state from conversation
memory — the files are the source of truth (the user may have edited them
by hand between sessions; that is a supported and expected behavior).

## Workflow 1 — New course

1. Read the global `config.yaml` (create it from `assets/config-template.yaml`
   if missing, asking the user only for the storage root).
2. Ask only what's essential and not already known: target depth
   (`quick` | `standard` | `deep`), the user's starting level, and any specific
   goal (e.g. "learn Java for backend work"). One short round of questions, max.
3. Generate `00-curriculum.md` following `references/curriculum-format.md`
   exactly: modules → topics → subtopics, each subtopic described in 2–3 lines
   (enough for a future session to know the intended scope, not the content
   itself), each topic carrying its state front matter block.
4. Show the user a compact outline of the result and where it was saved.
   Do not generate any lesson yet unless asked.

## Workflow 2 — Generate a lesson

1. Read `00-curriculum.md`. Identify the target topic: the one the user named,
   or the first topic with `status: pending` if they said "next".
2. Read the lesson files of the 2–3 most recently completed topics, plus any
   attempt files that mention weak points. This keeps terminology, examples
   and difficulty consistent between sessions.
3. **Reinforcement check**: scan the curriculum for topics with
   `status: review` or non-empty `weak_points`. If any exist, open the lesson
   with a short "Quick review" section (a few paragraphs max) addressing those
   specific weak points, referencing — not repeating — the earlier material.
4. Generate the lesson following `references/lesson-format.md`. Write it to
   `lessons/`, then update the topic's front matter in `00-curriculum.md`
   (`status: completed`, check the checkbox, set `last_reviewed`).
5. Close by offering exercises for the topic.

## Workflow 3 — Generate exercises

Read the curriculum and the topic's lesson file first, then follow
`references/exercises-format.md`. Difficulty must be calibrated against the
user's attempt history for earlier topics (see the progression rules in that
reference). Save to `exercises/` and point the user to the file.

## Workflow 4 — Correct an attempt

Follow the correction section of `references/exercises-format.md`. In short:
grade each answer with specific feedback, save an attempt record, and update
the topic's front matter — `perceived_difficulty`, `weak_points`, and set
`status: review` when the result warrants it. End with a one-paragraph
summary of where the user struggled and what the next lesson will reinforce.

## Workflow 5 — Progress / review

Read `00-curriculum.md` and summarize: completed vs pending topics, topics
flagged for review, recurring weak points across attempts, and a suggested
next step. Keep it short and actionable — this is a status check, not a report.

## Style rules (all generated content)

- Output language, pedagogical tone and depth come from `config.yaml`
  (per-course overrides win over global). Respect them in every file.
- Code samples: variable names and comments in English regardless of the
  output language, unless configured otherwise.
- Lessons teach one topic well rather than several topics shallowly. When a
  topic turns out too large for one lesson, split it into subtopic lessons and
  note the split in the curriculum rather than compressing the content.
- Everything written to storage must be valid, plain Markdown that renders
  well in Obsidian (checkboxes, YAML front matter, standard headings). No
  HTML, no proprietary syntax.
