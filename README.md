# ChatGPT Audio Hijacker (Manifest V3)

A personal Chrome extension for `https://chatgpt.com` that intercepts OpenAI's native Read Aloud audio stream and replaces its UI with a draggable floating media controller.

## Features

- **One-click speaker button** injected into every message's action row (next to Copy/Dislike) via `MutationObserver` — no need to open the three-dot menu.
- **Triggers OpenAI's native Read Aloud** button (directly, or by opening/clicking through the overflow menu automatically), so you get the premium cloud voice stream.
- **Hijacks the native `<audio>` element**: keeps `audio.controls = false` and routes all control to the floating panel.
- **Floating media controller** with Play/Pause, ±10s skip, timeline scrubber, and a speed dropdown (1x / 1.25x / 1.5x / 1.75x / 2x).
- **Sticky speed memory**: preferred speed (default **1.5x**) is saved in `chrome.storage.local` and re-applied on every new track — even if the site tries to reset it to 1x (`ratechange` listener enforces it).
- **Draggable panel** (drag by the header) with **position persistence**: `top`/`left` coordinates are saved on drag-end and restored on reload.

## Install

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this folder.
4. Open/reload `https://chatgpt.com`.

## Usage

- Click the injected speaker icon under any assistant message.
- The floating panel appears; drag it anywhere by its header — the position sticks.
- Change speed in the dropdown — it persists across messages and reloads.
- The **×** button hides the panel; it reappears automatically on the next audio playback.

## Notes

- ChatGPT's DOM changes frequently. The script uses multiple selector fallbacks (`data-testid`, `aria-label`, menu-item text matching) to stay resilient, but selectors may need updating after major UI redesigns.
