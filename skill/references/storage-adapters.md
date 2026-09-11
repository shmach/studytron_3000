# Storage adapters

All course state is Markdown. The adapter decides where it lives and how it's
read/written. Resolve the adapter from `config.yaml` (`storage.adapter`)
before any read/write.

## `local` (default, fully implemented)

Reads and writes files directly under `storage.root` using the filesystem
tools available in the session (Claude Desktop / Claude Code / any environment
with file access).

- `storage.root` points at the courses root — typically a folder inside the
  user's Obsidian vault (e.g. `C:\Users\me\vault\Courses`).
- Always confirm the root exists on first use of a session; if the configured
  path is unreachable, tell the user instead of silently writing elsewhere.
- Edits to `00-curriculum.md` must be surgical (targeted string replacement of
  the relevant `topic-meta` block / checkbox), preserving the user's manual
  edits elsewhere in the file.
- Filenames: kebab-case ASCII slugs; topic id prefix keeps them sorted
  (`2.3-inductive-sensors.md` → `2-3-inductive-sensors.md` if the platform
  dislikes dots).

## `remote` (planned — SaaS API)

Reserved for the hosted version. When `storage.adapter: remote` is configured
but no implementation instructions exist yet, say so and offer to fall back
to `local`. Design contract for the future implementation, so nothing else in
this skill needs to change when it lands:

- Same file semantics over HTTP: `GET/PUT /courses/<slug>/<path>` carrying the
  raw Markdown, plus `GET /courses` for listing.
- Auth via an API key in `storage.remote.api_key_env` (environment variable
  name — never store the key itself in config files that may be committed).
- The Markdown formats in the other reference files ARE the API payload spec:
  the server parses `topic-meta` blocks and front matter, which is why their
  field names must never drift.
