export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Keep silent to avoid noisy UX if SW registration fails.
    });
  });
}

// Native app enhancements
export function initNativeAppFeatures() {
  // Prevent zoom on input focus (iOS)
  const metaViewport = document.querySelector('meta[name="viewport"]');
  if (metaViewport) {
    metaViewport.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no, minimal-ui');
  }

  // Prevent double-tap zoom
  let lastTouchEnd = 0;
  document.addEventListener('touchend', function(event) {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, false);

  // Prevent bouncy scroll
  document.body.addEventListener('touchmove', function(e) {
    if (e.target === document.body) {
      e.preventDefault();
    }
  }, { passive: false });

  // Handle app orientation
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('portrait').catch(() => {
      // Silently continue if lock fails
    });
  }

  // Enhance status bar color dynamically to match toolbar
  function updateStatusBarColor() {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      // Match toolbar background: white in light mode, dark surface in dark mode
      metaThemeColor.setAttribute('content', isDark ? '#1e1e1e' : '#ffffff');
    }
  }

  updateStatusBarColor();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateStatusBarColor);

  // Improve touchscreen responsiveness
  document.addEventListener('touchstart', function() {}, { passive: true });
  document.addEventListener('touchmove', function() {}, { passive: true });
  document.addEventListener('touchend', function() {}, { passive: true });

  // Disable pinch zoom on touch
  document.addEventListener('wheel', function(event) {
    if (event.ctrlKey) {
      event.preventDefault();
    }
  }, { passive: false });

  // Hide address bar on scroll (mobile)
  let lastScrollPos = 0;
  window.addEventListener('scroll', () => {
    if (window.scrollY > lastScrollPos) {
      // Scrolling down - might hide address bar
      document.body.style.paddingTop = '0';
    }
    lastScrollPos = window.scrollY;
  }, { passive: true });

  // Status bar color matching on app resume
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      updateStatusBarColor();
    }
  });

  // Disable autofill suggestions - Simple approach
  function disableAutofill() {
    // 1. Apply to all existing inputs
    const allInputs = document.querySelectorAll('input, textarea, select');
    allInputs.forEach(input => {
      input.setAttribute('autocomplete', 'new-password');
      input.setAttribute('autocorrect', 'off');
      input.setAttribute('autocapitalize', 'off');
      input.setAttribute('spellcheck', 'false');
    });

    // 2. Set autocomplete on all forms to off
    document.querySelectorAll('form').forEach(form => {
      form.setAttribute('autocomplete', 'off');
    });

    // 3. Watch for dynamically added inputs
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            if (node.matches && node.matches('input, textarea, select')) {
              node.setAttribute('autocomplete', 'new-password');
              node.setAttribute('autocorrect', 'off');
              node.setAttribute('autocapitalize', 'off');
              node.setAttribute('spellcheck', 'false');
            }
            node.querySelectorAll && node.querySelectorAll('input, textarea, select').forEach(input => {
              input.setAttribute('autocomplete', 'new-password');
              input.setAttribute('autocorrect', 'off');
              input.setAttribute('autocapitalize', 'off');
              input.setAttribute('spellcheck', 'false');
            });
          }
        });
      });
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  // Run immediately and on load
  disableAutofill();
  document.addEventListener('DOMContentLoaded', disableAutofill);
  window.addEventListener('load', disableAutofill);
}
