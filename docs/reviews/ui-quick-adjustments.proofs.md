# Proofs: ui-quick-adjustments

- **Commit:** 52ca7928080f2495d717bf787a9acd41eab8d066
- **Tree:** clean
- **Result:** PASS

| Check | Requirements | Proof | Status |
| --- | --- | --- | --- |
| C1 | REQ-106 | run quick \| ✓ renders no Explorer, Changes or sync counts while their flags are off | PASS |
| C2 | REQ-110 | run quick \| ✓ renames an agent in Settings and shows the name with its role in the tooltip | PASS |
| C3 | REQ-107 | run quick \| ✓ opens the chat with the Ferreiro as soon as the first prompt is sent | PASS |
| C4 | REQ-108 | run quick \| ✓ shows the Ferreiro as the author of a summary | PASS |
| C5 | REQ-082 | run quick \| ✓ shows plan usage above Archived for tools with data | PASS |
| C6 | REQ-114 | run quick \| ✓ draws a face per agent with a distinct Ferreiro mark and a mouth only while speaking | PASS |
| C7 | REQ-115 | run quick \| ✓ maps each feature state to a distinct glyph and an animated spinner while working | PASS |
| C8 | REQ-116 | run quick \| ✓ opens a file preview from Explorer and a diff from Changes as tabs | PASS |
| C9 | REQ-117 | run quick \| ✓ adds a demand and starts it only after confirmation | PASS |
| C10 | REQ-118 | run quick \| ✓ places features and demands in RPI columns and opens a card | PASS |
| C11 | REQ-119 | run quick \| ✓ lists features and Ferreiro chats under Chats | PASS |

## Runs

### run quick (exit 0)

```text
 ✓ test/renderer/file-view.test.tsx > opens files from the keyboard 1119ms
 ✓ test/renderer/file-view.test.tsx > opens no file view while the flags are off 4ms
 ✓ test/renderer/ferreiro-chat.test.tsx > still starts a feature directly when an RPI agent is picked 2304ms
 ✓ test/renderer/ferreiro-chat.test.tsx > keeps the Ferreiro outside the RPI Flow cycle 979ms
 ✓ test/web/feature-status.test.tsx > keeps fixed glyph columns and state wording in rows and tabs for {"state":"draft"} 838ms
 ✓ test/web/feature-status.test.tsx > keeps fixed glyph columns and state wording in rows and tabs for {"state":"interrupted"} 705ms
 ✓ test/renderer/agent-names-settings.test.tsx > lists all six agents with Smith first and saves his display name 1631ms
 ✓ test/renderer/backlog-page.test.tsx > keeps the demand when the confirmation is cancelled 3028ms
 ✓ test/web/feature-status.test.tsx > keeps fixed glyph columns and state wording in rows and tabs for {"state":"failed"} 334ms
 ✓ test/renderer/backlog-page.test.tsx > lists demands newest first, edits and removes them, and refuses an empty title 2879ms
 ✓ test/web/feature-status.test.tsx > keeps fixed glyph columns and state wording in rows and tabs for {"state":"completed","endState":"integrated"} 407ms
 ✓ test/web/feature-status.test.tsx > keeps fixed glyph columns and state wording in rows and tabs for {"state":"interrupted","endState":"abandoned"} 261ms
 ✓ test/renderer/backlog-page.test.tsx > closes the Backlog tab with Ctrl+W 467ms
 ✓ test/renderer/backlog-page.test.tsx > hides the Backlog entry and page while the flag is off 187ms

 Test Files  14 passed (14)
      Tests  69 passed (69)
   Start at  19:30:52
   Duration  17.75s (tests 72%, environment 13%, import 10%, setup 3%, transform 2%)

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
