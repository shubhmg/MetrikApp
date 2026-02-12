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
}

