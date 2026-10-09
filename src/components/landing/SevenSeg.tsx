/**
 * Seven-segment LED digits drawn in CSS.
 *
 * A real digital-readout face (DSEG and friends) would mean another webfont
 * download on a site that people open on mobile data, so the segments are
 * drawn instead: lit ones in the accent colour, unlit ones left faintly
 * visible the way they are on a real LED panel.
 */

const SEGMENTS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'] as const;

const DIGITS: Record<string, string> = {
  '0': 'abcdef',
  '1': 'bc',
  '2': 'abged',
  '3': 'abgcd',
  '4': 'fgbc',
  '5': 'afgcd',
  '6': 'afgedc',
  '7': 'abc',
  '8': 'abcdefg',
  '9': 'abcdfg',
};

export const segStyles = `
  .cm-seg{display:inline-flex;align-items:flex-end;gap:.1em;line-height:1}
  .cm-seg-d{position:relative;width:.58em;height:1em;flex-shrink:0}
  .cm-seg-d i{position:absolute;display:block;background:currentColor;opacity:.085;transition:opacity .18s ease}
  .cm-seg-d i.on{opacity:1;filter:drop-shadow(0 0 7px currentColor)}
  .cm-seg-a,.cm-seg-g,.cm-seg-dd{left:13%;right:13%;height:12%;clip-path:polygon(7% 0,93% 0,100% 50%,93% 100%,7% 100%,0 50%)}
  .cm-seg-a{top:0}
  .cm-seg-g{top:44%}
  .cm-seg-dd{bottom:0}
  .cm-seg-f,.cm-seg-b,.cm-seg-e,.cm-seg-c{width:12%;height:42%;clip-path:polygon(0 7%,50% 0,100% 7%,100% 93%,50% 100%,0 93%)}
  .cm-seg-f{left:0;top:6%}
  .cm-seg-b{right:0;top:6%}
  .cm-seg-e{left:0;bottom:6%}
  .cm-seg-c{right:0;bottom:6%}
  .cm-seg-sep{align-self:flex-end;padding-bottom:.04em;opacity:.55}
`;

const CLASS: Record<string, string> = { a: 'cm-seg-a', b: 'cm-seg-b', c: 'cm-seg-c', d: 'cm-seg-dd', e: 'cm-seg-e', f: 'cm-seg-f', g: 'cm-seg-g' };

const Digit = ({ char }: { char: string }) => {
  const lit = DIGITS[char] ?? '';
  return (
    <span className="cm-seg-d">
      {SEGMENTS.map((s) => (
        <i key={s} className={`${CLASS[s]}${lit.includes(s) ? ' on' : ''}`} />
      ))}
    </span>
  );
};

/** Renders `text` as LED digits; anything that is not 0-9 is shown as-is. */
const SevenSeg = ({ text, label }: { text: string; label?: string }) => (
  <span className="cm-seg" role="img" aria-label={label ?? text}>
    {text.split('').map((ch, i) =>
      DIGITS[ch] !== undefined
        ? <Digit key={i} char={ch} />
        : <span key={i} className="cm-seg-sep" aria-hidden="true">{ch}</span>
    )}
  </span>
);

export default SevenSeg;
