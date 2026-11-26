import DOMPurify from 'dompurify';
import { parseBody } from '@/data/support';

/**
 * Produktbeskrivningar sparas som HTML från editorn i Admin.
 * Äldre texter (stycken med tom rad, "- " för punkter, [text](länk)) räknas om till HTML.
 */

export const isHtml = (s: string) => /^\s*</.test(s);

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inline = (s: string) => esc(s).replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, href: string) => `<a href="${href}">${label}</a>`);

export function legacyToHtml(text: string): string {
  if (!text.trim()) return '';
  if (isHtml(text)) return text;
  return parseBody(text)
    .map((b) => (b.type === 'ul' ? `<ul>${b.items.map((i) => `<li><p>${inline(i)}</p></li>`).join('')}</ul>` : `<p>${inline(b.text)}</p>`))
    .join('');
}

const VIDEO_HOSTS = /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com|player\.vimeo\.com)\//;

/** Tar bort allt som inte hör hemma i en beskrivning (skript m.m.). Bara videor från YouTube och Vimeo släpps igenom. */
export function sanitizeHtml(html: string): string {
  const clean = DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'target', 'data-youtube-video'],
    FORBID_TAGS: ['style', 'script', 'form', 'input', 'button'],
  });
  const doc = new DOMParser().parseFromString(`<div>${clean}</div>`, 'text/html');
  doc.querySelectorAll('iframe').forEach((f) => {
    if (!VIDEO_HOSTS.test(f.getAttribute('src') ?? '')) f.remove();
    else f.setAttribute('loading', 'lazy');
  });
  doc.querySelectorAll('a[href^="http"]').forEach((a) => {
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
  });
  return doc.body.firstElementChild?.innerHTML ?? '';
}

/** Gör om en vanlig YouTube- eller Vimeo-länk till adressen för inbäddning. */
export function videoEmbedUrl(url: string): string | null {
  const u = url.trim();
  const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vimeo = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}
