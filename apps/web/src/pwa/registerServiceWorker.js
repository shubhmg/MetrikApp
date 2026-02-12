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

  // Enhance status bar color dynamically
  function updateStatusBarColor() {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', '#12b886');
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

  // Disable autofill and hide autofill suggestion icons - AGGRESSIVE approach
  function disableAutofill() {
    // 1. Apply to all existing inputs immediately
    const allInputs = document.querySelectorAll('input, textarea, select');
    allInputs.forEach(input => {
      // Disable all forms of autocomplete
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('autocorrect', 'off');
      input.setAttribute('autocapitalize', 'off');
      input.setAttribute('spellcheck', 'false');
      input.setAttribute('data-autofill', 'off');

      // Add transition delay to prevent autofill animation
      input.style.transition = 'background-color 5000s ease-in-out 0s';
    });

    // 2. Intercept form submissions to clear autofill
    document.querySelectorAll('form').forEach(form => {
      form.setAttribute('autocomplete', 'off');

      form.addEventListener('submit', (e) => {
        // This won't prevent submission, just clears autofill data
        allInputs.forEach(input => {
          if (input.value) {
            // Keep the value but prevent autofill suggestions
            input.style.transition = 'background-color 5000s ease-in-out 0s';
          }
        });
      });
    });

    // 3. Watch for autofill and immediately override it
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            // Handle single input elements
            if (node.matches && node.matches('input, textarea, select')) {
              applyAutofillDisable(node);
            }
            // Handle parent containers with inputs
            node.querySelectorAll && node.querySelectorAll('input, textarea, select').forEach(input => {
              applyAutofillDisable(input);
            });
          }
        });
      });
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    // 4. Also watch for autofill by checking input styles
    setInterval(() => {
      document.querySelectorAll('input, textarea, select').forEach(input => {
        const styles = window.getComputedStyle(input);
        // If autofilled, reapply our styles
        if (styles.webkitAutofillBackground || input.matches(':-webkit-autofill')) {
          input.style.transition = 'background-color 5000s ease-in-out 0s';
          input.style.WebkitTextFillColor = getComputedStyle(document.documentElement).getPropertyValue('--app-text');
        }
      });
    }, 100);
  }

  // Helper function to apply autofill disabling
  function applyAutofillDisable(input) {
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('spellcheck', 'false');
    input.setAttribute('data-autofill', 'off');
    input.style.transition = 'background-color 5000s ease-in-out 0s';

    // Prevent autofill color change
    input.addEventListener('change', () => {
      input.style.transition = 'background-color 5000s ease-in-out 0s';
    });
  }

  // Call autofill disabling
  disableAutofill();
  document.addEventListener('DOMContentLoaded', disableAutofill);
  window.addEventListener('load', disableAutofill);

  // Also run after a longer delay to catch lazy-loaded forms
  setTimeout(disableAutofill, 500);
  setTimeout(disableAutofill, 1000);
  setTimeout(disableAutofill, 2000);
}
