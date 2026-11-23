// src/seasonArt.jsx
// The drawings for the Seasonal theme: one wide scene and one garland per season.
// Every drawing is original and generic. There are no team, league, event or company marks:
// scarves and pennants are plain stripes, balls and helmets carry no badges.
//
// SeasonScene    the picture on the Dashboard banner, drawn in a 480 x 112 box with the main
//                subject on the right (narrow screens show the right-hand part).
// SeasonGarland  the row across the top of each page: a repeating tile, 30 high.
import { useId } from 'react'

const uid = (raw) => `qs${raw.replace(/[^a-zA-Z0-9]/g, '')}`
const range = (n) => Array.from({ length: n }, (_, i) => i)

// ------------------------------------------------------------------
// Shared pieces
// ------------------------------------------------------------------
const Cloud = ({ x, y, s = 1, fill = '#fff', opacity = 0.9 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill} opacity={opacity}>
    <circle cx="10" cy="10" r="8" /><circle cx="22" cy="7" r="10" /><circle cx="35" cy="11" r="7" /><rect x="6" y="10" width="34" height="8" rx="4" />
  </g>
)
const Sparkle = ({ x, y, s = 1, fill = '#f6d77a', className = 'qp-s-twinkle', delay = 0 }) => (
  <path className={className} style={{ animationDelay: `${delay}s` }} transform={`translate(${x} ${y}) scale(${s})`} fill={fill}
    d="M0 -6C.7 -1.6 1.6 -.7 6 0 1.6 .7 .7 1.6 0 6-.7 1.6-1.6 .7-6 0-1.6-.7-.7-1.6 0-6z" />
)
const Star5 = ({ x, y, s = 1, fill = '#f6c945' }) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} fill={fill} d="M0 -10l2.9 6.3 6.9.8-5.100 4.700 1.400 6.800L0 5.200l-6.100 3.400 1.400-6.800-5.100-4.700 6.900-.8z" />
)
// A firework: lines and dots thrown out from a centre
const Firework = ({ x, y, r = 16, color, n = 12, delay = 0, ring = false }) => (
  <g transform={`translate(${x} ${y})`}>
    <g className="qp-s-burst" style={{ animationDelay: `${delay}s` }}>
      <circle r={r * 1.25} fill={color} opacity="0.1" />
      {range(n).map(i => (
        <g key={i} transform={`rotate(${(360 / n) * i})`}>
          <path d={`M0 ${-r * 0.3}V${-r * 0.82}`} stroke={color} strokeWidth="1.300" strokeLinecap="round" />
          <circle cy={-r} r="1.500" fill={color} />
          {ring && <circle cy={-r * 0.55} r="0.9" fill="#fff" />}
        </g>
      ))}
      <circle r="1.800" fill="#fff" />
    </g>
  </g>
)
// A rugby-style ball (pale, two bands) and an Australian-rules style ball (red, laced). No maker's marks.
const BallPale = ({ x, y, s = 1, rot = -24 }) => (
  <g transform={`translate(${x} ${y}) scale(${s}) rotate(${rot})`}>
    <ellipse rx="11" ry="6.600" fill="#f5eedf" stroke="#cfc4ad" strokeWidth="0.6" />
    <path d="M-6 -5.400Q-7.800 0 -6 5.400M6 -5.400Q7.800 0 6 5.400" fill="none" stroke="#2f6fb5" strokeWidth="1.800" />
    <path d="M-2.500 0h5" stroke="#b9ad97" strokeWidth="0.8" strokeLinecap="round" /><ellipse cx="-2" cy="-3" rx="4" ry="1.300" fill="#fff" opacity="0.6" />
  </g>
)
const BallRed = ({ x, y, s = 1, rot = -24 }) => (
  <g transform={`translate(${x} ${y}) scale(${s}) rotate(${rot})`}>
    <ellipse rx="11" ry="7" fill="#b3372d" stroke="#8a231d" strokeWidth="0.6" />
    <path d="M-10.500 0Q0 -3.200 10.500 0" fill="none" stroke="#8a231d" strokeWidth="0.7" />
    <path d="M-3 -2.800h6M-2 -3.900v2.200M0 -4v2.300M2 -3.900v2.200" stroke="#f5eedf" strokeWidth="0.8" strokeLinecap="round" /><ellipse cx="-3" cy="-4.200" rx="4" ry="1.200" fill="#fff" opacity="0.35" />
  </g>
)
const BallBrown = ({ x, y, s = 1, rot = -28 }) => (
  <g transform={`translate(${x} ${y}) scale(${s}) rotate(${rot})`}>
    <path d="M-11.500 0Q0 -9.600 11.500 0 0 9.600 -11.500 0z" fill="#8b4a2b" stroke="#6d3519" strokeWidth="0.6" />
    <path d="M-8.500 -1Q0 -6.500 8.500 -1" fill="none" stroke="#b06a45" strokeWidth="0.9" opacity="0.8" />
    <path d="M-4 0h8M-2.500 -1.500v3M0 -1.500v3M2.500 -1.500v3" stroke="#fff" strokeWidth="1" strokeLinecap="round" />
    <path d="M-8.800 -2.300V2.300M8.800 -2.300V2.300" stroke="#fff" strokeWidth="1.100" />
  </g>
)
const Poppy = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx="-4.600" cy="-4.200" rx="7" ry="6.400" fill="#b00e28" transform="rotate(-18 -4.600 -4.200)" /><ellipse cx="4.600" cy="-4.200" rx="7" ry="6.400" fill="#c8102e" transform="rotate(18 4.600 -4.200)" />
    <ellipse cx="-4.200" cy="4" rx="7.400" ry="6.200" fill="#d2203a" transform="rotate(14 -4.200 4)" /><ellipse cx="4.200" cy="4" rx="7.400" ry="6.200" fill="#de3149" transform="rotate(-14 4.200 4)" />
    <path d="M-9 -1q4 3 9 1 5 2 9-1" fill="none" stroke="#9b0d24" strokeWidth="0.7" opacity="0.6" />
    <circle r="3.300" fill="#1d1d1b" /><circle r="1.300" fill="#5d6b3f" />
  </g>
)
const Egg = ({ x, y, s = 1, color, mark = '#fff', kind = 'bands', rot = 0 }) => (
  <g transform={`translate(${x} ${y}) scale(${s}) rotate(${rot})`}>
    <path d="M0 -10C-4.400 -10 -7.600 -3.400 -7.600 1.600a7.600 7.600 0 0 0 15.200 0C7.600 -3.400 4.400 -10 0 -10z" fill={color} />
    <path d="M-4.500 -6C-6 -3 -6.500 0 -6 3" fill="none" stroke="#fff" strokeWidth="1.300" strokeLinecap="round" opacity="0.5" />
    {kind === 'bands' && <path d="M-6.700 -1.800h13.400M-7.500 2.600h15" stroke={mark} strokeWidth="1.600" strokeLinecap="round" opacity="0.9" />}
    {kind === 'zigzag' && <path d="M-7 .8l2.300-2.600 2.400 2.600L0 -1.800l2.300 2.600 2.400-2.600L7 .8" fill="none" stroke={mark} strokeWidth="1.400" strokeLinejoin="round" strokeLinecap="round" />}
    {kind === 'dots' && [[-3, -3.500], [2.500, -2.500], [-4.500, 1.500], [0, 2], [4.500, 2.500], [-2, 6], [2.500, 6.300]].map(([a, b]) => <circle key={`${a}${b}`} cx={a} cy={b} r="1.100" fill={mark} />)}
  </g>
)
const Lantern = ({ x, y, s = 1, glow }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {glow && <circle cy="12" r="15" fill={`url(#${glow})`} />}
    <rect x="-3.800" y="2.400" width="7.600" height="2.300" rx="0.9" fill="#f0b840" />
    <ellipse cy="12" rx="9" ry="7.600" fill="#d6362f" /><ellipse cx="-2.600" cy="12" rx="5.200" ry="7.400" fill="#e2463c" opacity="0.6" />
    <path d="M0 4.600v14.800M-4.600 5.400Q-7.600 12 -4.600 18.600M4.600 5.400Q7.600 12 4.600 18.600" fill="none" stroke="#a81f24" strokeWidth="0.8" />
    <rect x="-3.800" y="19.300" width="7.600" height="2.300" rx="0.9" fill="#f0b840" />
    <path d="M0 21.600v2" stroke="#f0b840" strokeWidth="1" /><circle cy="24.500" r="1.300" fill="#d6362f" /><path d="M-1.500 26v4.500M0 26v5.500M1.500 26v4.500" stroke="#f0b840" strokeWidth="0.8" strokeLinecap="round" />
  </g>
)
const Blossom = ({ x, y, s = 1, color = '#f6a5c0' }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {[0, 72, 144, 216, 288].map(a => <ellipse key={a} cy="-4.600" rx="3" ry="4" fill={color} transform={`rotate(${a})`} />)}
    <circle r="1.800" fill="#f0b840" />
  </g>
)
const Bow = ({ x, y, s = 1, a = '#ec5f9c', b = '#c2357a', c = '#f9a8cc' }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-1 2L-7 15l4-1.500L-1.500 17 1 3z" fill={b} /><path d="M1 2L7 15l-4-1.500L1.500 17-1 3z" fill={b} />
    <path d="M-1 0C-5 -8 -13 -9 -15 -6c-1.800 2.800-1 9 .5 11C-12 8 -5 6 -1 0z" fill={a} /><path d="M1 0C5 -8 13 -9 15 -6c1.800 2.800 1 9-.5 11C12 8 5 6 1 0z" fill={a} />
    <path d="M-2 -1C-6 -5 -11 -6 -13.500 -4.500" fill="none" stroke={c} strokeWidth="1.400" strokeLinecap="round" /><path d="M2 -1C6 -5 11 -6 13.500 -4.500" fill="none" stroke={c} strokeWidth="1.400" strokeLinecap="round" />
    <path d="M-2.500 1.500C-6 3 -10 3.500 -13 2.500M2.500 1.500C6 3 10 3.500 13 2.500" fill="none" stroke={b} strokeWidth="0.9" strokeLinecap="round" opacity="0.55" />
    <rect x="-2.800" y="-3" width="5.600" height="6" rx="2.200" fill={b} /><rect x="-1.600" y="-2.200" width="1.400" height="4.400" rx="0.7" fill={c} opacity="0.6" />
  </g>
)
const Heart = ({ x, y, s = 1, fill = '#ec5f9c' }) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} fill={fill} d="M0 8C-7 3 -9.500 -.5 -9.500 -4a4.700 4.700 0 0 1 9.500-1 4.700 4.700 0 0 1 9.500 1C9.500 -.5 7 3 0 8z" />
)
const Pumpkin = ({ x, y, s = 1, face = 'grin' }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-.800 -9.500c0-2.500 1.200-4 3.200-4.300l.6 2c-1.100.3-1.700 1-1.700 2.300z" fill="#5f8a3a" />
    <ellipse cx="-7" cy="0" rx="6" ry="9" fill="#cf6717" /><ellipse cx="7" cy="0" rx="6" ry="9" fill="#cf6717" />
    <ellipse cx="-3.500" cy="0" rx="5.500" ry="9.600" fill="#e67d1e" /><ellipse cx="3.500" cy="0" rx="5.500" ry="9.600" fill="#e67d1e" />
    <ellipse cx="0" cy="0" rx="4.400" ry="9.900" fill="#f39233" /><ellipse cx="-1.500" cy="-4" rx="1.500" ry="3.500" fill="#ffc27a" opacity="0.5" />
    <g className="qp-s-flicker" fill="#ffd166">
      {face === 'grin' && <path d="M-6.500 -3.500l3 3h-5zM6.500 -3.500l2 3h-5zM-7.500 2.500h15l-2.300 4-2.200-2-2.500 2.400-2.500-2.400-2.200 2z" />}
      {face === 'ooh' && <path d="M-5 -4a2 2 0 1 0 .01 0zM5 -4a2 2 0 1 0 .01 0zM0 2a2.600 3 0 1 0 .01 0z" />}
      {face === 'smile' && <path d="M-6.500 -1.500l2.500-3 2.500 3zM1.500 -1.500l2.500-3 2.500 3zM-6 2.500Q0 8.500 6 2.500 0 5 -6 2.500z" />}
    </g>
  </g>
)
const Bat = ({ x, y, s = 1, fill = '#b79cf0', delay = 0 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path className="qp-s-flap" style={{ animationDelay: `${delay}s` }} fill={fill}
      d="M0 -3c1-1.500 2-1.500 2.400.2C5 -5 8 -4.800 11 -2c-2.200-.3-3.300.5-3.800 2-1.300-1.300-2.500-1.300-3.300 0-.9-.9-1.700-.6-2.300 1.200L0 4l-1.600-2.800c-.6-1.800-1.400-2.100-2.300-1.200-.8-1.300-2-1.300-3.300 0C-7.700 -1.500-8.800 -2.300-11 -2c3-2.800 6-3 8.600-.8C-2 -4.500-1 -4.500 0 -3z" />
  </g>
)
const Ghost = ({ x, y, s = 1, delay = 0 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <g className="qp-s-bob" style={{ animationDelay: `${delay}s` }}>
      <path d="M-8 11V-1a8 8 0 0 1 16 0v12l-2.700-2.200L2.700 11 0 8.800-2.700 11l-2.600-2.200z" fill="#f4f1ff" opacity="0.95" />
      <ellipse cx="-2.800" cy="-1" rx="1.300" ry="1.900" fill="#3b2a55" /><ellipse cx="2.800" cy="-1" rx="1.300" ry="1.900" fill="#3b2a55" /><ellipse cx="0" cy="3.500" rx="1.200" ry="1.600" fill="#3b2a55" />
    </g>
  </g>
)
// A rider on a bike. Wheels turn. jersey sets the top's colour; dots adds red spots.
const Cyclist = ({ x, y, s = 1, jersey = '#f6cf2f', dots = false, helmet = '#e23b3b', delay = 0 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <g className="qp-s-bob" style={{ animationDelay: `${delay}s` }}>
      {[-11, 11].map(cx => (
        <g key={cx} className="qp-s-spin-fast"><circle cx={cx} cy="0" r="7.500" fill="none" stroke="#2b2f36" strokeWidth="1.700" /><path d={`M${cx} -7.500v15M${cx - 7.500} 0h15`} stroke="#9aa3ad" strokeWidth="0.6" /></g>
      ))}
      <path d="M-11 0l7-11h10l5 11M-4 -11l5 11h-12M6 -11l-5 11M-7 -12.500h6M5 -14h4" fill="none" stroke="#31465f" strokeWidth="1.600" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M-4 -13c1-7 5-10 11-9l3 6" fill="none" stroke={jersey} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      {dots && [[-1.500, -18.500], [2.500, -21.500], [6.500, -21], [9, -17.500]].map(([a, b]) => <circle key={a} cx={a} cy={b} r="1" fill="#e23b3b" />)}
      <path d="M-3 -13l4 7-3 6" fill="none" stroke="#2b2f36" strokeWidth="2.300" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10.500" cy="-25" r="3.300" fill="#f1c9a5" /><path d="M7 -26a3.600 3.600 0 0 1 7-1z" fill={helmet} />
    </g>
  </g>
)
const Tulip = ({ x, y, s = 1, color = '#ec5f9c', h = 22 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d={`M0 0V${h}`} stroke="#5aa15f" strokeWidth="1.600" strokeLinecap="round" /><path d={`M0 ${h * 0.75}C-6 ${h * 0.6} -7 ${h * 0.25} -5 ${h * 0.15} -2 ${h * 0.35} 0 ${h * 0.55} 0 ${h * 0.75}z`} fill="#6fba73" />
    <path d="M-5 -8C-5 -1 -2 1 0 1s5-2 5-9l-2.500 3L0 -9l-2.500 4z" fill={color} />
  </g>
)

// ------------------------------------------------------------------
// The scenes
// ------------------------------------------------------------------
const SCENES = {
  christmas: (u) => (
    <>
      <defs>
        <linearGradient id={`${u}sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#dcedf7" /><stop offset="1" stopColor="#f6fbfe" /></linearGradient>
        <radialGradient id={`${u}glow`}><stop offset="0" stopColor="#ffe9a0" stopOpacity="0.9" /><stop offset="1" stopColor="#ffe9a0" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="480" height="112" fill={`url(#${u}sky)`} />
      <path d="M0 84Q70 58 150 76T300 70 480 78V112H0z" fill="#e7f1f8" />
      {[[36, 74, 0.8], [84, 70, 1], [140, 76, 0.7], [196, 72, 0.9]].map(([x, y, s]) => (
        <g key={x} transform={`translate(${x} ${y}) scale(${s})`}><path d="M0 -26l-9 12h5l-8 11h6l-9 11h30l-9-11h6l-8-11h5z" fill="#b5d2cb" /><rect x="-1.500" y="8" width="3" height="5" fill="#9bb9b1" /></g>
      ))}
      <path d="M0 96Q110 78 230 94T480 90V112H0z" fill="#fff" />
      {/* a string of lights along the top */}
      <path d="M150 0Q200 20 250 6T350 6T450 6T480 4" fill="none" stroke="#5a7a6a" strokeWidth="0.9" />
      {[[168, 9, '#e24b4b'], [190, 13, '#f6c945'], [214, 12, '#4fb07a'], [238, 8, '#5aa7e0'], [264, 9, '#e24b4b'], [290, 12, '#f6c945'], [316, 11, '#4fb07a'], [340, 7, '#5aa7e0'], [366, 9, '#e24b4b'], [392, 12, '#f6c945'], [418, 11, '#4fb07a'], [442, 7, '#5aa7e0'], [466, 8, '#e24b4b']].map(([x, y, c], i) => (
        <g key={x} className="qp-s-twinkle" style={{ animationDelay: `${(i % 5) * 0.45}s` }}><rect x={x - 1} y={y - 2.500} width="2" height="2" fill="#5a7a6a" /><ellipse cx={x} cy={y + 1.800} rx="2.200" ry="3" fill={c} /></g>
      ))}
      {/* snowman */}
      <ellipse cx="262" cy="100" rx="17" ry="3" fill="#cfdfea" />
      <circle cx="262" cy="86" r="13.500" fill="#fff" stroke="#d5e3ee" strokeWidth="0.8" /><circle cx="262" cy="66.500" r="9.500" fill="#fff" stroke="#d5e3ee" strokeWidth="0.8" />
      <path d="M252 72q10 5 20 0v4.500q-10 5-20 0z" fill="#d6362f" /><path d="M268 74l3 12 4-1-2.500-11z" fill="#c22a26" />
      <rect x="254.500" y="55" width="15" height="2.600" rx="1.300" fill="#2c3440" /><rect x="257" y="45.500" width="10" height="10" rx="1.500" fill="#2c3440" /><rect x="257" y="52" width="10" height="2" fill="#d6362f" />
      <circle cx="258.800" cy="63" r="1.200" fill="#2c3440" /><circle cx="265" cy="63" r="1.200" fill="#2c3440" /><path d="M261.800 66l8 1.700-8 1.300z" fill="#f28a2e" />
      <circle cx="262" cy="80" r="1.200" fill="#2c3440" /><circle cx="262" cy="86" r="1.200" fill="#2c3440" /><circle cx="262" cy="92" r="1.200" fill="#2c3440" />
      <path d="M249 80l-12-7M275 80l12-8M239 74l-1-4M285 73l3-3" stroke="#7a5a3c" strokeWidth="1.300" strokeLinecap="round" />
      {/* the tree */}
      <ellipse cx="360" cy="101" rx="34" ry="4" fill="#cfdfea" />
      <rect x="355" y="90" width="10" height="12" rx="1" fill="#8a5a3b" />
      <circle className="qp-s-twinkle" cx="360" cy="14" r="13" fill={`url(#${u}glow)`} />
      {[[92, 36, '#14603c', '#0f4f31'], [76, 30, '#197046', '#135a38'], [60, 24, '#1f8152', '#176842'], [44, 17, '#27935e', '#1c784b']].map(([by, half, a, b], i) => (
        <g key={by}>
          <path d={`M360 ${by - 32 + i * 2}L${360 - half} ${by}H${360 + half}z`} fill={a} />
          <path d={`M360 ${by - 32 + i * 2}L${360 + half} ${by}H360z`} fill={b} />
          <path d={`M${360 - half} ${by}q${half / 3} 4 ${half / 1.500} 0t${half / 1.500} 0t${half / 1.500} 0`} fill="none" stroke="#fff" strokeWidth="2.600" strokeLinecap="round" />
        </g>
      ))}
      <path d="M340 52q20 9 40-1M334 68q26 10 52-1M327 84q33 11 66-1" fill="none" stroke="#f0c75e" strokeWidth="1.500" strokeLinecap="round" />
      {[[350, 34, '#e24b4b'], [369, 38, '#f6c945'], [344, 50, '#5aa7e0'], [362, 54, '#e24b4b'], [377, 50, '#f6c945'], [338, 66, '#f6c945'], [354, 71, '#e24b4b'], [370, 72, '#5aa7e0'], [384, 66, '#e24b4b'], [334, 82, '#e24b4b'], [350, 87, '#5aa7e0'], [367, 88, '#f6c945'], [383, 85, '#e24b4b']].map(([x, y, c], i) => (
        <g key={`${x}${y}`}><circle className="qp-s-twinkle" style={{ animationDelay: `${(i % 4) * 0.5}s` }} cx={x} cy={y} r="3" fill={c} /><circle cx={x - 0.9} cy={y - 0.9} r="0.9" fill="#fff" opacity="0.7" /></g>
      ))}
      <Star5 x={360} y={15} s={0.95} />
      {/* presents */}
      <rect x="402" y="80" width="22" height="20" rx="2" fill="#d6362f" /><rect x="411" y="80" width="4" height="20" fill="#f6c945" /><rect x="402" y="88" width="22" height="3.500" fill="#f6c945" /><path d="M413 80c-6-7-11-2-4 0zM413 80c6-7 11-2 4 0z" fill="#f6c945" />
      <rect x="428" y="86" width="17" height="14" rx="2" fill="#2f9b79" /><rect x="435" y="86" width="3.500" height="14" fill="#fff" /><path d="M436.700 86c-5-5-8-1-3 0zM436.700 86c5-5 8-1 3 0z" fill="#fff" />
      <rect x="449" y="90" width="13" height="10" rx="1.500" fill="#f0b840" /><rect x="454" y="90" width="3" height="10" fill="#d6362f" />
      <path d="M390 100V86a4 4 0 0 1 8 0" fill="none" stroke="#fff" strokeWidth="3.200" strokeLinecap="round" /><path d="M390 100V86a4 4 0 0 1 8 0" fill="none" stroke="#d6362f" strokeWidth="3.200" strokeLinecap="round" strokeDasharray="3 3.500" />
      {[[30, 20], [70, 40], [110, 14], [160, 34], [210, 22], [228, 52], [300, 36], [318, 60], [410, 40], [440, 56], [470, 30], [296, 84]].map(([x, y], i) => <circle key={`${x}${y}`} className="qp-s-twinkle" style={{ animationDelay: `${(i % 6) * 0.4}s` }} cx={x} cy={y} r={1.200 + (i % 3) * 0.5} fill="#fff" />)}
    </>
  ),

  newyear: (u, year) => (
    <>
      <defs>
        <linearGradient id={`${u}sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0f1230" /><stop offset="0.7" stopColor="#2a2057" /><stop offset="1" stopColor="#3b2a66" /></linearGradient>
        <linearGradient id={`${u}gold`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe9a0" /><stop offset="1" stopColor="#e9a93a" /></linearGradient>
      </defs>
      <rect width="480" height="112" fill={`url(#${u}sky)`} />
      {[[20, 12], [60, 30], [96, 8], [140, 24], [186, 10], [236, 30], [270, 12], [330, 8], [372, 26], [430, 12], [462, 34], [404, 6]].map(([x, y], i) => <circle key={`${x}${y}`} className="qp-s-twinkle" style={{ animationDelay: `${(i % 5) * 0.5}s` }} cx={x} cy={y} r={0.7 + (i % 3) * 0.3} fill="#fff" opacity="0.8" />)}
      <path d="M96 100V60M168 100V40M250 100V52M336 100V34M420 100V58" stroke="#fff" strokeWidth="0.6" strokeDasharray="1 3" opacity="0.35" />
      <Firework x={96} y={46} r={17} color="#f2c94c" n={12} /><Firework x={168} y={28} r={22} color="#f472b6" n={14} delay={0.9} ring />
      <Firework x={250} y={40} r={15} color="#67e8f9" n={10} delay={1.700} /><Firework x={336} y={24} r={20} color="#a78bfa" n={12} delay={0.4} ring /><Firework x={420} y={44} r={16} color="#f2c94c" n={12} delay={1.300} />
      {/* skyline and river */}
      <path d="M0 96h14V80h10v-8h8v8h8V70h12v26h10V76h6v-6h6v6h6v20h12V66h14v30h10V82h10v14h12V72h8v-8h8v8h8v24h12V78h12v18h10V62h6v-8h6v8h6v34h12V80h14v16h12V70h12v26h10V84h12v12h14V74h10v22h12V68h8v-8h6v8h8v28h10V82h12v14h18v16H0z" fill="#090b1f" />
      {[[18, 86], [44, 76], [48, 84], [80, 82], [112, 72], [116, 80], [120, 88], [150, 88], [176, 78], [180, 86], [222, 84], [246, 68], [250, 76], [250, 84], [286, 86], [316, 76], [320, 84], [366, 80], [396, 74], [400, 82], [436, 88], [464, 80]].map(([x, y], i) => (
        <rect key={`${x}${y}`} className={i % 4 === 0 ? 'qp-s-twinkle' : undefined} style={{ animationDelay: `${i * 0.2}s` }} x={x} y={y} width="2.200" height="2.800" fill="#ffd97a" opacity="0.85" />
      ))}
      <rect y="100" width="480" height="12" fill="#151a44" />
      {[[96, '#f2c94c'], [168, '#f472b6'], [250, '#67e8f9'], [336, '#a78bfa'], [420, '#f2c94c']].map(([x, c]) => <path key={x} d={`M${x - 9} 103h18M${x - 6} 106.500h12M${x - 3} 110h6`} stroke={c} strokeWidth="1.200" strokeLinecap="round" opacity="0.45" />)}
      <text x="404" y="97" textAnchor="middle" fontSize="27" fontWeight="800" letterSpacing="1.500" fill="#090b1f" stroke="#090b1f" strokeWidth="5" strokeLinejoin="round" fontFamily="inherit">{year}</text>
      <text x="404" y="97" textAnchor="middle" fontSize="27" fontWeight="800" letterSpacing="1.500" fill={`url(#${u}gold)`} fontFamily="inherit">{year}</text>
      <Sparkle x={356} y={74} s={0.8} /><Sparkle x={452} y={72} s={0.6} delay={0.8} fill="#fff" />
    </>
  ),

  superbowl: (u) => (
    <>
      <defs>
        <linearGradient id={`${u}sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d7e8f7" /><stop offset="1" stopColor="#eef6fc" /></linearGradient>
        <linearGradient id={`${u}turf`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3a9f5b" /><stop offset="1" stopColor="#2c8648" /></linearGradient>
        <radialGradient id={`${u}lamp`}><stop offset="0" stopColor="#fff7d1" stopOpacity="0.9" /><stop offset="1" stopColor="#fff7d1" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="480" height="112" fill={`url(#${u}sky)`} />
      {/* the stands */}
      <path d="M0 62Q240 24 480 62V70H0z" fill="#b9c5d6" /><path d="M0 68Q240 34 480 68V74H0z" fill="#a4b2c6" />
      {range(46).map(i => { const x = 8 + i * 10.200; const y = 60 - 30 * Math.sin((x / 480) * Math.PI) + 4 + (i % 3) * 2.500; return <circle key={i} cx={x} cy={y} r="1.700" fill={['#d6362f', '#2f5fb5', '#f6c945', '#fff', '#2c3440'][i % 5]} /> })}
      {[[60, 8], [420, 8]].map(([x, y]) => (
        <g key={x}><circle cx={x} cy={y + 4} r="16" fill={`url(#${u}lamp)`} /><path d={`M${x} ${y + 8}V56`} stroke="#7d8794" strokeWidth="2" /><rect x={x - 9} y={y} width="18" height="8" rx="1.500" fill="#5b6470" />{[-6, -2, 2, 6].map(d => <circle key={d} cx={x + d} cy={y + 4} r="1.400" fill="#fff7d1" />)}</g>
      ))}
      {/* the field, seen from one end */}
      <path d="M40 112L130 70H350L440 112z" fill={`url(#${u}turf)`} />
      {range(5).map(i => <path key={i} d={`M${130 + i * 44 - (40 - i * 0) * 0} 70L${40 + i * 80} 112h40L${152 + i * 44} 70z`} fill="#fff" opacity={i % 2 ? 0 : 0.07} />)}
      {range(9).map(i => <path key={i} d={`M${130 + i * 27.500} 70L${40 + i * 50} 112`} stroke="#fff" strokeWidth={i % 4 === 0 ? 1.300 : 0.7} opacity="0.8" />)}
      <path d="M130 70H350" stroke="#fff" strokeWidth="1.200" /><path d="M112 78.500H368L350 70H130z" fill="#2f5fb5" opacity="0.85" />
      <path d="M240 70V52M222 52h36M222 52V30M258 52V30" fill="none" stroke="#f2c230" strokeWidth="2.600" strokeLinecap="round" />
      {/* two plain helmets, facing each other */}
      {[[92, 96, 1, '#d6362f', '#fff'], [176, 96, -1, '#2f5fb5', '#f6c945']].map(([x, y, dir, a, b]) => (
        <g key={x} transform={`translate(${x} ${y}) scale(${dir * 1.150} 1.150)`}>
          <path d="M-13 4a13 13 0 0 1 26-2c0 4-1 7-3 9H-2l-3-5h-8z" fill={a} /><path d="M-3 -9.500a13 13 0 0 1 6-.5l-1 20.500h-4z" fill={b} opacity="0.9" />
          <circle cx="-5" cy="3" r="2.200" fill="#1d2430" opacity="0.35" /><path d="M2 3h13M5 7h10M13 0v9" fill="none" stroke="#c9d1db" strokeWidth="1.300" strokeLinecap="round" />
          <ellipse cx="-4" cy="-5" rx="5" ry="2" fill="#fff" opacity="0.3" />
        </g>
      ))}
      {/* the ball */}
      <path d="M210 104Q300 6 388 46" fill="none" stroke="#7d8794" strokeWidth="1" strokeDasharray="2 4.500" strokeLinecap="round" />
      <ellipse cx="402" cy="104" rx="18" ry="2.600" fill="#1f6b39" opacity="0.5" />
      <g className="qp-s-bob"><BallBrown x={402} y={54} s={2.300} /></g>
      {[[300, 20, '#d6362f'], [330, 34, '#f6c945'], [452, 28, '#2f5fb5'], [436, 78, '#f6c945'], [356, 16, '#2f5fb5'], [462, 60, '#d6362f']].map(([x, y, c], i) => <rect key={`${x}${y}`} className="qp-s-twinkle" style={{ animationDelay: `${i * 0.35}s` }} x={x} y={y} width="4" height="2" rx="0.5" fill={c} transform={`rotate(${i * 37} ${x} ${y})`} />)}
    </>
  ),

  lunar: (u) => (
    <>
      <defs>
        <linearGradient id={`${u}sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff1dc" /><stop offset="1" stopColor="#ffdfc4" /></linearGradient>
        <radialGradient id={`${u}glow`}><stop offset="0" stopColor="#ffd27a" stopOpacity="0.75" /><stop offset="1" stopColor="#ffd27a" stopOpacity="0" /></radialGradient>
        <radialGradient id={`${u}moon`}><stop offset="0" stopColor="#fff6d8" /><stop offset="1" stopColor="#ffe3a3" /></radialGradient>
      </defs>
      <rect width="480" height="112" fill={`url(#${u}sky)`} />
      <circle cx="372" cy="60" r="44" fill={`url(#${u}moon)`} opacity="0.9" />
      {/* lucky clouds */}
      {[[40, 84, 1], [150, 96, 0.8], [430, 96, 0.9], [236, 88, 0.7]].map(([x, y, s]) => (
        <g key={x} transform={`translate(${x} ${y}) scale(${s})`} fill="none" stroke="#f0b840" strokeWidth="2" strokeLinecap="round" opacity="0.6">
          <path d="M-22 6h44M-14 6a8 8 0 1 1 9-9 9 9 0 0 1 17 3 6 6 0 0 1 2 6" /><path d="M-4 0a3 3 0 1 0 3-3" />
        </g>
      ))}
      {/* blossom branch */}
      <path d="M0 22Q60 10 120 30T220 26" fill="none" stroke="#7a4a2a" strokeWidth="3" strokeLinecap="round" /><path d="M70 17q14-12 30-10M130 31q12 12 30 10M176 29q10-12 26-12" fill="none" stroke="#7a4a2a" strokeWidth="1.800" strokeLinecap="round" />
      {[[26, 18, 1], [58, 12, 0.8], [98, 6, 0.9], [112, 28, 1.050], [150, 40, 0.8], [164, 24, 0.7], [200, 16, 0.95], [220, 28, 0.8], [84, 24, 0.6]].map(([x, y, s], i) => <Blossom key={x} x={x} y={y} s={s} color={i % 2 ? '#f9c3d5' : '#f6a5c0'} />)}
      {[[44, 24], [138, 22], [188, 34]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="2.200" fill="#f08fb0" />)}
      {/* lanterns */}
      {[[300, 0, 1.200, 0], [346, 0, 1.700, 0.7], [400, 0, 1.350, 1.400], [446, 0, 1.050, 0.3]].map(([x, y, s, d]) => (
        <g key={x} className="qp-s-sway" style={{ animationDelay: `${d}s` }}><path d={`M${x} 0v${6 * s}`} stroke="#b8862b" strokeWidth="1" /><Lantern x={x} y={y + 3 * s} s={s} glow={`${u}glow`} /></g>
      ))}
      {/* firecrackers */}
      <g className="qp-s-sway" style={{ animationDelay: '0.5s' }}>
        <path d="M262 0v62" stroke="#b8862b" strokeWidth="1" />
        {range(6).map(i => <g key={i} transform={`translate(${262 + (i % 2 ? 4.500 : -4.500)} ${12 + i * 8.500}) rotate(${i % 2 ? 28 : -28})`}><rect x="-2.300" y="-5" width="4.600" height="10" rx="1" fill="#d6362f" /><rect x="-2.300" y="-5" width="4.600" height="1.800" fill="#f0b840" /><rect x="-2.300" y="3.200" width="4.600" height="1.800" fill="#f0b840" /></g>)}
      </g>
      {/* mandarins */}
      {[[452, 98, 8], [438, 101, 6.500], [466, 102, 6]].map(([x, y, r]) => <g key={x}><circle cx={x} cy={y} r={r} fill="#f39a2e" /><circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.3} fill="#ffc46b" opacity="0.7" /><path d={`M${x} ${y - r}q4-4 7-1-3 3-7 1z`} fill="#4f9a4a" /></g>)}
    </>
  ),

  womens: (u) => (
    <>
      <defs>
        <linearGradient id={`${u}sky`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff0f6" /><stop offset="1" stopColor="#fbe3f0" /></linearGradient>
        <linearGradient id={`${u}rib`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#f9a8cc" /><stop offset="0.5" stopColor="#ec5f9c" /><stop offset="1" stopColor="#c2357a" /></linearGradient>
      </defs>
      <rect width="480" height="112" fill={`url(#${u}sky)`} />
      {[[60, 30, 26, '#f6cfe2'], [180, 84, 34, '#f1d9f5'], [300, 20, 22, '#f6cfe2'], [450, 90, 30, '#f1d9f5']].map(([x, y, r, c]) => <circle key={x} cx={x} cy={y} r={r} fill={c} opacity="0.5" />)}
      {/* a ribbon flowing across */}
      <path d="M0 78C50 54 90 100 150 74S250 50 310 70 370 56 384 52" fill="none" stroke="#c2357a" strokeWidth="9" strokeLinecap="round" opacity="0.3" />
      <path d="M0 72C50 48 90 94 150 68S250 44 310 64 370 50 384 46" fill="none" stroke={`url(#${u}rib)`} strokeWidth="9" strokeLinecap="round" />
      <path d="M0 69.500C50 45.500 90 91.500 150 65.500S250 41.500 310 61.500 370 47.500 384 43.500" fill="none" stroke="#fff" strokeWidth="1.300" strokeLinecap="round" opacity="0.5" />
      {/* tulips, tied */}
      <g transform="rotate(-8 228 96)"><Tulip x={216} y={44} color="#f49ac1" h={50} /><Tulip x={228} y={34} color="#b98be0" h={60} /><Tulip x={240} y={46} color="#ec5f9c" h={48} /></g>
      <Bow x={229} y={84} s={0.62} a="#b98be0" b="#8e5bd0" c="#dcc7f5" />
      {/* the bow */}
      <ellipse cx="384" cy="104" rx="46" ry="3" fill="#e9bcd3" opacity="0.6" />
      <g className="qp-s-bob"><Bow x={384} y={46} s={3.600} /></g>
      {[[316, 26, 0.9, '#c9a4ee', 0], [452, 22, 0.7, '#f49ac1', 0.8], [330, 92, 0.6, '#f49ac1', 1.200], [446, 78, 1, '#c9a4ee', 0.4], [270, 16, 0.6, '#f49ac1', 1.600], [140, 24, 0.8, '#f1b6d2', 0.6], [40, 96, 0.7, '#c9a4ee', 1]].map(([x, y, s, c, d]) => (
        <g key={`${x}${y}`} className="qp-s-twinkle" style={{ animationDelay: `${d}s` }}><Heart x={x} y={y} s={s} fill={c} /></g>
      ))}
      <Sparkle x={300} y={50} s={0.7} fill="#fff" /><Sparkle x={428} y={50} s={0.6} fill="#fff" delay={0.9} /><Sparkle x={96} y={40} s={0.6} fill="#fff" delay={0.5} />
    </>
  ),

  easter: (u) => (
    <>
      <defs>
        <linearGradient id={`${u}sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#dff1fb" /><stop offset="1" stopColor="#fdf7e6" /></linearGradient>
        <radialGradient id={`${u}sun`}><stop offset="0" stopColor="#fff3b0" /><stop offset="1" stopColor="#fff3b0" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="480" height="112" fill={`url(#${u}sky)`} />
      <circle cx="70" cy="26" r="30" fill={`url(#${u}sun)`} /><circle cx="70" cy="26" r="11" fill="#ffe98a" />
      <Cloud x={130} y={12} s={0.9} /><Cloud x={260} y={24} s={0.7} /><Cloud x={420} y={10} s={0.8} />
      <path d="M0 80Q90 52 190 74T380 66 480 76V112H0z" fill="#c9ecd0" /><path d="M0 94Q120 74 250 90T480 86V112H0z" fill="#a8dfb4" />
      {/* a chick, just hatched */}
      <path d="M176 96a9 9 0 0 1 18 0l-3-2.500-3 2.500-3-2.500-3 2.500-3-2.500z" fill="#fff" stroke="#e3ddcf" strokeWidth="0.6" /><circle cx="185" cy="88" r="6" fill="#ffd95a" /><circle cx="183" cy="86.500" r="0.9" fill="#3b3440" /><circle cx="187.300" cy="86.500" r="0.9" fill="#3b3440" /><path d="M184 88.800h2.400l-1.200 1.800z" fill="#f28a2e" />
      <path d="M176 96a9 9 0 0 0 18 0z" fill="#fff" stroke="#e3ddcf" strokeWidth="0.6" />
      {/* the bunny */}
      <ellipse cx="372" cy="103" rx="30" ry="3.500" fill="#8fcf9c" />
      <g className="qp-s-twitch"><path d="M358 44c-7-16-5-30 0-31 5 0 8 13 6 31z" fill="#fbf6ee" /><path d="M360 40c-4-11-3-21 0-22 3 0 4 10 3 22z" fill="#f7b6cf" /></g>
      <g className="qp-s-twitch" style={{ animationDelay: '0.6s' }}><path d="M372 43c2-17 8-28 13-27 5 1 3 15-5 31z" fill="#fbf6ee" /><path d="M374 40c2-12 5.500-19 8-18.500 2.500 .5 1 10-4 21z" fill="#f7b6cf" /></g>
      <ellipse cx="372" cy="84" rx="19" ry="18" fill="#fbf6ee" /><ellipse cx="372" cy="88" rx="11" ry="12" fill="#fff" />
      <circle cx="393" cy="92" r="6" fill="#fff" stroke="#efe8dc" strokeWidth="0.6" />
      <ellipse cx="361" cy="101" rx="8" ry="3.800" fill="#fbf6ee" stroke="#efe8dc" strokeWidth="0.6" /><ellipse cx="381" cy="101" rx="8" ry="3.800" fill="#fbf6ee" stroke="#efe8dc" strokeWidth="0.6" />
      <circle cx="368" cy="56" r="15" fill="#fbf6ee" />
      <circle cx="362.500" cy="54" r="2" fill="#3b3440" /><circle cx="373.500" cy="54" r="2" fill="#3b3440" /><circle cx="363.200" cy="53.300" r="0.7" fill="#fff" /><circle cx="374.200" cy="53.300" r="0.7" fill="#fff" />
      <path d="M366.300 59.500h3.400l-1.700 2z" fill="#f191b5" /><path d="M368 61.500q-2.500 3-5 1M368 61.500q2.500 3 5 1" fill="none" stroke="#c9a9b4" strokeWidth="0.8" strokeLinecap="round" />
      <circle cx="358.500" cy="60" r="2.800" fill="#f7b6cf" opacity="0.7" /><circle cx="377.500" cy="60" r="2.800" fill="#f7b6cf" opacity="0.7" />
      <path d="M356 58l-9-2M356 60.500l-9 1.500M380 58l9-2M380 60.500l9 1.500" stroke="#d9cfc2" strokeWidth="0.6" strokeLinecap="round" />
      <ellipse cx="362" cy="80" rx="4.500" ry="6" fill="#fbf6ee" stroke="#efe8dc" strokeWidth="0.6" transform="rotate(20 362 80)" /><Egg x={356} y={84} s={0.85} color="#c9b3f0" kind="zigzag" rot={-14} />
      {/* a basket of eggs */}
      <path d="M408 86a17 17 0 0 1 34 0" fill="none" stroke="#b8894f" strokeWidth="2.400" />
      <Egg x={416} y={84} s={0.8} color="#f7b6cf" kind="bands" rot={-10} /><Egg x={425} y={81} s={0.85} color="#a9d3f5" kind="dots" /><Egg x={434} y={84} s={0.8} color="#f9e08a" mark="#f2a65a" kind="zigzag" rot={10} />
      <path d="M406 86h38l-4 16h-30z" fill="#cfa063" /><path d="M407 90h36M408.500 95h33M410 99.500h30" stroke="#a97a3f" strokeWidth="1" /><path d="M413 86l3 16M421 86l1.500 16M429 86l-1.500 16M437 86l-3 16" stroke="#a97a3f" strokeWidth="0.8" opacity="0.7" />
      {/* eggs in the grass, flowers, a butterfly */}
      <Egg x={228} y={96} s={0.9} color="#f9e08a" mark="#f2a65a" kind="bands" rot={8} /><Egg x={282} y={94} s={1.050} color="#f7b6cf" kind="dots" rot={-12} /><Egg x={120} y={98} s={0.8} color="#a9d3f5" kind="zigzag" /><Egg x={462} y={98} s={0.75} color="#c9b3f0" kind="bands" rot={14} />
      <Tulip x={250} y={78} s={0.8} color="#f49ac1" /><Tulip x={304} y={76} s={0.9} color="#f6c945" /><Tulip x={148} y={82} s={0.7} color="#b98be0" /><Tulip x={318} y={84} s={0.7} color="#f49ac1" />
      {[[204, 100], [264, 104], [336, 102], [96, 104], [448, 108]].map(([x, y]) => <g key={x}>{[0, 60, 120, 180, 240, 300].map(a => <ellipse key={a} cx={x} cy={y - 3} rx="1.300" ry="2.600" fill="#fff" transform={`rotate(${a} ${x} ${y})`} />)}<circle cx={x} cy={y} r="1.500" fill="#f6c945" /></g>)}
      <g transform="translate(300 44)"><g className="qp-s-flap"><path d="M0 0C-8 -9 -13 -4 -9 1-13 5 -7 9 0 2 7 9 13 5 9 1 13 -4 8 -9 0 0z" fill="#f49ac1" /><path d="M0 0C-4 -4 -7 -2 -5 .5M0 0C4 -4 7 -2 5 .5" fill="none" stroke="#fff" strokeWidth="1" /></g><path d="M0 -3v7" stroke="#6b4a5a" strokeWidth="1.100" strokeLinecap="round" /></g>
      {range(34).map(i => <path key={i} d={`M${i * 14.500} 112l2.500-7 2.500 5 3-8 2.500 6 2.500-4.500 2 8.500z`} fill={i % 2 ? '#8fcf9c' : '#7cc48b'} />)}
    </>
  ),

  labour: (u) => (
    <>
      <defs>
        <linearGradient id={`${u}sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#dbe8f7" /><stop offset="1" stopColor="#f6f1e6" /></linearGradient>
        <linearGradient id={`${u}hat`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffd84d" /><stop offset="1" stopColor="#f0b414" /></linearGradient>
      </defs>
      <rect width="480" height="112" fill={`url(#${u}sky)`} />
      <circle cx="56" cy="30" r="13" fill="#ffe08a" /><Cloud x={96} y={14} s={0.9} /><Cloud x={300} y={8} s={0.8} />
      <path d="M0 96h20V64h22v32h14V50h26v46h12V72h20v24h16V58h18v38h340v16H0z" fill="#c5d1e2" opacity="0.8" />
      {[[26, 70], [34, 70], [26, 80], [34, 80], [62, 58], [72, 58], [62, 70], [72, 70], [62, 82], [100, 78], [108, 78], [136, 64], [136, 76], [144, 64]].map(([x, y]) => <rect key={`${x}${y}`} x={x} y={y} width="4" height="5" fill="#eaf1f9" />)}
      {/* a building going up */}
      <g stroke="#6f7f95" strokeWidth="1.600" fill="none"><path d="M236 100V40M260 100V40M284 100V40M308 100V52M236 40h48M236 55h72M236 70h72M236 85h72" /><path d="M236 55l24-15M260 70l24-15M284 85l24-15M236 85l24-15" strokeWidth="0.8" opacity="0.7" /></g>
      <path d="M236 70h48v15h-48zM260 85h48v15h-48z" fill="#9fb2cc" opacity="0.5" />
      {/* tower crane */}
      <g stroke="#f08a24" strokeWidth="1.600" fill="none" strokeLinecap="round">
        <path d="M196 100V14M204 100V14" /><path d="M196 92l8-8-8-8 8-8-8-8 8-8-8-8 8-8-8-8 8-8-8-8" strokeWidth="0.9" />
        <path d="M172 20h122M172 14h122M200 14V4l94 10M200 4L172 14" /><path d="M210 14l8 6 8-6 8 6 8-6 8 6 8-6 8 6 8-6 8 6 8-6" strokeWidth="0.8" />
      </g>
      <rect x="170" y="14" width="14" height="10" fill="#7d8794" /><rect x="194" y="20" width="12" height="9" rx="1" fill="#f6c945" stroke="#f08a24" strokeWidth="1" />
      <g className="qp-s-sway" style={{ animationDuration: '6s' }}><path d="M272 20v30" stroke="#5b6470" strokeWidth="0.9" /><path d="M272 50l-12 6M272 50l12 6" stroke="#5b6470" strokeWidth="0.8" /><rect x="256" y="55" width="32" height="5" rx="1" fill="#6f7f95" /></g>
      <path d="M0 100h480v12H0z" fill="#d9cdb8" /><path d="M0 100h480" stroke="#bfb199" strokeWidth="1" />
      <path d="M146 100l5-17h6l5 17z" fill="#f08a24" /><path d="M149.500 91h9M148 95.500h12" stroke="#fff" strokeWidth="2" /><rect x="142" y="99" width="24" height="3.500" rx="1" fill="#d9701c" />
      {/* cogs, tools, the plans and the hat */}
      <g className="qp-s-spin"><g transform="translate(440 42)">{range(10).map(i => <rect key={i} x="-3" y="-21" width="6" height="8" rx="1.500" fill="#3d5a8a" transform={`rotate(${i * 36})`} />)}<circle r="15" fill="#3d5a8a" /><circle r="6.500" fill="#dbe8f7" /><circle r="10.500" fill="none" stroke="#5574a8" strokeWidth="1.500" /></g></g>
      <g className="qp-s-spin" style={{ animationDirection: 'reverse', animationDuration: '9s' }}><g transform="translate(408 26)">{range(8).map(i => <rect key={i} x="-2.200" y="-13" width="4.400" height="5.500" rx="1" fill="#f08a24" transform={`rotate(${i * 45})`} />)}<circle r="9" fill="#f08a24" /><circle r="3.800" fill="#dbe8f7" /></g></g>
      <g transform="translate(330 86) rotate(-12)"><rect x="-22" y="-7" width="44" height="14" rx="7" fill="#eaf2fb" stroke="#9fb2cc" strokeWidth="1" /><ellipse cx="-22" cy="0" rx="3.500" ry="7" fill="#c9d8ec" stroke="#9fb2cc" strokeWidth="1" /><path d="M-12 -2h24M-12 2h16" stroke="#7fa0c9" strokeWidth="0.9" /><path d="M2 -7v14" stroke="#d6362f" strokeWidth="1.600" /></g>
      <g transform="translate(446 88) rotate(38)"><path d="M-3 -24h6v34a3 3 0 0 1-6 0z" fill="#9aa7b5" /><path d="M-8 -30a8 8 0 0 1 5-7v7h6v-7a8 8 0 0 1 5 7 8 8 0 0 1-16 0z" fill="#b5c0cc" /></g>
      <ellipse cx="388" cy="103" rx="34" ry="3.500" fill="#bfb199" />
      <path d="M358 94a30 30 0 0 1 60 0z" fill={`url(#${u}hat)`} /><path d="M382 65a30 30 0 0 1 12 0v29h-12z" fill="#ffe680" /><path d="M366 80a24 24 0 0 1 10-12" fill="none" stroke="#fff" strokeWidth="2.400" strokeLinecap="round" opacity="0.6" />
      <rect x="350" y="92" width="76" height="9" rx="4.500" fill="#e0a511" /><rect x="350" y="92" width="76" height="3.500" rx="1.700" fill="#f6c93a" />
    </>
  ),

  environment: (u) => (
    <>
      <defs>
        <linearGradient id={`${u}sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d3ecfb" /><stop offset="1" stopColor="#f2faee" /></linearGradient>
        <radialGradient id={`${u}sea`} cx="0.35" cy="0.3"><stop offset="0" stopColor="#7cc0f2" /><stop offset="1" stopColor="#3b8fd9" /></radialGradient>
      </defs>
      <rect width="480" height="112" fill={`url(#${u}sky)`} />
      <g className="qp-s-spin" style={{ animationDuration: '40s' }}><g transform="translate(60 28)">{range(12).map(i => <path key={i} d="M0 -17v-7" stroke="#f6c445" strokeWidth="2" strokeLinecap="round" transform={`rotate(${i * 30})`} />)}</g></g>
      <circle cx="60" cy="28" r="12" fill="#ffd95a" /><Cloud x={120} y={10} s={1} /><Cloud x={250} y={20} s={0.75} /><Cloud x={330} y={6} s={0.6} />
      <path d="M150 34q4-4 8 0 4-4 8 0M196 22q3-3 6 0 3-3 6 0" fill="none" stroke="#5b6f86" strokeWidth="1" strokeLinecap="round" />
      <path d="M0 78Q80 50 170 70T340 60 480 72V112H0z" fill="#b9e3ae" /><path d="M0 92Q110 70 240 88T480 82V112H0z" fill="#8fd18a" />
      <path d="M150 112Q190 92 250 96T330 84" fill="none" stroke="#7cc0f2" strokeWidth="7" strokeLinecap="round" opacity="0.9" /><path d="M150 112Q190 92 250 96T330 84" fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="6 9" opacity="0.6" />
      {/* wind turbines */}
      {[[118, 74, 1, 0], [168, 66, 0.8, -1.500], [34, 86, 0.65, -3]].map(([x, y, s, d]) => (
        <g key={x} transform={`translate(${x} ${y}) scale(${s})`}>
          <path d="M-1.300 0L-.7 -36h1.400L1.300 0z" fill="#f4f6f8" stroke="#c9d2dc" strokeWidth="0.5" />
          <g transform="translate(0 -36)"><g className="qp-s-spin" style={{ animationDuration: '5s', animationDelay: `${d}s` }}>{[0, 120, 240].map(a => <path key={a} d="M0 0C3 -6 2 -16 0 -22-2 -16 -3 -6 0 0z" fill="#fff" stroke="#c9d2dc" strokeWidth="0.5" transform={`rotate(${a})`} />)}</g><circle r="1.700" fill="#aeb9c5" /></g>
        </g>
      ))}
      {/* trees */}
      {[[250, 80, 1, '#3fa34d'], [276, 84, 0.8, '#62b96a'], [226, 86, 0.7, '#4fae5c']].map(([x, y, s, c]) => (
        <g key={x} transform={`translate(${x} ${y}) scale(${s})`}><rect x="-1.800" y="-4" width="3.600" height="14" rx="1" fill="#8a5a3b" /><circle cy="-13" r="12" fill={c} /><circle cx="-7" cy="-7" r="8" fill={c} /><circle cx="7" cy="-7" r="8" fill={c} /><circle cx="-4" cy="-17" r="4" fill="#fff" opacity="0.18" /></g>
      ))}
      {/* the Earth, cradled in leaves */}
      <ellipse cx="398" cy="104" rx="34" ry="3.500" fill="#6fba73" />
      <g className="qp-s-sway-base"><path d="M398 100C372 100 356 84 354 58c20 2 36 14 44 42z" fill="#3fa34d" /><path d="M398 100C386 84 372 70 358 62" fill="none" stroke="#2c7d39" strokeWidth="1.200" /></g>
      <g className="qp-s-sway-base" style={{ animationDelay: '1s' }}><path d="M398 100c26 0 42-16 44-42-20 2-36 14-44 42z" fill="#62b96a" /><path d="M398 100c12-16 26-30 40-38" fill="none" stroke="#3f8f4a" strokeWidth="1.200" /></g>
      <circle cx="398" cy="52" r="31" fill={`url(#${u}sea)`} />
      <path d="M378 34c8-5 17-3 18 4 1 6-8 6-9 13-1 7-8 5-10-3-1-6-2-10 1-14zM404 48c8-3 17 1 17 10s-8 17-15 17-5-8-8-13 0-12 6-14zM400 23c7-3 14-1 18 3-6 3-13 3-18-3zM372 62c4 0 8 4 7 9-4 1-8-3-7-9z" fill="#5fb96a" />
      <path d="M376 36a26 26 0 0 1 20-11" fill="none" stroke="#fff" strokeWidth="2.400" strokeLinecap="round" opacity="0.45" /><ellipse cx="412" cy="36" rx="9" ry="3" fill="#fff" opacity="0.5" /><ellipse cx="384" cy="70" rx="8" ry="2.600" fill="#fff" opacity="0.45" />
      {[[320, 40, 30], [300, 64, -40], [344, 22, 70], [452, 26, -20]].map(([x, y, r], i) => <g key={x} className="qp-s-bob" style={{ animationDelay: `${i * 0.7}s` }}><path d="M0 8C-5 5 -5 -3 0 -8 5 -3 5 5 0 8z" fill={i % 2 ? '#8fd18a' : '#3fa34d'} transform={`translate(${x} ${y}) rotate(${r})`} /></g>)}
    </>
  ),

  tour: (u) => (
    <>
      <defs>
        <linearGradient id={`${u}sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#cfe6fb" /><stop offset="1" stopColor="#f3f9ff" /></linearGradient>
      </defs>
      <rect width="480" height="112" fill={`url(#${u}sky)`} />
      <circle cx="430" cy="22" r="11" fill="#ffe08a" /><Cloud x={40} y={10} s={0.9} /><Cloud x={250} y={8} s={0.7} />
      <path d="M0 76L50 34l30 24 34-38 44 46 30-22 40 32H0z" fill="#d6e3f3" /><path d="M114 20l-12 13.500 8 3 6-5 8 5 2-4.500zM50 34l-8 7 6 2 4-3 5 3zM188 44l-9 7 6 2 4-3 6 3z" fill="#fff" />
      <path d="M150 80L220 30l40 30 50-42 60 44 40-26 70 46v18H150z" fill="#b9cde6" /><path d="M310 18l-15 12.500 9 3 7-5 9 5 4-5zM220 30l-11 8 7 2 5-3 6 4zM410 36l-10 6.500 7 2.500 5-3 7 4z" fill="#fff" />
      <path d="M0 74Q120 56 240 72T480 66V112H0z" fill="#a9d79a" />
      {/* a village on the hill */}
      <g transform="translate(64 66)"><rect x="-10" y="-8" width="20" height="10" fill="#f3e6d2" /><path d="M-12 -8L0 -17 12 -8z" fill="#c8674a" /><rect x="10" y="-22" width="8" height="24" fill="#f3e6d2" /><path d="M9 -22l5-10 5 10z" fill="#c8674a" /><rect x="12.500" y="-16" width="3" height="5" fill="#8fa9c6" /><rect x="-6" y="-4" width="4" height="6" fill="#8fa9c6" /><rect x="-26" y="-4" width="14" height="6" fill="#f6ecdb" /><path d="M-28 -4l9-6 9 6z" fill="#b9573d" /></g>
      {/* sunflowers */}
      <path d="M0 92Q160 80 300 90T480 86V112H0z" fill="#7dbb62" />
      {range(40).map(i => { const x = 6 + i * 12; const y = 92 + ((i * 7) % 5) + (i % 2 ? 6 : 0); return <g key={i}><path d={`M${x} ${y}v9`} stroke="#4f8f3d" strokeWidth="1" /><circle cx={x} cy={y} r="3.400" fill="#f6c93a" /><circle cx={x} cy={y} r="1.400" fill="#7a4a1e" /></g> })}
      {/* the road and the riders */}
      <path d="M0 86Q140 70 280 82T480 76V88Q360 80 280 94T0 98z" fill="#6b7480" /><path d="M0 92Q140 76 280 88T480 82" fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="9 8" opacity="0.85" />
      <path d="M300 14l180-6" stroke="#8b94a1" strokeWidth="0.8" />{range(9).map(i => <path key={i} d={`M${306 + i * 19} ${13.500 - i * 0.6}h13l-6.500 11z`} fill={['#1f4fa3', '#fff', '#e23b3b'][i % 3]} stroke="#c9d2dc" strokeWidth="0.3" />)}
      <Cyclist x={296} y={78} s={0.85} jersey="#2f9b5c" helmet="#fff" delay={0.4} />
      <Cyclist x={344} y={76} s={0.95} jersey="#fff" dots helmet="#e23b3b" delay={0.8} />
      <Cyclist x={402} y={74} s={1.150} jersey="#f6cf2f" helmet="#1f4fa3" />
    </>
  ),

  ekka: (u) => (
    <>
      <defs>
        <linearGradient id={`${u}sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#cfeaf6" /><stop offset="1" stopColor="#fff4e2" /></linearGradient>
        <linearGradient id={`${u}cone`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#e2b06a" /><stop offset="1" stopColor="#c98f45" /></linearGradient>
      </defs>
      <rect width="480" height="112" fill={`url(#${u}sky)`} />
      <Cloud x={220} y={8} s={0.8} /><Cloud x={30} y={18} s={0.6} />
      <path d="M0 96Q240 86 480 96V112H0z" fill="#bfe3a8" />
      {/* bunting */}
      <path d="M0 6Q120 26 240 8T480 8" fill="none" stroke="#9b8f7a" strokeWidth="0.9" />
      {range(22).map(i => { const x = 8 + i * 21.500; const y = 6 + 10 * Math.sin((x / 240) * Math.PI) * (x < 240 ? 1 : 0.15) + (x >= 240 ? 2 : 0); return <path key={i} d={`M${x} ${y}h12l-6 11z`} fill={['#e8475f', '#1f8aa3', '#f6c445', '#f7a8cf'][i % 4]} /> })}
      {/* the big wheel */}
      <path d="M132 100L150 52l18 48M140 100h20" fill="none" stroke="#7d8794" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <g transform="translate(150 52)">
        <g className="qp-s-spin" style={{ animationDuration: '24s' }}>
          <circle r="40" fill="none" stroke="#1f8aa3" strokeWidth="2.600" /><circle r="33" fill="none" stroke="#7fc0d0" strokeWidth="1" />
          {range(8).map(i => <path key={i} d="M0 0V-40" stroke="#7fc0d0" strokeWidth="1.200" transform={`rotate(${i * 45})`} />)}
          {range(8).map(i => (
            <g key={i} transform={`rotate(${i * 45}) translate(0 -40)`}>
              <g className="qp-s-spin" style={{ animationDuration: '24s', animationDirection: 'reverse' }}>
                <g transform={`rotate(${-i * 45})`}><path d="M-5 0a5 5 0 0 1 10 0z" fill={['#e8475f', '#f6c445', '#f7a8cf', '#9fd4f5'][i % 4]} /><rect x="-5" y="0" width="10" height="6" rx="1.500" fill="#fff" stroke={['#e8475f', '#f6c445', '#f7a8cf', '#9fd4f5'][i % 4]} strokeWidth="1" /></g>
              </g>
            </g>
          ))}
        </g>
        <circle r="5" fill="#1f8aa3" /><circle r="2" fill="#fff" />
      </g>
      {/* a striped tent */}
      <path d="M228 100V70h56v30z" fill="#fff6e6" /><path d="M235 100V70h7v30zM249 100V70h7v30zM263 100V70h7v30zM277 100V70h7v30z" fill="#e8475f" opacity="0.85" />
      <path d="M222 70L256 44l34 26z" fill="#e8475f" /><path d="M239 70l17-26 0 26zM256 44l17 26h-8.500z" fill="#fff6e6" /><path d="M222 70q5.700 6 11.300 0t11.300 0 11.400 0 11.300 0 11.300 0 11.400 0" fill="none" stroke="#c9364b" strokeWidth="1.600" />
      <path d="M256 44V32" stroke="#7d8794" strokeWidth="1" /><path className="qp-s-sway" d="M256 32l10 3-10 3z" fill="#f6c445" /><rect x="250" y="84" width="12" height="16" rx="5" fill="#7a4a2a" />
      {/* balloons */}
      {[[452, 30, '#e8475f', 0], [466, 42, '#f6c445', 0.6], [440, 44, '#9fd4f5', 1.200]].map(([x, y, c, d]) => (
        <g key={x} className="qp-s-bob" style={{ animationDelay: `${d}s` }}><path d={`M${x} ${y + 9}Q${x - 4} ${y + 30} 452 96`} fill="none" stroke="#8b94a1" strokeWidth="0.6" /><ellipse cx={x} cy={y} rx="7.500" ry="9" fill={c} /><ellipse cx={x - 2.500} cy={y - 3} rx="2" ry="3" fill="#fff" opacity="0.5" /><path d={`M${x - 1.500} ${y + 9}h3l-1.500 2.500z`} fill={c} /></g>
      ))}
      {/* fairy floss */}
      <path d="M330 104L336 70" stroke="#e9dcc3" strokeWidth="2.400" strokeLinecap="round" />
      <g className="qp-s-bob" style={{ animationDelay: '0.5s' }}>{[[336, 54, 13], [326, 60, 9], [346, 60, 9.500], [331, 46, 9], [342, 45, 9.500], [336, 64, 9]].map(([x, y, r], i) => <circle key={`${x}${y}`} cx={x} cy={y} r={r} fill={i % 2 ? '#f9bfdc' : '#f7a8cf'} />)}<path d="M328 50q8-6 14 2M326 60q10-4 18 2" fill="none" stroke="#fff" strokeWidth="1.300" strokeLinecap="round" opacity="0.6" /></g>
      {/* the strawberry sundae */}
      <ellipse cx="396" cy="105" rx="20" ry="2.800" fill="#9fcf8a" />
      <path d="M380 60l16 44 16-44z" fill={`url(#${u}cone)`} /><path d="M383 68h26M386.500 77h19M390 86h12M385 62l15 34M393 62l9 26M407 62l-15 34M399 62l-9 26" stroke="#a9742f" strokeWidth="0.7" opacity="0.8" />
      <path d="M376 60q4-22 20-22t20 22q-10 5-20 5t-20-5z" fill="#f7a8cf" /><path d="M380 56q-2-12 16-22-6 10-2 22z" fill="#fbcfe3" opacity="0.8" />
      <path d="M380 44q16-12 32 0-4 8-16 8t-16-8z" fill="#fffaf0" /><path d="M385 34q11-10 22 0-3 6-11 6t-11-6z" fill="#fffaf0" /><path d="M383 44q13-7 26 0M388 34q8-5 16 0" fill="none" stroke="#eadfc8" strokeWidth="0.9" />
      <g transform="translate(396 22)"><path d="M0 12c-6-3-9-8-9-12 0-4 4-5 9-3.500 5-1.500 9 0 9 3.500 0 4-3 9-9 12z" fill="#e8475f" />{[[-4, 1], [0, .5], [4, 1], [-2, 5], [2, 5], [0, 8.500]].map(([a, b]) => <ellipse key={`${a}${b}`} cx={a} cy={b} rx="0.6" ry="0.9" fill="#fde9a6" />)}<path d="M0 -3C-2 -7 -5 -7 -6.500 -5.500c2 .2 3.500 1 4.500 2.300zM0 -3c2-4 5-4 6.500-2.500-2 .2-3.500 1-4.500 2.300zM0 -2.500V-8" fill="#3fa34d" stroke="#3fa34d" strokeWidth="1" strokeLinejoin="round" strokeLinecap="round" /></g>
      <rect x="408" y="26" width="5" height="20" rx="1" fill="#e2b06a" transform="rotate(24 410 36)" />
    </>
  ),

  footy: (u) => (
    <>
      <defs>
        <linearGradient id={`${u}sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#cfe2f6" /><stop offset="1" stopColor="#edf5fc" /></linearGradient>
        <linearGradient id={`${u}cup`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#f8dc7a" /><stop offset="0.5" stopColor="#fff0b3" /><stop offset="1" stopColor="#e2a92c" /></linearGradient>
        <radialGradient id={`${u}lamp`}><stop offset="0" stopColor="#fff7d1" stopOpacity="0.95" /><stop offset="1" stopColor="#fff7d1" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="480" height="112" fill={`url(#${u}sky)`} />
      {/* floodlights */}
      {[[26, 4], [454, 4]].map(([x, y]) => (
        <g key={x}><circle cx={x} cy={y + 5} r="20" fill={`url(#${u}lamp)`} /><path d={`M${x} ${y + 10}V50`} stroke="#7d8794" strokeWidth="2.200" /><rect x={x - 11} y={y} width="22" height="10" rx="2" fill="#566070" />{[-7, -2.300, 2.300, 7].map(d => <g key={d}><circle cx={x + d} cy={y + 3} r="1.300" fill="#fff7d1" /><circle cx={x + d} cy={y + 7} r="1.300" fill="#fff7d1" /></g>)}</g>
      ))}
      {/* the grandstand and the crowd */}
      <path d="M0 40Q240 20 480 40V72H0z" fill="#9aa9bf" /><path d="M0 40Q240 20 480 40v4Q240 24 0 44z" fill="#7c8ca5" /><path d="M0 56Q240 38 480 56v2Q240 40 0 58z" fill="#7c8ca5" opacity="0.7" />
      {range(3).map(row => range(40).map(i => { const x = 8 + i * 11.800 + (row % 2) * 5; const y = 48 - 18 * Math.sin((x / 480) * Math.PI) + row * 8.500 + 6; return <circle key={`${row}${i}`} cx={x} cy={y} r="2.100" fill={['#f1c9a5', '#d9a47c', '#f5d7bd', '#b97f5a'][(i + row) % 4]} /> }))}
      {[[44, 0, '#7b1e3a', '#f2b632'], [96, 1, '#1e3a6e', '#d93a3a'], [150, 2, '#23272e', '#f3f4f6'], [208, 0, '#1f6fb5', '#f6cf2f'], [262, 1, '#1f7a4d', '#f6c945'], [318, 2, '#7b1e3a', '#f2b632'], [372, 0, '#1e3a6e', '#d93a3a'], [428, 1, '#23272e', '#f3f4f6']].map(([x, row, a, b], i) => {
        const y = 48 - 18 * Math.sin((x / 480) * Math.PI) + row * 8.500 - 3
        return (
          <g key={x} transform={`translate(${x} ${y})`}><g className="qp-s-sway-base" style={{ animationDelay: `${i * 0.35}s`, animationDuration: '2.6s' }}>
            <path d="M-8 6v-6M8 6v-6" stroke="#d9a47c" strokeWidth="1.300" strokeLinecap="round" /><rect x="-10" y="-5" width="20" height="5.500" rx="1" fill={a} />{[-7, -1.500, 4].map(d => <rect key={d} x={d} y="-5" width="2.700" height="5.500" fill={b} />)}
          </g></g>
        )
      })}
      {/* the ground */}
      <path d="M0 70h480v42H0z" fill="#3a9f5b" />{range(8).map(i => <rect key={i} x={i * 60} y="70" width="30" height="42" fill="#fff" opacity="0.07" />)}
      <path d="M0 72h480" stroke="#fff" strokeWidth="1.300" opacity="0.9" /><ellipse cx="240" cy="104" rx="46" ry="10" fill="none" stroke="#fff" strokeWidth="1" opacity="0.6" />
      {/* league-style posts, with a kick going over */}
      <g fill="none" strokeLinecap="round"><path d="M92 92V14M132 92V14M92 56h40" stroke="#7c8ca5" strokeWidth="4" /><path d="M92 92V14M132 92V14M92 56h40" stroke="#fbfcfe" strokeWidth="2.500" /></g>
      <rect x="88.500" y="78" width="7" height="14" rx="2.500" fill="#7b1e3a" /><rect x="128.500" y="78" width="7" height="14" rx="2.500" fill="#7b1e3a" />
      <path d="M40 104Q84 8 150 34" fill="none" stroke="#fff" strokeWidth="1.100" strokeDasharray="2 4.500" strokeLinecap="round" opacity="0.9" />
      <g className="qp-s-bob"><BallPale x={112} y={36} s={0.95} rot={-30} /></g>
      {/* rules-style posts, with a ball sailing through the middle */}
      <g fill="none" strokeLinecap="round"><path d="M352 92V10M376 92V10M334 92V34M394 92V34" stroke="#7c8ca5" strokeWidth="3.600" /><path d="M352 92V10M376 92V10M334 92V34M394 92V34" stroke="#fbfcfe" strokeWidth="2.200" /></g>
      {[352, 376, 334, 394].map(x => <rect key={x} x={x - 3} y="80" width="6" height="12" rx="2.300" fill="#1e3a6e" />)}
      <path d="M452 104Q420 4 352 30" fill="none" stroke="#fff" strokeWidth="1.100" strokeDasharray="2 4.500" strokeLinecap="round" opacity="0.9" />
      <g className="qp-s-bob" style={{ animationDelay: '0.8s' }}><BallRed x={364} y={28} s={0.95} rot={24} /></g>
      {/* the cup */}
      <ellipse cx="240" cy="104" rx="20" ry="3" fill="#2c8648" />
      <rect x="226" y="94" width="28" height="9" rx="1.500" fill="#3a2a22" /><rect x="230" y="96.500" width="20" height="3.500" rx="1" fill="#e2a92c" />
      <path d="M237 94h6v-9h-6z" fill="#d49a22" /><path d="M233 85h14l-2-3h-10z" fill="#e2a92c" />
      <path d="M227 54h26c0 16-4 27-13 28-9-1-13-12-13-28z" fill={`url(#${u}cup)`} /><ellipse cx="240" cy="54" rx="13" ry="2.600" fill="#c98b16" />
      <path d="M227 58c-9-2-11 12 2 15M253 58c9-2 11 12-2 15" fill="none" stroke="#e2a92c" strokeWidth="2.300" strokeLinecap="round" /><path d="M232 59c0 9 1.500 15 4 19" fill="none" stroke="#fff" strokeWidth="1.800" strokeLinecap="round" opacity="0.6" />
      <Sparkle x={258} y={50} s={0.8} fill="#fff" /><Sparkle x={222} y={64} s={0.55} fill="#fff" delay={0.9} /><Sparkle x={246} y={44} s={0.5} delay={1.500} />
      {[[190, 26, '#7b1e3a'], [204, 40, '#f2b632'], [280, 30, '#1e3a6e'], [296, 44, '#d93a3a'], [218, 18, '#1f6fb5'], [266, 16, '#f6cf2f'], [176, 44, '#f3f4f6'], [306, 24, '#1f7a4d']].map(([x, y, c], i) => <rect key={`${x}${y}`} className="qp-s-twinkle" style={{ animationDelay: `${i * 0.3}s` }} x={x} y={y} width="5" height="2.200" rx="0.6" fill={c} transform={`rotate(${i * 41} ${x} ${y})`} />)}
    </>
  ),

  halloween: (u) => (
    <>
      <defs>
        <linearGradient id={`${u}sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1a1233" /><stop offset="0.75" stopColor="#3a2259" /><stop offset="1" stopColor="#59306a" /></linearGradient>
        <radialGradient id={`${u}moon`}><stop offset="0.6" stopColor="#ffe9a8" stopOpacity="0.5" /><stop offset="1" stopColor="#ffe9a8" stopOpacity="0" /></radialGradient>
        <radialGradient id={`${u}glow`}><stop offset="0" stopColor="#ffb347" stopOpacity="0.55" /><stop offset="1" stopColor="#ffb347" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="480" height="112" fill={`url(#${u}sky)`} />
      {[[30, 14], [70, 34], [120, 10], [170, 28], [300, 12], [330, 40], [450, 14], [468, 50], [230, 8]].map(([x, y], i) => <circle key={`${x}${y}`} className="qp-s-twinkle" style={{ animationDelay: `${(i % 4) * 0.6}s` }} cx={x} cy={y} r={0.7 + (i % 2) * 0.4} fill="#fff" opacity="0.75" />)}
      <circle cx="388" cy="36" r="42" fill={`url(#${u}moon)`} /><circle cx="388" cy="36" r="25" fill="#ffe9a8" /><circle cx="380" cy="28" r="4.500" fill="#f2d98a" /><circle cx="397" cy="44" r="3" fill="#f2d98a" /><circle cx="395" cy="26" r="2" fill="#f2d98a" />
      <path d="M330 30q14-8 30-2 10-8 24 0-14-2-24 6-14-8-30-4z" fill="#3a2259" opacity="0.55" />
      {/* a cobweb in the corner, and its owner */}
      <g stroke="#b7a6d9" strokeWidth="0.7" fill="none" opacity="0.7"><path d="M0 0L52 0M0 0L46 22M0 0L26 44M0 0L0 50" /><path d="M16 0Q17 6 14 7.500 9 13 5 14 2 16 0 16M32 0Q33 12 28 14 18 24 11 26 4 30 0 31M46 0Q47 17 40 19.500 26 34 16 38 6 43 0 44" /></g>
      <g className="qp-s-bob" style={{ animationDuration: '4.5s' }}><path d="M40 20v20" stroke="#b7a6d9" strokeWidth="0.6" /><circle cx="40" cy="43" r="3.200" fill="#120a24" /><circle cx="40" cy="39.500" r="1.800" fill="#120a24" /><path d="M37 42l-5-3M37 44l-5 0M37.500 46l-4 3M43 42l5-3M43 44l5 0M42.500 46l4 3" stroke="#120a24" strokeWidth="0.8" strokeLinecap="round" /><circle cx="39.300" cy="39.300" r="0.5" fill="#ff8a3a" /><circle cx="40.800" cy="39.300" r="0.5" fill="#ff8a3a" /></g>
      {/* the hill, the house, the tree */}
      <path d="M0 96Q90 66 190 82T360 84 480 78V112H0z" fill="#1c1233" />
      <g transform="translate(206 80)">
        <path d="M-22 4V-22l11-11 11 11V4zM0 4V-34l9-12 9 12V4zM18 4V-18l8-7 8 7V4z" fill="#120a24" /><path d="M7 -46l2-9 2 9z" fill="#120a24" /><path d="M-26 -22l15-15 15 15zM-4 -34l13-17 13 17zM15 -18l11-10 11 10z" fill="#0c0619" />
        {[[-15, -18, 0], [-15, -6, 1.100], [6, -30, 0.5], [6, -16, 1.600], [23, -12, 0.8]].map(([x, y, d]) => <rect key={`${x}${y}`} className="qp-s-flicker" style={{ animationDelay: `${d}s` }} x={x} y={y} width="6" height="8" rx="3" fill="#ffc45e" />)}
        <rect x="-8" y="-6" width="7" height="10" rx="3.500" fill="#2a1a45" />
      </g>
      <g stroke="#120a24" strokeLinecap="round" fill="none"><path d="M120 90Q118 66 124 46" strokeWidth="4" /><path d="M123 62q-12-6-16-18M124 54q12-6 14-20M122 70q10 0 18-8M108 46l-6-6M106 50l-8 2M138 36l6-8M136 40l10 0M140 62l8-2" strokeWidth="1.800" /></g>
      {[[156, 92], [172, 96]].map(([x, y]) => <g key={x}><path d={`M${x - 6} ${y}v-9a6 6 0 0 1 12 0v9z`} fill="#4a3a6b" /><path d={`M${x - 2.500} ${y - 8}h5M${x} ${y - 10.500}v6`} stroke="#2a1a45" strokeWidth="1" /></g>)}
      {/* ghosts and bats */}
      <Ghost x={78} y={62} s={1.400} /><Ghost x={286} y={58} s={1} delay={1.200} />
      <Bat x={250} y={22} s={1.200} /><Bat x={318} y={62} s={0.9} fill="#8f7cc4" delay={0.2} /><Bat x={150} y={24} s={0.8} fill="#8f7cc4" delay={0.35} /><Bat x={440} y={70} s={0.7} delay={0.15} />
      {/* pumpkins */}
      <circle cx="398" cy="88" r="40" fill={`url(#${u}glow)`} />
      <ellipse cx="398" cy="105" rx="60" ry="3.500" fill="#120a24" opacity="0.6" />
      <Pumpkin x={352} y={94} s={0.95} face="ooh" /><Pumpkin x={446} y={92} s={1.100} face="smile" /><Pumpkin x={398} y={84} s={1.900} face="grin" />
      <path d="M318 106l5-12 5 12zM322.500 98h1" fill="#f6c945" /><path d="M318 106l1.700-4h6.600l1.700 4z" fill="#f08a24" /><path d="M321.200 98.500l1.800-4.500 1.800 4.500z" fill="#fff" />
    </>
  ),

  remembrance: (u) => (
    <>
      <defs>
        <linearGradient id={`${u}sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#dfe7ec" /><stop offset="0.7" stopColor="#f5ecdc" /><stop offset="1" stopColor="#f7e6c9" /></linearGradient>
        <radialGradient id={`${u}sun`}><stop offset="0" stopColor="#fff4d6" stopOpacity="0.95" /><stop offset="1" stopColor="#fff4d6" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="480" height="112" fill={`url(#${u}sky)`} />
      <circle cx="170" cy="76" r="60" fill={`url(#${u}sun)`} /><circle cx="170" cy="78" r="14" fill="#fff6dd" />
      <path d="M0 76Q100 60 210 72T400 64 480 70V112H0z" fill="#cdd5c4" /><path d="M0 86Q130 70 260 82T480 78V112H0z" fill="#b4c2a8" />
      {/* a plain memorial on the rise */}
      <path d="M96 78l3-34h6l3 34z" fill="#9aa39a" /><path d="M99 44l3-6 3 6z" fill="#8b948b" /><rect x="90" y="78" width="24" height="4" fill="#8b948b" /><rect x="86" y="82" width="32" height="3" fill="#7d867d" />
      <path d="M0 96Q150 84 300 92T480 88V112H0z" fill="#8fa581" />
      {/* poppies, from far to near */}
      {[[40, 92, 0.3], [70, 96, 0.34], [128, 94, 0.3], [160, 98, 0.36], [196, 92, 0.3], [236, 96, 0.36], [20, 100, 0.36], [108, 100, 0.34]].map(([x, y, s]) => <g key={x}><path d={`M${x} ${y}v8`} stroke="#5f7d55" strokeWidth="0.8" /><Poppy x={x} y={y} s={s} /></g>)}
      {[[268, 84, 0.62, 26, 0], [300, 90, 0.5, 20, 0.7], [334, 72, 0.9, 38, 1.300], [372, 82, 0.7, 28, 0.4], [404, 60, 1.250, 50, 1], [444, 74, 1, 36, 1.700], [468, 90, 0.6, 20, 0.2], [352, 96, 0.5, 14, 2]].map(([x, y, s, h, d]) => (
        <g key={x} className="qp-s-sway-base" style={{ animationDelay: `${d}s`, animationDuration: '6s' }}>
          <path d={`M${x} ${y}Q${x - 3} ${y + h / 2} ${x + 1} ${y + h}`} fill="none" stroke="#4f7a4a" strokeWidth={1 + s} strokeLinecap="round" /><Poppy x={x} y={y} s={s} />
        </g>
      ))}
      <g className="qp-s-sway-base" style={{ animationDelay: '0.8s', animationDuration: '6s' }}><path d="M426 112Q424 96 430 86" fill="none" stroke="#4f7a4a" strokeWidth="1.600" strokeLinecap="round" /><ellipse cx="431" cy="82" rx="3.200" ry="5" fill="#5f8a5a" /><path d="M431 78v8" stroke="#c8102e" strokeWidth="1" /></g>
      <path d="M392 112q-10-14-22-13 6 12 22 13zM418 112q12-12 22-10-6 9-22 10zM330 112q-8-10-17-9 4 8 17 9z" fill="#5f8a5a" />
      {range(30).map(i => <path key={i} d={`M${i * 16.500} 112l2-7 2.500 4.500 2.500-8 2.500 6 2-3.500 2.500 8z`} fill={i % 2 ? '#7d9870' : '#6f8c63'} />)}
    </>
  ),
}

export function SeasonScene({ seasonId, year, className, style }) {
  const u = uid(useId())
  const draw = SCENES[seasonId]
  if (!draw) return null
  return (
    <svg aria-hidden="true" viewBox="0 0 480 112" preserveAspectRatio="xMaxYMid slice" className={className} style={style}>
      {draw(u, year)}
    </svg>
  )
}

// ------------------------------------------------------------------
// The garlands. Each is one tile, 30 high, repeated across the page.
// ------------------------------------------------------------------
const rope = (w, dip) => `M0 4Q${w / 2} ${4 + dip * 2} ${w} 4`
const pennant = (x, y, a, b) => (
  <g key={x} transform={`translate(${x} ${y})`}>
    <path d="M0 0h16l-8 17z" fill={a} />{b && <path d="M3.300 0h3.200l-1.300 11.500zM9.500 0h3.200L10.800 11.500z" fill={b} />}
  </g>
)
const bulb = (x, y, c, i) => (
  <g key={x} className="qp-s-twinkle" style={{ animationDelay: `${(i % 4) * 0.5}s` }}>
    <rect x={x - 1.300} y={y - 3} width="2.600" height="2.600" rx="0.5" fill="#5b6470" /><ellipse cx={x} cy={y + 2.600} rx="2.900" ry="3.900" fill={c} /><ellipse cx={x - 0.9} cy={y + 1.300} rx="0.8" ry="1.300" fill="#fff" opacity="0.6" />
  </g>
)
const GARLANDS = {
  christmas: { w: 120, tile: (
    <>
      <path d={rope(120, 8)} fill="none" stroke="#145c39" strokeWidth="7" strokeLinecap="round" />
      <path d={rope(120, 8)} fill="none" stroke="#2a9460" strokeWidth="7" strokeDasharray="2 3" />
      <path d={rope(120, 8)} fill="none" stroke="#57b784" strokeWidth="3" strokeDasharray="1 4" />
      <path d="M0 6Q60 28 120 6" fill="none" stroke="#f0c75e" strokeWidth="1.300" strokeDasharray="4 3" strokeLinecap="round" />
      {[[30, 14, '#d6362f'], [60, 18, '#f0b840'], [90, 14, '#d6362f']].map(([x, y, c]) => (
        <g key={x}><path d={`M${x} ${y - 5}v3`} stroke="#b8862b" strokeWidth="0.8" /><rect x={x - 1.500} y={y - 2.500} width="3" height="2.400" rx="0.6" fill="#d9a521" /><circle cx={x} cy={y + 4} r="4.600" fill={c} /><circle cx={x - 1.500} cy={y + 2.500} r="1.200" fill="#fff" opacity="0.6" /></g>
      ))}
      <g transform="translate(0 4)"><path d="M0 0C-4 -6 -10 -5 -10 -1s6 4 10 1zM0 0C4 -6 10 -5 10 -1s-6 4-10 1zM-1 0l-4 9 3.500-1.500L0 10l1.500-2.500L5 9 1 0z" fill="#d6362f" /><circle r="2.200" fill="#b92a26" /></g>
      <g transform="translate(120 4)"><path d="M0 0C-4 -6 -10 -5 -10 -1s6 4 10 1zM0 0C4 -6 10 -5 10 -1s-6 4-10 1zM-1 0l-4 9 3.500-1.500L0 10l1.500-2.500L5 9 1 0z" fill="#d6362f" /><circle r="2.200" fill="#b92a26" /></g>
      {[[15, 9], [45, 14], [75, 14], [105, 9]].map(([x, y], i) => <circle key={x} className="qp-s-twinkle" style={{ animationDelay: `${i * 0.5}s` }} cx={x} cy={y} r="1.600" fill="#ffe9a0" />)}
    </>
  ) },
  newyear: { w: 132, tile: (
    <>
      <path d={rope(132, 5)} fill="none" stroke="#6f6aa8" strokeWidth="0.9" />
      {[[16, 8, '#f2c94c'], [50, 12, '#f472b6'], [82, 12, '#67e8f9'], [116, 8, '#a78bfa']].map(([x, y, c], i) => bulb(x, y, c, i))}
      <Star5 x={66} y={22} s={0.5} fill="#f2c94c" /><Sparkle x={33} y={22} s={0.6} fill="#f7e3a1" /><Sparkle x={100} y={23} s={0.5} fill="#fff" delay={1} />
      <path d="M0 16q4 4 0 8t0 6M132 16q4 4 0 8t0 6" fill="none" stroke="#f472b6" strokeWidth="1.200" strokeLinecap="round" opacity="0.8" />
    </>
  ) },
  superbowl: { w: 200, tile: (
    <>
      <rect x="0" y="6" width="200" height="18" rx="2" fill="#3a9f5b" /><rect x="0" y="6" width="100" height="18" fill="#fff" opacity="0.06" />
      <path d="M0 7.500h200M0 22.500h200" stroke="#fff" strokeWidth="1" opacity="0.9" />
      {range(11).map(i => <path key={i} d={`M${i * 20} 7.500v15`} stroke="#fff" strokeWidth={i % 5 === 0 ? 1.300 : 0.7} opacity="0.9" />)}
      {range(40).map(i => <path key={i} d={`M${i * 5 + 2.500} 9v1.800M${i * 5 + 2.500} 19.200v1.800`} stroke="#fff" strokeWidth="0.5" opacity="0.8" />)}
      {[[40, '2 0'], [80, '4 0'], [140, '4 0'], [180, '2 0']].map(([x, t]) => <text key={x} x={x} y="18.200" textAnchor="middle" fontSize="7.500" fontWeight="700" fill="#fff" opacity="0.92" fontFamily="inherit">{t}</text>)}
      <BallBrown x={110} y={15} s={0.62} rot={-18} />
    </>
  ) },
  lunar: { w: 132, tile: (
    <>
      <path d={rope(132, 4)} fill="none" stroke="#b8862b" strokeWidth="1" />
      <Lantern x={33} y={3} s={0.72} /><Lantern x={99} y={3} s={0.72} />
      {[0, 66, 132].map(x => (
        <g key={x} transform={`translate(${x} ${x === 66 ? 9 : 5})`}><path d="M0 -4v3" stroke="#b8862b" strokeWidth="0.8" /><path d="M0 -1l4.500 4.500L0 8l-4.500-4.500z" fill="#d6362f" /><path d="M0 1.200l2.300 2.300L0 5.800l-2.300-2.300z" fill="#f0b840" /><path d="M0 8v3M-1.300 9v4M1.300 9v4" stroke="#f0b840" strokeWidth="0.8" strokeLinecap="round" /></g>
      ))}
    </>
  ) },
  womens: { w: 132, tile: (
    <>
      <path d="M0 11Q33 3 66 11T132 11" fill="none" stroke="#c2357a" strokeWidth="4.500" strokeLinecap="round" opacity="0.3" transform="translate(0 2)" />
      <path d="M0 11Q33 3 66 11T132 11" fill="none" stroke="#f08ab8" strokeWidth="4.500" strokeLinecap="round" /><path d="M0 9.800Q33 1.800 66 9.800T132 9.800" fill="none" stroke="#fff" strokeWidth="0.9" opacity="0.6" />
      <Bow x={66} y={12} s={0.85} /><Bow x={0} y={12} s={0.6} a="#b98be0" b="#8e5bd0" c="#dcc7f5" /><Bow x={132} y={12} s={0.6} a="#b98be0" b="#8e5bd0" c="#dcc7f5" />
      <Heart x={33} y={20} s={0.42} fill="#f49ac1" /><Heart x={99} y={20} s={0.42} fill="#c9a4ee" />
    </>
  ) },
  easter: { w: 176, tile: (
    <>
      <Egg x={22} y={16} s={0.95} color="#f7b6cf" kind="zigzag" rot={-8} /><Egg x={66} y={17} s={0.85} color="#a9d3f5" kind="dots" rot={10} />
      <Egg x={110} y={16} s={0.95} color="#f9e08a" mark="#f2a65a" kind="bands" rot={-6} /><Egg x={154} y={17} s={0.85} color="#c9b3f0" kind="zigzag" rot={8} />
      <Tulip x={44} y={12} s={0.55} color="#f49ac1" h={26} /><Tulip x={132} y={12} s={0.55} color="#b98be0" h={26} />
      {[[88, 20], [0, 20], [176, 20]].map(([x, y]) => <g key={x}>{[0, 60, 120, 180, 240, 300].map(a => <ellipse key={a} cx={x} cy={y - 3.200} rx="1.400" ry="2.800" fill="#fff" stroke="#ead9b5" strokeWidth="0.2" transform={`rotate(${a} ${x} ${y})`} />)}<circle cx={x} cy={y} r="1.700" fill="#f6c945" /></g>)}
      {range(16).map(i => <path key={i} d={`M${i * 11} 30l2-6 2 4 2.500-7 2 5 2-3.500 1.500 7.500z`} fill={i % 2 ? '#8fcf9c' : '#7cc48b'} />)}
    </>
  ) },
  labour: { w: 132, tile: (
    <>
      <path d={rope(132, 3)} fill="none" stroke="#8793a6" strokeWidth="1" />
      {[[3, 5, '#3d5a8a'], [25, 7, '#f08a24'], [47, 8, '#f6c93a'], [69, 8, '#3d5a8a'], [91, 7, '#f08a24'], [113, 5, '#f6c93a']].map(([x, y, c]) => pennant(x, y, c))}
      {[[33, 13, '#fff'], [77, 14, '#fff']].map(([x, y, c]) => <g key={x} transform={`translate(${x} ${y})`}>{range(6).map(i => <rect key={i} x="-0.9" y="-4.200" width="1.800" height="2" fill={c} transform={`rotate(${i * 60})`} />)}<circle r="2.700" fill={c} /><circle r="1.100" fill={x === 33 ? '#f08a24' : '#3d5a8a'} /></g>)}
    </>
  ) },
  environment: { w: 144, tile: (
    <>
      <path d="M0 12Q36 2 72 12T144 12" fill="none" stroke="#3f8f4a" strokeWidth="1.800" />
      {[[14, 8, -50, '#3fa34d'], [30, 6, 130, '#8fd18a'], [50, 9, -40, '#62b96a'], [86, 15, 140, '#3fa34d'], [104, 17, -50, '#8fd18a'], [124, 14, 130, '#62b96a']].map(([x, y, r, c]) => (
        <g key={x} transform={`translate(${x} ${y}) rotate(${r})`}><path d="M0 0C-5 -3 -6 -10 0 -15 6 -10 5 -3 0 0z" fill={c} /><path d="M0 -1v-11" stroke="#2c7d39" strokeWidth="0.6" /></g>
      ))}
      {[[68, 12], [140, 11]].map(([x, y]) => <g key={x}>{[0, 72, 144, 216, 288].map(a => <ellipse key={a} cx={x} cy={y - 3.300} rx="2" ry="3" fill="#fff" stroke="#e6e0cf" strokeWidth="0.3" transform={`rotate(${a} ${x} ${y})`} />)}<circle cx={x} cy={y} r="1.700" fill="#f6c445" /></g>)}
      <g transform="translate(36 20)"><ellipse rx="3.600" ry="2.900" fill="#e23b3b" /><path d="M0 -2.900v5.800" stroke="#1d1d1b" strokeWidth="0.6" /><circle cx="-3.800" cy="0" r="1.500" fill="#1d1d1b" /><circle cx="-1" cy="-1" r="0.6" fill="#1d1d1b" /><circle cx="1.500" cy="1" r="0.6" fill="#1d1d1b" /></g>
    </>
  ) },
  tour: { w: 168, tile: (
    <>
      <path d={rope(168, 3)} fill="none" stroke="#8b94a1" strokeWidth="1" />
      {[[10, 6, '#f6cf2f', false], [52, 8, '#2f9b5c', false], [94, 8, '#fff', true], [136, 6, '#f3f4f6', false]].map(([x, y, c, dots], i) => (
        <g key={x} transform={`translate(${x} ${y})`}>
          <path d="M5 0L0 3l2 3.600 2-1V17h14V5.600l2 1L22 3 17 0c-.6 1.500-2.300 2.500-6 2.500S5.600 1.500 5 0z" fill={c} stroke="#c9d2dc" strokeWidth="0.5" />
          {dots && [[7, 6], [14, 5.500], [10.500, 9.500], [6.500, 13], [15, 13]].map(([a, b]) => <circle key={`${a}${b}`} cx={a} cy={b} r="1.300" fill="#e23b3b" />)}
          {i === 3 && <path d="M4 9h14M4 12h14" stroke="#1f4fa3" strokeWidth="1.400" />}
          <rect x="3.500" y="-1.200" width="1.800" height="3" rx="0.6" fill="#c98f45" /><rect x="16.700" y="-1.200" width="1.800" height="3" rx="0.6" fill="#c98f45" />
        </g>
      ))}
    </>
  ) },
  ekka: { w: 132, tile: (
    <>
      <path d={rope(132, 5)} fill="none" stroke="#7d8794" strokeWidth="1" />
      {[[11, 7, '#e8475f'], [33, 11, '#f6c445'], [55, 13, '#9fd4f5'], [77, 13, '#f7a8cf'], [99, 11, '#e8475f'], [121, 7, '#f6c445']].map(([x, y, c], i) => bulb(x, y, c, i))}
      <path d="M0 2h132" stroke="#9b8f7a" strokeWidth="0.8" />
      {[[14, '#1f8aa3'], [58, '#f7a8cf'], [102, '#e8475f']].map(([x, c]) => <path key={x} d={`M${x} 2h14l-7 9z`} fill={c} opacity="0.85" />)}
    </>
  ) },
  footy: { w: 180, tile: (
    <>
      <path d={rope(180, 3)} fill="none" stroke="#8b94a1" strokeWidth="1" />
      {[[2, 5, '#7b1e3a', '#f2b632'], [22, 6.500, '#1e3a6e', '#d93a3a'], [42, 7.500, '#23272e', '#f3f4f6'], [100, 7.500, '#1f6fb5', '#f6cf2f'], [120, 7.500, '#1f7a4d', '#f6c945'], [140, 6.500, '#7b1e3a', '#f3f4f6'], [160, 5, '#1e3a6e', '#f6cf2f']].map(([x, y, a, b]) => pennant(x, y, a, b))}
      <path d="M80 8v4" stroke="#8b94a1" strokeWidth="0.8" /><BallPale x={80} y={18} s={0.62} rot={-20} />
    </>
  ) },
  halloween: { w: 144, tile: (
    <>
      <path d={rope(144, 5)} fill="none" stroke="#6a5a8c" strokeWidth="0.9" />
      {[[18, 9], [72, 13.500], [126, 9]].map(([x, y]) => <g key={x}><path d={`M${x} ${y - 3}v3`} stroke="#6a5a8c" strokeWidth="0.8" /><Pumpkin x={x} y={y + 8} s={0.52} face="grin" /></g>)}
      <Bat x={45} y={18} s={0.8} /><Bat x={99} y={18} s={0.8} fill="#8f7cc4" delay={0.3} />
      <g className="qp-s-bob"><path d="M0 4v8M144 4v8" stroke="#b7a6d9" strokeWidth="0.5" /><circle cx="0" cy="14" r="2.200" fill="#b7a6d9" /><circle cx="144" cy="14" r="2.200" fill="#b7a6d9" /></g>
    </>
  ) },
  remembrance: { w: 180, tile: (
    <>
      <path d="M0 24h180" stroke="#9aa697" strokeWidth="0.9" />
      <path d="M90 24V14" stroke="#4f7a4a" strokeWidth="1.300" /><Poppy x={90} y={12} s={0.6} />
      <path d="M90 24q-7-6-12-4 4 4 12 4z" fill="#5f8a5a" />
      <path d="M30 24v-5M150 24v-5" stroke="#4f7a4a" strokeWidth="1" /><Poppy x={30} y={18} s={0.34} /><Poppy x={150} y={18} s={0.34} />
    </>
  ) },
}

export function SeasonGarland({ seasonId }) {
  const id = uid(useId())
  const g = GARLANDS[seasonId]
  if (!g) return null
  return (
    <svg width="100%" height="30" aria-hidden="true">
      <defs><pattern id={id} width={g.w} height="30" patternUnits="userSpaceOnUse">{g.tile}</pattern></defs>
      <rect width="100%" height="30" fill={`url(#${id})`} />
    </svg>
  )
}
