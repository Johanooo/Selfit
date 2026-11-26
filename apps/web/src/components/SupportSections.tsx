import type { SupportPage } from '@/data/support';
import { parseBody } from '@/data/support';
import { RichText } from './RichText';

/** Brödtexten i en supportsida (används på supportsidan, i popupen i kassan och i förhandsvisningen i Admin). */
export function SupportSections({ page, headingLevel = 2 }: { page: SupportPage; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <>
      {page.sections.map((s, si) => (
        <section key={`${si}-${s.heading}`} className="prose-block">
          {s.heading && <H className="h2">{s.heading}</H>}
          {parseBody(s.body).map((b, i) =>
            b.type === 'p' ? (
              <p key={i}>
                <RichText text={b.text} />
              </p>
            ) : (
              <ul key={i}>
                {b.items.map((li, j) => (
                  <li key={j}>
                    <RichText text={li} />
                  </li>
                ))}
              </ul>
            ),
          )}
        </section>
      ))}
    </>
  );
}
