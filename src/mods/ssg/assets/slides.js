// Slide-deck navigation for a published note with `slides: true` frontmatter.
// Only loaded on pages that actually are a slide deck (see render.ts's
// `scripts` template fill) — an ordinary published note ships no script.
(function () {
  var deck = document.querySelector(".slide-deck");
  if (!deck) return;

  var slides = Array.prototype.slice.call(deck.querySelectorAll(".slide"));
  var bar = deck.querySelector(".slide-progress-bar");
  var count = deck.querySelector(".slide-count");
  var i = slides.indexOf(deck.querySelector(".slide.active"));
  if (i < 0) i = 0;

  function show(n) {
    n = Math.max(0, Math.min(slides.length - 1, n));
    if (n === i) return;
    slides[i].classList.remove("active");
    slides[n].classList.add("active");
    i = n;
    render();
  }

  function render() {
    if (bar) bar.style.width = ((i + 1) / slides.length) * 100 + "%";
    if (count) count.textContent = (i + 1) + " / " + slides.length;
  }

  function isEditable(el) {
    return el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
  }

  document.addEventListener("keydown", function (e) {
    if (isEditable(document.activeElement)) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " " || e.key === "PageDown") {
      e.preventDefault();
      show(i + 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") {
      e.preventDefault();
      show(i - 1);
    } else if (e.key === "Home") {
      show(0);
    } else if (e.key === "End") {
      show(slides.length - 1);
    } else if (e.key === "f" || e.key === "F") {
      toggleFullscreen();
    }
  });

  var prevBtn = deck.querySelector(".slide-prev");
  var nextBtn = deck.querySelector(".slide-next");
  var fsBtn = deck.querySelector(".slide-fullscreen");
  if (prevBtn) prevBtn.addEventListener("click", function () { show(i - 1); });
  if (nextBtn) nextBtn.addEventListener("click", function () { show(i + 1); });
  if (fsBtn) fsBtn.addEventListener("click", toggleFullscreen);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (deck.requestFullscreen) {
      deck.requestFullscreen();
    }
  }

  // click the left/right edge of the viewport to step back/forward — but not
  // when the click landed on a real link, button, or other interactive
  // element inside the slide content itself
  var viewport = deck.querySelector(".slide-viewport");
  if (viewport) {
    viewport.addEventListener("click", function (e) {
      if (e.target.closest("a, button, input, textarea, select, label")) return;
      var rect = viewport.getBoundingClientRect();
      var half = rect.left + rect.width / 2;
      show(e.clientX < half ? i - 1 : i + 1);
    });
  }

  // touch swipe
  var touchStartX = null;
  deck.addEventListener("touchstart", function (e) {
    touchStartX = e.changedTouches[0].clientX;
  }, { passive: true });
  deck.addEventListener("touchend", function (e) {
    if (touchStartX === null) return;
    var dx = e.changedTouches[0].clientX - touchStartX;
    touchStartX = null;
    if (Math.abs(dx) < 40) return;
    show(dx < 0 ? i + 1 : i - 1);
  }, { passive: true });

  render();
})();
