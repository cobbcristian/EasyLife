/** Static Apple Pay / Google Pay buttons for Harbor sales demos (no Stripe). */
export function WalletPayDemo({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{ display: "grid", gap: compact ? 6 : 8 }}>
      <p
        style={{
          margin: 0,
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontWeight: 700,
          color: "var(--mute)",
        }}
      >
        Express checkout
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: compact ? "1fr" : "1fr 1fr",
          gap: 8,
        }}
      >
        <button
          type="button"
          style={{
            minHeight: 44,
            borderRadius: 12,
            border: "none",
            background: "#000",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            cursor: "default",
          }}
          aria-label="Pay with Apple Pay"
        >
          Pay
        </button>
        <button
          type="button"
          style={{
            minHeight: 44,
            borderRadius: 12,
            border: "1px solid #dadce0",
            background: "#fff",
            color: "var(--ink)",
            fontWeight: 700,
            fontSize: 14,
            cursor: "default",
          }}
          aria-label="Pay with Google Pay"
        >
          <span style={{ fontFamily: "system-ui, sans-serif" }}>
            <span style={{ color: "#4285F4" }}>G</span>
            <span style={{ color: "#EA4335" }}>o</span>
            <span style={{ color: "#FBBC05" }}>o</span>
            <span style={{ color: "#4285F4" }}>g</span>
            <span style={{ color: "#34A853" }}>l</span>
            <span style={{ color: "#EA4335" }}>e</span>
            <span style={{ color: "var(--ink)" }}> Pay</span>
          </span>
        </button>
      </div>
    </div>
  );
}
