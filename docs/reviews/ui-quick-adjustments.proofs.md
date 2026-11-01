# Proofs: ui-quick-adjustments

- **Commit:** b73883f5e864acb7a97f8d388ae67ed899527402
- **Tree:** dirty (docs/plans/2026-11-01-ui-quick-adjustments.md)
- **Result:** FAIL

| Check | Requirements | Proof | Status |
| --- | --- | --- | --- |
| C1 | REQ-106 | run quick \| ✓ renders no Explorer, Changes or sync counts while their flags are off | PASS |
| C2 | REQ-110 | run quick \| ✓ renames an agent in Settings and shows the name with its role in the tooltip | PASS |
| C3 | REQ-107 | run quick \| ✓ opens the chat with the Ferreiro as soon as the first prompt is sent | PASS |
| C4 | REQ-108 | run quick \| ✓ shows the Ferreiro as the author of a summary | PASS |
| C5 | REQ-082 | run quick \| ✓ shows plan usage above Archived for tools with data | PASS |
| C6 | REQ-114 | run quick \| ✓ draws a face per agent with a distinct Ferreiro mark and moving eyes while speaking | NO TEST RAN |
| C7 | REQ-115 | run quick \| ✓ maps each feature state to a distinct glyph and an animated spinner while working | PASS |
| C8 | REQ-116 | run quick \| ✓ opens a file preview from Explorer and a diff from Changes as tabs | PASS |
| C9 | REQ-117 | run quick \| ✓ adds a demand and starts it only after confirmation | PASS |
| C10 | REQ-118 | run quick \| ✓ places features and demands in RPI columns and opens a card | PASS |
| C11 | REQ-119 | run quick \| ✓ lists features and Ferreiro chats under Chats | PASS |

## Runs

### run quick (exit 0)

```text
 ✓ test/web/feature-status.test.tsx > keeps fixed glyph columns and state wording in rows and tabs for {"state":"draft"} 664ms
 ✓ test/renderer/ferreiro-chat.test.tsx > still starts a feature directly when an RPI agent is picked 1688ms
 ✓ test/renderer/ferreiro-chat.test.tsx > keeps the Ferreiro outside the RPI Flow cycle 1068ms
 ✓ test/renderer/file-view.test.tsx > opens files from the keyboard 936ms
 ✓ test/renderer/file-view.test.tsx > opens no file view while the flags are off 3ms
 ✓ test/renderer/agent-names-settings.test.tsx > lists all six agents with Smith first and saves his display name 1747ms
 ✓ test/web/feature-status.test.tsx > keeps fixed glyph columns and state wording in rows and tabs for {"state":"interrupted"} 928ms
 ✓ test/renderer/backlog-page.test.tsx > keeps the demand when the confirmation is cancelled 2772ms
 ✓ test/web/feature-status.test.tsx > keeps fixed glyph columns and state wording in rows and tabs for {"state":"failed"} 459ms
 ✓ test/renderer/backlog-page.test.tsx > lists demands newest first, edits and removes them, and refuses an empty title 2314ms
 ✓ test/web/feature-status.test.tsx > keeps fixed glyph columns and state wording in rows and tabs for {"state":"completed","endState":"integrated"} 314ms
 ✓ test/web/feature-status.test.tsx > keeps fixed glyph columns and state wording in rows and tabs for {"state":"interrupted","endState":"abandoned"} 364ms
 ✓ test/renderer/backlog-page.test.tsx > closes the Backlog tab with Ctrl+W 375ms
 ✓ test/renderer/backlog-page.test.tsx > hides the Backlog entry and page while the flag is off 248ms

 Test Files  13 passed (13)
      Tests  65 passed (65)
   Start at  19:22:40
   Duration  15.95s (tests 81%, environment 9%, import 6%, transform 2%, setup 2%)

Not implemented: HTMLCanvasElement's getContext() method: without installing the canvas npm package
Not implemented: HTMLCanvasElement's getContext() method: without installing the canvas npm package
Not implemented: HTMLCanvasElement's getContext() method: without installing the canvas npm package
Not implemented: HTMLCanvasElement's getContext() method: without installing the canvas npm package
Not implemented: HTMLCanvasElement's getContext() method: without installing the canvas npm package
Not implemented: HTMLCanvasElement's getContext() method: without installing the canvas npm package
Not implemented: HTMLCanvasElement's getContext() method: without installing the canvas npm package
Not implemented: HTMLCanvasElement's getContext() method: without installing the canvas npm package
Not implemented: HTMLCanvasElement's getContext() method: without installing the canvas npm package
Not implemented: HTMLCanvasElement's getContext() method: without installing the canvas npm package
Not implemented: HTMLCanvasElement's getContext() method: without installing the canvas npm package
Not implemented: HTMLCanvasElement's getContext() method: without installing the canvas npm package
Not implemented: HTMLCanvasElement's getContext() method: without installing the canvas npm package
Not implemented: HTMLCanvasElement's getContext() method: without installing the canvas npm package
Not implemented: HTMLCanvasElement's getContext() method: without installing the canvas npm package
Not implemented: HTMLCanvasElement's getContext() method: without installing the canvas npm package
Not implemented: HTMLCanvasElement's getContext() method: without installing the canvas npm package
Not implemented: HTMLCanvasElement's getContext() method: without installing the canvas npm package
Not implemented: HTMLCanvasElement's getContext() method: without installing the canvas npm package
Not implemented: HTMLCanvasElement's getContext() method: without installing the canvas npm package
```
