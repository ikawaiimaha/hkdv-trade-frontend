import { useToast } from "./ToastProvider";

const RARITY_COLORS = {
  SSR: "#ff3b93",
  SR: "#8a6a00",
  R: "#2faf7f",
  C: "#7a4a68",
  N: "#7a4a68",
};

const RARITY_BG = {
  SSR: "#ffe3f1",
  SR: "#fff7cc",
  R: "#e7fff4",
  C: "#ffeaf3",
  N: "#ffeaf3",
};

function getItemRarity(item) {
  return item?.rarity ?? item?.tier ?? item?.wikiRarity ?? "C";
}

function getMatchLabel(score) {
  if (score >= 90) return "Perfect Match";
  if (score >= 72) return "Strong Match";
  if (score >= 50) return "Good Match";
  return "Possible Trade";
}

export default function TradeMatchCard({ match, onQuickOffer }) {
  const { showToast } = useToast();

  if (!match) {
    return null;
  }

  const otherTrader = match.otherTrader ?? match.trader ?? {};
  const theyHaveYouWant = match.theyHaveYouWant ?? [];
  const youHaveTheyWant = match.youHaveTheyWant ?? [];
  const topGive = youHaveTheyWant[0] ?? null;
  const topGet = theyHaveYouWant[0] ?? null;
  const matchScore = Number(match.matchScore ?? 0);
  const matchLabel = getMatchLabel(matchScore);
  const circumference = 2 * Math.PI * 26;
  const progress = Math.max(0, Math.min(matchScore, 100));
  const strokeDasharray = `${(progress / 100) * circumference} ${circumference}`;

  function handleQuickOffer() {
    if (onQuickOffer) {
      onQuickOffer(match);
      return;
    }

    showToast(`Quick offer drafted for @${otherTrader.username ?? "trader"}.`, "success");
  }

  return (
    <article className="trade-card">
      <div className="trade-card-header">
        <div className="trader-info">
          <div className="trader-avatar">
            {otherTrader.avatarUrl || otherTrader.avatar_url ? (
              <img
                src={otherTrader.avatarUrl ?? otherTrader.avatar_url}
                alt={otherTrader.displayName ?? otherTrader.display_name ?? otherTrader.username ?? "Trader"}
              />
            ) : (
              <span>•ᴗ•</span>
            )}
          </div>
          <div>
            <span className="trader-name">@{otherTrader.username ?? "trader"}</span>
            {otherTrader.buddyKey || otherTrader.buddy_key ? (
              <span className="trader-buddy">
                {(otherTrader.buddyKey ?? otherTrader.buddy_key).replaceAll("_", " ")}
              </span>
            ) : null}
          </div>
        </div>

        <div className="trade-score-ring" aria-label={`${matchScore}% match score`}>
          <svg viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="26" />
            <circle
              className="trade-score-ring__progress"
              cx="32"
              cy="32"
              r="26"
              strokeDasharray={strokeDasharray}
            />
          </svg>
          <div className="trade-score-ring__copy">
            <strong>{matchScore}%</strong>
            <span>{matchLabel}</span>
          </div>
        </div>
      </div>

      <div className="trade-exchange-zone">
        <div className="trade-item-column">
          <span className="trade-label text-green">You Receive</span>
          <div
            className="trade-item-bubble"
            style={{ backgroundColor: RARITY_BG[getItemRarity(topGet)] ?? RARITY_BG.C }}
          >
            {topGet?.imageUrl || topGet?.image_url ? (
              <img src={topGet.imageUrl ?? topGet.image_url} alt={topGet.name} />
            ) : (
              <span>Gift</span>
            )}
          </div>
          <span className="trade-item-name">{topGet?.name ?? "Wishlist item"}</span>
          <span
            className="trade-rarity-chip"
            style={{
              backgroundColor: RARITY_BG[getItemRarity(topGet)] ?? RARITY_BG.C,
              color: RARITY_COLORS[getItemRarity(topGet)] ?? RARITY_COLORS.C,
            }}
          >
            {getItemRarity(topGet)}
          </span>
        </div>

        <div className="exchange-icon">⇄</div>

        <div className="trade-item-column">
          <span className="trade-label text-pink">You Give</span>
          <div
            className="trade-item-bubble"
            style={{ backgroundColor: RARITY_BG[getItemRarity(topGive)] ?? RARITY_BG.C }}
          >
            {topGive?.imageUrl || topGive?.image_url ? (
              <img src={topGive.imageUrl ?? topGive.image_url} alt={topGive.name} />
            ) : (
              <span>Gift</span>
            )}
          </div>
          <span className="trade-item-name">{topGive?.name ?? "Duplicate item"}</span>
          <span
            className="trade-rarity-chip"
            style={{
              backgroundColor: RARITY_BG[getItemRarity(topGive)] ?? RARITY_BG.C,
              color: RARITY_COLORS[getItemRarity(topGive)] ?? RARITY_COLORS.C,
            }}
          >
            {getItemRarity(topGive)}
          </span>
        </div>
      </div>

      {(theyHaveYouWant.length > 1 || youHaveTheyWant.length > 1) ? (
        <p className="trade-multi-hint">
          {theyHaveYouWant.length} they have • {youHaveTheyWant.length} they want
        </p>
      ) : null}

      <button type="button" className="trade-quick-btn" onClick={handleQuickOffer}>
        Send Quick Offer
      </button>
    </article>
  );
}
