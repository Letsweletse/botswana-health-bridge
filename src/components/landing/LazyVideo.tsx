import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';

type Props = {
  src: string;
  poster: string;
  alt: string;
  className?: string;
  loop?: boolean;
};

// Plays muted/looped video only when visible. Falls back to the poster image for
// reduced-motion, data-saver, or slow connections, so the page stays light on mobile data.
export default function LazyVideo({ src, poster, alt, className, loop = true }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();
  const near = useInView(ref, { margin: '300px 0px' });
  const visible = useInView(ref, { amount: 0.2 });
  const [allowed, setAllowed] = useState(true);

  useEffect(() => {
    try {
      const c = (navigator as any).connection;
      if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))) setAllowed(false);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (visible) v.play().catch(() => {});
    else v.pause();
  }, [visible, near]);

  const playVideo = allowed && !reduce && near;

  return (
    <div ref={ref} className={className} style={{ overflow: 'hidden' }}>
      <img src={poster} alt={alt} loading="lazy" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      {playVideo && (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          muted
          loop={loop}
          playsInline
          preload="metadata"
          aria-hidden="true"
          disablePictureInPicture
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
    </div>
  );
}
