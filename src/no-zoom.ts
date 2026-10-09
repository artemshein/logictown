import './no-zoom.css';

// iOS Safari ignores user-scalable=no, so pinch and double-tap zoom are blocked here as well.
for (const type of ['gesturestart', 'gesturechange', 'gestureend', 'dblclick'])
  document.addEventListener(type, (event) => event.preventDefault(), { passive: false });

// A zoom left over from before this fix (or from an accessibility shortcut) snaps back on the next tap.
document.addEventListener('touchend', () => {
  if (window.visualViewport && window.visualViewport.scale > 1.01) {
    const meta = document.querySelector<HTMLMetaElement>('meta[name=viewport]');
    if (!meta) return;
    const content = meta.content;
    meta.content = `${content.replace(/,?\s*maximum-scale=[^,]*/, '')},maximum-scale=1`;
    requestAnimationFrame(() => { meta.content = content; });
  }
}, { passive: true });
