/* Runs in the page's MAIN world.
 * ChatGPT sometimes plays Read Aloud audio through a detached `new Audio()` object
 * that never enters the DOM, so the isolated content script can't see it.
 * Patch HTMLMediaElement.play so any detached audio gets adopted into the DOM
 * (hidden), where the content script's MutationObserver picks it up.
 */
(() => {
  const origPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...args) {
    try {
      if (this.tagName === 'AUDIO' && !this.isConnected && document.body) {
        this.style.display = 'none';
        this.setAttribute('data-cgpt-ah-adopted', '1');
        document.body.appendChild(this);
      }
    } catch (_) {
      /* never break playback */
    }
    return origPlay.apply(this, args);
  };
})();
