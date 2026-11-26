/**
 * Butikens företagsuppgifter och villkor – standardvärden.
 * De riktiga värdena ändras i Admin (Inställningar) och sparas i databasen.
 * Den här filen används bara när databasen saknar ett värde, och delas av butiken och servern.
 */
export interface CompanyInfo {
  brand: string;
  legalName: string;
  orgNr: string;
  vatNr: string;
  address: string;
  email: string;
  phone: string;
  hours: string;
  emailProvider: string;
}

export interface Policies {
  /** Frivilligt öppet köp i dagar (utöver lagens 14 dagars ångerrätt). */
  openPurchaseDays: number;
  /** Avdrag för returfrakt i kronor när kunden ångrar sig. */
  returnFee: number;
  /** Normal kostnad i kronor för ett outhämtat paket. */
  uncollectedFee: number;
  ageLimit: number;
  dispatchDays: string;
  /** Datum då villkoren senast ändrades (ÅÅÅÅ-MM-DD). */
  termsUpdated: string;
}

export interface SiteSettings {
  company: CompanyInfo;
  policies: Policies;
}

export const defaultCompany: CompanyInfo = {
  brand: 'SELFIT',
  legalName: '[FYLL I: bolagsnamn, t.ex. SELFIT AB]',
  orgNr: '[FYLL I: org.nr]',
  vatNr: '[FYLL I: momsreg.nr, SE…01]',
  address: '[FYLL I: gatuadress, postnummer och ort]',
  email: '[FYLL I: e-post till kundtjänst]',
  phone: '[FYLL I: telefon]',
  hours: '[FYLL I: öppettider, t.ex. vardagar 09–16]',
  emailProvider: '[FYLL I: e-posttjänst för orderbekräftelser]',
};

export const defaultPolicies: Policies = {
  openPurchaseDays: 30,
  returnFee: 39,
  uncollectedFee: 149,
  ageLimit: 18,
  dispatchDays: '1–2 vardagar',
  termsUpdated: '2026-11-25',
};

export const defaultSettings: SiteSettings = { company: defaultCompany, policies: defaultPolicies };

/** Är värdet fortfarande en platshållare som behöver fyllas i? */
export const isPlaceholder = (v: string) => v.trim() === '' || v.startsWith('[FYLL');
