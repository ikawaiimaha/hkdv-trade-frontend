import { Component, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ToastProvider } from "./components/ToastProvider";
import "./styles/design-tokens.css";
import "./styles.css";
import "./styles/navbar.css";
import "./styles/hero-banner.css";
import "./styles/toast.css";
import "./styles/trade-card.css";
import "./styles/item-modal.css";
import "./styles/catalog-grid.css";
import "./styles/catalog-section.css";
import "./styles/asset-manager.css";
import "./styles/dream-board.css";

class RootErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="auth-shell">
        <section className="auth-surface">
          <p className="eyebrow">App error</p>
          <h2>The trading desk hit a runtime error.</h2>
          <p className="catalog-state error">{this.state.error.message || "Unknown client-side error."}</p>
        </section>
      </div>
    );
  }
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RootErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </RootErrorBoundary>
  </StrictMode>
);
