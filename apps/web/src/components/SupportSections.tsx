import type { SupportPage } from '@/data/support';

/** Brödtexten i en supportsida (används både på supportsidan och i popupen i kassan). */
export function SupportSections({ page, headingLevel = 2 }: { page: SupportPage; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <>
      {page.sections.map((s) => (
        <section key={s.heading} className="prose-block">
          <H className="h2">{s.heading}</H>
          {s.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
          {s.list && (
            <ul>
              {s.list.map((li) => (
                <li key={li}>{li}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </>
  );
}
