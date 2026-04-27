const DEFAULT_CHIPS = [];

export default function HeroBanner({
  eyebrow = "MomoMint",
  title,
  subtitle,
  ctaText,
  onCtaClick,
  secondaryText,
  secondaryHref,
  chips = DEFAULT_CHIPS,
}) {
  return (
    <section className="hero-banner">
      <img className="hero-banner-charm charm-bow" src="/charm-bow.png" alt="" loading="lazy" decoding="async" />
      <img className="hero-banner-charm charm-star" src="/charm-star.png" alt="" loading="lazy" decoding="async" />
      <img className="hero-banner-charm charm-heart" src="/charm-heart.png" alt="" loading="lazy" decoding="async" />
      <img className="hero-banner-charm charm-cloud" src="/charm-cloud.png" alt="" loading="lazy" decoding="async" />

      <div className="hero-banner-stars" aria-hidden="true">
        {Array.from({ length: 10 }).map((_, index) => (
          <span key={`hero-star-${index}`}>✦</span>
        ))}
      </div>

      <div className="hero-banner-copy">
        <img
          className="hero-banner-mascot"
          src="/momo-idle.png"
          alt="Momo mascot"
          loading="lazy"
          decoding="async"
        />
        <p className="hero-banner-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="hero-banner-subtitle">{subtitle}</p>

        {(ctaText || secondaryText) ? (
          <div className="hero-banner-actions">
            {ctaText ? (
              <button type="button" className="button hero-primary" onClick={onCtaClick}>
                {ctaText}
              </button>
            ) : null}
            {secondaryText && secondaryHref ? (
              <a className="button hero-secondary" href={secondaryHref}>
                {secondaryText}
              </a>
            ) : null}
          </div>
        ) : null}

        {chips.length ? (
          <div className="hero-banner-chips">
            {chips.map((chip) => (
              <span key={chip.label} className={`pill ${chip.tone ?? "muted"}`.trim()}>
                {chip.label}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
