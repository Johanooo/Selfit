import { useEffect, useState } from 'react';
import { call } from './discountViews';

/**
 * Admin → Inställningar → Backup. Laddar ner databasen (och bilderna) som en fil att spara på datorn.
 */

interface Info {
  lastBackup: string | null;
  databaseBytes: number;
  images: number;
  imageBytes: number;
}

const api = (path: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api${path}`;
const mb = (bytes: number) => `${new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024)} MB`;
const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);

export function BackupView() {
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState('');
  const [started, setStarted] = useState('');

  const load = () =>
    call<Info>('GET', '/admin/backup/info')
      .then(setInfo)
      .catch((e: Error) => setError(e.message));
  useEffect(() => {
    void load();
  }, []);

  // Webbläsaren laddar ner filen själv. Uppdatera "senaste backup" en stund efteråt.
  const download = (images: boolean) => {
    setStarted(images ? 'Backupen laddas ner …' : 'Databasen laddas ner …');
    window.setTimeout(() => {
      void load();
      setStarted('Klart. Filen ligger i mappen Hämtade filer. Spara en kopia någon annanstans också, t.ex. iCloud eller en USB-sticka.');
    }, 2500);
    return images;
  };

  const last = info?.lastBackup;
  const old = last ? daysSince(last) >= 7 : true;

  return (
    <div className="pf">
      <div className="pf-top">
        <h1>Backup</h1>
      </div>
      {error && (
        <p className="pf-error" role="alert">
          {error}
        </p>
      )}
      <div className="pf-grid">
        <div className="pf-main">
          <section className="pf-card">
            <header className="pf-card-head">
              <h2>Ladda ner backup</h2>
            </header>
            <p>En fil med allt som sparats i Admin: produkter, priser, kategorier, texter, inställningar, rabatter, kampanjer och uppladdade bilder.</p>
            <div className="backup-actions">
              <a className="pf-btn primary" href={api('/admin/backup')} download onClick={() => download(true)} data-testid="button-download-backup">
                Ladda ner backup
              </a>
              <a className="pf-btn ghost" href={api('/admin/backup?bilder=0')} download onClick={() => download(false)} data-testid="button-download-backup-db">
                Bara databasen
              </a>
            </div>
            {info && (
              <p className="pf-help">
                Ungefär {mb(info.databaseBytes + info.imageBytes)}: databas {mb(info.databaseBytes)} och {info.images} {info.images === 1 ? 'bild' : 'bilder'} ({mb(info.imageBytes)}). "Bara databasen" blir mycket mindre.
              </p>
            )}
            {started && (
              <p className="admin-inline-message" role="status" data-testid="status-backup">
                {started}
              </p>
            )}
          </section>
          <section className="pf-card">
            <header className="pf-card-head">
              <h2>Bra att veta</h2>
            </header>
            <ul className="backup-list">
              <li>Filen heter t.ex. selfit-backup-2026-11-28-1130.tar.gz. Dubbelklicka för att packa upp den.</li>
              <li>Inuti finns selfit.db (databasen), mappen uploads (bilderna) och LASMIG.txt som beskriver hur backupen läggs tillbaka.</li>
              <li>Ta en backup innan stora ändringar, till exempel innan du lägger in många produkter eller tömmer papperskorgen.</li>
              <li>Filen innehåller kunduppgifter när butiken har ordrar. Spara den på ett säkert ställe och skicka den inte till någon.</li>
            </ul>
          </section>
        </div>
        <aside className="pf-side">
          <section className="pf-card">
            <header className="pf-card-head">
              <h2>Senaste backup</h2>
            </header>
            {info === null ? (
              <p className="pf-help">Laddar …</p>
            ) : last ? (
              <>
                <p data-testid="text-last-backup">{new Date(last).toLocaleString('sv-SE', { dateStyle: 'long', timeStyle: 'short' })}</p>
                {old && <p className="pf-error">Det är {daysSince(last)} dagar sedan. Ladda gärna ner en ny.</p>}
              </>
            ) : (
              <p className="pf-error" data-testid="text-last-backup">Ingen backup har laddats ner än.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
