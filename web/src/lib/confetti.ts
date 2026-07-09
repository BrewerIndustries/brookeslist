// Lightweight, dependency-free emoji burst. Used for delight moments (max rating,
// gold standard). Spawns particles from a point and removes them after the animation.
export function celebrate(originX?: number, originY?: number) {
  const emojis = ['💕', '✨', '💖', '⭐', '💗', '🌸'];
  const N = 24;
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:100;overflow:hidden';
  document.body.appendChild(container);
  const cx = originX ?? window.innerWidth / 2;
  const cy = originY ?? window.innerHeight / 3;

  for (let i = 0; i < N; i++) {
    const el = document.createElement('span');
    el.textContent = emojis[i % emojis.length];
    const angle = Math.random() * Math.PI * 2;
    const dist = 120 + Math.random() * 240;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 60;
    el.style.cssText =
      `position:absolute;left:${cx}px;top:${cy}px;font-size:${16 + Math.random() * 22}px;` +
      'transform:translate(-50%,-50%) scale(0.4);opacity:1;' +
      'transition:transform .95s cubic-bezier(.2,.7,.3,1),opacity .95s ease';
    container.appendChild(el);
    requestAnimationFrame(() => {
      el.style.transform = `translate(${dx}px,${dy}px) rotate(${(Math.random() * 2 - 1) * 90}deg) scale(1)`;
      el.style.opacity = '0';
    });
  }
  setTimeout(() => container.remove(), 1200);
}
