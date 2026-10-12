/** Keep focused inputs visible above the soft keyboard (iOS/Android WebViews). */
export function scrollFieldIntoView(
  event: { currentTarget: HTMLElement },
): void {
  const el = event.currentTarget;
  // After the keyboard animates; double-rAF is more reliable than a fixed delay alone.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
    });
  });
  window.setTimeout(() => {
    el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
  }, 280);
}
