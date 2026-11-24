import { useEffect } from 'react';

export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title.includes('SELFIT') ? title : `${title} | SELFIT`;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = description;
    for (const [key, value] of [
      ['og:title', document.title],
      ['og:description', description],
      ['twitter:title', document.title],
      ['twitter:description', description],
    ]) {
      const attribute = key.startsWith('og:') ? 'property' : 'name';
      let social = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!social) {
        social = document.createElement('meta');
        social.setAttribute(attribute, key);
        document.head.appendChild(social);
      }
      social.content = value;
    }
  }, [title, description]);
}
