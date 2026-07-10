/* ChatGPT Audio Hijacker — content script
 * 1. Injects a speaker button into each assistant message's action row.
 * 2. Clicking it triggers OpenAI's native "Read Aloud" (directly or via the overflow menu).
 * 3. Hijacks the native <audio> element and routes control to a floating, draggable media panel.
 * 4. Persists playback speed and panel position in chrome.storage.local.
 */
(() => {
  'use strict';

  const BTN_CLASS = 'cgpt-audio-hijacker-btn';
  const PANEL_ID = 'cgpt-audio-hijacker-panel';
  const SPEED_OPTIONS = [1, 1.25, 1.5, 1.75, 2];
  const DEFAULT_SPEED = 1.5;
  const STORAGE_KEYS = { speed: 'preferredSpeed', pos: 'panelPosition' };

  let preferredSpeed = DEFAULT_SPEED;
  let activeAudio = null;
  let panel = null;
  let ui = {};

  /* ---------------- storage ---------------- */

  function loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.speed, STORAGE_KEYS.pos], (res) => {
        if (typeof res[STORAGE_KEYS.speed] === 'number') {
          preferredSpeed = res[STORAGE_KEYS.speed];
        }
        resolve(res[STORAGE_KEYS.pos] || null);
      });
    });
  }

  function saveSpeed(speed) {
    preferredSpeed = speed;
    chrome.storage.local.set({ [STORAGE_KEYS.speed]: speed });
  }

  function savePosition(top, left) {
    chrome.storage.local.set({ [STORAGE_KEYS.pos]: { top, left } });
  }

  /* ---------------- native Read Aloud trigger ---------------- */

  // Radix UI buttons/menus on chatgpt.com often ignore plain .click();
  // dispatch a full pointer-event sequence instead.
  function simulateClick(el) {
    const opts = { bubbles: true, cancelable: true, composed: true, view: window };
    el.dispatchEvent(new PointerEvent('pointerover', opts));
    el.dispatchEvent(new PointerEvent('pointerdown', opts));
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new PointerEvent('pointerup', opts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.dispatchEvent(new MouseEvent('click', opts));
  }

  function findNativeReadAloudButton(scope) {
    // Direct button in the action row (present on wider layouts).
    // Never match our own injected button.
    return (
      scope.querySelector(
        `button[data-testid="voice-play-turn-action-button"]:not(.${BTN_CLASS})`
      ) ||
      Array.from(scope.querySelectorAll(`button:not(.${BTN_CLASS})`)).find((b) =>
        /read aloud/i.test(b.getAttribute('aria-label') || '')
      ) ||
      null
    );
  }

  function findOverflowButton(scope) {
    return (
      scope.querySelector('button[data-testid="more-actions-button"]') ||
      scope.querySelector('button[aria-label*="more" i][aria-haspopup]') ||
      Array.from(scope.querySelectorAll('button[aria-haspopup="menu"]')).pop() ||
      null
    );
  }

  function clickMenuItemReadAloud() {
    // Radix menus render in a portal at document.body level.
    const items = document.querySelectorAll('[role="menuitem"], [role="option"]');
    for (const item of items) {
      if (/read aloud/i.test(item.textContent || '')) {
        simulateClick(item);
        return true;
      }
    }
    return false;
  }

  function triggerReadAloud(actionRow) {
    const scope = actionRow.closest('[data-testid^="conversation-turn"], article') || actionRow;

    const direct = findNativeReadAloudButton(scope);
    if (direct) {
      simulateClick(direct);
      return;
    }

    // Fall back: open the three-dot overflow menu, then click "Read aloud".
    const overflow = findOverflowButton(scope);
    if (!overflow) return;
    simulateClick(overflow);

    let attempts = 0;
    const poll = setInterval(() => {
      attempts += 1;
      if (clickMenuItemReadAloud() || attempts > 20) {
        clearInterval(poll);
        if (attempts > 20) {
          // Close the menu again if we never found the item.
          document.body.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
          );
        }
      }
    }, 50);
  }

  /* ---------------- button injection ---------------- */

  const SPEAKER_SVG =
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';

  function isAssistantActionRow(row) {
    const turn = row.closest('[data-testid^="conversation-turn"], article');
    if (!turn) return false;

    // ChatGPT currently exposes the role on the turn itself (`data-turn`) and/or
    // on a descendant (`data-message-author-role`). Require an explicit assistant
    // role so user action rows never receive a button that cannot play anything.
    const turnRole = (
      turn.getAttribute('data-turn') ||
      turn.getAttribute('data-message-author-role') ||
      ''
    ).toLowerCase();
    if (turnRole) return turnRole === 'assistant';

    const message = turn.querySelector('[data-message-author-role]');
    return message?.getAttribute('data-message-author-role')?.toLowerCase() === 'assistant';
  }

  function findActionRows(root) {
    // Both user and assistant turns have Copy buttons, so use them only to locate
    // action rows and then filter those rows by the message author's role.
    const selector =
      'button[data-testid="copy-turn-action-button"], button[aria-label="Copy" i]';
    const copyButtons = [
      ...(root.matches?.(selector) ? [root] : []),
      ...root.querySelectorAll(selector),
    ];
    const rows = new Set();
    copyButtons.forEach((btn) => {
      const row = btn.parentElement;
      if (!row) return;

      if (isAssistantActionRow(row)) {
        rows.add(row);
      } else {
        // Clean up a button injected before a turn's role was available or if
        // ChatGPT reuses DOM while navigating between conversations.
        row.querySelector(`.${BTN_CLASS}`)?.remove();
      }
    });
    return rows;
  }

  function injectButton(row) {
    if (row.querySelector(`.${BTN_CLASS}`)) return;
    const btn = document.createElement('button');
    btn.className = BTN_CLASS;
    btn.type = 'button';
    btn.title = 'Play audio (hijacked player)';
    btn.setAttribute('aria-label', 'Play audio via floating player');
    btn.innerHTML = SPEAKER_SVG;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      triggerReadAloud(row);
    });
    row.insertBefore(btn, row.firstChild);
  }

  function scanAndInject(root) {
    findActionRows(root).forEach(injectButton);
  }

  /* ---------------- audio hijacking ---------------- */

  function hijackAudio(audio) {
    if (audio.dataset.cgptHijacked) return;
    audio.dataset.cgptHijacked = '1';

    activeAudio = audio;
    audio.controls = false; // keep OpenAI's layout hidden
    applyPreferredSpeed(audio);
    bindAudioToPanel(audio);
    if (!audio.paused) {
      setPlayIcon(false);
      showPanel();
    }
  }

  function applyPreferredSpeed(audio) {
    if (Math.abs(audio.playbackRate - preferredSpeed) > 0.001) {
      audio.playbackRate = preferredSpeed;
    }
  }

  function bindAudioToPanel(audio) {
    const onLoaded = () => {
      applyPreferredSpeed(audio);
      updateTimeline();
    };
    const onPlay = () => {
      activeAudio = audio;
      applyPreferredSpeed(audio);
      setPlayIcon(false);
      showPanel();
    };
    const onPause = () => {
      if (audio === activeAudio) setPlayIcon(true);
    };
    const onTime = () => {
      if (audio === activeAudio) updateTimeline();
    };
    const onRateChange = () => {
      // Sticky speed: never let the site reset us to 1x.
      if (audio === activeAudio) applyPreferredSpeed(audio);
    };
    const onEnded = () => {
      if (audio === activeAudio) {
        setPlayIcon(true);
        hidePanel();
      }
    };

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('durationchange', onLoaded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('playing', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ratechange', onRateChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('emptied', onEnded);
  }

  function hijackExistingAudio(root) {
    root.querySelectorAll('audio').forEach(hijackAudio);
  }

  /* ---------------- floating media panel ---------------- */

  function fmtTime(sec) {
    if (!isFinite(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function setPlayIcon(showPlay) {
    if (!ui.playBtn) return;
    ui.playBtn.innerHTML = showPlay
      ? '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>'
      : '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="1"/><rect x="14" y="4" width="5" height="16" rx="1"/></svg>';
  }

  function updateTimeline() {
    if (!activeAudio || !ui.scrubber) return;
    const { currentTime, duration } = activeAudio;
    ui.current.textContent = fmtTime(currentTime);
    ui.total.textContent = fmtTime(duration);
    if (isFinite(duration) && duration > 0 && !ui.scrubber.matches(':active')) {
      ui.scrubber.value = String((currentTime / duration) * 100);
    }
  }

  function buildPanel(savedPos) {
    panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <div class="cgpt-ah-header">
        <span class="cgpt-ah-grip">⠿</span>
        <span class="cgpt-ah-title">ChatGPT Audio</span>
        <button class="cgpt-ah-close" title="Hide panel" aria-label="Hide panel">×</button>
      </div>
      <div class="cgpt-ah-timeline">
        <span class="cgpt-ah-current">0:00</span>
        <input class="cgpt-ah-scrubber" type="range" min="0" max="100" step="0.1" value="0" aria-label="Seek" />
        <span class="cgpt-ah-total">0:00</span>
      </div>
      <div class="cgpt-ah-controls">
        <button class="cgpt-ah-back" title="Back 10s" aria-label="Skip back 10 seconds">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>
          <span class="cgpt-ah-skip-label">10</span>
        </button>
        <button class="cgpt-ah-play" title="Play / Pause" aria-label="Play or pause"></button>
        <button class="cgpt-ah-fwd" title="Forward 10s" aria-label="Skip forward 10 seconds">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>
          <span class="cgpt-ah-skip-label">10</span>
        </button>
        <select class="cgpt-ah-speed" title="Playback speed" aria-label="Playback speed"></select>
      </div>
    `;
    document.documentElement.appendChild(panel);

    ui = {
      header: panel.querySelector('.cgpt-ah-header'),
      closeBtn: panel.querySelector('.cgpt-ah-close'),
      current: panel.querySelector('.cgpt-ah-current'),
      total: panel.querySelector('.cgpt-ah-total'),
      scrubber: panel.querySelector('.cgpt-ah-scrubber'),
      backBtn: panel.querySelector('.cgpt-ah-back'),
      playBtn: panel.querySelector('.cgpt-ah-play'),
      fwdBtn: panel.querySelector('.cgpt-ah-fwd'),
      speedSel: panel.querySelector('.cgpt-ah-speed'),
    };

    // Speed dropdown
    SPEED_OPTIONS.forEach((s) => {
      const opt = document.createElement('option');
      opt.value = String(s);
      opt.textContent = `${s}x`;
      if (s === preferredSpeed) opt.selected = true;
      ui.speedSel.appendChild(opt);
    });
    ui.speedSel.addEventListener('change', () => {
      const speed = parseFloat(ui.speedSel.value);
      saveSpeed(speed);
      if (activeAudio) activeAudio.playbackRate = speed;
    });

    setPlayIcon(true);
    // Set play button to blue to match the injected audio button
    if (ui.playBtn) {
      ui.playBtn.style.background = '#3b82f6 !important';
    }

    // Transport controls
    ui.playBtn.addEventListener('click', () => {
      if (!activeAudio) return;
      if (activeAudio.paused) activeAudio.play();
      else activeAudio.pause();
    });
    ui.backBtn.addEventListener('click', () => {
      if (activeAudio) activeAudio.currentTime = Math.max(0, activeAudio.currentTime - 10);
    });
    ui.fwdBtn.addEventListener('click', () => {
      if (activeAudio && isFinite(activeAudio.duration)) {
        activeAudio.currentTime = Math.min(activeAudio.duration, activeAudio.currentTime + 10);
      }
    });
    ui.scrubber.addEventListener('input', () => {
      if (activeAudio && isFinite(activeAudio.duration)) {
        activeAudio.currentTime = (parseFloat(ui.scrubber.value) / 100) * activeAudio.duration;
      }
    });
    ui.closeBtn.addEventListener('click', () => {
      panel.style.display = 'none';
    });

    // Restore saved position
    if (savedPos && typeof savedPos.top === 'number' && typeof savedPos.left === 'number') {
      applyPosition(savedPos.top, savedPos.left);
    }

    makeDraggable();
    panel.style.display = 'none'; // hidden until audio starts / button clicked
  }

  function applyPosition(top, left) {
    const maxLeft = Math.max(0, window.innerWidth - panel.offsetWidth - 4);
    const maxTop = Math.max(0, window.innerHeight - panel.offsetHeight - 4);
    panel.style.left = `${Math.min(Math.max(0, left), maxLeft)}px`;
    panel.style.top = `${Math.min(Math.max(0, top), maxTop)}px`;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
  }

  function makeDraggable() {
    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    ui.header.addEventListener('mousedown', (e) => {
      if (e.target === ui.closeBtn) return;
      dragging = true;
      const rect = panel.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      panel.classList.add('cgpt-ah-dragging');
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      applyPosition(e.clientY - offsetY, e.clientX - offsetX);
    });

    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      panel.classList.remove('cgpt-ah-dragging');
      const rect = panel.getBoundingClientRect();
      savePosition(Math.round(rect.top), Math.round(rect.left));
    });
  }

  function showPanel() {
    if (panel) panel.style.display = '';
  }

  function hidePanel() {
    if (panel) panel.style.display = 'none';
  }

  /* ---------------- observers ---------------- */

  function startObserver() {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (node.tagName === 'AUDIO') {
            hijackAudio(node);
          } else {
            hijackExistingAudio(node);
            scanAndInject(node);
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  /* ---------------- init ---------------- */

  async function init() {
    const savedPos = await loadSettings();
    buildPanel(savedPos);
    scanAndInject(document.body);
    hijackExistingAudio(document.body);
    startObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
