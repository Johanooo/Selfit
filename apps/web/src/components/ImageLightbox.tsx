import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';
import type { Product, Variant } from '@/data/types';
import { ProductImage, type ImageView } from '@/components/art/ProductImage';

const ZOOM = 2.2;

/**
 * Förstorad produktbild i helskärm. Klick/tryck på bilden zoomar in där man klickar,
 * och bilden följer musen/fingret. Piltangenter byter bild, Esc stänger.
 */
export function ImageLightbox({
  open,
  onClose,
  product,
  variant,
  views,
  view,
  onView,
  title,
}: {
  open: boolean;
  onClose: () => void;
  product: Product;
  variant: Variant;
  views: ImageView[];
  view: ImageView;
  onView: (v: ImageView) => void;
  title: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');
  const idx = Math.max(0, views.indexOf(view));
  const many = views.length > 1;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    setZoomed(false);
    setOrigin('50% 50%');
  }, [view, open]);

  const step = (dir: number) => onView(views[(idx + dir + views.length) % views.length]);

  const place = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    setOrigin(`${Math.min(100, Math.max(0, x))}% ${Math.min(100, Math.max(0, y))}%`);
  };

  return (
    <dialog
      ref={ref}
      className="lightbox"
      aria-label={`Förstorad bild: ${title}`}
      onClose={onClose}
      onCancel={onClose}
      onKeyDown={(e) => {
        if (!many) return;
        if (e.key === 'ArrowRight') step(1);
        if (e.key === 'ArrowLeft') step(-1);
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="lightbox-top">
        <p className="lightbox-title">{title}</p>
        <div className="lightbox-tools">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setZoomed((z) => !z)}
            aria-pressed={zoomed}
            aria-label={zoomed ? 'Zooma ut' : 'Zooma in'}
            data-testid="button-lightbox-zoom"
          >
            {zoomed ? <ZoomOut size={20} aria-hidden="true" /> : <ZoomIn size={20} aria-hidden="true" />}
          </button>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Stäng" data-testid="button-lightbox-close">
            <X size={22} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="lightbox-stage-wrap">
        {many && (
          <button type="button" className="lightbox-nav lightbox-nav--prev" onClick={() => step(-1)} aria-label="Föregående bild">
            <ChevronLeft size={26} aria-hidden="true" />
          </button>
        )}
        <div
          className={`lightbox-stage${zoomed ? ' is-zoomed' : ''}`}
          onClick={(e) => {
            if (!zoomed) place(e as unknown as PointerEvent<HTMLDivElement>);
            setZoomed((z) => !z);
          }}
          onPointerMove={(e) => zoomed && place(e)}
          data-testid="lightbox-stage"
        >
          <div className="lightbox-img" style={{ transform: zoomed ? `scale(${ZOOM})` : undefined, transformOrigin: origin }}>
            {open && <ProductImage key={`${variant.id}-${view}`} product={product} variant={variant} view={view} />}
          </div>
        </div>
        {many && (
          <button type="button" className="lightbox-nav lightbox-nav--next" onClick={() => step(1)} aria-label="Nästa bild">
            <ChevronRight size={26} aria-hidden="true" />
          </button>
        )}
      </div>

      <p className="lightbox-hint small muted">{zoomed ? 'Flytta musen eller fingret för att se detaljer. Klicka för att zooma ut.' : 'Klicka på bilden för att zooma in.'}</p>

      {many && (
        <ul className="lightbox-thumbs" aria-label="Välj bild">
          {views.map((v, i) => (
            <li key={v}>
              <button type="button" className="thumb" aria-pressed={v === view} aria-label={`Bild ${i + 1} av ${views.length}`} onClick={() => onView(v)}>
                <ProductImage product={product} variant={variant} view={v} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </dialog>
  );
}
