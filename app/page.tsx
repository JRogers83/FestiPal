import { redirect } from 'next/navigation'
import { randomUUID } from 'crypto'
import './landing.css'

/** Generate SVG polygon points for a starburst shape. */
function star(cx: number, cy: number, outerR: number, innerR: number, points: number): string {
  const pts: string[] = []
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2
    const r = i % 2 === 0 ? outerR : innerR
    pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`)
  }
  return pts.join(' ')
}

// Crowd arm x-positions and height cycle
const ARMS = [52, 115, 182, 248, 318, 386, 452, 520, 590, 658, 726, 796, 862, 930, 998, 1064, 1132]

export default function LandingPage() {
  async function start() {
    'use server'
    redirect(`/u/${randomUUID()}`)
  }

  return (
    <main className="landing">

      {/* ── 1. Background: grain SVG + CSS radial vignettes ── */}
      <div className="landing-bg" aria-hidden>
        <svg className="grain-svg" aria-hidden>
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>
      </div>

      {/* ── 2. Edge splatters: red ink at page margins ── */}
      <svg
        className="splatter-layer"
        aria-hidden
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid slice"
      >
        <g opacity="0.18">
          <ellipse cx="78"  cy="218" rx="92"  ry="34" fill="#5a0000" transform="rotate(-20,78,218)"  />
          <ellipse cx="722" cy="246" rx="82"  ry="30" fill="#5a0000" transform="rotate(14,722,246)"  />
          <ellipse cx="400" cy="26"  rx="136" ry="20" fill="#440000"                                  />
          <circle  cx="58"  cy="136" r="26"   fill="#4e0000" />
          <circle  cx="742" cy="156" r="20"   fill="#4e0000" />
          <circle  cx="118" cy="466" r="16"   fill="#3a0000" />
          <circle  cx="682" cy="476" r="13"   fill="#3a0000" />
          <circle  cx="220" cy="82"  r="6"    fill="#600000" />
          <circle  cx="580" cy="78"  r="5"    fill="#600000" />
        </g>
      </svg>

      {/* ── 3. Lightning: 2 angular bolts framing the hero ── */}
      <svg
        className="bolt-layer"
        aria-hidden
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Left bolt — dark shadow beneath, then red stroke */}
        <polyline
          points="162,0 194,120 170,126 218,280 191,286 248,428"
          fill="none" stroke="#0a0000" strokeWidth="7" strokeLinejoin="round"
        />
        <polyline
          points="162,0 194,120 170,126 218,280 191,286 248,428"
          fill="none" stroke="#d60018" strokeWidth="3" strokeLinejoin="round"
        />
        {/* Right bolt */}
        <polyline
          points="638,0 603,114 628,120 574,274 602,280 548,422"
          fill="none" stroke="#0a0000" strokeWidth="7" strokeLinejoin="round"
        />
        <polyline
          points="638,0 603,114 628,120 574,274 602,280 548,422"
          fill="none" stroke="#d60018" strokeWidth="3" strokeLinejoin="round"
        />
      </svg>

      {/* ── 4. Hero composition ── */}
      <section className="hero-card">

        {/*
          Explosion badge: sits behind all hero text via z-index:-1 inside
          the hero-card's isolated stacking context. Three-layer badge:
          outer ragged burst → torn inner shape → dark reading core.
        */}
        <div className="poster-burst" aria-hidden>
          <svg viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="burstGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor="#4a0000" />
                <stop offset="50%"  stopColor="#280000" />
                <stop offset="100%" stopColor="#0e0000" />
              </radialGradient>
              <radialGradient id="coreHot" cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor="#7a0010" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#0d0101" stopOpacity="0"   />
              </radialGradient>
            </defs>

            {/* Outer ragged starburst — 20 points */}
            <polygon
              points={star(300, 300, 289, 214, 20)}
              fill="#2c0000"
              stroke="#150000"
              strokeWidth="2"
            />

            {/* Inner explosion shape — 14 points, rotated 7° for asymmetry */}
            <polygon
              points={star(300, 300, 238, 196, 14)}
              fill="#1a0000"
              stroke="#0c0000"
              strokeWidth="2"
              transform="rotate(7,300,300)"
            />

            {/* Dark reading core behind title */}
            <ellipse cx="300" cy="300" rx="178" ry="172" fill="#0c0101" />

            {/* Warm red hot-spot at centre — subtle depth */}
            <circle cx="300" cy="300" r="95" fill="url(#coreHot)" />

            {/* Off-white ink scratches — aged poster texture */}
            <g stroke="#d4c4a0" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.22">
              <line x1="212" y1="190" x2="388" y2="410" />
              <line x1="180" y1="250" x2="420" y2="350" />
              <line x1="255" y1="170" x2="345" y2="430" />
              <line x1="390" y1="182" x2="210" y2="418" />
              <line x1="138" y1="288" x2="172" y2="320" />
              <line x1="462" y1="288" x2="428" y2="320" />
            </g>
          </svg>
        </div>

        {/* Event context — red stamp above the title */}
        <p className="eyebrow">Download Festival 2026</p>

        <h1>Festipals</h1>

        <h2>
          Build your schedule.<br />
          Share it. See who clashes.
        </h2>

        <p className="hero-note">
          No sign-up needed. Your link is your identity —<br />
          bookmark it to come back.
        </p>

        <form className="landing-form" action={start}>
          <button type="submit" className="landing-btn">
            Build your schedule
          </button>
        </form>

      </section>

      {/* ── 5. Crowd silhouette with red backlight ── */}
      <svg
        className="crowd-layer"
        aria-hidden
        viewBox="0 0 1200 200"
        preserveAspectRatio="xMidYMax slice"
      >
        <defs>
          <linearGradient id="crowdLight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#5a0000" stopOpacity="0.5"  />
            <stop offset="55%"  stopColor="#180000" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#0a0101" stopOpacity="1"    />
          </linearGradient>
        </defs>

        {/* Red backlight glow behind silhouette */}
        <ellipse cx="600" cy="200" rx="680" ry="75" fill="#480000" opacity="0.38" />

        {/* Crowd body */}
        <path
          fill="#0b0101"
          d="M0,200 L0,156
          Q13,134 28,150 Q42,115 60,135 Q76,107 92,125
          Q108,97  126,116 Q140,87  158,105 Q173,77  190,97
          Q206,67  222,87  Q238,59  256,79  Q272,51  290,71
          Q305,45  322,65  Q338,39  356,59  Q371,35  388,55
          Q404,31  420,51  Q437,27  454,47  Q470,23  487,45
          Q503,20  520,42  Q536,19  553,41  Q569,25  586,47
          Q602,21  618,43  Q634,27  651,49  Q668,31  685,53
          Q700,37  718,57  Q734,41  751,61  Q767,47  784,65
          Q800,51  816,71  Q833,57  850,77  Q866,64  883,83
          Q899,71  916,91  Q932,79  950,99  Q966,87  982,109
          Q998,95  1015,117 Q1031,105 1048,127
          Q1064,115 1081,137 Q1097,125 1114,149
          Q1130,137 1147,159 Q1164,149 1181,167
          L1200,173 L1200,200 Z"
        />

        {/* Raised arms with fists */}
        {ARMS.map((x, i) => {
          const h    = i % 3 === 0 ? 55 : i % 3 === 1 ? 42 : 48
          const base = i % 3 === 0 ? 156 : i % 3 === 1 ? 163 : 159
          return (
            <g key={x}>
              <rect x={x - 4} y={base - h} width={8} height={h} rx={4} fill="#0b0101" />
              <ellipse cx={x} cy={base - h - 5} rx={5} ry={6} fill="#0b0101" />
            </g>
          )
        })}

        {/* Ground gradient — fades to near-black */}
        <rect x="0" y="168" width="1200" height="32" fill="url(#crowdLight)" />
      </svg>

    </main>
  )
}
