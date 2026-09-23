import { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';

/**
 * Fixed animated background: slow 20s multi-stop gradient (in .app-bg)
 * + 14 drifting 3D bubbles. pointer-events: none → never blocks clicks.
 * Hidden when showBubbles = off; motion disabled via prefers-reduced-motion.
 */
export default function BubbleBackground() {
  const showBubbles = useAppStore((s) => s.showBubbles);

  const bubbles = useMemo(
    () =>
      Array.from({ length: 14 }).map(() => ({
        size: 40 + Math.random() * 220,
        left: Math.random() * 96,
        delay: Math.random() * 16,
        dur: 16 + Math.random() * 14,
        sway: 24 + Math.random() * 60,
        op: 0.35 + Math.random() * 0.35
      })),
    []
  );

  return (
    <>
      <div className="app-bg" aria-hidden="true" />
      {showBubbles && (
        <div className="bubbles-layer" aria-hidden="true">
          {bubbles.map((b, i) => (
            <span
              key={i}
              className="bubble"
              style={
                {
                  width: `${b.size}px`,
                  height: `${b.size}px`,
                  left: `${b.left}%`,
                  opacity: b.op,
                  animationDelay: `-${b.delay}s`,
                  animationDuration: `${b.dur}s`,
                  '--sway': `${b.sway}px`
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}
    </>
  );
}
