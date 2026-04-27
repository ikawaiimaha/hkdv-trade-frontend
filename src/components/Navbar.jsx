const DEFAULT_NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "profile", label: "Profile" },
  { id: "inventory", label: "Inventory" },
  { id: "wishlist", label: "Wishlist" },
  { id: "listings", label: "Listings" },
  { id: "offers", label: "Offers" },
  { id: "trades", label: "Trades" },
];

export default function Navbar({
  trader,
  activeView = "dashboard",
  navItems = DEFAULT_NAV_ITEMS,
  onNavigate,
}) {
  return (
    <nav className="momomint-navbar" aria-label="Workspace navigation">
      <div className="momomint-navbar__brand">
        <img src="/momo-idle.png" alt="" loading="lazy" decoding="async" />
        <div>
          <strong>MomoMint</strong>
          <span>{trader?.displayName ?? "Trader desk"}</span>
        </div>
      </div>

      <div className="momomint-navbar__links">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`momomint-navbar__link ${activeView === item.id ? "is-active" : ""}`.trim()}
            onClick={() => onNavigate?.(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
