import { Link } from 'wouter';
import { activeCampaigns, campaignHref } from '@/data/campaigns';

/**
 * Banner för kampanjer som pågår (Admin → Kampanjer → Banner).
 * "topbar" visas överst på alla sidor, "home" på startsidan. Försvinner av sig själv när kampanjen slutar.
 */
export function CampaignBanner({ where }: { where: 'home' | 'topbar' }) {
  const list = activeCampaigns().filter((c) => c.banner.text && (c.banner.placement === where || c.banner.placement === 'both'));
  if (!list.length) return null;
  return (
    <div className={`campaign-banner campaign-banner--${where}`} data-testid={`banner-campaign-${where}`}>
      <div className="container">
        {list.map((c) => (
          <Link key={c.slug} href={campaignHref(c.slug)} className="campaign-banner-link">
            <span className="campaign-banner-tag">REA</span>
            <span>{c.banner.text}</span>
            <span aria-hidden="true">›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
