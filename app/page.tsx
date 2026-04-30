import { redirect } from 'next/navigation'
import { randomUUID } from 'crypto'
import './landing.css'

// Pre-computed particle data — varied positions, sizes, timings
const PARTICLES = [
  { left: '10%', bottom: '33%', delay: '0.0s', dur: '4.2s', size: 3, red: '#cc0015' },
  { left: '20%', bottom: '27%', delay: '0.9s', dur: '5.1s', size: 2, red: '#ff4444' },
  { left: '31%', bottom: '36%', delay: '1.7s', dur: '3.8s', size: 3, red: '#aa0010' },
  { left: '43%', bottom: '23%', delay: '0.4s', dur: '5.8s', size: 2, red: '#cc0015' },
  { left: '54%', bottom: '30%', delay: '2.3s', dur: '4.4s', size: 4, red: '#ff4444' },
  { left: '63%', bottom: '28%', delay: '1.1s', dur: '5.3s', size: 2, red: '#aa0010' },
  { left: '74%', bottom: '25%', delay: '1.9s', dur: '3.9s', size: 3, red: '#cc0015' },
  { left: '85%', bottom: '32%', delay: '0.6s', dur: '5.6s', size: 2, red: '#ff4444' },
  { left: '17%', bottom: '45%', delay: '3.0s', dur: '4.7s', size: 2, red: '#aa0010' },
  { left: '50%', bottom: '41%', delay: '1.5s', dur: '5.1s', size: 3, red: '#cc0015' },
  { left: '79%', bottom: '39%', delay: '3.3s', dur: '4.2s', size: 2, red: '#ff4444' },
  { left: '38%', bottom: '47%', delay: '0.2s', dur: '6.2s', size: 2, red: '#aa0010' },
]

export default function LandingPage() {
  async function start() {
    'use server'
    redirect(`/u/${randomUUID()}`)
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: '#080808',
      padding: '2rem 1.5rem 250px',
    }}>

      {/* ── 1: Radiating rays behind burst ── */}
      <svg
        aria-hidden
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.11, zIndex: 1 }}
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid slice"
      >
        {Array.from({ length: 28 }, (_, i) => {
          const rad = (i / 28) * 2 * Math.PI
          return (
            <line key={i}
              x1="400" y1="148"
              x2={400 + Math.cos(rad) * 1000}
              y2={148 + Math.sin(rad) * 1000}
              stroke="#cc0015"
              strokeWidth={i % 5 === 0 ? 2.8 : i % 3 === 0 ? 1.6 : 0.8}
              strokeLinecap="round"
            />
          )
        })}
      </svg>

      {/* ── 2a: Pulsing red burst — outer ring ── */}
      <div
        className="burst-outer"
        style={{
          position: 'absolute',
          top: '22%', left: '50%',
          width: 'min(110vw, 780px)',
          height: 'min(110vw, 780px)',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(195,5,20,0.3) 0%, rgba(130,0,12,0.07) 45%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* ── 2b: Pulsing red burst — inner core ── */}
      <div
        className="burst-inner"
        style={{
          position: 'absolute',
          top: '22%', left: '50%',
          width: 'min(65vw, 460px)',
          height: 'min(65vw, 460px)',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(228,12,32,0.52) 0%, rgba(190,0,18,0.16) 38%, transparent 65%)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* ── 3: Red ink splatters ── */}
      <svg
        aria-hidden
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 3 }}
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid slice"
      >
        <g opacity="0.21">
          <ellipse cx="125" cy="265" rx="112" ry="44" fill="#6a0000" transform="rotate(-24,125,265)" />
          <ellipse cx="675" cy="292" rx="98"  ry="38" fill="#6a0000" transform="rotate(17,675,292)"  />
          <ellipse cx="400" cy="50"  rx="158" ry="28" fill="#550000" transform="rotate(-4,400,50)"   />
          <circle  cx="96"  cy="175" r="33" fill="#580000" />
          <circle  cx="704" cy="194" r="28" fill="#580000" />
          <circle  cx="192" cy="422" r="20" fill="#480000" />
          <circle  cx="608" cy="432" r="16" fill="#480000" />
          <ellipse cx="60"  cy="390" rx="54" ry="19" fill="#4e0000" transform="rotate(15,60,390)"   />
          <ellipse cx="740" cy="378" rx="48" ry="17" fill="#4e0000" transform="rotate(-13,740,378)" />
          {/* Fine splatter drops */}
          <circle cx="152" cy="142" r="8" fill="#5e0000" />
          <circle cx="648" cy="130" r="6" fill="#5e0000" />
          <circle cx="318" cy="518" r="10" fill="#3e0000" opacity="0.55" />
          <circle cx="482" cy="508" r="8"  fill="#3e0000" opacity="0.55" />
          <circle cx="240" cy="82"  r="5"  fill="#700000" />
          <circle cx="560" cy="76"  r="4"  fill="#700000" />
        </g>
      </svg>

      {/* ── 4: Lightning bolts (animated flicker) ── */}
      <svg
        aria-hidden
        className="lightning-layer"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 4 }}
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <filter id="lglow" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <g filter="url(#lglow)">
          {/* Main left bolt */}
          <polyline points="170,0 194,108 176,113 220,252 196,258 246,388 222,394 258,452"
            fill="none" stroke="#d40020" strokeWidth="2.8" strokeLinejoin="round" />
          {/* Main right bolt */}
          <polyline points="630,0 602,100 624,107 578,238 606,245 554,372 582,379 546,444"
            fill="none" stroke="#d40020" strokeWidth="2.8" strokeLinejoin="round" />
          {/* Secondary bolts */}
          <polyline points="90,38 108,128 98,131 126,214"
            fill="none" stroke="#a00018" strokeWidth="1.9" strokeLinejoin="round" />
          <polyline points="710,52 688,140 700,144 668,228"
            fill="none" stroke="#a00018" strokeWidth="1.9" strokeLinejoin="round" />
          {/* Fine accent bolts */}
          <polyline points="293,0 302,62 292,65 314,130"
            fill="none" stroke="#880010" strokeWidth="1.2" strokeLinejoin="round" />
          <polyline points="507,4 496,64 509,68 484,132"
            fill="none" stroke="#880010" strokeWidth="1.2" strokeLinejoin="round" />
        </g>
      </svg>

      {/* ── 5: Noise / grain overlay ── */}
      <svg
        aria-hidden
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.06, zIndex: 5, mixBlendMode: 'overlay' }}
      >
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)" />
      </svg>

      {/* ── 6: Floating red embers ── */}
      {PARTICLES.map((p, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: p.left,
          bottom: p.bottom,
          width: p.size,
          height: p.size,
          borderRadius: '50%',
          backgroundColor: p.red,
          pointerEvents: 'none',
          zIndex: 6,
          animationName: 'float-up',
          animationDuration: p.dur,
          animationDelay: p.delay,
          animationTimingFunction: 'ease-out',
          animationIterationCount: 'infinite',
          opacity: 0,
        }} />
      ))}

      {/* ── Content ── */}

      <h1 style={{
        position: 'relative',
        zIndex: 10,
        fontFamily: '"Barlow Condensed", sans-serif',
        fontWeight: 800,
        fontSize: 'clamp(4.5rem, 20vw, 11rem)',
        textTransform: 'uppercase',
        letterSpacing: '-0.01em',
        color: '#e8192c',
        lineHeight: 0.88,
        marginBottom: '1.1rem',
      }}>
        Festipals
      </h1>

      <h2 style={{
        position: 'relative',
        zIndex: 10,
        fontFamily: '"Barlow Condensed", sans-serif',
        fontWeight: 700,
        fontSize: 'clamp(1.15rem, 4.2vw, 1.9rem)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: '#f2f2f2',
        lineHeight: 1.25,
        marginBottom: '1rem',
      }}>
        Download Festival 2026<br />
        Build your schedule.<br />
        Share it. See who clashes.
      </h2>

      <p style={{
        position: 'relative',
        zIndex: 10,
        color: 'rgba(242,242,242,0.78)',
        fontSize: '1rem',
        lineHeight: 1.6,
        marginBottom: '2.2rem',
        maxWidth: '340px',
      }}>
        No sign-up needed. Your link is your identity —<br />
        bookmark it to come back.
      </p>

      <form action={start} style={{ position: 'relative', zIndex: 10, marginBottom: '0.5rem' }}>
        <button
          type="submit"
          className="landing-btn"
          style={{
            fontFamily: '"Barlow Condensed", sans-serif',
            fontWeight: 700,
            fontSize: '1.4rem',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: '#ffffff',
            backgroundColor: '#e10600',
            padding: '0.9rem 3rem',
            borderRadius: '3px',
            border: '2px solid rgba(255,80,60,0.35)',
            cursor: 'pointer',
          }}
        >
          Build your schedule
        </button>
      </form>

      {/* ── Crowd silhouette ── */}
      <svg
        aria-hidden
        viewBox="0 0 1200 220"
        preserveAspectRatio="xMidYMax slice"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          display: 'block',
          pointerEvents: 'none',
          zIndex: 9,
        }}
      >
        <defs>
          <linearGradient id="crowdGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#200000" stopOpacity="0.7" />
            <stop offset="70%" stopColor="#0a0303" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#080202" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Crowd body */}
        <path
          fill="#0d0101"
          d="
            M0,220 L0,158
            Q14,136 30,152 Q44,118 62,138 Q77,110 94,128
            Q110,100 128,118 Q142,90 160,108 Q175,80 192,100
            Q208,70 225,90  Q240,62 258,82  Q273,54 290,74
            Q306,48 324,68  Q339,42 357,62  Q372,38 390,58
            Q405,34 422,54  Q438,30 455,50  Q471,26 488,48
            Q504,23 521,45  Q537,22 554,44  Q570,28 587,50
            Q603,24 620,46  Q636,30 653,52  Q669,34 686,56
            Q702,40 719,60  Q735,44 752,64  Q768,50 785,68
            Q801,54 818,74  Q834,60 851,80  Q867,67 884,86
            Q900,74 917,94  Q933,82 950,102 Q966,90 983,112
            Q999,98 1016,120 Q1032,108 1049,130
            Q1065,117 1082,140 Q1098,128 1115,152
            Q1131,140 1148,162 Q1165,152 1182,170
            L1200,176 L1200,220 Z
          "
        />

        {/* Raised arms scattered across the crowd */}
        {[48,108,172,238,306,374,440,508,576,644,712,782,850,918,988,1056,1128].map((x, i) => {
          const armH = i % 3 === 0 ? 62 : i % 3 === 1 ? 48 : 55
          const baseY = i % 3 === 0 ? 158 : i % 3 === 1 ? 165 : 160
          return (
            <g key={x}>
              <rect x={x - 4} y={baseY - armH} width={8} height={armH} rx={4} fill="#0d0101" />
              <ellipse cx={x} cy={baseY - armH - 6} rx={5} ry={7} fill="#0d0101" />
            </g>
          )
        })}

        {/* Warm red glow at base */}
        <rect x="0" y="192" width="1200" height="28" fill="url(#crowdGlow)" />
      </svg>

    </main>
  )
}
