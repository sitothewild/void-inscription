import { cn } from "@/lib/utils";

/** Diablo-style spherical orb for HP / resource displays. */
export function Orb({
  value,
  max,
  label,
  hue,
  className,
}: {
  value: number;
  max: number;
  label: string;
  hue: "crimson" | "emerald" | "sapphire";
  className?: string;
}) {
  const pct = Math.max(0, Math.min(1, value / max));
  const fillFrom =
    hue === "crimson"
      ? "from-red-500 via-rose-600 to-red-800"
      : hue === "emerald"
      ? "from-emerald-400 via-green-600 to-emerald-900"
      : "from-sky-400 via-blue-600 to-indigo-900";
  const ring =
    hue === "crimson"
      ? "shadow-[0_0_24px_-2px_rgba(239,68,68,0.55)]"
      : hue === "emerald"
      ? "shadow-[0_0_24px_-2px_rgba(16,185,129,0.55)]"
      : "shadow-[0_0_24px_-2px_rgba(59,130,246,0.55)]";

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "relative h-20 w-20 overflow-hidden rounded-full border-2 border-white/15 bg-black/60 backdrop-blur-md",
          ring,
        )}
      >
        {/* Liquid fill */}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 bg-gradient-to-b transition-[height] duration-300 ease-out",
            fillFrom,
          )}
          style={{ height: `${pct * 100}%` }}
        >
          {/* surface shimmer */}
          <div className="absolute inset-x-0 top-0 h-1.5 bg-white/30 blur-[2px]" />
        </div>
        {/* Inner glass highlight */}
        <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.35),transparent_45%)]" />
        {/* Vignette */}
        <div className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_18px_rgba(0,0,0,0.85)]" />
        {/* Number */}
        <div className="absolute inset-0 grid place-items-center">
          <span className="font-mono text-sm font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
            {Math.ceil(value)}
          </span>
        </div>
      </div>
      <div className="mt-1 text-center text-[10px] font-semibold uppercase tracking-widest text-white/70">
        {label}
      </div>
    </div>
  );
}