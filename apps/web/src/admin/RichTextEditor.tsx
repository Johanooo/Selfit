import { useEffect, useRef, useState, type ReactNode } from 'react';
import { EditorContent, Node, mergeAttributes, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Color, TextStyle } from '@tiptap/extension-text-style';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { legacyToHtml, videoEmbedUrl } from '@/lib/richText';
import { MediaPicker } from './mediaViews';

/**
 * Textredigerare för produktbeskrivningar: fetstil, kursiv, understrykning, färg, rubriker,
 * listor, länkar, bilder och video (YouTube/Vimeo). Sparar HTML.
 */

/** Inbäddad video från YouTube eller Vimeo. */
const Video = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return { src: { default: null } };
  },
  parseHTML() {
    return [{ tag: 'div[data-video] iframe', getAttrs: (el) => ({ src: (el as HTMLElement).getAttribute('src') }) }, { tag: 'iframe[src]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      { class: 'rich-video', 'data-video': '' },
      ['iframe', mergeAttributes(HTMLAttributes, { frameborder: '0', allowfullscreen: 'true', allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture' })],
    ];
  },
});

const COLORS = [
  { name: 'Svart', value: '#1d1b20' },
  { name: 'Grå', value: '#6b6670' },
  { name: 'Lila', value: '#4b2a6b' },
  { name: 'Röd', value: '#c0352b' },
  { name: 'Orange', value: '#d9731a' },
  { name: 'Grön', value: '#2f7d4f' },
  { name: 'Blå', value: '#2463b4' },
];

function Btn({ on, label, onClick, children, disabled }: { on?: boolean; label: string; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      className={`rte-btn${on ? ' is-on' : ''}`}
      aria-label={label}
      aria-pressed={on}
      title={label}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/** Liten ruta under verktygsraden för länk och video. */
function Prompt({ label, placeholder, initial = '', onSubmit, onCancel, extra }: { label: string; placeholder: string; initial?: string; onSubmit: (v: string) => string | void; onCancel: () => void; extra?: ReactNode }) {
  const [v, setV] = useState(initial);
  const [err, setErr] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const submit = () => {
    const e = onSubmit(v.trim());
    if (e) setErr(e);
  };
  return (
    <div className="rte-prompt">
      <label>
        <span>{label}</span>
        <input
          ref={ref}
          className="pf-input"
          value={v}
          placeholder={placeholder}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
            if (e.key === 'Escape') onCancel();
          }}
        />
      </label>
      <button type="button" className="pf-btn primary" onClick={submit}>
        Infoga
      </button>
      {extra}
      <button type="button" className="pf-btn ghost" onClick={onCancel}>
        Avbryt
      </button>
      {err && <p className="pf-error rte-prompt-err">{err}</p>}
    </div>
  );
}

function Toolbar({ editor, onImage }: { editor: Editor; onImage: () => void }) {
  const [prompt, setPrompt] = useState<'link' | 'video' | null>(null);
  const [colorOpen, setColorOpen] = useState(false);
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      block: e.isActive('heading', { level: 2 }) ? 'h2' : e.isActive('heading', { level: 3 }) ? 'h3' : 'p',
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      link: e.isActive('link'),
      href: (e.getAttributes('link').href as string | undefined) ?? '',
      color: (e.getAttributes('textStyle').color as string | undefined) ?? '',
      center: e.isActive({ textAlign: 'center' }),
      right: e.isActive({ textAlign: 'right' }),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const chain = () => editor.chain().focus();

  return (
    <div className="rte-toolbar-wrap">
      <div className="rte-toolbar" role="toolbar" aria-label="Textformat">
        <select
          className="rte-select"
          aria-label="Textstil"
          value={s.block}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'p') chain().setParagraph().run();
            else chain().toggleHeading({ level: v === 'h2' ? 2 : 3 }).run();
          }}
          data-testid="rte-block"
        >
          <option value="p">Stycke</option>
          <option value="h2">Rubrik</option>
          <option value="h3">Underrubrik</option>
        </select>
        <span className="rte-sep" />
        <Btn label="Fetstil (Ctrl+B)" on={s.bold} onClick={() => chain().toggleBold().run()}>
          <b>B</b>
        </Btn>
        <Btn label="Kursiv (Ctrl+I)" on={s.italic} onClick={() => chain().toggleItalic().run()}>
          <i>I</i>
        </Btn>
        <Btn label="Understrykning (Ctrl+U)" on={s.underline} onClick={() => chain().toggleUnderline().run()}>
          <u>U</u>
        </Btn>
        <Btn label="Genomstruken" on={s.strike} onClick={() => chain().toggleStrike().run()}>
          <s>S</s>
        </Btn>
        <div className="rte-color">
          <Btn label="Textfärg" on={colorOpen} onClick={() => setColorOpen((o) => !o)}>
            <span className="rte-color-a">A</span>
            <span className="rte-color-bar" style={{ background: s.color || '#1d1b20' }} />
          </Btn>
          {colorOpen && (
            <div className="rte-palette" role="group" aria-label="Välj textfärg">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={`rte-swatch${s.color === c.value ? ' is-on' : ''}`}
                  style={{ background: c.value }}
                  aria-label={c.name}
                  title={c.name}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    chain().setColor(c.value).run();
                    setColorOpen(false);
                  }}
                />
              ))}
              <label className="rte-swatch rte-custom" title="Egen färg">
                <span className="sr-only">Egen färg</span>
                <input type="color" value={s.color || '#1d1b20'} onChange={(e) => chain().setColor(e.target.value).run()} />
              </label>
              <button
                type="button"
                className="pf-link"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  chain().unsetColor().run();
                  setColorOpen(false);
                }}
              >
                Ingen färg
              </button>
            </div>
          )}
        </div>
        <span className="rte-sep" />
        <Btn label="Punktlista" on={s.bullet} onClick={() => chain().toggleBulletList().run()}>
          •≡
        </Btn>
        <Btn label="Numrerad lista" on={s.ordered} onClick={() => chain().toggleOrderedList().run()}>
          1.
        </Btn>
        <Btn label="Citat" on={s.quote} onClick={() => chain().toggleBlockquote().run()}>
          ❝
        </Btn>
        <Btn label={s.center ? 'Vänsterjustera' : 'Centrera'} on={s.center} onClick={() => chain().setTextAlign(s.center ? 'left' : 'center').run()}>
          ≣
        </Btn>
        <span className="rte-sep" />
        <Btn label="Länk" on={s.link || prompt === 'link'} onClick={() => setPrompt(prompt === 'link' ? null : 'link')}>
          🔗
        </Btn>
        <Btn label="Infoga bild" onClick={onImage}>
          🖼
        </Btn>
        <Btn label="Infoga video" on={prompt === 'video'} onClick={() => setPrompt(prompt === 'video' ? null : 'video')}>
          ▶
        </Btn>
        <Btn label="Linje" onClick={() => chain().setHorizontalRule().run()}>
          ―
        </Btn>
        <span className="rte-sep" />
        <Btn label="Ta bort formatering" onClick={() => chain().unsetAllMarks().clearNodes().run()}>
          T̸
        </Btn>
        <Btn label="Ångra (Ctrl+Z)" disabled={!s.canUndo} onClick={() => chain().undo().run()}>
          ↶
        </Btn>
        <Btn label="Gör om" disabled={!s.canRedo} onClick={() => chain().redo().run()}>
          ↷
        </Btn>
      </div>
      {prompt === 'link' && (
        <Prompt
          label="Länk"
          placeholder="https://… eller /sida, t.ex. /kopvillkor"
          initial={s.href}
          onCancel={() => setPrompt(null)}
          extra={
            s.link ? (
              <button
                type="button"
                className="pf-btn ghost"
                onClick={() => {
                  chain().extendMarkRange('link').unsetLink().run();
                  setPrompt(null);
                }}
              >
                Ta bort länk
              </button>
            ) : undefined
          }
          onSubmit={(v) => {
            if (!v) return 'Skriv en adress.';
            const href = /^(https?:|mailto:|tel:|\/)/.test(v) ? v : `https://${v}`;
            if (editor.state.selection.empty && !s.link) chain().insertContent({ type: 'text', text: v, marks: [{ type: 'link', attrs: { href } }] }).run();
            else chain().extendMarkRange('link').setLink({ href }).run();
            setPrompt(null);
            return undefined;
          }}
        />
      )}
      {prompt === 'video' && (
        <Prompt
          label="Video"
          placeholder="Klistra in en länk från YouTube eller Vimeo"
          onCancel={() => setPrompt(null)}
          onSubmit={(v) => {
            const src = videoEmbedUrl(v);
            if (!src) return 'Länken känns inte igen. Kopiera adressen till videon från YouTube eller Vimeo.';
            chain().insertContent({ type: 'video', attrs: { src } }).run();
            setPrompt(null);
            return undefined;
          }}
        />
      )}
    </div>
  );
}

export default function RichTextEditor({ id, value, onChange, placeholder = 'Beskriv produkten …' }: { id: string; value: string; onChange: (html: string) => void; placeholder?: string }) {
  const [picker, setPicker] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false, autolink: true, defaultProtocol: 'https' } }),
      TextStyle,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ HTMLAttributes: { class: 'rich-image' } }),
      Video,
    ],
    content: legacyToHtml(value),
    editorProps: { attributes: { id, class: 'rte-content', 'aria-label': 'Beskrivning', 'data-placeholder': placeholder } },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? '' : e.getHTML()),
    immediatelyRender: true,
  });

  // Om värdet byts utifrån (t.ex. Ångra-knappen i formuläret) läggs det in i editorn.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const current = editor.isEmpty ? '' : editor.getHTML();
    const next = legacyToHtml(value);
    if (next !== current && next !== legacyToHtml(current)) editor.commands.setContent(next, { emitUpdate: false });
  }, [value, editor]);

  const empty = useEditorState({ editor, selector: ({ editor: e }) => e?.isEmpty ?? true });
  if (!editor) return null;

  const insertImages = (imgs: { src: string; alt?: string }[]) => {
    const chain = editor.chain().focus();
    imgs.forEach((i) => chain.setImage({ src: i.src, alt: i.alt ?? '' }));
    chain.run();
  };

  return (
    <div className={`rte${empty ? ' is-empty' : ''}`}>
      <Toolbar editor={editor} onImage={() => setPicker(true)} />
      <EditorContent editor={editor} />
      <MediaPicker
        open={picker}
        onClose={() => setPicker(false)}
        already={[]}
        onPick={(items) => insertImages(items.map((m) => ({ src: m.src, alt: m.alt })))}
      />
    </div>
  );
}
