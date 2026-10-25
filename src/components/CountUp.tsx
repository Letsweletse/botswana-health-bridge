import { useEffect, useRef, useState } from 'react';

/* Counts from 0 to `to` the first time it scrolls into view. Screen readers
   get the final value straight away; reduced motion shows it with no count. */

type Props = { to: number; prefix?: string; suffix?: string; duration?: number; delay?: number; className?: string };

const fmt = (n: number) => n.toLocaleString('en-US');

export default function CountUp({ to, prefix = '', suffix = '', duration = 1800, delay = 0, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [n, setN] = useState(reduce ? to : 0);

  useEffect(() => {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let timer = 0;
    const run = () => {
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / duration);
        setN(Math.round(to * (1 - Math.pow(1 - p, 4))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        timer = window.setTimeout(run, delay);
      }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); window.clearTimeout(timer); };
  }, [to, duration, delay, reduce]);

  const final = `${prefix}${fmt(to)}${suffix}`;
  return (
    <span ref={ref} className={className} aria-label={final} style={{ fontVariantNumeric: 'tabular-nums' }}>
      <span aria-hidden="true">{prefix}{fmt(n)}{suffix}</span>
    </span>
  );
}
