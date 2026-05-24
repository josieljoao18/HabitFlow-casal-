import confetti from 'canvas-confetti';

export const playCompletionSound = (): void => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    // Success musical tone (G5)
    osc.frequency.setValueAtTime(783.99, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // sliding up to A5
    
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {
    console.debug('AudioContext not allowed or failed:', e);
  }
};

export const triggerConfetti = (): void => {
  try {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#10b981', '#059669', '#34d399', '#3b82f6', '#f43f5e']
    });
  } catch (e) {
    console.debug('Confetti failed to run:', e);
  }
};

export const performVibe = (): void => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(35);
    } catch (e) {
      // Ignored - system restrictions
    }
  }
};

export const triggerSystemNotification = (title: string, body: string, iconUrl?: string): void => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.debug('Notifications are not supported by this browser.');
    return;
  }
  
  if (Notification.permission === 'granted') {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        const options: any = {
          body: body,
          icon: iconUrl || '/icon.svg',
          vibrate: [200, 100, 200],
          badge: '/icon.svg',
          tag: 'sintonia-coach',
          requireInteraction: false
        };
        registration.showNotification(title, options);
      }).catch((err) => {
        console.debug('Service Worker not ready for notification, using fallback:', err);
        new Notification(title, {
          body: body,
          icon: iconUrl || '/icon.svg'
        });
      });
    } else {
      new Notification(title, {
        body: body,
        icon: iconUrl || '/icon.svg'
      });
    }
  } else {
    console.debug('Notification permission not granted. Current state:', Notification.permission);
  }
};
