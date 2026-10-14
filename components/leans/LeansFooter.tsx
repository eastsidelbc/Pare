/**
 * LeansFooter — the responsible-gambling line every Leans screen ends with
 * (Leans DECISIONS §8). 10px / 600 in `--subtext` (`--muted` fails AA at 10px).
 * The phone line never breaks mid-number.
 */

export const LEANS_FOOTER_TEXT = '21+ · Info only, not betting advice · Gambling problem? 1-800-GAMBLER';

export default function LeansFooter() {
  return (
    <p
      data-leans-footer
      className="text-center"
      style={{ padding: '12px 8px 0', fontSize: 10, fontWeight: 600, lineHeight: 1.4, color: 'var(--subtext)' }}
    >
      21+ · Info only, not betting advice · <span className="whitespace-nowrap">Gambling problem? 1-800-GAMBLER</span>
    </p>
  );
}
