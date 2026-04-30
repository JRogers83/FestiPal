import { redirect } from 'next/navigation'
import { randomUUID } from 'crypto'
import './landing.css'

const ARMS = [52, 115, 182, 248, 318, 386, 452, 520, 590, 658, 726, 796, 862, 930, 998, 1064, 1132]

export default function LandingPage() {
  async function start() {
    'use server'
    redirect(`/u/${randomUUID()}`)
  }

  return (
    <main className="landing">

      {/* ── 1. Hero image — full bleed, crops from centre on all viewports ── */}
      <div className="poster-art" role="presentation" />

      {/* ── 2. Dark overlay — vignette edges, transparent centre ── */}
      <div className="poster-overlay" aria-hidden />

      {/* ── 3. Hero content ── */}
      <section className="hero-card">

        {/* Event stamp */}
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

      {/* ── 4. Crowd silhouette — reinforces bottom edge ── */}
      <svg
        className="crowd-layer"
        aria-hidden
        viewBox="0 0 1200 200"
        preserveAspectRatio="xMidYMax slice"
      >
        <defs>
          <linearGradient id="crowdLight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#5a0000" stopOpacity="0.45" />
            <stop offset="55%"  stopColor="#180000" stopOpacity="0.82" />
            <stop offset="100%" stopColor="#080101" stopOpacity="1"    />
          </linearGradient>
        </defs>

        {/* Warm red backlight glow behind silhouette */}
        <ellipse cx="600" cy="200" rx="680" ry="72" fill="#480000" opacity="0.35" />

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

        {/* Ground gradient — fades silhouette into the page base */}
        <rect x="0" y="168" width="1200" height="32" fill="url(#crowdLight)" />
      </svg>

    </main>
  )
}
