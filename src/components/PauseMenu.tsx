import { useEffect, useState } from "react";

/**
 * Lightweight in-game pause / options overlay. Toggled with ESC.
 * Pure UI — does not actually pause the physics simulation (R3F has no
 * universal pause). Future work: gate Game render via context if needed.
 */
export function PauseMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      setOpen((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  const Btn = ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
    <button
      onClick={onClick}
      style={{
        width: 260,
        padding: "12px 18px",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.25)",
        background: "rgba(20,22,28,0.85)",
        color: "white",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontSize: 15,
        letterSpacing: 0.4,
        cursor: "pointer",
        transition: "background 0.15s, transform 0.1s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(40,50,70,0.95)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(20,22,28,0.85)")}
    >
      {children}
    </button>
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        color: "white",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 36, margin: 0, letterSpacing: 2, textTransform: "uppercase" }}>
        Paused
      </h1>
      <p style={{ opacity: 0.7, margin: "0 0 16px", fontSize: 13 }}>
        Press <kbd style={kbd}>Esc</kbd> to resume
      </p>
      <Btn onClick={() => setOpen(false)}>Resume</Btn>
      <Btn onClick={() => alert("Options coming soon")}>Options</Btn>
      <Btn onClick={() => location.reload()}>Restart</Btn>
      <div style={{ marginTop: 24, fontSize: 12, opacity: 0.6, maxWidth: 320, textAlign: "center" }}>
        <div><kbd style={kbd}>WASD</kbd> move · <kbd style={kbd}>Shift</kbd> sprint · <kbd style={kbd}>Space</kbd> jump</div>
        <div style={{ marginTop: 6 }}><kbd style={kbd}>LMB</kbd> quick shot · <kbd style={kbd}>RMB</kbd> hold to charge</div>
      </div>
    </div>
  );
}

const kbd: React.CSSProperties = {
  display: "inline-block",
  padding: "1px 6px",
  margin: "0 2px",
  borderRadius: 4,
  background: "rgba(255,255,255,0.15)",
  border: "1px solid rgba(255,255,255,0.25)",
  fontFamily: "ui-monospace, monospace",
  fontSize: 11,
};