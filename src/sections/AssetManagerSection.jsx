import AssetList from "../components/AssetList";
import { useTraderAssets } from "../hooks/useTraderAssets";

export default function AssetManagerSection({ trader }) {
  const traderId = trader?.id ?? null;
  const { inventory, wishlist, loading, error, refetch } = useTraderAssets(traderId);

  return (
    <section className="am-section">
      <div className="am-header">
        <h2 className="am-title">My Collection</h2>
        <p className="am-subtitle">Manage what you own and what you are hunting for</p>
      </div>

      {!traderId ? (
        <div className="am-guest">
          <p>Log in to view your collection.</p>
        </div>
      ) : null}

      {traderId && loading ? (
        <div className="am-loading">
          <div className="am-spinner" />
          <p>Loading your items...</p>
        </div>
      ) : null}

      {traderId && !loading && error ? (
        <div className="am-error">
          <p>{error}</p>
          <button type="button" className="am-retry" onClick={refetch}>
            Try Again
          </button>
        </div>
      ) : null}

      {traderId && !loading && !error ? (
        <AssetList
          inventory={inventory}
          wishlist={wishlist}
          traderId={traderId}
          onRefresh={refetch}
        />
      ) : null}
    </section>
  );
}
