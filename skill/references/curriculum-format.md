# Curriculum format (`00-curriculum.md`)

The curriculum is the single source of truth for course structure AND progress.
It must stay readable as a plain Obsidian note (the user will open and edit it
by hand) while carrying enough structured state for tooling to parse it.

## File structure

```markdown
---
course: "Java for Backend Development"
slug: "java-backend"
created: 2026-08-29
depth: standard          # quick | standard | deep
level: beginner          # user's starting level
goal: "Learn Java to build backend services"
language: pt-BR          # output language for lessons/exercises
---

# Java for Backend Development

> One-paragraph course overview: what the user will be able to do at the end.

## Module 1 — <Module name>

Short paragraph (1–2 lines) on what this module covers and why it comes first.

### 1.1 <Topic name>

```topic-meta
id: "1.1"
status: pending          # pending | in_progress | completed | review
perceived_difficulty:    # empty | easy | ok | hard (set after attempts)
weak_points: []          # short strings, e.g. ["checked exceptions"]
last_reviewed:           # ISO date, set when lesson generated or reviewed
```

- [ ] **1.1.1 <Subtopic name>** — 2–3 lines describing the intended scope:
  what will be explained, which examples/skills the learner should get out
  of it. Scope description only, never the content itself.
- [ ] **1.1.2 <Subtopic name>** — ...

### 1.2 <Topic name>
...
```

## Rules

- **Three levels, always**: module → topic → subtopic. Lessons are generated
  per *topic* (covering its subtopics); checkboxes live at *subtopic* level so
  partial progress is visible.
- Subtopic descriptions: 2–3 lines. Less than that gives future sessions too
  little guidance; more starts to become the lesson itself.
- Number of modules/topics scales with `depth`:
  - `quick`: 3–4 modules, 2–3 topics each
  - `standard`: 5–7 modules, 3–4 topics each
  - `deep`: 8+ modules, 4–5 topics each, including advanced/ecosystem modules
- Order topics by prerequisite chains, not by theme. When a topic depends on
  something unusual, note it in the topic paragraph ("builds on 2.3").
- The `topic-meta` fenced block must be valid YAML. Tooling (and the future
  remote adapter) parses these blocks, so keep the field names exactly as
  shown: `id`, `status`, `perceived_difficulty`, `weak_points`, `last_reviewed`.
- When updating state, edit ONLY the relevant `topic-meta` block and checkbox —
  never regenerate the whole file, which would destroy the user's manual edits.

## Status semantics

- `pending` — nothing generated yet
- `in_progress` — lesson generated, exercises not yet attempted or incomplete
- `completed` — lesson done and attempts show acceptable understanding
- `review` — attempts revealed gaps; next lesson must open with reinforcement
