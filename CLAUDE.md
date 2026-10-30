# Claude Code Game Studios -- Game Studio Agent Architecture

Indie game development managed through 49 coordinated Claude Code subagents.
Each agent owns a specific domain, enforcing separation of concerns and quality.

## Technology Stack

- **Engine**: None — native H5 running offline in the Xiaohongshu "小工具" WebView
  (`docs/architecture/adr-0001-no-engine-native-h5.md`)
- **Language**: JavaScript, ES2017 baseline; ES modules in development, bundled
  into one classic script inside one HTML file for release; no third-party
  libraries in the shipped package
- **Version Control**: Git with trunk-based development
- **Build System**: Node 24 built-ins only (`tools/build/`, dev-only, never shipped)
- **Asset Pipeline**: hand-made SVG in an inline `<symbol>` sprite, with
  build-time size and banned-feature checks (art bible §8)

> **Note**: No engine-specialist agent applies. Skills that stop on "no engine
> configured" are NOT APPLICABLE here: follow their structure with the H5 stack
> above and record the skip (see the `project.yaml` comment).

## Project Structure

@.claude/docs/directory-structure.md

## Engine Version Reference

<!-- ENGINE-REFERENCE-IMPORT: the line below is engine-specific. /setup-engine
     rewrites it to @docs/engine-reference/<engine>/VERSION.md for the chosen
     engine, so a Unity or Unreal project stops loading the Godot reference every
     session. It defaults to Godot (the template's example engine); skills that
     need the pinned version read docs/engine-reference/<engine>/VERSION.md on
     demand regardless of this import.
     This project has no engine: the import points at the H5 platform reference
     instead (user-approved 2026-10-27). -->
@docs/engine-reference/web-h5/VERSION.md


## Technical Preferences

`project.yaml` at the repo root is the primary config store — engine, specialists,
naming, platform, performance, modes. Skills resolve it via `resolve_config`
(see `.claude/docs/config-resolution.md`).

`.claude/docs/technical-preferences.md` is the **legacy fallback**, read on demand
when a key is absent from `project.yaml`. It is not imported here: before
`/setup-engine` runs it is almost entirely `[TO BE CONFIGURED]` placeholders, and
after it runs `project.yaml` holds the real values.

## Coordination Rules

@.claude/docs/coordination-rules.md

## Collaboration Protocol

**User-driven collaboration, not autonomous execution.**
Every task follows: **Question -> Options -> Decision -> Draft -> Approval**

- Agents MUST ask "May I write this to [filepath]?" before using Write/Edit tools
  (exempt: `active.md` appends, agent memory, a subagent's new file at the path
  its orchestrating skill named; see `.claude/rules/agent-memory.md`)
- Agents MUST show drafts or summaries before requesting approval
- Multi-file changes require explicit approval for the full changeset
- No commits without user instruction
- A skipped or dismissed question is not an answer: act on nothing, re-ask in
  plain text and wait
- Started outside this file's folder? Warn first: hooks, deny rules and the
  ask-first mode load only when Claude Code starts here

See `docs/COLLABORATIVE-DESIGN-PRINCIPLE.md` for full protocol and examples.

> **First session?** If the project has no engine configured and no game concept,
> run `/start` to begin the guided onboarding flow.

## Browser Access

**Connect to the user's Chrome only through browser harness** (the `browser-use`
plugin: `browser-use` CLI / `mcp__plugin_browser-use_browser-use__*` tools, CDP to
the running Chrome). Do not use Claude in Chrome (`mcp__claude-in-chrome__*`) for
it. Use the user's existing logins as they are (e.g. EvoMeme); never log in, type
passwords or top up for them. (User decision, 2026-10-30.)

## Coding Standards

@.claude/docs/coding-standards.md

## Context Management

Read `.claude/docs/context-management.md` on demand — it is a reference, not
session context. Two of its conventions are load-bearing and cited by name
elsewhere in the repo, so they are restated here rather than lost:

- **`production/session-state/active.md` is the session checkpoint.** The file is
  the memory, not the conversation. Read it first after any compaction, crash, or
  `/clear`.
- **Helpers in `.claude/scripts/` emit observations, never verdicts.** A script
  that scores or judges will eventually contradict a mode or override it cannot
  see. (Cited by `artifact-check.sh` and `adr-dep-graph.sh`.)
