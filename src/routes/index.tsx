import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Seed of Yggdrasil - Viking survival in your browser" },
      {
        name: "description",
        content:
          "A Tribe of Midgard-inspired isometric survival prototype built with Three.js. Gather by day, defend the Seed by night.",
      },
      { property: "og:title", content: "Seed of Yggdrasil" },
      {
        property: "og:description",
        content:
          "Isometric Viking survival prototype. Gather by day, defend the Seed by night.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#0c1a2e] via-[#13294a] to-[#0c1a2e] text-white">
      <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_25%_20%,#7da9ff_0,transparent_40%),radial-gradient(circle_at_75%_80%,#3fa83f_0,transparent_45%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 py-20 text-center">
        <p className="mb-3 text-xs uppercase tracking-[0.4em] text-emerald-300/80">
          A Tribe of Midgard-inspired prototype
        </p>
        <h1 className="mb-6 text-6xl font-black tracking-tight md:text-7xl">
          Seed of Yggdrasil
        </h1>
        <p className="mb-10 max-w-xl text-lg text-white/70">
          Wash up on a small Viking isle. Chop trees, mine stone, and craft a
          blade. When night falls, the Helthings come for the Seed. Hold the
          line for five nights.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/play"
            className="rounded-md bg-emerald-500 px-8 py-4 text-lg font-bold text-black shadow-[0_0_40px_rgba(63,168,63,0.5)] transition hover:bg-emerald-400"
          >
            Enter Midgard
          </Link>
          <Link
            to="/lobby"
            className="rounded-md border border-white/20 bg-white/5 px-8 py-4 text-lg font-bold text-white transition hover:bg-white/10"
          >
            Play with friends
          </Link>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 text-left md:grid-cols-3">
          <Feature title="Day" body="Explore the island and harvest resources from a deterministic procedural map." />
          <Feature title="Dusk" body="Craft an axe, a sword, or palisades at the Seed to prepare for the wave." />
          <Feature title="Night" body="Defend the Seed from waves of Helthings. Lose the Seed, lose the run." />
        </div>
        <p className="mt-12 text-xs text-white/40">
          WASD to move - Mouse to aim - Click to attack or chop - Desktop only
        </p>
      </div>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <h3 className="mb-2 text-sm font-bold uppercase tracking-widest text-emerald-300">
        {title}
      </h3>
      <p className="text-sm text-white/70">{body}</p>
    </div>
  );
}
