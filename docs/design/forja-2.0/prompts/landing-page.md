Create EXACTLY ONE new desktop landing page design in the existing Forja project. Title: "Forja 2.0 - Landing page - Guided RPI". This is a PUBLIC MARKETING PAGE, not an application screen, component gallery, onboarding, dashboard, or settings view. Preserve all existing screens.

REFERENCES:

- Previous landing page: https://forja.web.app/. It has a compact navbar, centered hero, large application preview, alternating product sections, and a final GitHub CTA. Reuse that clear narrative rhythm and brand continuity only.
- The OLD proposition was a desktop GUI for AI CLIs, multi-session rendering, many themes and downloading version 1. Those are NOT the new primary proposition.
- Approved Forja 2.0 application screens in this project: b1e7dc73f23d4af5b81d37d978ef4b68 (feature flow), 2551431dbc994626a9fd20cd8290a8d7 (observable agent terminal), a486490d997146329aa2b82c637c98ee (configuration), 5cae4de038e748b7a1a0f06f6f332da3 (component styleguide).
- Use the approved Terminal Noir identity: neutral near-black, subtle gray borders, warm amber #F5A623, JetBrains Mono, restrained geometry. Do not reuse the old purple/Catppuccin palette or old terminal-only screenshot.
- Existing screens inform the product visuals; the webpage has its own marketing layout. Do NOT wrap the entire landing page inside the app's sidebar/topbar/composer. Screenshots may contain the app shell.

FACTS AND HONEST STATUS:
Forja 2.0 is being designed and developed. The current code is an early scaffold; most MVP behavior below is planned, not shipped. Be explicit near the hero and in the feature-section label. Do not imply downloads, production readiness or verified five-CLI compatibility.
OFFICIAL PRODUCT OBJECTIVE (use verbatim as the hero supporting copy): An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.
Installed CLIs are the execution mechanism, not the primary product definition.
Fixed agent roles: Research, Planner, Implementer, Tester, Reviewer.
One feature per renameable tab, isolated conversations and Git target/worktree, one agent execution per feature, parallel work across features.
Human approves specs/plans and Git integration. Per-agent automatic handoff does not grant artifact approval. Full autonomous approval is NOT part of the MVP.
Documents are Markdown/Mermaid specs, plans and reviews stored in the opened folder; runtime state and approvals stay in local SQLite, not STATE.md in user projects.
A global composer addresses the active agent of the selected feature. Combobox and @ select one recipient.
Planned agent commands go through a Forja MCP runner with visible command/output/directory and stop controls. A separate manual terminal uses the developer's default shell. Terminal tabs collapse into a footer toolbar with state previews.
Integrations TARGETED for this MVP: Claude Code, Codex, OpenCode, agy and Grok. Compatibility and controlled-execution support must be validated per CLI. Do not present integrations as already verified.
Skills are read-only from a configurable local folder. Existing CLI authentication is reused; no new Forja AI service or credential capture.
Public repository: https://github.com/nandomoreirame/forja.
No confirmed launch date, new-version license decision, price, benchmark, star count, customer proof or platform-wide availability. Do not invent any.

PAGE SCOPE:
One full landing page, 1440px logical desktop width, vertically scrollable to fit the sections. Container approximately 1120px, deliberate spacing, legible body copy, large truthful product preview. Avoid tiny text copied from a styleguide board.
ALL MARKETING COPY MUST BE IN ENGLISH. Existing app screenshots may preserve their original Portuguese UI; do not fabricate or translate product features to make fake screenshots.
Use the exact sections and copy below. Minor line wrapping is fine; do not add new claims or sections.

1. NAVBAR:
Forja anvil mark + "Forja 2.0".
Anchor links: "Why Forja", "Workflow", "What’s planned".
CTA: "Follow development", linking to https://github.com/nandomoreirame/forja.
No Download button, themes selector, account login, pricing, newsletter form or social counters.

2. HERO:
Small status label: "FORJA 2.0 · IN DEVELOPMENT".
Headline EXACT: "Keep your AI work moving. Know what happens next."
Supporting copy EXACT:
"An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage."
CTA: "Follow development", same GitHub destination.
Small note: "The 2.0 MVP is in development. Preview the direction below."
Below, one large faithful product mockup based on approved execution-with-terminals screen 2551431dbc994626a9fd20cd8290a8d7. Show recognizable feature tabs, RPI steps, sidebar artifacts, global composer and terminal panel. Label it clearly "Design preview · planned MVP".
Use a screenshot-like faithful view, not an imaginary IDE, a terminal-only v1 view, a code editor, new dashboard or decorative tilted 3D card. No macOS traffic lights.

3. WHY FORJA, PROBLEM FIRST:
Eyebrow: "WHY FORJA".
Heading: "The work spans more than a conversation."
Paragraph:
"Research produces decisions. Planning turns them into tasks. Implementation changes code. Tests and reviews send work back for correction. Keeping those steps connected across terminals and documents takes attention away from the feature."
Closing:
"Forja 2.0 is being built around an opinionated RPI workflow, connecting the spec, plan, agents and execution history with your explicit approval before the next stage."
No exaggerated productivity statistics, competitor attacks or promises of error-free AI.

4. WORKFLOW:
Eyebrow "THE GUIDED WORKFLOW".
Heading "Five roles. Explicit handoffs."
A clean horizontal connected sequence, not a Kanban board or five giant cards:
Research -> Planner -> Implementer -> Tester -> Reviewer.
Each node has ONLY one short line:
Research: "Clarify the problem and write the spec."
Planner: "Turn the approved spec into a plan."
Implementer: "Build from the approved plan."
Tester: "Run checks and report failures."
Reviewer: "Review the changes and record findings."
Below:
"Corrections return to the Implementer with links to the request and its execution. Automatic handoffs remain bounded; approvals stay explicit."
A compact approval marker between Research/Planner and Planner/Implementer is allowed. Do not suggest the agent approves its own spec or merges automatically.

5. PLANNED CAPABILITIES:
Eyebrow "PLANNED FOR THE MVP".
Heading "Stay close to the work."
Four feature stories, arranged as two restrained alternating text/detail rows or a coherent 2x2 composition, with approved UI fragments. Do not add more than four.
A. "One tab per feature"
"Keep each feature’s conversations, target repository and worktree together. Work on multiple features without mixing their context."
Visual: two feature tabs, one selected, with a visible target path.
B. "Documents you can discuss"
"Read specs, plans and reviews as formatted Markdown with Mermaid. Select a passage to prepare a revision request for its author."
Visual: a compact document fragment and "Review with agent" selection popover. This is a planned capability visual, not a claim that it already ships.
C. "Execution you can follow"
"Watch agent commands and output through the Forja MCP runner. Use your own shell in a separate tab, and keep background processes visible in the footer."
Visual: terminal tabs with window-terminal icon before EACH tab, agent tests and dev execution tabs plus a manual "zsh" example; + at the right; collapsed footer state preview. Do not add SSH, splits or shell-profile selectors.
D. "Your tools, configured per role"
"Choose the CLI, model, instructions and local skills for each of the five agents. Skills stay read-only; your existing tools keep their authentication."
Small text-only line: "Target integrations: Claude Code · Codex · OpenCode · agy · Grok".
Small qualification: "Availability depends on validated adapter capabilities."
No provider logos requiring invented partnerships, no Gemini, Pi, API keys, tool marketplace or custom agent creation.

6. SCOPE AND FAQ:
Heading "A focused first release."
One short paragraph:
"The first MVP focuses on the Guided workflow and a Linux acceptance environment. Full autonomous approvals, onboarding and cross-platform release packaging are outside this initial scope."
Three FAQ rows only, expanded or simple readable Q/A:
Q: "Can I download Forja 2.0 now?"
A: "The 2.0 MVP is still in development. Follow the repository for progress and release information."
Q: "Does Forja replace my AI CLI?"
A: "Forja defines the RPI workflow and your approval points. Installed coding CLIs provide execution, with per-role configuration and validated controlled-execution capabilities."
Q: "Who decides when work moves forward?"
A: "You approve the spec, plan and key transitions. Agent handoffs can be enabled, but do not bypass required approvals or permission to integrate changes."
No pricing, subscriptions, guarantees, telemetry promises, sandbox claims or claims that all network data stays on the machine.

7. FINAL CTA AND FOOTER:
Heading "Follow Forja 2.0 as it takes shape."
Paragraph "An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage."
CTA "Follow development" -> same GitHub repository.
Footer: Forja 2.0, "Opinionated RPI development · In development".
Links "Source" -> repository and "Issues" -> https://github.com/nandomoreirame/forja/issues.
No invented copyright date, license badge, privacy policy, release link or email address.

EXPLICIT PROHIBITIONS:
Do not carry over the old landing's "1.2k+ GitHub Stars", "400+ Tests Passing", "14 themes", "Free forever", "MIT", "Native macOS & Linux" or download CTA. Those are not confirmed 2.0 promises.
Do not add testimonials, customer logos, charts, token savings, model leaderboards, launch countdown, team collaboration, cloud sync, SaaS accounts, autonomous mode, mobile app or sales forms.
Do not add extra copy or features beyond the approved inventory.
Do not use the generic shadcn default appearance or purple gradients. Product excerpts must match Terminal Noir and the user's terminal refinements.
Do not generate application pages, new styleguide screens or multiple variants.
Deliver EXACTLY ONE landing page that makes the NEW proposition and current development status clear.

## Result

- [Generated landing page in Stitch](https://stitch.withgoogle.com/projects/9281162402489678867/screens/bf8dfb657a774e26b6205771525461a8).
- One marketing design generated. Existing product screens and the live website were not changed.
- Human visual approval is pending. Implementation and deployment are separate tasks.
