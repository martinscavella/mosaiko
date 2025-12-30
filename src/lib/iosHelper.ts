/**
 * iOS PWA Helper functions
 * Utilities to enhance the iOS PWA experience
 */

export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export const isStandalone = (): boolean => {
  const nav = window.navigator as unknown as { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

export const isIOSStandalone = (): boolean => {
  return isIOS() && isStandalone();
}

export const setupIOSPWA = (): void => {
  if (!isIOS()) return;

  // Set CSS custom property for viewport height
  const setViewportHeight = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  // Initial setup
  setViewportHeight();

  // Update on resize and orientation change
  window.addEventListener('resize', setViewportHeight);
  window.addEventListener('orientationchange', () => {
    // Delay to allow for iOS to complete orientation change
    setTimeout(setViewportHeight, 100);
  });

  // Prevent zoom on double tap
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, false);

  // Hide Safari UI elements in standalone mode
  if (isStandalone()) {
    document.body.style.setProperty('-webkit-user-select', 'none')
    document.body.style.setProperty('-webkit-touch-callout', 'none')
    document.body.style.setProperty('-webkit-tap-highlight-color', 'transparent')
  }
};

export const addToHomeScreenPrompt = (): boolean => {
  if (!isIOS() || isStandalone()) {
    return false;
  }

  // Return true if we should show the iOS add to home screen instructions
  return !localStorage.getItem('ios-add-to-home-dismissed');
};

export const dismissAddToHomeScreen = (): void => {
  localStorage.setItem('ios-add-to-home-dismissed', 'true');
};
