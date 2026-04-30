import { redirect } from 'next/navigation'
import { randomUUID } from 'crypto'

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
      padding: '2rem 1.5rem 240px',
    }}>

      {/* ── Background layers ── */}

      {/* Primary red energy burst */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: [
          'radial-gradient(ellipse 120% 70% at 50% 35%, rgba(220,10,30,0.22) 0%, transparent 60%)',
          'radial-gradient(ellipse 60% 50% at 30% 60%, rgba(140,0,15,0.12) 0%, transparent 55%)',
          'radial-gradient(ellipse 60% 50% at 70% 60%, rgba(140,0,15,0.12) 0%, transparent 55%)',
        ].join(', '),
        pointerEvents: 'none',
      }} />

      {/* Radiating rays from top-centre */}
      <svg
        aria-hidden
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.18 }}
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid slice"
      >
        {[...Array(18)].map((_, i) => {
          const angle = (i / 18) * 360
          const rad = (angle * Math.PI) / 180
          const x2 = 400 + Math.cos(rad) * 700
          const y2 = 180 + Math.sin(rad) * 700
          return (
            <line
              key={i}
              x1="400" y1="180"
              x2={x2} y2={y2}
              stroke="#c00010"
              strokeWidth={i % 3 === 0 ? 3 : 1}
              strokeLinecap="round"
            />
          )
        })}
      </svg>

      {/* Lightning bolts */}
      <svg
        aria-hidden
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.35 }}
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Left bolt */}
        <polyline
          points="180,0 210,120 190,125 230,260 205,265 250,400"
          fill="none" stroke="#d0001a" strokeWidth="2.5" strokeLinejoin="round"
        />
        <polyline
          points="180,0 210,120 190,125 230,260 205,265 250,400"
          fill="none" stroke="rgba(255,80,80,0.4)" strokeWidth="6" strokeLinejoin="round"
        />
        {/* Right bolt */}
        <polyline
          points="620,0 590,100 615,108 570,230 598,238 555,370"
          fill="none" stroke="#d0001a" strokeWidth="2.5" strokeLinejoin="round"
        />
        <polyline
          points="620,0 590,100 615,108 570,230 598,238 555,370"
          fill="none" stroke="rgba(255,80,80,0.4)" strokeWidth="6" strokeLinejoin="round"
        />
        {/* Small accent bolts */}
        <polyline points="100,80 120,160 108,163 135,240" fill="none" stroke="#a00010" strokeWidth="1.5" strokeLinejoin="round"/>
        <polyline points="700,60 678,140 692,144 665,220" fill="none" stroke="#a00010" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>

      {/* Red splatter blobs */}
      <svg
        aria-hidden
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.2 }}
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid slice"
      >
        <ellipse cx="150" cy="250" rx="90" ry="40" fill="#8b0000" transform="rotate(-20,150,250)"/>
        <ellipse cx="650" cy="300" rx="80" ry="35" fill="#8b0000" transform="rotate(15,650,300)"/>
        <ellipse cx="400" cy="80" rx="120" ry="30" fill="#6b0000" transform="rotate(-5,400,80)"/>
        <circle cx="120" cy="180" r="25" fill="#700000"/>
        <circle cx="680" cy="220" r="20" fill="#700000"/>
        <circle cx="400" cy="50" r="18" fill="#800010"/>
      </svg>

      {/* ── Content ── */}

      {/* FESTIPALS */}
      <h1 style={{
        fontFamily: '"Barlow Condensed", sans-serif',
        fontWeight: 800,
        fontSize: 'clamp(4.5rem, 20vw, 11rem)',
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
        color: '#e8192c',
        lineHeight: 0.88,
        marginBottom: '1.1rem',
        position: 'relative',
      }}>
        Festipals
      </h1>

      {/* Tagline */}
      <h2 style={{
        fontFamily: '"Barlow Condensed", sans-serif',
        fontWeight: 700,
        fontSize: 'clamp(1.15rem, 4.5vw, 2rem)',
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        color: '#ffffff',
        lineHeight: 1.25,
        marginBottom: '1rem',
        position: 'relative',
      }}>
        Download Festival 2026<br />
        Build your schedule.<br />
        Share it. See who clashes.
      </h2>

      {/* Small print — white, not grey */}
      <p style={{
        color: 'rgba(255,255,255,0.72)',
        fontSize: '1rem',
        lineHeight: 1.55,
        marginBottom: '2.2rem',
        maxWidth: '340px',
        position: 'relative',
      }}>
        No sign-up needed. Your link is your identity —<br />
        bookmark it to come back.
      </p>

      {/* CTA */}
      <form action={start} style={{ position: 'relative', marginBottom: '2rem' }}>
        <button
          type="submit"
          style={{
            fontFamily: '"Barlow Condensed", sans-serif',
            fontWeight: 700,
            fontSize: '1.35rem',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: '#ffffff',
            backgroundColor: '#e8192c',
            border: '2px solid rgba(255,80,80,0.4)',
            padding: '0.9rem 2.8rem',
            borderRadius: '4px',
            cursor: 'pointer',
            boxShadow: '0 0 24px rgba(232,25,44,0.55), 0 4px 20px rgba(0,0,0,0.4)',
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
          right: 0,
          width: '100%',
          display: 'block',
          pointerEvents: 'none',
        }}
      >
        {/* Crowd body */}
        <path
          d={[
            'M0,220 L0,160',
            'Q15,140 30,155 Q45,125 60,145 Q75,118 90,135',
            'Q105,108 118,128 Q130,100 145,118 Q158,90 172,108',
            'Q185,82 198,100 Q210,75 225,92 Q238,68 252,88',
            'Q265,65 278,82 Q290,58 305,75 Q318,52 332,70',
            'Q345,48 358,66 Q370,44 384,62 Q396,42 410,58',
            'Q422,38 436,55 Q450,35 462,52 Q476,32 490,50',
            'Q502,30 516,48 Q528,28 542,46 Q556,32 568,50',
            'Q582,28 596,46 Q608,32 622,50 Q636,28 648,46',
            'Q662,30 676,50 Q688,35 702,52 Q715,38 728,56',
            'Q742,42 755,60 Q768,45 782,62 Q795,50 808,68',
            'Q822,55 835,72 Q848,58 862,78 Q875,65 888,82',
            'Q902,70 915,88 Q928,75 942,95 Q955,82 968,100',
            'Q982,88 995,108 Q1008,95 1022,115 Q1035,105 1048,122',
            'Q1062,112 1075,130 Q1088,118 1102,138',
            'Q1115,128 1130,148 Q1145,138 1160,158',
            'Q1178,148 1200,165 L1200,220 Z',
          ].join(' ')}
          fill="#0d0000"
        />
        {/* Raised arms/hands scattered across crowd */}
        {[
          [80, 135, 70, 95],
          [155, 118, 145, 78],
          [240, 92, 232, 52],
          [330, 70, 320, 30],
          [415, 58, 407, 18],
          [500, 50, 490, 12],
          [590, 46, 582, 8],
          [680, 50, 670, 12],
          [770, 62, 762, 24],
          [858, 78, 850, 38],
          [950, 100, 940, 58],
          [1040, 122, 1030, 80],
          [1130, 148, 1120, 105],
        ].map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#0d0000" strokeWidth="6" strokeLinecap="round"/>
        ))}
        {/* Fists at top of arms */}
        {[
          [70, 92],
          [145, 75],
          [232, 49],
          [320, 27],
          [407, 15],
          [490, 9],
          [582, 5],
          [670, 9],
          [762, 21],
          [850, 35],
          [940, 55],
          [1030, 77],
          [1120, 102],
        ].map(([cx, cy], i) => (
          <ellipse key={i} cx={cx} cy={cy} rx="5" ry="7" fill="#0d0000"/>
        ))}
        {/* Red glow at base of crowd */}
        <rect x="0" y="195" width="1200" height="25" fill="url(#crowdGlow)"/>
        <defs>
          <linearGradient id="crowdGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a0000" stopOpacity="0.6"/>
            <stop offset="100%" stopColor="#0d0000" stopOpacity="1"/>
          </linearGradient>
        </defs>
      </svg>

    </main>
  )
}
