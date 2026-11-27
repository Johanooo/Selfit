import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { isHtml, sanitizeHtml } from '@/lib/richText';

/** Höjd i pixlar innan texten fälls ihop med "Läs mer". */
const COLLAPSED = 150;

/**
 * Kategoritexten överst på kategorisidan. Kan vara formaterad (rubriker, listor, länkar) från Admin.
 * Långa texter visas ihopfällda med en "Läs mer"-knapp, som hos Apotea.
 */
export function CategoryIntro({ text }: { text?: string }) {
  const body = useRef<HTMLDivElement>(null);
  const [long, setLong] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = body.current;
    if (!el) return;
    const check = () => setLong(el.scrollHeight > COLLAPSED + 24);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  if (!text?.trim()) return null;
  const collapsed = long && !open;
  return (
    <div className={`category-intro${collapsed ? ' is-collapsed' : ''}`}>
      <div
        ref={body}
        id="category-intro-body"
        className="category-intro-body rich-description"
        style={collapsed ? { maxHeight: COLLAPSED } : undefined}
        {...(isHtml(text) ? { dangerouslySetInnerHTML: { __html: sanitizeHtml(text) } } : { children: <p>{text}</p> })}
      />
      {long && (
        <button type="button" className="category-intro-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="category-intro-body" data-testid="button-read-more">
          {open ? 'Visa mindre' : 'Läs mer'} <ChevronDown size={16} aria-hidden="true" style={open ? { transform: 'rotate(180deg)' } : undefined} />
        </button>
      )}
    </div>
  );
}

/** Texten utan formatering, t.ex. till sidans beskrivning för Google. */
export const plainText = (text?: string) => (text ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
