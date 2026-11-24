// src/seasonStrips.jsx
// The strip across the top of each page on the Seasonal theme. One picture per season, 36 high.
//
// Each one is a single long scene, not a short tile repeated. It is laid out along 2,400 pixels,
// which is wider than almost any screen, so nothing on screen is ever drawn twice. A phone shows
// the left-hand end, so every scene puts something worth seeing in its first 390 pixels.
// (The Super Bowl strip is the one exception: it is one whole field, stretched to fit the screen.)
//
// The scenes are laid out by a fixed sequence of "random" numbers, so they look hand-placed but
// come out the same every time. Every drawing is original and generic: no team, league, event or
// company marks. Footy colours are plain club colours with no names, logos or badges.
import { useId } from 'react'
import { CLUBS } from './seasonClubs'
import { Firework, Sparkle, BallPale, BallRed, BallBrown, Poppy, Egg, Pumpkin, Bat, Ghost, Cyclist, Tulip, Heart, Lantern, Cloud } from './seasonArt'

const H = 36
const W = 2400
const uid = (raw) => `qf${raw.replace(/[^a-zA-Z0-9]/g, '')}`
const n1 = (v) => Math.round(v * 10) / 10

// A fixed sequence of numbers between 0 and 1 for each scene
function seeded(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const between = (r, a, b) => a + r() * (b - a)
const pick = (r, list) => list[Math.floor(r() * list.length)]

// Rolling ground. Each part is [how many rises across the strip, height, where it starts], so
// the right-hand end always meets the left-hand end on a screen wide enough to see both.
const roll = (...parts) => (x) => parts.reduce((s, [k, amp, phase = 0]) => s + amp * Math.sin((2 * Math.PI * k * x) / W + phase), 0)
const ground = (f, base, step = 12) => {
  let d = `M0 ${H}V${n1(base - f(0))}`
  for (let x = step; x <= W; x += step) d += `L${x} ${n1(base - f(x))}`
  return `${d}V${H}z`
}
// Walk along the strip putting things down with uneven gaps. `clear` lists the stretches kept
// free for the main pieces, as [from, to].
function along(r, minGap, maxGap, clear, fn, from = 0) {
  const out = []
  let x = from + between(r, 0, maxGap), i = 0
  while (x < W - 8) {
    if (!clear.some(([a, b]) => x > a && x < b)) { const piece = fn(x, i); if (piece) out.push(piece); i++ }
    x += between(r, minGap, maxGap)
  }
  return out
}
const At = ({ x, y = 0, s = 1, children, ...rest }) => <g transform={`translate(${n1(x)} ${n1(y)})${s === 1 ? '' : ` scale(${s})`}`} {...rest}>{children}</g>

// ------------------------------------------------------------------
// Christmas: a village under snow
// ------------------------------------------------------------------
const Pine = ({ x, y, h, fill = '#1f6b4a', snow = '#fff' }) => {
  const w = h * 0.64
  return (
    <At x={x} y={y}>
      <rect x="-0.9" y="-2.5" width="1.800" height="3.500" fill="#6b4a32" />
      <path fill={fill} d={`M0 ${n1(-h)}L${n1(w * 0.3)} ${n1(-h * 0.62)}H${n1(w * 0.15)}L${n1(w * 0.42)} ${n1(-h * 0.34)}H${n1(w * 0.22)}L${n1(w * 0.52)} -2H${n1(-w * 0.52)}L${n1(-w * 0.22)} ${n1(-h * 0.34)}H${n1(-w * 0.42)}L${n1(-w * 0.15)} ${n1(-h * 0.62)}H${n1(-w * 0.3)}z`} />
      {snow && <path fill={snow} d={`M0 ${n1(-h)}L${n1(w * 0.2)} ${n1(-h * 0.75)}Q${n1(w * 0.1)} ${n1(-h * 0.8)} 0 ${n1(-h * 0.73)}Q${n1(-w * 0.1)} ${n1(-h * 0.8)} ${n1(-w * 0.2)} ${n1(-h * 0.75)}z`} />}
      {snow && <path fill={snow} opacity="0.85" d={`M${n1(-w * 0.34)} ${n1(-h * 0.42)}Q${n1(-w * 0.2)} ${n1(-h * 0.5)} ${n1(-w * 0.05)} ${n1(-h * 0.42)}T${n1(w * 0.3)} ${n1(-h * 0.46)}L${n1(w * 0.42)} ${n1(-h * 0.34)}H${n1(-w * 0.42)}z`} />}
    </At>
  )
}
const Cottage = ({ x, y, w = 15, h = 8, wall = '#f4ead9', roof = '#8e2331', door = '#6b4a32', chimney = true, lit = true }) => {
  const peak = w * 0.44
  return (
    <At x={x} y={y}>
      {chimney && <rect x={n1(w * 0.18)} y={n1(-h - peak * 0.9)} width="2.600" height={n1(peak * 0.8)} fill="#7b5a48" />}
      {chimney && <rect x={n1(w * 0.18 - 0.5)} y={n1(-h - peak * 0.9 - 1)} width="3.600" height="1.400" rx="0.6" fill="#fff" />}
      <rect x={n1(-w / 2)} y={-h} width={w} height={h} fill={wall} />
      <path d={`M${n1(-w / 2 - 2)} ${-h}L0 ${n1(-h - peak)}L${n1(w / 2 + 2)} ${-h}z`} fill={roof} />
      <path d={`M${n1(-w / 2 - 2)} ${-h}L0 ${n1(-h - peak)}L${n1(w / 2 + 2)} ${-h}`} fill="none" stroke="#fff" strokeWidth="1.700" strokeLinejoin="round" strokeLinecap="round" />
      <rect x="-1.400" y="-4.600" width="2.800" height="4.600" rx="0.5" fill={door} />
      {lit && <rect className="qp-s-flicker" x={n1(-w / 2 + 1.6)} y={n1(-h + 2)} width="2.600" height="2.600" rx="0.3" fill="#f6c453" />}
      {lit && <rect x={n1(w / 2 - 4.2)} y={n1(-h + 2)} width="2.600" height="2.600" rx="0.3" fill="#f6c453" />}
    </At>
  )
}
const Chapel = ({ x, y }) => (
  <At x={x} y={y}>
    <rect x="-9" y="-9" width="14" height="9" fill="#f4ead9" /><path d="M-10.500 -9L-2 -15.500 6.500 -9z" fill="#5d6f78" /><path d="M-10.500 -9L-2 -15.500 6.500 -9" fill="none" stroke="#fff" strokeWidth="1.600" strokeLinejoin="round" strokeLinecap="round" />
    <rect x="4" y="-17" width="6" height="17" fill="#eadfcb" /><path d="M3 -17L7 -27 11 -17z" fill="#5d6f78" /><path d="M3 -17L7 -27 11 -17" fill="none" stroke="#fff" strokeWidth="1.300" strokeLinejoin="round" strokeLinecap="round" />
    <path d="M7 -31v4M5.600 -29.600h2.800" stroke="#c9a23a" strokeWidth="0.9" strokeLinecap="round" />
    <path d="M5.800 -9.500v-2.200a1.200 1.200 0 0 1 2.400 0v2.200z" fill="#f6c453" /><path d="M-3.600 0v-4.200a1.600 1.600 0 0 1 3.200 0V0z" fill="#6b4a32" />
    <circle cx="-2" cy="-10.400" r="1.300" fill="#f6c453" />
  </At>
)
const Snowman = ({ x, y, scarf = '#8e2331' }) => (
  <At x={x} y={y}>
    <circle cy="-4.200" r="4.600" fill="#fff" stroke="#c4d6cd" strokeWidth="0.6" /><circle cy="-10.800" r="3.200" fill="#fff" stroke="#c4d6cd" strokeWidth="0.6" />
    <path d="M-3 -8.300h6" stroke={scarf} strokeWidth="1.500" strokeLinecap="round" /><path d="M2 -8.300l1.500 3.600" stroke={scarf} strokeWidth="1.300" strokeLinecap="round" />
    <rect x="-2.300" y="-17" width="4.600" height="3.800" rx="0.5" fill="#2c3238" /><rect x="-3.500" y="-13.700" width="7" height="1.100" rx="0.5" fill="#2c3238" />
    <circle cx="-1.100" cy="-11.400" r="0.450" fill="#2c3238" /><circle cx="1.100" cy="-11.400" r="0.450" fill="#2c3238" /><path d="M0 -10.400l2.800.6L0 -9.600z" fill="#e8873a" />
    <path d="M-4.300 -6l-3.600-2.600M4.300 -6l3.600-2.600" stroke="#6b4a32" strokeWidth="0.7" strokeLinecap="round" />
  </At>
)
const Deer = ({ x, y, s = 1, flip = false, fill = '#7b5a48' }) => (
  <At x={x} y={y}>
    <g transform={`scale(${flip ? -s : s} ${s})`} fill={fill}>
      <path d="M-6 -9.500c2-1.200 6-1.200 8.500 0l2.500-4 1.800.4-.6 4.600c.4 1.800-.3 3-1.700 3.300V0h-1.300v-4.600h-5V0h-1.300v-4.800C-5.300 -5.500-6.300 -7-6 -9.500z" />
      <path d="M5.600 -13.200l-.3-1.600 1.600.8 2.200-.2.9 1.300-1 1.200H6.400z" />
      <path d="M5.800 -14.600c-.6-1.600-.4-3 .6-4.200M5.900 -16.600l-1.600-1M6.700 -14.700c.3-1.600 1.200-2.700 2.600-3.200M7.600 -16.600l1.900.2" fill="none" stroke={fill} strokeWidth="0.7" strokeLinecap="round" />
      <path d="M-6.200 -8.800l-1.300-.9" stroke={fill} strokeWidth="1.100" strokeLinecap="round" />
    </g>
  </At>
)
// A sleigh pulled across the sky. It is a silhouette, so it reads at a glance.
const Sleigh = ({ x, y, fill = '#7a1f2b' }) => (
  <At x={x} y={y}>
    <path d="M-30 1.500c5 0 9-1.500 12-4M-12 -1.500c5 .5 9-1 12-3.500M6 -4.500c5 .5 9-1.200 12-4" fill="none" stroke="#b9975a" strokeWidth="0.5" />
    {[[-4, -3.500], [14, -7.500]].map(([dx, dy]) => (
      <g key={dx} transform={`translate(${dx} ${dy})`} fill={fill}>
        <path d="M-5 0c2-1.600 6-1.800 8.500-.5l2.400-2.600 1.600.6-1 3.300c0 1.300-.8 2.100-2 2.300l2.500 3-1 .8-3.400-3.200h-3.600l-3 3.200-1-.8 2.300-3.300C-6.200 3-6 1-5 0z" />
        <path d="M5.700 -3.200c-.4-1.200 0-2.300.9-3M6.500 -3.200c.5-1 1.300-1.600 2.400-1.700" fill="none" stroke={fill} strokeWidth="0.6" strokeLinecap="round" />
      </g>
    ))}
    <g transform="translate(-36 3)">
      <path d="M-8 -5.500c0 3.400 1.600 5 4.600 5H5c1.500 0 2.300-1 2.300-2.400V-4H1.800c-1.800 0-2.600-.6-3-2.200L-1.600 -8H-6c-1.300 0-2 1-2 2.500z" fill={fill} />
      <path d="M-9.500 1.800H5.500c1.700 0 2.900-.9 3.300-2.400" fill="none" stroke="#c9a23a" strokeWidth="0.8" strokeLinecap="round" />
      <circle cx="-3.800" cy="-9.600" r="1.900" fill={fill} /><path d="M-5.600 -10.400l3.400-.5 1.600-2.600-3.200.8z" fill={fill} /><circle cx="-.5" cy="-13.600" r="0.700" fill="#fff" />
      <path d="M2.500 -4.200c0-2 1.300-3.200 3.200-3.200 1.200 0 1.900.8 1.900 1.900v1.300z" fill="#2f8660" />
    </g>
    {[[-52, 4], [-60, 1.500], [-68, 5], [-47, -1]].map(([dx, dy], i) => <circle key={dx} className="qp-s-twinkle" style={{ animationDelay: `${i * 0.4}s` }} cx={dx} cy={dy} r="0.800" fill="#d9ae45" />)}
  </At>
)
const Gift = ({ x, y, w = 5, h = 4.5, fill = '#8e2331', ribbon = '#e9c15a' }) => (
  <At x={x} y={y}>
    <rect x={n1(-w / 2)} y={-h} width={w} height={h} rx="0.4" fill={fill} /><path d={`M0 ${-h}V0M${n1(-w / 2)} ${n1(-h * 0.55)}H${n1(w / 2)}`} stroke={ribbon} strokeWidth="0.9" />
    <path d={`M0 ${-h}c-1.200-2-3-1.600-2.300-.4zM0 ${-h}c1.200-2 3-1.600 2.300-.4z`} fill={ribbon} />
  </At>
)
function christmas() {
  const r = seeded(1225)
  const far = roll([5, 2.2, 0.6], [11, 1.2, 2]), near = roll([3, 1.6, 1.2], [8, 1.1, 0.3], [17, 0.5, 2.2])
  const snowY = (x) => 31.5 - near(x)
  // the main pieces, left to right. A phone shows the first four.
  const heroes = [
    [58, 'cottages'], [168, 'snowman'], [262, 'sleigh'], [345, 'tree'], [520, 'chapel'], [700, 'deer'], [880, 'cottage-red'], [1060, 'gifts'],
    [1230, 'cottages2'], [1420, 'deer2'], [1600, 'tree2'], [1790, 'cottage-blue'], [1960, 'snowman2'], [2140, 'chapel2'], [2300, 'cottage-last'],
  ]
  const clear = heroes.filter(([, k]) => k !== 'sleigh').map(([x]) => [x - 30, x + 32])
  const greens = ['#1f6b4a', '#2a7a56', '#256f5e']
  return (
    <>
      <path d={ground(far, 27.5)} fill="#d5e6dd" />
      {along(r, 18, 46, clear, (x, i) => <Pine key={`f${i}`} x={x} y={28.5 - far(x)} h={between(r, 9, 15)} fill="#9fc2b2" snow="#eef6f1" />)}
      {along(r, 30, 120, [], (x, i) => <Sparkle key={`s${i}`} x={x} y={between(r, 4, 13)} s={between(r, 0.28, 0.5)} fill="#d9ae45" delay={i % 5 * 0.5} />)}
      <path d={ground(near, 31.5)} fill="#fff" stroke="#c4d6cd" strokeWidth="0.7" />
      {along(r, 22, 64, clear, (x, i) => <Pine key={`n${i}`} x={x} y={snowY(x) + 1} h={between(r, 13, 24)} fill={pick(r, greens)} />)}
      {heroes.map(([x, kind]) => {
        const y = snowY(x) + 0.8
        if (kind === 'sleigh') return <Sleigh key={x} x={x} y={15} />
        return <g key={x} transform={`translate(${x} ${n1(y)}) scale(1.2) translate(${-x} ${n1(-y)})`}>{piece(x, kind, y)}</g>
      })}
    </>
  )
}
function piece(x, kind, y) {
  {
        if (kind === 'cottages') return <g key={x}><Pine x={x - 22} y={y} h={19} /><Cottage x={x - 4} y={y} /><Cottage x={x + 14} y={y} w={12} h={7} wall="#e9dcc6" roof="#2f6f5a" chimney={false} /></g>
        if (kind === 'snowman') return <Snowman key={x} x={x} y={y} />
        if (kind === 'tree') return (
          <g key={x}>
            <Pine x={x} y={y} h={27} fill="#1f6b4a" snow={null} />
            {[[-1.5, -19, '#e9c15a'], [2, -15, '#d94a4a'], [-3.5, -12, '#fff'], [3.5, -9.500, '#e9c15a'], [-5, -6.500, '#d94a4a'], [0.5, -6, '#fff'], [5.5, -4, '#d94a4a'], [-1, -23, '#fff']].map(([dx, dy, c], i) => <circle key={dx} className="qp-s-twinkle" style={{ animationDelay: `${i * 0.3}s` }} cx={x + dx} cy={y + dy} r="1" fill={c} />)}
            <path transform={`translate(${x} ${n1(y - 28.5)}) scale(0.32)`} fill="#e9c15a" d="M0 -10l2.900 6.300 6.900.8-5.100 4.700 1.400 6.800L0 5.200l-6.100 3.400 1.400-6.800-5.100-4.700 6.900-.8z" />
            <Gift x={x - 12} y={y} /><Gift x={x + 12} y={y} w={6} h={3.6} fill="#2f6f5a" /><Gift x={x + 18} y={y} w={3.6} h={5} fill="#e9c15a" ribbon="#8e2331" />
          </g>
        )
        if (kind === 'chapel') return <g key={x}><Chapel x={x} y={y} /><Pine x={x - 20} y={y} h={15} /><Pine x={x + 20} y={y} h={12} fill="#2a7a56" /></g>
        if (kind === 'deer') return <g key={x}><Deer x={x - 7} y={y} s={0.9} /><Deer x={x + 9} y={y} s={0.7} flip fill="#8d6a55" /></g>
        if (kind === 'cottage-red') return <g key={x}><Cottage x={x} y={y} w={17} h={9} wall="#a8323f" roof="#5d6f78" door="#f4ead9" /><Snowman x={x + 17} y={y} scarf="#2f6f5a" /></g>
        if (kind === 'gifts') return <g key={x}><Gift x={x - 8} y={y} w={7} h={6} /><Gift x={x} y={y} w={5} h={4} fill="#2f6f5a" /><Gift x={x + 7} y={y} w={6} h={7.5} fill="#e9c15a" ribbon="#8e2331" /><Gift x={x - 1} y={y - 4} w={4} h={3.4} fill="#f4ead9" ribbon="#8e2331" /></g>
        if (kind === 'cottages2') return <g key={x}><Cottage x={x - 12} y={y} w={13} h={7} roof="#2f6f5a" /><Cottage x={x + 6} y={y} w={18} h={10} wall="#e9dcc6" /><Pine x={x + 22} y={y} h={14} /></g>
        if (kind === 'deer2') return <Deer key={x} x={x} y={y} s={1} flip />
        if (kind === 'tree2') return <g key={x}><Pine x={x} y={y} h={24} /><Pine x={x - 13} y={y} h={15} fill="#2a7a56" /><Deer x={x + 16} y={y} s={0.75} /></g>
        if (kind === 'cottage-blue') return <Cottage key={x} x={x} y={y} w={16} h={8} wall="#f4ead9" roof="#3f5f7a" />
        if (kind === 'snowman2') return <g key={x}><Snowman x={x - 6} y={y} scarf="#2f6f5a" /><Gift x={x + 6} y={y} /></g>
        if (kind === 'chapel2') return <Chapel key={x} x={x} y={y} />
        return <g key={x}><Cottage x={x} y={y} w={14} h={8} roof="#8e2331" /><Pine x={x + 16} y={y} h={17} /></g>
  }
}

// ------------------------------------------------------------------
// New Year: fireworks over the city at midnight
// ------------------------------------------------------------------
function skyline(r, { minW, maxW, minH, maxH, fill, base = H, clear = [], windows = null, tops = true }) {
  const out = []
  let x = -4, i = 0
  while (x < W) {
    const w = Math.round(between(r, minW, maxW)), h = Math.round(between(r, minH, maxH))
    const skip = clear.some(([a, b]) => x + w > a && x < b)
    if (!skip) {
      const kind = tops ? r() : 1
      out.push(
        <g key={`b${i}`}>
          <rect x={x} y={base - h} width={w} height={h} fill={fill} />
          {kind < 0.16 && <path d={`M${x + w / 2} ${base - h}v-${Math.round(between(r, 3, 6))}`} stroke={fill} strokeWidth="0.9" />}
          {kind >= 0.16 && kind < 0.32 && <rect x={x + 2} y={base - h - 2.5} width={w - 4} height="2.500" fill={fill} />}
          {kind >= 0.32 && kind < 0.42 && <path d={`M${x} ${base - h}L${x + w / 2} ${base - h - 4}L${x + w} ${base - h}z`} fill={fill} />}
          {windows && range(Math.floor(w / 3.2) * Math.floor(h / 3.4)).map(k => {
            if (r() > windows.chance) return null
            const cols = Math.floor(w / 3.2), cx = k % cols, cy = Math.floor(k / cols)
            return <rect key={k} className={r() < 0.25 ? 'qp-s-twinkle' : undefined} style={{ animationDelay: `${n1(r() * 3)}s` }} x={n1(x + 1.4 + cx * 3.2)} y={n1(base - h + 1.8 + cy * 3.4)} width="1.300" height="1.600" fill={windows.fill} opacity={n1(between(r, 0.55, 1))} />
          })}
        </g>
      )
    }
    x += w + (r() < 0.2 ? Math.round(between(r, 2, 6)) : 0); i++
  }
  return out
}
const range = (n) => Array.from({ length: n }, (_, i) => i)
function newyear() {
  const r = seeded(101)
  const colours = ['#f2c94c', '#f472b6', '#67e8f9', '#c4b5fd', '#fda4af', '#fde68a']
  const bursts = [[40, 12, 9], [118, 9, 6], [292, 11, 10], [372, 8, 6.5]]
  let x = 470
  while (x < W - 30) { bursts.push([x, between(r, 8, 13), between(r, 5.5, 10.5)]); x += between(r, 62, 150) }
  return (
    <>
      {along(r, 9, 34, [], (sx, i) => <circle key={`st${i}`} cx={n1(sx)} cy={n1(between(r, 2, 20))} r={n1(between(r, 0.35, 0.8))} fill="#fff" opacity={n1(between(r, 0.3, 0.8))} />)}
      {skyline(r, { minW: 12, maxW: 26, minH: 9, maxH: 18, fill: '#262049', clear: [[540, 700]] })}
      {bursts.map(([bx, by, br], i) => (
        <g key={`fw${i}`}>
          <path d={`M${n1(bx)} ${n1(by + br + 3)}V30`} stroke={colours[i % colours.length]} strokeWidth="0.5" strokeDasharray="1 2.200" opacity="0.5" />
          <Firework x={n1(bx)} y={n1(by)} r={n1(br)} color={colours[i % colours.length]} n={br > 8 ? 12 : 9} delay={n1((i * 0.7) % 3)} ring={i % 3 === 0} />
        </g>
      ))}
      {skyline(r, { minW: 9, maxW: 20, minH: 5, maxH: 12, fill: '#3a3270', clear: [[188, 216], [536, 704]], windows: { chance: 0.34, fill: '#f6d77a' } })}
      {/* the clock tower, a minute to midnight */}
      <g>
        <rect x="192" y="13" width="20" height="23" fill="#3a3270" /><rect x="196" y="6" width="12" height="8" fill="#3a3270" /><path d="M195 6L202 -1 209 6z" fill="#3a3270" /><path d="M202 -1v-2.500" stroke="#3a3270" strokeWidth="0.9" />
        <circle cx="202" cy="10" r="3.300" fill="#fdf3cf" /><path d="M202 10V7.600M202 10l-.9-1.800" stroke="#3a3270" strokeWidth="0.6" strokeLinecap="round" />
        {[196, 200.500, 205].map(wx => <rect key={wx} x={wx} y="17" width="2" height="5" rx="1" fill="#f6d77a" opacity="0.8" />)}
        {[196, 200.500, 205].map(wx => <rect key={wx} x={wx} y="25.500" width="2" height="4" fill="#f6d77a" opacity="0.5" />)}
      </g>
      {/* the bridge over the river */}
      <g>
        <rect x="536" y="31.500" width="168" height="4.500" fill="#1d1a3d" />
        <path d="M540 27h160" stroke="#3a3270" strokeWidth="2" />
        <path d="M560 27L590 12 620 20.500 650 12 680 27" fill="none" stroke="#3a3270" strokeWidth="1.400" strokeLinejoin="round" />
        <path d="M590 12V32M650 12V32M560 27V32M680 27V32" stroke="#3a3270" strokeWidth="1.800" />
        <path d="M575 19.500V27M605 16.300V27M620 20.500V27M635 16.300V27M665 19.500V27" stroke="#3a3270" strokeWidth="0.7" />
        {range(15).map(i => <circle key={i} className="qp-s-twinkle" style={{ animationDelay: `${(i % 4) * 0.5}s` }} cx={546 + i * 10.6} cy="25.200" r="0.650" fill="#fde68a" />)}
        {range(9).map(i => <path key={i} d={`M${548 + i * 18} ${33 + (i % 2)}h${6 + (i % 3) * 2}`} stroke={colours[i % colours.length]} strokeWidth="0.6" opacity="0.45" strokeLinecap="round" />)}
      </g>
    </>
  )
}

// ------------------------------------------------------------------
// Super Bowl: one whole field, goal line to goal line, whatever the width of the screen
// ------------------------------------------------------------------
function superbowl(id) {
  const zone = 100 / 12 // each end zone, and every ten yards, is a twelfth of the width
  const yard = (n) => `${n1(zone + (n / 10) * zone)}%`
  return (
    <svg width="100%" height={H} aria-hidden="true">
      <defs>
        <pattern id={`${id}e`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="3" height="7" fill="#fff" opacity="0.16" /></pattern>
      </defs>
      <rect width="100%" height={H} fill="#3d9459" />
      {range(20).map(i => i % 2 === 0 && <rect key={i} x={yard(i * 5)} y="0" width={`${n1(zone / 2)}%`} height={H} fill="#fff" opacity="0.07" />)}
      <rect x="0" y="0" width={`${n1(zone)}%`} height={H} fill="#a8323f" /><rect x="0" y="0" width={`${n1(zone)}%`} height={H} fill={`url(#${id}e)`} />
      <rect x={yard(100)} y="0" width={`${n1(zone)}%`} height={H} fill="#2b4a7f" /><rect x={yard(100)} y="0" width={`${n1(zone)}%`} height={H} fill={`url(#${id}e)`} />
      {range(99).map(i => (i + 1) % 5 !== 0 && <line key={i} x1={`${zone + ((i + 1) / 10) * zone}%`} x2={`${zone + ((i + 1) / 10) * zone}%`} y1="11.500" y2="13.900" stroke="#fff" strokeWidth="0.7" opacity="0.8" />)}
      {range(99).map(i => (i + 1) % 5 !== 0 && <line key={i} x1={`${zone + ((i + 1) / 10) * zone}%`} x2={`${zone + ((i + 1) / 10) * zone}%`} y1="22.100" y2="24.500" stroke="#fff" strokeWidth="0.7" opacity="0.8" />)}
      {range(21).map(i => <line key={i} x1={yard(i * 5)} x2={yard(i * 5)} y1="4.500" y2="31.500" stroke="#fff" strokeWidth={i % 20 === 0 ? 2 : i % 2 === 0 ? 1 : 0.6} opacity={i % 2 === 0 ? 0.95 : 0.7} />)}
      <path d="M0 4.500H4000M0 31.500H4000" stroke="#fff" strokeWidth="1.200" opacity="0.95" />
      {[10, 20, 30, 40, 50, 40, 30, 20, 10].map((n, i) => (
        <text key={i} x={yard((i + 1) * 10)} y="21.300" textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff" opacity="0.94" fontFamily="inherit" letterSpacing="4" dx="2">{n}</text>
      ))}
      {/* a play chalked up near the forty, and the ball on the fifty */}
      <svg x={yard(34)} y="0" overflow="visible">
        <g fill="none" stroke="#fff" strokeWidth="0.9" strokeLinecap="round" opacity="0.9">
          <circle cx="-9" cy="8.500" r="1.900" /><circle cx="-9" cy="27.500" r="1.900" />
          <path d="M7.200 6.800l3 3M10.200 6.800l-3 3M7.200 25.800l3 3M10.200 25.800l-3 3" />
        </g>
      </svg>
      <svg x={yard(50)} y="0" overflow="visible"><BallBrown x={0} y={9.4} s={0.5} rot={-14} /></svg>
    </svg>
  )
}

// ------------------------------------------------------------------
// Remembrance Day: poppies in a quiet field. Nothing moves.
// ------------------------------------------------------------------
function remembrance() {
  const r = seeded(1111)
  const far = roll([4, 2.4, 0.5], [9, 1.2, 2.1]), near = roll([3, 1.3, 1.9], [7, 0.8, 0.2])
  const farY = (x) => 25.5 - far(x), gy = (x) => 32.5 - near(x)
  const rows = [[236, 9], [1176, 7], [1968, 10]] // plain white crosses on the far rise, in rows
  const poppies = []
  let cx = 26
  while (cx < W - 20) {
    const count = 1 + Math.floor(r() * 5)
    for (let i = 0; i < count; i++) poppies.push({ x: cx + between(r, -26, 26), s: between(r, 0.24, 0.56), h: between(r, 6, 19), lean: between(r, -2.5, 2.5), bud: r() < 0.14 })
    cx += between(r, 58, 176)
  }
  poppies.sort((a, b) => a.s - b.s)
  return (
    <>
      <path d={ground(far, 25.5)} fill="#d3dac6" />
      {rows.map(([x0, n]) => range(n).map(i => { const x = x0 + i * 9.5; return <path key={x} d={`M${n1(x)} ${n1(farY(x) + 0.6)}v-5.200M${n1(x - 1.7)} ${n1(farY(x) - 3)}h3.400`} stroke="#fff" strokeWidth="1.300" /> }))}
      <g transform={`translate(742 ${n1(farY(742) + 0.5)})`}><path d="M-1.600 0L-.9 -13h1.800L1.600 0z" fill="#a9b0a2" /><path d="M-.9 -13L0 -15.200 .9 -13z" fill="#9aa194" /><rect x="-3.600" y="-1.200" width="7.200" height="1.600" fill="#9aa194" /></g>
      <path d={ground(near, 32.5)} fill="#bcc8af" />
      {along(r, 5, 15, [], (x, i) => <path key={`g${i}`} d={`M${n1(x)} ${n1(gy(x) + 0.6)}l-.9-${n1(between(r, 2.6, 5))} 1.700 2.600 .800-${n1(between(r, 3, 6))} 1.100 3.200 1.300-${n1(between(r, 2, 4))} .500 ${n1(between(r, 3, 4))}z`} fill={i % 3 ? '#a3b394' : '#93a685'} />)}
      {poppies.map((p, i) => {
        const y0 = gy(p.x) + 0.5, top = y0 - p.h
        return (
          <g key={`p${i}`}>
            <path d={`M${n1(p.x)} ${n1(y0)}Q${n1(p.x + p.lean)} ${n1(y0 - p.h / 2)} ${n1(p.x + p.lean * 0.6)} ${n1(top)}`} fill="none" stroke="#5f7f57" strokeWidth={n1(0.5 + p.s)} strokeLinecap="round" />
            {p.bud
              ? <ellipse cx={n1(p.x + p.lean * 0.6)} cy={n1(top - 1)} rx={n1(2.4 * p.s + 0.5)} ry={n1(3.6 * p.s + 0.6)} fill="#b00e28" />
              : <Poppy x={n1(p.x + p.lean * 0.6)} y={n1(top)} s={n1(p.s)} />}
          </g>
        )
      })}
    </>
  )
}

// ------------------------------------------------------------------
// Lunar New Year: dragons through gold clouds, each chasing its pearl
// ------------------------------------------------------------------
const Dragon = ({ x, y = 19, len = 300, amp = 6, cycles = 2.25, phase = 0, body = '#c8322b', belly = '#f0b840', fin = '#f0b840', dark = '#9c1f24', flip = false }) => {
  const pts = []
  for (let d = 0; d <= len; d += 3) {
    const t = d / len, a = 2 * Math.PI * cycles * t + phase
    pts.push({ t, x: d, y: amp * Math.sin(a), slope: ((amp * 2 * Math.PI * cycles) / len) * Math.cos(a) })
  }
  const thick = (t) => 2 + 8 * Math.min(1, t * 3.2)
  // a point beside the spine: sign 1 is the belly side, -1 the back, frac how far out
  const off = (p, sign, frac = 1) => { const n = Math.hypot(1, p.slope), w = (thick(p.t) / 2) * frac; return [n1(p.x - (sign * w * p.slope) / n), n1(p.y + (sign * w) / n)] }
  const line = (list) => list.map(([a, b], i) => `${i ? 'L' : 'M'}${a} ${b}`).join('')
  const back = pts.map(p => off(p, -1)), under = pts.map(p => off(p, 1)), mid = pts.map(p => off(p, 1, 0.2))
  const head = pts[pts.length - 1], tail = pts[0]
  const deg = (p) => n1((Math.atan(p.slope) * 180) / Math.PI)
  return (
    <g transform={`translate(${x} ${y})${flip ? ' scale(-1 1)' : ''}`}>
      {/* the tuft on the tail */}
      <path transform={`translate(${tail.x} ${n1(tail.y)}) rotate(${deg(tail)}) scale(1.3)`} d="M2 0C-2 -3.500 -7 -2.500 -9.500 -6c.6 3.600-.6 5.400-3.500 6.200 3.300 1 6 .9 8.500-.4-1.200 2.300-3.200 3.400-6 3.500C-5.500 5.200-.5 4 2 0z" fill={fin} />
      {/* the fins along the back */}
      {pts.filter((p, i) => i % 3 === 1 && p.t > 0.06 && p.t < 0.95).map((p, i) => {
        const [bx, by] = off(p, -1, 0.8)
        return <path key={i} transform={`translate(${bx} ${by}) rotate(${deg(p)}) scale(1.5)`} d="M-2.600 .600L-1.600 -3.600 2.600 .600z" fill={fin} />
      })}
      {/* the legs */}
      {[0.3, 0.52, 0.76].map(t => {
        const p = pts[Math.round(t * (pts.length - 1))], [lx, ly] = off(p, 1, 0.8)
        return (
          <g key={t} transform={`translate(${lx} ${ly}) rotate(${deg(p)}) scale(1.5)`}>
            <path d="M0 0c.5 2.200 1.800 3.300 3.800 3.600" fill="none" stroke={body} strokeWidth="2" strokeLinecap="round" />
            <path d="M3.600 3.400l2.300-.9M3.800 3.700l2.500.6M3.600 4l1.700 1.900" stroke={belly} strokeWidth="0.800" strokeLinecap="round" />
          </g>
        )
      })}
      <path d={`${line(back)}${line([...under].reverse()).replace('M', 'L')}z`} fill={body} />
      <path d={`${line(mid)}${line([...under].reverse()).replace('M', 'L')}z`} fill={belly} />
      {pts.filter((p, i) => i % 2 === 0 && p.t > 0.12).map((p, i) => { const [ax, ay] = off(p, 1, 0.2), [bx, by] = off(p, 1); return <path key={i} d={`M${ax} ${ay}L${bx} ${by}`} stroke={dark} strokeWidth="0.500" opacity="0.55" /> })}
      <path d={line(pts.filter(p => p.t > 0.1).map(p => off(p, -1, 0.4)))} fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="2.600 4" strokeLinecap="round" opacity="0.35" />
      {/* the head */}
      <g transform={`translate(${head.x - 2} ${n1(head.y)}) rotate(${deg(head)}) scale(1.55)`}>
        <path d="M1.500 -3C-2.500 -6.500 -7 -5.500 -9.500 -9c.4 3.200-.6 5-3.200 5.600 2.600.9 4.400.8 6.200-.1-1.400 2.200-3.400 3.200-6 3.200 3.200 2.300 7.400 2.300 10.500.3z" fill={fin} />
        <path d="M3.500 -4.200L.3 -10M1.700 -7.400l-3.400-.5M6.200 -4.600L5.200 -10M5.700 -7.600l2.200-1.600" fill="none" stroke={belly} strokeWidth="1" strokeLinecap="round" />
        <path d="M-2.800 -3.600C2 -6.200 9 -5.600 12.200 -2.900c2 .6 2.900 2.500 1.600 3.800L5.800 2.500C2.600 4-1.200 3.800-2.800 3.200z" fill={body} />
        <path d="M2.600 2.700l10.400-1.100c-.7 3-5.100 4.900-9.700 3.700z" fill={dark} />
        <path d="M5.800 2.500l.9 1.500.9-1.600M9 2.200l.8 1.400.8-1.500" fill="#fff" />
        <circle cx="13.200" cy="-1.400" r="1.400" fill={belly} />
        <circle cx="6.200" cy="-2.500" r="1.400" fill="#fff" /><circle cx="6.600" cy="-2.500" r="0.700" fill="#1d1d1b" />
        <path d="M3.800 -4.600c1.600-1 3.300-.9 4.800.3" fill="none" stroke={belly} strokeWidth="1" strokeLinecap="round" />
        <path d="M13.800 -2c3.200-3.400 6.400-2.100 8-5.600M13.800 .200c3.200 .200 4.800 3.200 8.600 2.100" fill="none" stroke={belly} strokeWidth="0.800" strokeLinecap="round" />
        <path d="M3.800 5c-.5 2.700-2.700 3.800-4.900 3.500 1.600-.9 2-2.200 1.700-3.900z" fill={fin} />
      </g>
    </g>
  )
}
const Swirl = ({ x, y, s = 1, flip = false, stroke = '#d9a441', opacity = 1 }) => (
  <g transform={`translate(${n1(x)} ${n1(y)}) scale(${flip ? -s : s} ${s})`} fill="none" stroke={stroke} strokeWidth={n1(1.1 / s)} strokeLinecap="round" opacity={opacity}>
    <path d="M-13 4h11c3.300 0 5.200-1.900 5.200-4.400S1.400 -4.200 -.7 -4.200s-3.300 1.300-3.300 3 1 2.600 2.400 2.600" />
    <path d="M3.500 3.600h9c2.500 0 3.900-1.300 3.900-3.200s-1.200-3-2.800-3-2.400 1-2.400 2.200" />
    <path d="M-18 7.600h24" opacity="0.6" />
  </g>
)
const Pearl = ({ x, y }) => (
  <At x={x} y={y}>
    <path className="qp-s-flicker" d="M-3.600 -1.500c-.5-3.500 1.400-5.300 2.400-7.500.6 2.200 2.700 2.900 2.900 5.300.9-1 1.200-2 1.100-3.300 1.800 1.900 2 4.500.9 6.700z" fill="#f08a24" />
    <circle r="3.600" fill="#fff3c4" stroke="#e2a336" strokeWidth="0.800" /><circle cx="-1.100" cy="-1.200" r="1" fill="#fff" />
  </At>
)
function lunar() {
  const r = seeded(888)
  const clear = [[0, 372], [1010, 1380], [1850, 2230]]
  return (
    <>
      {along(r, 54, 130, clear, (x, i) => <Swirl key={`c${i}`} x={x} y={between(r, 9, 25)} s={between(r, 0.8, 1.25)} flip={r() < 0.5} opacity={n1(between(r, 0.55, 1))} />)}
      {[[452, 1.02], [506, 0.8], [716, 0.92], [1500, 1.02], [1556, 0.78], [1716, 0.9], [2300, 1], [2352, 0.8]].map(([x, s]) => <Lantern key={x} x={x} y={-1.5} s={s} />)}
      {along(r, 40, 110, [], (x, i) => { const y = between(r, 4, 31), s = between(r, 0.24, 0.4); return <g key={`b${i}`} transform={`translate(${n1(x)} ${n1(y)}) scale(${n1(s)})`}>{[0, 72, 144, 216, 288].map(a => <ellipse key={a} cy="-4.600" rx="3" ry="4" fill={i % 3 ? '#f4a3b8' : '#f7c1cf'} transform={`rotate(${a})`} />)}<circle r="1.800" fill="#f0b840" /></g> })}
      <Swirl x={70} y={31} s={0.8} opacity={0.7} /><Swirl x={196} y={6} s={0.7} flip opacity={0.7} />
      <Dragon x={10} len={262} y={18.5} amp={5} cycles={1.75} phase={0.4} /><Pearl x={322} y={15} />
      <Swirl x={1250} y={31} s={0.8} flip opacity={0.7} /><Swirl x={1130} y={5.5} s={0.7} opacity={0.7} />
      <Dragon x={1372} len={270} y={18.5} amp={4.6} cycles={2} phase={2.2} flip body="#e2a336" belly="#c8322b" fin="#c8322b" dark="#a8721a" /><Pearl x={1052} y={18} />
      <Swirl x={1960} y={31} s={0.8} opacity={0.7} /><Swirl x={2080} y={5.5} s={0.7} flip opacity={0.7} />
      <Dragon x={1860} len={274} y={18.500} amp={5} cycles={1.5} phase={1.1} body="#2e8f7a" belly="#f0b840" fin="#f0b840" dark="#1f6b5b" /><Pearl x={2188} y={16} />
    </>
  )
}

// ------------------------------------------------------------------
// International Women's Day: silk ribbons through spring flowers
// ------------------------------------------------------------------
const Bloom = ({ x, y, r = 7, fill = '#f8b9d2', deep = '#e98bb5', ink = '#c05a8c', rot = 0 }) => (
  <g transform={`translate(${n1(x)} ${n1(y)}) rotate(${rot})`}>
    {[0, 72, 144, 216, 288].map(a => <path key={a} transform={`rotate(${a})`} d={`M0 0C${n1(-r * 0.8)} ${n1(-r * 0.3)} ${n1(-r * 0.62)} ${n1(-r * 1.08)} 0 ${n1(-r)}C${n1(r * 0.62)} ${n1(-r * 1.08)} ${n1(r * 0.8)} ${n1(-r * 0.3)} 0 0z`} fill={fill} stroke={ink} strokeWidth="0.500" strokeLinejoin="round" />)}
    {[0, 72, 144, 216, 288].map(a => <path key={a} transform={`rotate(${a})`} d={`M0 ${n1(-r * 0.3)}V${n1(-r * 0.72)}`} stroke={deep} strokeWidth="0.600" strokeLinecap="round" />)}
    <circle r={n1(r * 0.22)} fill="#f6d36b" stroke="#d09a2c" strokeWidth="0.400" />
  </g>
)
const Peony = ({ x, y, r = 7, fill = '#cdb0ee', deep = '#a985d8', ink = '#7f5bb5' }) => (
  <At x={x} y={y}>
    {[0, 60, 120, 180, 240, 300].map(a => <circle key={a} cx={n1(r * 0.55 * Math.cos((a * Math.PI) / 180))} cy={n1(r * 0.55 * Math.sin((a * Math.PI) / 180))} r={n1(r * 0.52)} fill={fill} stroke={ink} strokeWidth="0.500" />)}
    {[30, 102, 174, 246, 318].map(a => <circle key={a} cx={n1(r * 0.28 * Math.cos((a * Math.PI) / 180))} cy={n1(r * 0.28 * Math.sin((a * Math.PI) / 180))} r={n1(r * 0.36)} fill={deep} stroke={ink} strokeWidth="0.400" />)}
    <circle r={n1(r * 0.2)} fill="#f6d36b" />
  </At>
)
const Sprig = ({ x, y, s = 1, flip = false, rot = 0 }) => (
  <g transform={`translate(${n1(x)} ${n1(y)}) rotate(${rot}) scale(${flip ? -s : s} ${s})`}>
    <path d="M0 0C3 -6 8 -10 16 -12" fill="none" stroke="#7a9a63" strokeWidth="0.900" strokeLinecap="round" />
    <path d="M3 -4.500l-4-1.800M6 -7.800l-3.600-2.800M2 -2.600l1.800 3M5 -6.600l3 2.200M9.500 -10l-1.800-3.800" stroke="#9cba84" strokeWidth="0.800" strokeLinecap="round" />
    {[[7, -11.500, 2], [10.500, -13.200, 1.700], [13.800, -13.600, 2.100], [16.800, -12.400, 1.800], [14.600, -9.600, 1.600], [18.800, -9.800, 1.900], [11.200, -8.400, 1.500], [8.600, -14.600, 1.400]].map(([a, b, c]) => <circle key={`${a}${b}`} cx={a} cy={b} r={c} fill={a > 12 ? '#f4c430' : '#f9dc6b'} stroke="#cf9d1f" strokeWidth="0.300" />)}
  </g>
)
const LeafPair = ({ x, y, s = 1, rot = 0, fill = '#9cba84', ink = '#6c8c58' }) => (
  <g transform={`translate(${n1(x)} ${n1(y)}) rotate(${rot}) scale(${s})`}>
    <path d="M0 0C-1 -5 2 -9 7 -11 8 -6 5 -2 0 0z" fill={fill} stroke={ink} strokeWidth="0.500" /><path d="M0 0C3 -3.600 5 -7 7 -11" fill="none" stroke={ink} strokeWidth="0.400" />
    <path d="M0 0C-5 -1.500 -9 -5 -10 -9.500 -5 -9 -1 -5 0 0z" fill={fill} stroke={ink} strokeWidth="0.500" /><path d="M0 0C-3.600 -3 -7 -6 -10 -9.500" fill="none" stroke={ink} strokeWidth="0.400" />
  </g>
)
const Bud = ({ x, y, h = 9, fill = '#f49ac1', ink = '#c05a8c', lean = 0 }) => (
  <g transform={`translate(${n1(x)} ${n1(y)}) rotate(${lean})`}>
    <path d={`M0 0V${-h}`} stroke="#7a9a63" strokeWidth="0.900" strokeLinecap="round" />
    <path d={`M0 ${-h - 5.600}C-2.600 ${-h - 3.600} -2.400 ${-h} 0 ${-h + 0.400}C2.400 ${-h} 2.600 ${-h - 3.600} 0 ${-h - 5.600}z`} fill={fill} stroke={ink} strokeWidth="0.500" />
    <path d={`M-1.800 ${-h + 0.200}C-1 ${-h - 1.600} 1 ${-h - 1.600} 1.800 ${-h + 0.200}L0 ${-h + 1.200}z`} fill="#8fae7a" />
  </g>
)
function womens() {
  const r = seeded(308)
  const a = roll([4, 6, 0.4], [9, 2.2, 1.7]), b = roll([5, 5.5, 2.7], [11, 1.8, 0.2])
  const fat = (k, ph, lo, hi) => (x) => lo + (hi - lo) * (0.5 + 0.5 * Math.sin((2 * Math.PI * k * x) / W + ph))
  const ta = fat(7, 2.2, 1.6, 4.6), tb = fat(9, 0.6, 1.4, 4)
  const band = (mid, half, base, side = 0) => {
    let top = '', bottom = ''
    for (let x = 0; x <= W; x += 8) {
      const m = base - mid(x), h = half(x)
      top += `${x ? 'L' : 'M'}${x} ${n1(side > 0 ? m : m - h)}`
      bottom = `L${x} ${n1(side < 0 ? m : m + h)}` + bottom
    }
    return `${top}${bottom}z`
  }
  // an awareness loop tied into the ribbon, and the flowers around it
  const groups = []
  let gx = 52, i = 0
  while (gx < W - 40) {
    const kinds = [['bloom', 'bud', 'sprig'], ['peony', 'bloom', 'leaf'], ['sprig', 'bloom', 'bud'], ['peony', 'bud', 'sprig'], ['bloom', 'peony', 'leaf']][i % 5]
    groups.push({ x: gx, kinds, lift: between(r, -2, 2), big: between(r, 8, 10.4), turn: Math.round(between(r, 0, 70)), flip: r() < 0.5 })
    gx += between(r, 104, 176); i++
  }
  const loops = [206, 1124, 1986]
  return (
    <>
      <path d={band(b, tb, 18)} fill="#c9a9ea" /><path d={band(b, tb, 18, 1)} fill="#b08ddc" />
      <path d={band(a, ta, 17.5)} fill="#f7b0cd" /><path d={band(a, ta, 17.5, 1)} fill="#ec8db7" />
      <path d={band(a, () => 0.35, 17.5 - 0.2)} fill="#fff" opacity="0.5" />
      {loops.map(x => (
        <g key={x} transform={`translate(${x} ${n1(17.5 - a(x))})`}>
          <path d="M9 17L-3.200 -1C-6 -5.200 -4 -13 0 -13" fill="none" stroke="#e77fae" strokeWidth="4.600" strokeLinejoin="round" />
          <path d="M-9 17L3.200 -1C6 -5.200 4 -13 0 -13" fill="none" stroke="#f7a8c9" strokeWidth="4.600" strokeLinejoin="round" />
          <path d="M-8.600 15L3 -1.800C5 -5 3.800 -10.500 .8 -11" fill="none" stroke="#fff" strokeWidth="0.700" opacity="0.6" />
        </g>
      ))}
      {groups.filter(g => !loops.some(x => Math.abs(g.x - x) < 44)).map((g, k) => {
        const y = 17.5 - a(g.x) + g.lift
        return (
          <g key={`g${k}`}>
            {g.kinds.map((kind, j) => {
              const dx = [0, g.flip ? -15 : 15, g.flip ? 13 : -13][j], dy = [0, -2, 3][j]
              if (kind === 'bloom') return <g key={j}><LeafPair x={g.x + dx} y={y + dy + 3} s={0.8} rot={g.flip ? 150 : 200} /><Bloom x={g.x + dx} y={y + dy} r={j ? g.big * 0.78 : g.big} rot={g.turn} fill={j ? '#fbd0e0' : '#f8b9d2'} /></g>
              if (kind === 'peony') return <g key={j}><LeafPair x={g.x + dx} y={y + dy + 2} s={0.8} rot={g.flip ? 30 : -20} /><Peony x={g.x + dx} y={y + dy} r={j ? g.big * 0.74 : g.big * 0.96} /></g>
              if (kind === 'sprig') return <Sprig key={j} x={g.x + dx - (g.flip ? -4 : 4)} y={Math.min(34, y + dy + 9)} s={0.95} flip={g.flip} rot={g.flip ? 8 : -8} />
              if (kind === 'bud') return <g key={j}><Bud x={g.x + dx} y={Math.min(36, y + dy + 12)} h={9} lean={g.flip ? 12 : -12} /><Bud x={g.x + dx + 5} y={Math.min(36, y + dy + 13)} h={6} fill="#c9a9ea" ink="#7f5bb5" lean={g.flip ? -8 : 14} /></g>
              return <LeafPair key={j} x={g.x + dx} y={y + dy + 4} s={1} rot={g.flip ? 20 : -30} />
            })}
          </g>
        )
      })}
      {along(r, 60, 150, [], (x, k) => <Heart key={`h${k}`} x={n1(x)} y={n1(between(r, 4, 32))} s={n1(between(r, 0.2, 0.34))} fill={k % 2 ? '#f4a3c4' : '#c9a9ea'} />)}
    </>
  )
}

// ------------------------------------------------------------------
// Easter: an egg hunt in a spring meadow
// ------------------------------------------------------------------
const Bunny = ({ x, y, s = 1, flip = false, fur = '#dcbd97', belly = '#f6ead6', ink = '#8a6a4f' }) => (
  <g transform={`translate(${n1(x)} ${n1(y)}) scale(${flip ? -s : s} ${s})`} stroke={ink} strokeWidth="0.600" strokeLinejoin="round">
    <path d="M1.300 -19C-.2 -25 .9 -30 3.100 -30.500 5.200 -30 5.700 -24.500 4.700 -19z" fill={fur} /><path d="M2.500 -20.500C2 -24.500 2.500 -27.800 3.200 -28.500 4 -27.700 4.200 -24 3.700 -20.500z" fill="#f2b6c0" stroke="none" />
    <path d="M5.400 -19.200C6.200 -24.500 8.800 -28.600 10.800 -28 12.200 -26.600 10.600 -22 8.200 -18.400z" fill={fur} /><path d="M6.600 -20C7.300 -23.500 9 -26.300 10.100 -26.400 10.500 -25 9.400 -22 7.800 -19.600z" fill="#f2b6c0" stroke="none" />
    <circle cx="-9.300" cy="-3.600" r="2.500" fill="#fff" />
    <path d="M-6 0C-10.500 -1 -11.500 -7.500 -8.300 -12 -6 -15 -1.500 -15.200 1.500 -13L6.200 -8C8.200 -5 7.600 -1 5 0z" fill={fur} />
    <path d="M.5 -9C3.200 -10.200 5.600 -8 5.600 -5S4 0 2 0H-1.500C-.3 -3 0 -6 .5 -9z" fill={belly} stroke="none" />
    <ellipse cx="4.800" cy="-15.600" rx="5.200" ry="4.500" fill={fur} /><ellipse cx="7.400" cy="-14.200" rx="2.300" ry="1.900" fill={belly} stroke="none" />
    <circle cx="6.300" cy="-16.800" r="0.900" fill="#3b2a2a" stroke="none" /><circle cx="6.600" cy="-17.100" r="0.300" fill="#fff" stroke="none" />
    <path d="M9.500 -15.200l1 .5-1 .7z" fill="#e58aa0" stroke="none" />
    <path d="M9.200 -13.400l3.200-.6M9.200 -12.800l3 .8" fill="none" strokeWidth="0.300" />
    <ellipse cx="-3.400" cy="-1" rx="3.800" ry="1.400" fill={fur} /><ellipse cx="4.800" cy="-.9" rx="2.400" ry="1.100" fill={belly} />
  </g>
)
const Chick = ({ x, y, s = 1, flip = false }) => (
  <g transform={`translate(${n1(x)} ${n1(y)}) scale(${flip ? -s : s} ${s})`} stroke="#c49a2c" strokeWidth="0.500" strokeLinejoin="round">
    <path d="M-1.500 -1.600v2.600M1.500 -1.600v2.600M-3 1h3M0 1h3" fill="none" stroke="#e58a2e" strokeWidth="0.700" strokeLinecap="round" />
    <ellipse cx="0" cy="-5.600" rx="5" ry="4.600" fill="#fbe27a" /><circle cx="3" cy="-11" r="3.500" fill="#fbe27a" />
    <path d="M-3.800 -6.500c1.600-1.600 4-1.400 4.800.6-1.200 1.600-3.400 1.900-4.800-.6z" fill="#f4c94a" />
    <path d="M6.300 -11.400l2.400.9-2.400.9z" fill="#e58a2e" stroke="none" /><circle cx="4.100" cy="-11.800" r="0.600" fill="#3b2a2a" stroke="none" />
    <path d="M2.400 -14.400l.6-1.700.7 1.600" fill="none" strokeWidth="0.500" />
  </g>
)
const Basket = ({ x, y, s = 1 }) => (
  <g transform={`translate(${n1(x)} ${n1(y)}) scale(${s})`}>
    <path d="M-9.500 -9C-9.500 -25 9.500 -25 9.500 -9" fill="none" stroke="#a9763f" strokeWidth="1.700" /><path d="M-9.500 -9C-9.500 -25 9.500 -25 9.500 -9" fill="none" stroke="#d9a868" strokeWidth="0.600" strokeDasharray="1.600 1.600" />
    <Egg x={-5} y={-11} s={0.62} color="#f7a8c9" kind="dots" rot={-12} /><Egg x={0.5} y={-12.500} s={0.66} color="#a9d3f5" kind="zigzag" /><Egg x={5.600} y={-11} s={0.6} color="#f9e08a" mark="#f2a65a" kind="bands" rot={14} />
    <path d="M-11 -9.500h22l-2.300 9.500H-8.700z" fill="#c9935a" stroke="#8a5f30" strokeWidth="0.600" strokeLinejoin="round" />
    <path d="M-10.300 -6.500h20.600M-9.600 -3.500h19.200M-6.500 -9.500l1 9.500M-2.200 -9.500l.4 9.500M2.200 -9.500l-.4 9.500M6.500 -9.500l-1 9.500" stroke="#8a5f30" strokeWidth="0.400" opacity="0.8" />
    <rect x="-11.600" y="-10.600" width="23.200" height="2" rx="1" fill="#d9a868" stroke="#8a5f30" strokeWidth="0.500" />
    <path d="M0 -5.500C-3.500 -9.500 -7 -8 -6 -5.200S-2 -3.500 0 -5.500zM0 -5.500C3.500 -9.500 7 -8 6 -5.200S2 -3.500 0 -5.500zM-.8 -5l-2.200 4.600 2-.8.9 1.600zM.8 -5l2.200 4.600-2-.8-.9 1.600z" fill="#b99be8" stroke="#7f5bb5" strokeWidth="0.400" strokeLinejoin="round" />
  </g>
)
const Daffodil = ({ x, y, h = 14, s = 1 }) => (
  <g transform={`translate(${n1(x)} ${n1(y)}) scale(${s})`}>
    <path d={`M0 0V${-h}`} stroke="#5aa15f" strokeWidth="1.200" strokeLinecap="round" /><path d={`M0 0C-3 ${-h * 0.3} -3.500 ${-h * 0.6} -2.500 ${-h * 0.8}C-1 ${-h * 0.5} 0 ${-h * 0.25} 0 0z`} fill="#6fba73" />
    {[0, 60, 120, 180, 240, 300].map(a => <path key={a} transform={`translate(0 ${-h}) rotate(${a})`} d="M0 0C-2 -1.600 -1.600 -4.600 0 -5.600 1.600 -4.600 2 -1.600 0 0z" fill="#fbe27a" stroke="#d9a82c" strokeWidth="0.400" />)}
    <circle cy={-h} r="1.900" fill="#f4a93a" stroke="#c9801f" strokeWidth="0.400" />
  </g>
)
const Butterfly = ({ x, y, s = 1, fill = '#c9a9ea', deep = '#9b78d6', rot = -15 }) => (
  <g transform={`translate(${n1(x)} ${n1(y)}) rotate(${rot}) scale(${s})`}>
    <g className="qp-s-flap"><path d="M0 0C-3 -6 -8 -6 -8 -2.500S-3 1 0 0zM0 0C3 -6 8 -6 8 -2.500S3 1 0 0z" fill={fill} stroke={deep} strokeWidth="0.500" /><path d="M0 0C-2.500 1 -5.500 2 -5 4.200S-1 4 0 0zM0 0C2.500 1 5.500 2 5 4.200S1 4 0 0z" fill={deep} /></g>
    <path d="M0 -2v5.500M0 -2l-1.500-2.200M0 -2l1.500-2.200" fill="none" stroke="#4a3a5e" strokeWidth="0.600" strokeLinecap="round" />
  </g>
)
function easter() {
  const r = seeded(404)
  const far = roll([4, 1.6, 0.3], [9, 0.9, 1.8]), near = roll([3, 1.1, 2.1], [7, 0.7, 0.6])
  const gy = (x) => 33 - near(x)
  const heroes = [
    [34, 'bunny'], [92, 'eggs'], [150, 'chick'], [212, 'basket'], [278, 'daffodils'], [340, 'bunny-left'], [470, 'butterfly'], [560, 'eggs2'], [660, 'chicks'],
    [790, 'tulips'], [900, 'bunny'], [1020, 'basket'], [1150, 'eggs'], [1260, 'butterfly2'], [1370, 'bunny-left'], [1490, 'daffodils'], [1600, 'chick'],
    [1720, 'eggs2'], [1840, 'bunnies'], [1980, 'tulips'], [2090, 'basket'], [2210, 'chicks'], [2320, 'eggs'],
  ]
  const clear = heroes.map(([x]) => [x - 30, x + 30])
  const eggs = [['#f7a8c9', 'zigzag', '#fff'], ['#a9d3f5', 'dots', '#fff'], ['#f9e08a', 'bands', '#f2a65a'], ['#c9b3f0', 'zigzag', '#fff'], ['#b6e3c9', 'dots', '#fff'], ['#fbc4a0', 'bands', '#fff']]
  const egg = (x, y, k, s = 0.8, rot = 0) => <Egg key={`e${x}`} x={x} y={y - 9.2 * s + 2} s={s} color={eggs[k % 6][0]} kind={eggs[k % 6][1]} mark={eggs[k % 6][2]} rot={rot} />
  return (
    <>
      <path d={ground(far, 29)} fill="#d6efd2" />
      {along(r, 120, 300, [], (x, k) => <Cloud key={`c${k}`} x={n1(x)} y={n1(between(r, 1, 7))} s={n1(between(r, 0.4, 0.6))} opacity={0.75} />)}
      <path d={ground(near, 33)} fill="#b4dfb0" />
      {along(r, 26, 70, clear, (x, k) => (k % 3 === 0 ? <Tulip key={`t${k}`} x={n1(x)} y={n1(gy(x) - 11)} s={0.7} color={pick(r, ['#f49ac1', '#b98be0', '#f6c45a'])} h={16} /> : egg(n1(x), gy(x), k, between(r, 0.55, 0.75), between(r, -14, 14))))}
      {heroes.map(([x, kind]) => {
        const y = gy(x) + 1
        if (kind === 'bunny') return <Bunny key={x} x={x} y={y} s={0.98} />
        if (kind === 'bunny-left') return <g key={x}><Bunny x={x} y={y} s={0.94} flip fur="#e6d2b8" />{egg(x + 17, y, 3, 0.8, 10)}</g>
        if (kind === 'bunnies') return <g key={x}><Bunny x={x - 12} y={y} s={0.98} fur="#cfae86" /><Bunny x={x + 12} y={y} s={0.76} flip fur="#efe2cd" /></g>
        if (kind === 'eggs') return <g key={x}>{egg(x - 12, y, 0, 1, -10)}{egg(x + 1, y, 1, 1.15, 4)}{egg(x + 14, y, 2, 0.9, 12)}</g>
        if (kind === 'eggs2') return <g key={x}>{egg(x - 9, y, 3, 1.1, 8)}{egg(x + 6, y, 4, 0.95, -8)}<Daffodil x={x + 19} y={y} h={17} /></g>
        if (kind === 'chick') return <g key={x}><Chick x={x} y={y - 1} s={1.25} />{egg(x - 15, y, 5, 0.85, -6)}</g>
        if (kind === 'chicks') return <g key={x}><Chick x={x - 10} y={y - 1} s={1.25} /><Chick x={x + 8} y={y - 1} s={1} flip /></g>
        if (kind === 'basket') return <Basket key={x} x={x} y={y} s={1.05} />
        if (kind === 'daffodils') return <g key={x}><Daffodil x={x - 10} y={y} h={16} /><Daffodil x={x} y={y} h={22} s={1.1} /><Daffodil x={x + 11} y={y} h={13} /></g>
        if (kind === 'tulips') return <g key={x}><Tulip x={x - 11} y={y - 15} s={0.95} color="#f49ac1" h={16} /><Tulip x={x} y={y - 21} s={1.05} color="#b98be0" h={22} /><Tulip x={x + 11} y={y - 13} s={0.9} color="#f6c45a" h={14} /></g>
        if (kind === 'butterfly') return <g key={x}><Butterfly x={x} y={12} s={1.2} /><Butterfly x={x + 26} y={20} s={0.8} fill="#f7a8c9" deep="#e06f9f" rot={20} /></g>
        return <Butterfly key={x} x={x} y={14} s={1.1} fill="#f9e08a" deep="#e0a93a" rot={12} />
      })}
      {along(r, 7, 18, [], (x, k) => <path key={`g${k}`} d={`M${n1(x)} 36l-.8-${n1(between(r, 3.5, 6.5))} 1.800 3 .900-${n1(between(r, 4, 7.5))} 1.200 4 1.400-${n1(between(r, 2.5, 5))} .700 5z`} fill={k % 3 ? '#8fd098' : '#7cc48b'} />)}
    </>
  )
}

// ------------------------------------------------------------------
// Labour Day: a city going up
// ------------------------------------------------------------------
const INK = '#2f4770'
const Worker = ({ x, y, s = 1, vest = '#f08a24', hat = '#f6c93a', flip = false, plans = false, back = false }) => (
  <g transform={`translate(${n1(x)} ${n1(y)}) scale(${flip ? -s : s} ${s})`} stroke={INK} strokeWidth="0.500" strokeLinejoin="round">
    <path d="M-3.200 -9.500h2.600L-.8 0h-2.800zM.6 -9.500h2.600L3.600 0H.8z" fill="#3d5a8a" />
    {plans && <path d="M4.500 -18.500l8.500-1.500 1 8.500-8.500 1.500z" fill="#fff" />}
    {plans && <path d="M6.300 -17.300l5.400-.9M6.600 -15.400l5.400-.9M6.900 -13.500l3.600-.6M9.400 -18l.8 6.800" fill="none" stroke="#6f8fc0" strokeWidth="0.400" />}
    <path d="M-4.600 -19.500c0-1.600 1.200-2.500 2.600-2.500h4c1.400 0 2.600.9 2.600 2.500l.4 10.500h-10z" fill="#7fa0cf" />
    <path d="M-3.600 -22h7.200l.8 12.500h-8.800z" fill={vest} />
    {back ? <path d="M-3.900 -15h7.800M-4.100 -12h8.200M-1.800 -22v12.500M1.800 -22v12.500" fill="none" stroke="#fbe9a8" strokeWidth="0.900" /> : <path d="M-3.900 -14.500h7.800M0 -22v12.500" fill="none" stroke="#fbe9a8" strokeWidth="0.900" />}
    <path d={plans ? 'M3.800 -20.500l3.600 4.500' : 'M4 -20.500l1.600 6.500'} fill="none" stroke="#7fa0cf" strokeWidth="2.200" strokeLinecap="round" /><path d="M-4 -20.500l-1.600 6.500" fill="none" stroke="#7fa0cf" strokeWidth="2.200" strokeLinecap="round" />
    <circle cy="-25" r="2.900" fill={back ? '#6b4a32' : '#e9b98f'} />
    <path d="M-3.600 -25.500a3.600 3.600 0 0 1 7.200 0z" fill={hat} /><path d="M-4.600 -25.500h9.200" stroke={INK} strokeWidth="0.900" strokeLinecap="round" />
  </g>
)
const TowerCrane = ({ x, base = 34, h = 28, jib = 40, back = 12, flip = false, colour = '#f08a24', drop = 12, load = true }) => {
  const top = base - h
  let lattice = ''
  for (let y = top + 3; y < base - 2; y += 4) lattice += `M-1.600 ${n1(y)}L1.600 ${n1(y + 2)}L-1.600 ${n1(y + 4)}`
  return (
    <g transform={`translate(${n1(x)} 0) scale(${flip ? -1 : 1} 1)`}>
      <path d={`M-1.600 ${top}V${base}M1.600 ${top}V${base}`} stroke={colour} strokeWidth="0.900" /><path d={lattice} fill="none" stroke={colour} strokeWidth="0.500" />
      <path d={`M0 ${top - 5}L${jib} ${top + 2.500}M0 ${top - 5}L${-back} ${top + 2.500}`} stroke={INK} strokeWidth="0.400" />
      <path d={`M${-back} ${top + 2.500}H${jib}`} stroke={colour} strokeWidth="1.700" /><path d={`M${-back} ${top + 2.500}H${jib}`} stroke="#fff" strokeWidth="0.400" strokeDasharray="1.500 2.500" opacity="0.7" />
      <path d={`M0 ${top + 2.500}V${top - 5}`} stroke={colour} strokeWidth="1.300" />
      <rect x={-back} y={top + 2.500} width="4.600" height="3.600" fill="#5f6b7a" /><rect x="1.600" y={top + 3.300} width="3.800" height="3.400" rx="0.500" fill="#fff" stroke={INK} strokeWidth="0.400" />
      <g className="qp-s-sway" style={{ animationDuration: '7s' }}>
        <path d={`M${n1(jib * 0.72)} ${top + 3}v${drop}`} stroke={INK} strokeWidth="0.500" />
        {load && <rect x={n1(jib * 0.72 - 5)} y={top + 3 + drop} width="10" height="1.800" fill="#5f6b7a" />}
        {!load && <path d={`M${n1(jib * 0.72)} ${top + 3 + drop}q2 2 0 3.200`} fill="none" stroke={INK} strokeWidth="0.800" />}
      </g>
    </g>
  )
}
const SteelFrame = ({ x, w, floors, base = 34, floor = 5.4, clad = 0 }) => {
  const bays = Math.max(2, Math.round(w / 8)), bw = w / bays, h = floors * floor
  return (
    <g transform={`translate(${n1(x)} 0)`}>
      {clad > 0 && <rect x="0" y={n1(base - clad * floor)} width={w} height={n1(clad * floor)} fill="#aebfdc" />}
      {clad > 0 && range(clad).map(f => range(bays).map(c => <rect key={`${f}${c}`} x={n1(c * bw + 1.6)} y={n1(base - (f + 1) * floor + 1.4)} width={n1(bw - 3.2)} height={n1(floor - 2.8)} fill="#e6eefb" />))}
      {range(bays + 1).map(c => <path key={c} d={`M${n1(c * bw)} ${base}V${n1(base - h - (c % 2 ? 0 : 2.5))}`} stroke={INK} strokeWidth="1.200" />)}
      {range(floors).map(f => <path key={f} d={`M0 ${n1(base - (f + 1) * floor)}H${w}`} stroke={INK} strokeWidth="1" />)}
      {range(floors - clad).map(f => <path key={f} d={`M0 ${n1(base - (clad + f) * floor)}L${n1(bw)} ${n1(base - (clad + f + 1) * floor)}M${w} ${n1(base - (clad + f) * floor)}L${n1(w - bw)} ${n1(base - (clad + f + 1) * floor)}`} stroke={INK} strokeWidth="0.400" opacity="0.7" />)}
    </g>
  )
}
const Excavator = ({ x, y, s = 1, flip = false }) => (
  <g transform={`translate(${n1(x)} ${n1(y)}) scale(${flip ? -s : s} ${s})`} stroke={INK} strokeWidth="0.500" strokeLinejoin="round">
    <rect x="-10" y="-4" width="19" height="4" rx="2" fill="#3b4656" />{[-7, -3, 1, 5].map(c => <circle key={c} cx={c + 0.5} cy="-2" r="1" fill="#8b94a1" stroke="none" />)}
    <path d="M-8.500 -10.500h12.500v6.500H-8.500z" fill="#f08a24" /><path d="M-2.500 -16.500h6.500v6H-4z" fill="#f08a24" /><path d="M-1.400 -15.300h4.200v3.600h-5z" fill="#d7e7f7" />
    <path d="M3.500 -10.500L13 -21 20.500 -12" fill="none" stroke="#f08a24" strokeWidth="2.600" strokeLinecap="round" /><path d="M3.500 -10.500L13 -21 20.500 -12" fill="none" stroke={INK} strokeWidth="0.400" />
    <path d="M20.500 -12.500l2.800 4.500-5.800 1.800c-.6-2.200.4-4.600 3-6.300z" fill="#5f6b7a" />
  </g>
)
const Cone = ({ x, y, s = 1 }) => (
  <g transform={`translate(${n1(x)} ${n1(y)}) scale(${s})`}><path d="M-1 -7h2l2 6h-6z" fill="#f08a24" stroke={INK} strokeWidth="0.400" /><path d="M-1.700 -4.800h3.400l.6 1.700h-4.600z" fill="#fff" /><rect x="-4" y="-1" width="8" height="1.200" rx="0.400" fill="#f08a24" stroke={INK} strokeWidth="0.300" /></g>
)
function labour() {
  const r = seeded(505)
  const plots = []
  // the first screen is composed by hand; after that the site carries on, never the same plot twice in a row
  const opening = [[30, 'planners'], [78, 'frame-low'], [132, 'crane'], [196, 'excavator'], [250, 'cones'], [290, 'frame-tall'], [352, 'crane-left']]
  opening.forEach(p => plots.push(p))
  const kinds = ['frame-tall', 'crane', 'workers', 'frame-low', 'excavator', 'crane-left', 'cones', 'planners', 'frame-clad']
  let x = 420, last = ''
  while (x < W - 40) {
    let kind = pick(r, kinds)
    if (kind === last) kind = kinds[(kinds.indexOf(kind) + 1) % kinds.length]
    plots.push([x, kind]); last = kind
    x += { 'frame-tall': 70, 'frame-low': 62, 'frame-clad': 66, crane: 66, 'crane-left': 62, excavator: 58, workers: 44, cones: 40, planners: 50 }[kind] + between(r, 0, 26)
  }
  return (
    <>
      {skyline(r, { minW: 12, maxW: 28, minH: 8, maxH: 24, fill: '#d3deef', base: 34 })}
      {skyline(r, { minW: 10, maxW: 20, minH: 5, maxH: 15, fill: '#bccbe4', base: 34, tops: false })}
      <rect x="0" y="33.500" width={W} height="2.500" fill="#9fb2d3" />
      {plots.map(([px, kind], i) => {
        if (kind === 'planners') return <g key={i}><Worker x={px - 7} y={35} s={1.02} back vest="#f08a24" hat="#fff" /><Worker x={px + 5} y={35} s={1.08} back plans vest="#f6c93a" hat="#f6c93a" /></g>
        if (kind === 'frame-low') return <SteelFrame key={i} x={px - 16} w={34} floors={3} clad={1} />
        if (kind === 'frame-tall') return <SteelFrame key={i} x={px - 18} w={38} floors={5} clad={2} />
        if (kind === 'frame-clad') return <SteelFrame key={i} x={px - 16} w={32} floors={4} clad={3} />
        if (kind === 'crane') return <TowerCrane key={i} x={px} h={27} jib={38} drop={9 + (i % 3) * 3} />
        if (kind === 'crane-left') return <TowerCrane key={i} x={px} h={24} jib={34} flip colour="#f6c93a" drop={8 + (i % 4) * 2} load={i % 2 === 0} />
        if (kind === 'excavator') return <Excavator key={i} x={px - 4} y={34} s={0.95} flip={i % 2 === 1} />
        if (kind === 'workers') return <g key={i}><Worker x={px - 8} y={35} s={0.62} vest="#f08a24" /><Worker x={px + 4} y={35} s={0.58} flip vest="#f6c93a" hat="#fff" /><Cone x={px + 14} y={35} s={0.8} /></g>
        return <g key={i}><Cone x={px - 8} y={35} /><Cone x={px + 2} y={35} s={0.85} /><Cone x={px + 11} y={35} /><Worker x={px + 22} y={35} s={0.6} vest="#f08a24" /></g>
      })}
    </>
  )
}

// ------------------------------------------------------------------
// World Environment Day: hills, a river, wind and sun
// ------------------------------------------------------------------
const Turbine = ({ x, y, h = 20, blade = 9, delay = 0 }) => (
  <g transform={`translate(${n1(x)} ${n1(y)})`}>
    <path d={`M-.900 0L-.400 ${-h}h.800L.900 0z`} fill="#fff" stroke="#8fa596" strokeWidth="0.400" />
    <g transform={`translate(0 ${-h})`}>
      <g className="qp-s-spin" style={{ animationDuration: '9s', animationDelay: `${delay}s` }}>
        <circle r={blade} fill="none" />
        {[0, 120, 240].map(a => <path key={a} transform={`rotate(${a + delay * 40})`} d={`M-.700 0Q-1.100 ${n1(-blade * 0.5)} 0 ${-blade}Q1.100 ${n1(-blade * 0.5)} .700 0z`} fill="#fff" stroke="#8fa596" strokeWidth="0.400" />)}
      </g>
      <circle r="1" fill="#e6efe9" stroke="#8fa596" strokeWidth="0.300" />
    </g>
  </g>
)
const GumTree = ({ x, y, h = 26, flip = false }) => (
  <g transform={`translate(${n1(x)} ${n1(y)}) scale(${flip ? -1 : 1} 1)`}>
    <path d={`M-1.500 0C-1 ${-h * 0.4} -2.500 ${-h * 0.6} -1 ${-h * 0.85}M-1.200 ${-h * 0.5}C2 ${-h * 0.62} 4 ${-h * 0.7} 6 ${-h * 0.86}M-1.800 ${-h * 0.62}C-4 ${-h * 0.7} -6 ${-h * 0.74} -8 ${-h * 0.84}`} fill="none" stroke="#f1ece0" strokeWidth="2.200" strokeLinecap="round" />
    <path d={`M-1.500 0C-1 ${-h * 0.4} -2.500 ${-h * 0.6} -1 ${-h * 0.85}M-1.200 ${-h * 0.5}C2 ${-h * 0.62} 4 ${-h * 0.7} 6 ${-h * 0.86}M-1.800 ${-h * 0.62}C-4 ${-h * 0.7} -6 ${-h * 0.74} -8 ${-h * 0.84}`} fill="none" stroke="#a79b84" strokeWidth="0.500" strokeLinecap="round" strokeDasharray="2 3" />
    {[[-9, -0.86, 5.2, '#6fae6b'], [-2, -0.96, 6, '#5a9a5c'], [6.5, -0.9, 5.4, '#7fba76'], [1.5, -0.8, 4.4, '#8cc481'], [-5.5, -0.74, 4, '#7fba76']].map(([dx, k, rr, c]) => <ellipse key={dx} cx={dx} cy={n1(h * k)} rx={n1(rr * 1.15)} ry={rr} fill={c} stroke="#4f8650" strokeWidth="0.400" />)}
  </g>
)
const RoundTree = ({ x, y, h = 12, fill = '#5a9a5c' }) => (
  <g transform={`translate(${n1(x)} ${n1(y)})`}><path d={`M0 0V${n1(-h * 0.5)}`} stroke="#7b6248" strokeWidth="1.100" /><ellipse cy={n1(-h * 0.68)} rx={n1(h * 0.36)} ry={n1(h * 0.4)} fill={fill} stroke="#4f8650" strokeWidth="0.400" /></g>
)
const SolarFarm = ({ x, y }) => (
  <g transform={`translate(${n1(x)} ${n1(y)})`}>
    {range(4).map(i => (
      <g key={i} transform={`translate(${i * 13} ${-i * 0.6})`}>
        <path d="M2 0v-3M9 -1v-3" stroke="#6b7a85" strokeWidth="0.600" /><path d="M-1 -3.500L9.500 -7.500 12 -4.500 1.500 -.5z" fill="#3f6aa3" stroke="#274b7c" strokeWidth="0.400" /><path d="M2.500 -5.200L5 -2M6 -6.400L8.500 -3.200M.300 -2.100L10.800 -6" stroke="#9cc0ea" strokeWidth="0.300" />
      </g>
    ))}
  </g>
)
function environment() {
  const r = seeded(606)
  const peaks = roll([5, 3.6, 0.4], [11, 1.8, 2.2], [23, 0.8, 0.9]), mid = roll([4, 2.6, 1.9], [9, 1.3, 0.3]), near = roll([3, 1.5, 3.1], [7, 0.9, 1.2])
  const midY = (x) => 27 - mid(x), gy = (x) => 32.5 - near(x)
  const farms = [[236, 5], [1010, 4], [1650, 6], [2210, 4]]  // where the wind farms stand, and how many turbines
  const rivers = [330, 1280, 2040]
  const clear = [...farms.map(([x, n]) => [x - 14, x + n * 26]), ...rivers.map(x => [x - 46, x + 46]), [0, 60], [640, 700], [1440, 1500]]
  return (
    <>
      <circle cx="560" cy="9" r="13" fill="#f7dc84" opacity="0.3" /><circle cx="560" cy="9" r="6.500" fill="#f7d064" stroke="#e0b23a" strokeWidth="0.500" />
      {range(12).map(i => <path key={i} transform={`rotate(${i * 30} 560 9)`} d="M560 -1v-3.500" stroke="#e9c04a" strokeWidth="0.800" strokeLinecap="round" />)}
      {along(r, 150, 330, [[500, 620]], (x, k) => <Cloud key={`c${k}`} x={n1(x)} y={n1(between(r, 1, 6))} s={n1(between(r, 0.42, 0.62))} opacity={0.9} />)}
      {along(r, 90, 240, [[520, 600]], (x, k) => { const y = between(r, 4, 13); return <path key={`b${k}`} d={`M${n1(x - 3)} ${n1(y)}q1.500-2 3 0 1.500-2 3 0`} fill="none" stroke="#5d7a63" strokeWidth="0.700" strokeLinecap="round" /> })}
      <path d={ground(peaks, 22)} fill="#cfe5cf" />
      <path d={ground(mid, 27)} fill="#a9d49f" />
      {farms.map(([x0, n]) => range(n).map(i => { const x = x0 + i * 26 + (i % 2) * 6; return <Turbine key={x} x={x} y={midY(x) + 1} h={15 + ((i * 5) % 9)} blade={7 + (i % 3)} delay={i * 0.7} /> }))}
      {along(r, 24, 70, clear, (x, k) => <RoundTree key={`m${k}`} x={n1(x)} y={n1(midY(x) + 1)} h={between(r, 8, 12)} fill={pick(r, ['#7fba76', '#6fae6b', '#8cc481'])} />)}
      <SolarFarm x={96} y={midY(120) + 3.500} /><SolarFarm x={1500} y={midY(1524) + 3.500} />
      <path d={ground(near, 32.5)} fill="#84c07c" />
      {rivers.map(x => <path key={x} d={`M${x - 3} ${n1(midY(x) + 2)}C${x + 10} ${n1(midY(x) + 5)} ${x - 22} 31 ${x - 30} 36H${x + 34}C${x + 26} 31 ${x + 24} ${n1(midY(x) + 6)} ${x + 3} ${n1(midY(x) + 2)}z`} fill="#8fcbe0" stroke="#5ea6c2" strokeWidth="0.500" />)}
      {rivers.map(x => <path key={x} d={`M${x - 6} 31.500q4-1.200 8 0M${x + 4} 34q4-1.200 8 0M${x - 2} 28q3-1 6 0`} fill="none" stroke="#fff" strokeWidth="0.500" strokeLinecap="round" opacity="0.8" />)}
      {along(r, 30, 96, clear, (x, k) => (k % 4 === 0 ? <Pine key={`n${k}`} x={n1(x)} y={n1(gy(x) + 1.5)} h={between(r, 13, 19)} fill="#3f8f52" snow={null} /> : <RoundTree key={`n${k}`} x={n1(x)} y={n1(gy(x) + 1)} h={between(r, 12, 18)} fill={pick(r, ['#3f8f52', '#4f9e58', '#2f7a48'])} />))}
      <GumTree x={22} y={36} h={31} /><GumTree x={668} y={36} h={30} flip /><GumTree x={1468} y={36} h={32} /><GumTree x={2380} y={36} h={30} flip />
      {along(r, 10, 30, [], (x, k) => <circle key={`f${k}`} cx={n1(x)} cy={n1(gy(x) + between(r, 1.5, 3.2))} r="0.700" fill={k % 2 ? '#fff' : '#f7d064'} />)}
    </>
  )
}

// ------------------------------------------------------------------
// Tour de France: the race through the mountains and the sunflower fields
// ------------------------------------------------------------------
const SLATE = '#44546b'
const Sunflower = ({ x, y, h = 12, s = 1, lean = 0 }) => (
  <g transform={`translate(${n1(x)} ${n1(y)}) scale(${s})`}>
    <path d={`M0 0Q${lean} ${n1(-h / 2)} ${n1(lean * 0.6)} ${-h}`} fill="none" stroke="#5a9a4f" strokeWidth="1.100" strokeLinecap="round" />
    <path d={`M0 ${n1(-h * 0.45)}c-3-1.500-5-.5-5.500 1.500 2.500.5 4.500-.2 5.500-1.500zM0 ${n1(-h * 0.3)}c3-1.500 5-.5 5.500 1.500-2.500.5-4.500-.2-5.500-1.500z`} fill="#6fb060" />
    <g transform={`translate(${n1(lean * 0.6)} ${-h})`}>
      {range(10).map(k => <ellipse key={k} cy="-3.300" rx="1.200" ry="2.300" fill={k % 2 ? '#f6c62f' : '#f9d84a'} transform={`rotate(${k * 36})`} />)}
      <circle r="2.100" fill="#6b4423" stroke="#4a2e16" strokeWidth="0.400" />
    </g>
  </g>
)
const Fan = ({ x, y, shirt = '#2f6fb5', flag = null, s = 1, flip = false }) => (
  <g transform={`translate(${n1(x)} ${n1(y)}) scale(${flip ? -s : s} ${s})`}>
    <path d="M-1.600 -6.500h3.200l.6 6.500h-4.400z" fill={shirt} /><circle cy="-8.300" r="1.800" fill="#e9b98f" />
    <path d="M1.600 -5.800l2.600-3.600" stroke={shirt} strokeWidth="1.200" strokeLinecap="round" />
    {flag && <g><path d="M4.200 -9.400v-6" stroke={SLATE} strokeWidth="0.500" /><rect x="4.200" y="-15.400" width="1.800" height="3.600" fill={flag[0]} /><rect x="6" y="-15.400" width="1.800" height="3.600" fill={flag[1]} /><rect x="7.800" y="-15.400" width="1.800" height="3.600" fill={flag[2]} /></g>}
  </g>
)
function tour() {
  const r = seeded(721)
  // the mountains: a broken line of peaks
  const peaks = []
  let px = -20
  while (px < W + 40) { peaks.push([px, between(r, 5, 22)]); px += between(r, 26, 62) }
  let ridge = `M0 ${H}`, caps = []
  peaks.forEach(([x, top], k) => {
    ridge += `L${n1(x)} ${n1(top)}`
    const next = peaks[k + 1]
    if (next) ridge += `L${n1((x + next[0]) / 2 + between(r, -6, 6))} ${n1(Math.max(top, next[1]) + between(r, 5, 9))}`
    if (top < 13) caps.push(<path key={`s${k}`} d={`M${n1(x)} ${n1(top)}l5 6.500-2.400-1.200-1.600 2.200-1.800-2.400-2.200 1.600-2-1.200z`} fill="#fff" />)
  })
  ridge += `L${W} ${H}z`
  const hills = roll([4, 1.8, 0.7], [9, 1, 2.4]), front = roll([5, 0.9, 1.3], [12, 0.5, 0.2])
  const hy = (x) => 28.5 - hills(x), fy = (x) => 32 - front(x)
  const jerseys = ['#e23b3b', '#2f9b5c', '#2f6fb5', '#f08a24', '#7a4fc0', '#1f8aa3', '#f3f4f6', '#c2357a', '#3b4656']
  const groups = [[58, 3, 'break'], [286, 9, 'peloton']]
  let gx = 520
  while (gx < W - 120) { const n = 1 + Math.floor(r() * 8); groups.push([gx, n, n > 5 ? 'peloton' : 'chase']); gx += n * 13 + between(r, 150, 330) }
  const fans = [[170, 4], [226, 3], [470, 5], [1196, 6], [1620, 4], [2190, 7]]
  const fields = [[130, 60], [430, 70], [760, 90], [1090, 60], [1380, 80], [1760, 70], [2060, 60]]
  return (
    <>
      <path d={ridge} fill="#b9c7dd" stroke="#8fa2c0" strokeWidth="0.500" strokeLinejoin="round" />{caps}
      <path d="M2302 33l5.400-16h1.200l5.400 16h-2.600l-1.300-4.600h-4.200l-1.300 4.600zM2305 22h7M2303.600 27h9.800M2307.400 17l.6-9 .6 9z" fill="#7b8798" stroke="#7b8798" strokeWidth="0.500" />
      <path d={ground(hills, 28.5)} fill="#c3dd9e" />
      {fields.map(([x0, w]) => range(Math.floor(w / 4)).map(k => { const x = x0 + k * 4 + (k % 2); return <circle key={`${x0}${k}`} cx={n1(x)} cy={n1(hy(x) + 1.2 + (k % 3))} r="1" fill="#f6c62f" /> }))}
      {along(r, 70, 210, fields.map(([x0, w]) => [x0 - 10, x0 + w + 10]), (x, k) => (k % 2 ? <g key={`v${k}`} transform={`translate(${n1(x)} ${n1(hy(x) + 1)})`}><circle cy="-2.600" r="2.600" fill="#e9cf7a" stroke="#c9a94a" strokeWidth="0.400" /><path d="M-1.300 -2.600a1.300 1.300 0 1 0 1.300-1.300" fill="none" stroke="#c9a94a" strokeWidth="0.400" /></g> : <Pine key={`v${k}`} x={n1(x)} y={n1(hy(x) + 1.5)} h={between(r, 9, 13)} fill="#5a9a5c" snow={null} />))}
      <path d={ground(front, 32)} fill="#a5cf86" />
      {[[150, 3], [448, 4], [800, 5], [1108, 3], [1400, 4], [1790, 5], [2080, 3]].map(([x0, n]) => range(n).map(k => <Sunflower key={`${x0}${k}`} x={x0 + k * 11} y={fy(x0 + k * 11) + 1.5} h={11 + ((k * 5) % 7)} s={1} lean={(k % 3) - 1} />))}
      <rect x="0" y="32.800" width={W} height="3.200" fill="#8d939c" /><path d={`M0 34.400H${W}`} stroke="#fff" strokeWidth="0.500" strokeDasharray="5 6" opacity="0.8" />
      {fans.map(([x0, n], g) => range(n).map(k => <Fan key={`${x0}${k}`} x={x0 + k * 7} y={33} s={0.95 + (k % 2) * 0.1} shirt={jerseys[(g + k * 2) % jerseys.length]} flip={k % 2 === 1} flag={k % 2 === 0 ? [['#2f55a4', '#fff', '#e23b3b'], ['#2f9b5c', '#fff', '#e23b3b'], ['#f6c62f', '#f6c62f', '#f6c62f']][(g + k) % 3] : null} />))}
      {/* the red kite: one kilometre to go */}
      <g transform="translate(1250 0)"><path d="M-17 33V7M17 33V7" stroke="#c9d2dc" strokeWidth="1.600" /><path d="M-18.500 5.500h37v4.500h-37z" fill="#e23b3b" stroke="#a82a2a" strokeWidth="0.400" /><path d="M-4.500 10h9l-4.500 8z" fill="#e23b3b" stroke="#a82a2a" strokeWidth="0.400" /></g>
      {/* the finish line */}
      <g transform="translate(2236 0)"><path d="M-19 33V6M19 33V6" stroke="#3b4656" strokeWidth="1.600" /><rect x="-20.500" y="4.500" width="41" height="5.500" fill="#fff" stroke="#3b4656" strokeWidth="0.400" />{range(16).map(k => <rect key={k} x={-20.5 + k * 2.56} y={k % 2 ? 4.5 : 7.25} width="2.560" height="2.750" fill="#3b4656" />)}</g>
      {groups.map(([x0, n, kind], g) => range(n).map(k => {
        const lead = kind === 'peloton' && k === n - 1 && g === 1
        return <Cyclist key={`${x0}${k}`} x={x0 + k * (kind === 'peloton' ? 9.5 : 15) + (k % 2)} y={31.6 + (k % 3) * 0.5} s={0.5} jersey={lead ? '#f6cf2f' : kind === 'break' && k === 1 ? '#fff' : jerseys[(g * 3 + k) % jerseys.length]} dots={kind === 'break' && k === 1} helmet={jerseys[(g + k + 4) % jerseys.length]} delay={(k % 4) * 0.2} />
      }))}
    </>
  )
}

// ------------------------------------------------------------------
// Ekka: the show comes to town
// ------------------------------------------------------------------
const SHOW = '#7a3340'
const Wheel = ({ x, r = 14, base = 34 }) => {
  const cy = base - r - 4
  return (
    <g transform={`translate(${x} ${cy})`}>
      <path d={`M0 0L${n1(-r * 0.55)} ${r + 4}M0 0L${n1(r * 0.55)} ${r + 4}`} stroke="#5c6672" strokeWidth="1.500" strokeLinecap="round" /><path d={`M${n1(-r * 0.8)} ${r + 4}h${n1(r * 1.6)}`} stroke="#5c6672" strokeWidth="1.400" strokeLinecap="round" />
      <g className="qp-s-spin" style={{ animationDuration: '50s' }}>
        <circle r={r} fill="none" stroke="#e8475f" strokeWidth="1.300" /><circle r={n1(r * 0.62)} fill="none" stroke="#f3a3b0" strokeWidth="0.600" />
        {range(5).map(k => <path key={k} d={`M${-r} 0H${r}`} stroke="#8b94a1" strokeWidth="0.500" transform={`rotate(${k * 36})`} />)}
        {range(10).map(k => <circle key={k} cy={-r} r="2" fill={['#f6c445', '#1f8aa3', '#f7a8cf', '#e8475f', '#9fd4f5'][k % 5]} stroke={SHOW} strokeWidth="0.400" transform={`rotate(${k * 36})`} />)}
      </g>
      <circle r="2" fill="#f6c445" stroke={SHOW} strokeWidth="0.400" />
    </g>
  )
}
const BigTop = ({ x, w = 44, h = 27, a = '#e8475f', b = '#fff3d6', base = 34 }) => {
  const wall = h * 0.4, n = 8, slice = w / n
  return (
    <g transform={`translate(${x} ${base})`}>
      {range(n).map(k => <rect key={k} x={n1(-w / 2 + k * slice)} y={-wall} width={n1(slice)} height={wall} fill={k % 2 ? a : b} />)}
      {range(n).map(k => <path key={k} d={`M0 ${-h}L${n1(-w / 2 - 2 + k * ((w + 4) / n))} ${-wall}H${n1(-w / 2 - 2 + (k + 1) * ((w + 4) / n))}z`} fill={k % 2 ? b : a} />)}
      <path d={`M0 ${-h}L${-w / 2 - 2} ${-wall}H${w / 2 + 2}z`} fill="none" stroke={SHOW} strokeWidth="0.500" strokeLinejoin="round" /><rect x={-w / 2} y={-wall} width={w} height={wall} fill="none" stroke={SHOW} strokeWidth="0.500" />
      {range(n).map(k => <circle key={k} cx={n1(-w / 2 - 2 + (k + 0.5) * ((w + 4) / n))} cy={-wall + 0.600} r={n1((w + 4) / n / 2)} fill={k % 2 ? b : a} stroke={SHOW} strokeWidth="0.300" />)}
      <path d={`M-3.500 0v${n1(-wall * 0.8)}a3.500 3.500 0 0 1 7 0V0z`} fill={SHOW} />
      <path d={`M0 ${-h}v-4.500`} stroke={SHOW} strokeWidth="0.600" /><path className="qp-s-sway" d={`M0 ${-h - 4.5}l5.500 1.600L0 ${-h - 1.2}z`} fill="#f6c445" />
    </g>
  )
}
const Stall = ({ x, w = 22, a = '#1f8aa3', b = '#fff3d6', base = 34, prizes = ['#f6c445', '#f7a8cf', '#e8475f'] }) => (
  <g transform={`translate(${x} ${base})`}>
    <path d={`M${-w / 2 + 1} 0v-15M${w / 2 - 1} 0v-15`} stroke="#8a6a4f" strokeWidth="1" /><rect x={-w / 2} y="-6.500" width={w} height="6.500" fill="#f4ead9" stroke={SHOW} strokeWidth="0.500" />
    <path d={`M${-w / 2 + 2} -3.200h${w - 4}`} stroke={a} strokeWidth="1.400" />
    {range(6).map(k => <path key={k} d={`M${n1(-w / 2 - 1.5 + k * ((w + 3) / 6))} -19h${n1((w + 3) / 6)}v4.500a${n1((w + 3) / 12)} ${n1((w + 3) / 12)} 0 0 1 ${n1(-(w + 3) / 6)} 0z`} fill={k % 2 ? b : a} stroke={SHOW} strokeWidth="0.300" />)}
    {prizes.map((c, k) => <g key={k}><path d={`M${n1(-w / 4 + k * (w / 4))} -14v2`} stroke="#8a6a4f" strokeWidth="0.300" /><circle cx={n1(-w / 4 + k * (w / 4))} cy="-10.600" r="1.600" fill={c} /></g>)}
  </g>
)
const Sundae = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} stroke={SHOW} strokeWidth="0.400" strokeLinejoin="round">
    <path d="M-3.600 -9L0 0 3.600 -9z" fill="#e0a85a" /><path d="M-2.400 -6.500l3.500-2.500M-1.100 -3.300l3.400-3M-2.900 -8.800l4.400 5.800M.2 -8.900l1.900 3" fill="none" stroke="#b97f35" strokeWidth="0.400" />
    <circle cy="-11.200" r="4.200" fill="#f58fa8" /><path d="M-3.800 -13.600c0-2.800 1.500-4.600 3.800-4.600s3.800 1.800 3.800 4.600c-1.300 1.100-6.300 1.100-7.600 0z" fill="#fff7e6" />
    <path d="M0 -22.200c-1.700 0-2.500 1.100-2.500 2.200 0 1.600 1.300 2.900 2.500 3.400 1.200-.5 2.500-1.800 2.500-3.400 0-1.100-.8-2.200-2.500-2.200z" fill="#e8475f" /><path d="M-1.400 -22l1.400.9 1.400-.9" fill="none" stroke="#3fa34d" strokeWidth="0.800" />
  </g>
)
const Cow = ({ x, y, s = 1, flip = false, ribbon = '#1f8aa3' }) => (
  <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`} stroke="#5c4a3d" strokeWidth="0.500" strokeLinejoin="round">
    <path d="M-7 -4.500V0h1.800v-4M-3.500 -4.500V0h1.800v-4M3.500 -4.500V0h1.800v-4M6.500 -4.500V0h1.800v-4" fill="#fff" />
    <path d="M-9 -8c-2 .5-2.500 3-2.200 5.500" fill="none" /><rect x="-9" y="-12" width="18.500" height="8.500" rx="3.400" fill="#fff" />
    <path d="M-6 -11.800c2.500-.4 4.200 1 3.600 3.200s-3.600 2.300-4.800.6M2 -6.500c1.200-1.900 4.200-1.800 4.800 0s-.6 2.800-2.400 2.800z" fill="#5c4a3d" stroke="none" />
    <path d="M8 -14.500h4.500c1.300 0 2 1 2 2.300v3.400c0 1-.8 1.800-1.800 1.800H9.500C8.500 -7 8 -7.800 8 -8.800z" fill="#fff" /><path d="M11 -9.600h3.500v1.800c0 .5-.4.800-.9.800H11z" fill="#f2b6c0" stroke="none" />
    <path d="M8.300 -14.300l-1.800-1.700M12.300 -14.500l1.200-1.900" fill="none" strokeLinecap="round" /><circle cx="11" cy="-12" r="0.600" fill="#3b2a2a" stroke="none" />
    <circle cx="3" cy="-12.500" r="2.300" fill={ribbon} stroke="#14607a" strokeWidth="0.300" /><circle cx="3" cy="-12.500" r="0.900" fill="#f6c445" stroke="none" /><path d="M1.800 -10.600l-.9 3.200 1.600-.8zM4.200 -10.600l.9 3.200-1.600-.8z" fill={ribbon} stroke="none" />
  </g>
)
const Balloons = ({ x, y, colours = ['#e8475f', '#f6c445', '#1f8aa3'] }) => (
  <g transform={`translate(${x} ${y})`}>
    {colours.map((c, k) => { const bx = (k - 1) * 5.5, by = -18 - (k % 2) * 4; return <g key={k} className="qp-s-bob" style={{ animationDelay: `${k * 0.5}s` }}><path d={`M0 0Q${bx * 0.3} ${by / 2} ${bx} ${by + 4.6}`} fill="none" stroke="#8a6a4f" strokeWidth="0.300" /><ellipse cx={bx} cy={by} rx="3.600" ry="4.500" fill={c} stroke={SHOW} strokeWidth="0.300" /><ellipse cx={bx - 1.2} cy={by - 1.6} rx="0.800" ry="1.300" fill="#fff" opacity="0.6" /></g> })}
  </g>
)
const Floss = ({ x, y, fill = '#f7a8cf' }) => (
  <g transform={`translate(${x} ${y})`}><path d="M0 0L-.600 -9" stroke="#f4ead9" strokeWidth="1" /><circle cx="-2.200" cy="-12" r="3" fill={fill} /><circle cx="1.800" cy="-12.600" r="3.200" fill={fill} /><circle cx="-.4" cy="-15.200" r="3" fill={fill} /><path d="M-3.400 -12c1-1.400 2.400-1.600 3.600-.6M.2 -14.600c1.200-.9 2.400-.6 3 .5" fill="none" stroke="#e77fae" strokeWidth="0.400" /></g>
)
const Bunting = ({ x, w, y = 3, colours = ['#e8475f', '#f6c445', '#1f8aa3', '#f7a8cf'] }) => {
  const n = Math.floor(w / 7)
  return (
    <g transform={`translate(${x} 0)`}>
      <path d={`M0 ${y}Q${w / 2} ${y + 7} ${w} ${y}`} fill="none" stroke="#8a6a4f" strokeWidth="0.500" />
      {range(n).map(k => { const t = (k + 0.5) / n, px = t * w, py = y + 7 * 2 * t * (1 - t); return <path key={k} d={`M${n1(px - 2.4)} ${n1(py)}h4.800l-2.400 5z`} fill={colours[k % colours.length]} stroke={SHOW} strokeWidth="0.200" /> })}
    </g>
  )
}
function ekka() {
  const r = seeded(808)
  const first = [[40, 'wheel'], [92, 'sundae'], [138, 'stall'], [196, 'cow'], [262, 'bigtop'], [322, 'balloons'], [362, 'floss']]
  const kinds = ['stall', 'cow', 'bigtop', 'balloons', 'sundae', 'stall2', 'wheel-small', 'floss', 'cows', 'bigtop-teal', 'wheel']
  const plots = [...first]
  let x = 430, last = ''
  while (x < W - 40) {
    let kind = pick(r, kinds)
    if (kind === last) kind = kinds[(kinds.indexOf(kind) + 3) % kinds.length]
    plots.push([x, kind]); last = kind
    x += { wheel: 58, 'wheel-small': 46, bigtop: 70, 'bigtop-teal': 64, stall: 44, stall2: 44, cow: 48, cows: 64, sundae: 38, balloons: 34, floss: 34 }[kind] + between(r, 4, 30)
  }
  return (
    <>
      <rect x="0" y="33.500" width={W} height="2.500" fill="#e3d3a4" />
      {[[112, 60], [700, 70], [1240, 56], [1830, 64], [2260, 60]].map(([bx, bw], k) => <Bunting key={bx} x={bx} w={bw} colours={k % 2 ? ['#1f8aa3', '#fff3d6', '#e8475f'] : undefined} />)}
      {plots.map(([px, kind], i) => {
        if (kind === 'wheel') return <Wheel key={i} x={px} r={14} />
        if (kind === 'wheel-small') return <Wheel key={i} x={px} r={10.5} />
        if (kind === 'sundae') return <Sundae key={i} x={px} y={34} s={1.36} />
        if (kind === 'stall') return <Stall key={i} x={px} />
        if (kind === 'stall2') return <Stall key={i} x={px} w={26} a="#e8475f" prizes={['#9fd4f5', '#f6c445', '#f7a8cf']} />
        if (kind === 'cow') return <Cow key={i} x={px} y={34} s={1.15} flip={i % 2 === 1} ribbon={i % 3 ? '#1f8aa3' : '#e8475f'} />
        if (kind === 'cows') return <g key={i}><Cow x={px - 14} y={34} s={1.15} ribbon="#e8475f" /><Cow x={px + 15} y={34} s={0.9} flip /></g>
        if (kind === 'bigtop') return <BigTop key={i} x={px} />
        if (kind === 'bigtop-teal') return <BigTop key={i} x={px} w={38} h={24} a="#1f8aa3" />
        if (kind === 'balloons') return <g key={i}><Fan x={px - 2} y={34} shirt="#1f8aa3" s={1.1} /><Balloons x={px + 3} y={24} colours={i % 2 ? ['#f7a8cf', '#9fd4f5', '#f6c445'] : undefined} /></g>
        return <g key={i}><Floss x={px - 6} y={34} /><Floss x={px + 5} y={34} fill="#9fd4f5" /><Fan x={px + 14} y={34} shirt="#e8475f" /></g>
      })}
    </>
  )
}

// ------------------------------------------------------------------
// Footy finals: under lights, both codes
// ------------------------------------------------------------------
const NAVY = '#1f2f55'
const club = (k) => CLUBS[['broncos', 'lions', 'titans', 'suns', 'dolphins', 'cowboys', 'storm', 'rabbitohs'][k % 8]]
const LeaguePosts = ({ x, k = 0 }) => (
  <g transform={`translate(${x} 0)`}>
    <path d="M-8.500 30V3M8.500 30V3" stroke="#fff" strokeWidth="2" /><path d="M-8.500 30V3M8.500 30V3" stroke="#aab4c4" strokeWidth="0.400" transform="translate(1.100 0)" /><path d="M-8.500 19h17" stroke="#fff" strokeWidth="1.800" />
    <rect x="-10.300" y="24" width="3.600" height="6" rx="0.800" fill={club(k)[0]} stroke={NAVY} strokeWidth="0.300" /><rect x="6.700" y="24" width="3.600" height="6" rx="0.800" fill={club(k)[0]} stroke={NAVY} strokeWidth="0.300" />
    <path d="M-10.300 26.500h3.600M6.700 26.500h3.600" stroke={club(k)[1]} strokeWidth="1" />
  </g>
)
const RulesPosts = ({ x, k = 1 }) => (
  <g transform={`translate(${x} 0)`}>
    {[[-13, 13], [-4.500, 2], [4.500, 2], [13, 13]].map(([dx, top]) => <g key={dx}><path d={`M${dx} 30V${top}`} stroke="#fff" strokeWidth="1.700" /><path d={`M${dx + 0.9} 30V${top}`} stroke="#aab4c4" strokeWidth="0.400" /><rect x={dx - 1.6} y="24.500" width="3.200" height="5.500" rx="0.700" fill={top < 5 ? club(k)[0] : club(k)[1]} stroke={NAVY} strokeWidth="0.300" /></g>)}
  </g>
)
const PoleFlag = ({ x, k, h = 20, delay = 0 }) => (
  <g transform={`translate(${x} 30)`}>
    <path d={`M0 0V${-h}`} stroke="#8b94a1" strokeWidth="0.800" />
    <g className="qp-s-sway" style={{ animationDelay: `${delay}s`, transformOrigin: '0% 50%' }}>
      <path d={`M0 ${-h}q4-1.600 8 0t8 0v7q-4 1.600-8 0t-8 0z`} fill={club(k)[0]} stroke={NAVY} strokeWidth="0.300" /><path d={`M0 ${-h + 2.6}q4-1.600 8 0t8 0v1.800q-4 1.600-8 0t-8 0z`} fill={club(k)[1]} />
    </g>
  </g>
)
const Stand = ({ x, w = 96, k = 0 }) => (
  <g transform={`translate(${x} 0)`}>
    <path d={`M0 30V9l${w} -4v25z`} fill="#d5dceb" stroke={NAVY} strokeWidth="0.500" strokeLinejoin="round" /><path d={`M-4 9.500l${w + 8} -4.300v-2.500l${-(w + 8)} 4.300z`} fill={NAVY} />
    {range(4).map(row => range(Math.floor(w / 4.4)).map(c => { const cx = 2.6 + c * 4.4 + (row % 2) * 2.2, top = 9 - (cx / w) * 4; const cy = top + 4.5 + row * 4.4; return cy < 28 ? <circle key={`${row}${c}`} cx={n1(cx)} cy={n1(cy)} r="1.500" fill={club(k + ((c + row * 3) % 4 < 2 ? 0 : 1))[(c + row) % 3 === 0 ? 1 : 0]} /> : null }))}
    <path d={`M0 30h${w}`} stroke={NAVY} strokeWidth="1" />
  </g>
)
const Lights = ({ x, flip = false }) => (
  <g transform={`translate(${x} 0) scale(${flip ? -1 : 1} 1)`}>
    <path d="M0 30V6" stroke="#8b94a1" strokeWidth="1.200" /><path d="M-5.500 1.500h11l-1.200 5h-8.600z" fill="#5c6672" stroke={NAVY} strokeWidth="0.300" />
    {[-3.300, -1.100, 1.100, 3.300].map(d => <circle key={d} className="qp-s-twinkle" cx={d} cy="3.900" r="0.800" fill="#fff6c8" />)}
    <path d="M-4.500 6.500L-13 24h26L4.500 6.500z" fill="#fff6c8" opacity="0.14" />
  </g>
)
const Cup = ({ x }) => (
  <g transform={`translate(${x} 30)`} stroke="#b9861f" strokeWidth="0.400" strokeLinejoin="round">
    <rect x="-5.500" y="-3.500" width="11" height="3.500" fill={NAVY} stroke="none" /><rect x="-3.500" y="-5.500" width="7" height="2" fill="#f0c247" />
    <path d="M-1 -5.500v-4h2v4z" fill="#f0c247" /><path d="M-6 -20h12c0 6-2.400 10.500-6 10.500S-6 -14-6 -20z" fill="#f6d36b" />
    <path d="M-6 -18.500c-3.600-.5-3.800 5 .9 5.600M6 -18.500c3.600-.5 3.800 5-.9 5.600" fill="none" strokeWidth="1" stroke="#f0c247" />
    <path d="M-3.300 -18.500c.2 3 1 5.200 2.200 6.600" fill="none" stroke="#fff" strokeWidth="0.700" strokeLinecap="round" opacity="0.7" />
    <path transform="translate(0 -24.500) scale(0.3)" fill="#f6d36b" stroke="none" d="M0 -10l2.900 6.300 6.900.8-5.100 4.700 1.400 6.800L0 5.200l-6.100 3.400 1.400-6.800-5.100-4.700 6.900-.8z" />
  </g>
)
function footy() {
  const r = seeded(909)
  const first = [[46, 'league'], [154, 'stand'], [290, 'cup'], [352, 'rules']]
  const kinds = ['league', 'rules', 'stand', 'flags', 'lights', 'cup', 'kick', 'flags2', 'stand2']
  const plots = [...first]
  let x = 470, last = ''
  while (x < W - 60) {
    let kind = pick(r, kinds)
    if (kind === last) kind = kinds[(kinds.indexOf(kind) + 2) % kinds.length]
    plots.push([x, kind]); last = kind
    x += { league: 110, rules: 110, stand: 130, stand2: 110, flags: 80, flags2: 66, lights: 50, cup: 60, kick: 90 }[kind] + between(r, 6, 36)
  }
  const arc = (x0, x1, top, key, ball) => {
    const mid = (x0 + x1) / 2, t = 0.72, bx = (1 - t) * (1 - t) * x0 + 2 * t * (1 - t) * mid + t * t * x1, by = (1 - t) * (1 - t) * 28 + 2 * t * (1 - t) * top + t * t * 12
    return <g key={key}><path d={`M${x0} 28Q${mid} ${top} ${x1} 12`} fill="none" stroke="#fff" strokeWidth="0.900" strokeDasharray="1 3" strokeLinecap="round" />{ball === 'red' ? <BallRed x={n1(bx)} y={n1(by)} s={0.56} rot={-30} /> : <BallPale x={n1(bx)} y={n1(by)} s={0.56} rot={-30} />}</g>
  }
  return (
    <>
      <rect x="0" y="29" width={W} height="7" fill="#58ad6a" />{range(W / 48).map(k => <rect key={k} x={k * 48} y="29" width="24" height="7" fill="#fff" opacity="0.1" />)}
      <path d={`M0 30.200H${W}`} stroke="#fff" strokeWidth="0.800" opacity="0.9" />
      {plots.map(([px, kind], i) => {
        if (kind === 'league') return <g key={i}><Lights x={px - 34} /><LeaguePosts x={px} k={i} />{arc(px + 62, px + 2, -4, 'a', 'pale')}</g>
        if (kind === 'rules') return <g key={i}><RulesPosts x={px} k={i + 1} />{arc(px - 58, px - 1, -6, 'a', 'red')}<Lights x={px + 36} flip /></g>
        if (kind === 'stand') return <g key={i}><Stand x={px - 48} k={i} /><PoleFlag x={px - 54} k={i} h={24} /><PoleFlag x={px + 54} k={i + 1} h={22} delay={0.6} /></g>
        if (kind === 'stand2') return <Stand key={i} x={px - 38} w={76} k={i + 2} />
        if (kind === 'flags') return <g key={i}>{range(4).map(k => <PoleFlag key={k} x={px - 30 + k * 20} k={i + k} h={16 + (k % 2) * 6} delay={k * 0.4} />)}</g>
        if (kind === 'flags2') return <g key={i}>{range(3).map(k => <PoleFlag key={k} x={px - 20 + k * 20} k={i + k + 4} h={22 - (k % 2) * 5} delay={k * 0.5} />)}</g>
        if (kind === 'lights') return <Lights key={i} x={px} flip={i % 2 === 0} />
        if (kind === 'cup') return <g key={i}><Cup x={px} /><Sparkle x={px - 9} y={9} s={0.5} /><Sparkle x={px + 10} y={14} s={0.4} delay={1} /></g>
        return <g key={i}>{arc(px - 36, px + 36, -8, 'a', i % 2 ? 'red' : 'pale')}<PoleFlag x={px + 40} k={i} h={18} /></g>
      })}
    </>
  )
}

// ------------------------------------------------------------------
// Halloween: the old house on the hill, by moonlight
// ------------------------------------------------------------------
const DUSK = '#40375a'
const BareTree = ({ x, y, h = 22, flip = false, stroke = DUSK }) => (
  <g transform={`translate(${n1(x)} ${n1(y)}) scale(${(flip ? -1 : 1) * (h / 22)} ${h / 22})`} fill="none" stroke={stroke} strokeLinecap="round">
    <path d="M0 0C1.200 -6 -1 -10 0 -17" strokeWidth="2" />
    <path d="M0 -8l-5.500-5.200-1-4.300M-3.500 -11.300l-3.800-.3M0 -11.500l5-4 .6-4.500M3.200 -14.200l3.800-1M0 -17l-2.300-4.500M0 -17l2.800-3.800M-5.500 -13.200l-2.500-2.500" strokeWidth="1" />
  </g>
)
const Tomb = ({ x, y, kind = 0, s = 1 }) => (
  <g transform={`translate(${n1(x)} ${n1(y)}) scale(${s})`} stroke="#8a84a6" strokeWidth="0.400">
    {kind === 0 && <path d="M-3.500 0v-6a3.500 3.500 0 0 1 7 0v6z" fill="#5c5676" />}
    {kind === 1 && <path d="M-1.300 0v-6.500h-2.400v-2.400h2.400v-2.800h2.600v2.800h2.400v2.400H1.300V0z" fill="#5c5676" />}
    {kind === 2 && <path d="M-3.200 0l.6-8.500h5.200L3.200 0z" fill="#5c5676" />}
    {kind !== 1 && <path d="M-1.600 -5h3.200M-1.600 -3.200h2.200" stroke="#8a84a6" strokeWidth="0.500" />}
  </g>
)
const HauntedHouse = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`}>
    <path d="M-15 0v-13l-2.500 .2L-8 -22l5 4.500V-25l-2 .2L-.5 -33 4 -25l-2-.2v10l3-2.300 9 8.300-2.500-.2V0z" fill="#3b3350" stroke="#5b5078" strokeWidth="0.500" strokeLinejoin="round" />
    <path d="M9 -17v-6h3v8.600" fill="#3b3350" stroke="#5b5078" strokeWidth="0.500" />
    <g className="qp-s-flicker" fill="#f7a02c"><path d="M-12 -10.500h3.600v4H-12zM-1.800 -23.500a1.600 1.600 0 0 1 3.200 0v3.500h-3.200zM5 -10h3.600v4H5z" /></g>
    <path d="M-10.200 -10.500v4M-12 -8.500h3.600M6.800 -10v4M5 -8h3.600" stroke="#3b3350" strokeWidth="0.500" />
    <path d="M-4.500 0v-6.500a2.300 2.300 0 0 1 4.600 0V0z" fill="#221d30" />
    <path d="M-18 0h36" stroke="#5b5078" strokeWidth="0.600" />
  </g>
)
const Fence = ({ x, y, n = 6 }) => (
  <g transform={`translate(${x} ${y})`} stroke="#6a6288" strokeWidth="0.800" strokeLinecap="round">
    <path d={`M-1 -3.500h${n * 4.4}M-1 -6.500h${n * 4.4}`} strokeWidth="0.500" />
    {range(n).map(k => <path key={k} d={`M${k * 4.4} 0V${-8.5 - (k % 3 === 1 ? 1 : 0)}`} transform={`rotate(${((k * 7) % 5) - 2} ${k * 4.4} 0)`} />)}
  </g>
)
const Cat = ({ x, y, flip = false }) => (
  <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`} fill="#17141f" stroke="#5b5078" strokeWidth="0.400" strokeLinejoin="round">
    <path d="M-3 0c-1-3 0-6 2.500-6.500V-9l1.300 1.300h1.400L3.500 -9v3c.5 2 .5 4 0 6z" /><path d="M-3 0c-2.500-.5-3.500-3-2.500-5.500" fill="none" strokeWidth="0.900" stroke="#17141f" />
    <circle cx="1.100" cy="-6.600" r="0.450" fill="#f7d064" stroke="none" /><circle cx="2.700" cy="-6.600" r="0.450" fill="#f7d064" stroke="none" />
  </g>
)
const Spider = ({ x, drop = 14, delay = 0 }) => (
  <g transform={`translate(${x} 0)`}>
    <g className="qp-s-sway" style={{ animationDelay: `${delay}s`, animationDuration: '6s' }}>
      <path d={`M0 0V${drop}`} stroke="#8a84a6" strokeWidth="0.300" />
      <g transform={`translate(0 ${drop + 1.6})`} stroke="#8a84a6" strokeWidth="0.400" fill="none"><path d="M-1.200 -.5l-2.300-1.600M-1.400 .3l-2.600 0M-1.200 1.100l-2.300 1.600M1.200 -.5l2.300-1.600M1.400 .3l2.600 0M1.200 1.100l2.300 1.600" /><ellipse rx="1.700" ry="2" fill="#2a2436" /></g>
    </g>
  </g>
)
function halloween() {
  const r = seeded(1031)
  const far = roll([4, 2.6, 0.2], [9, 1.3, 1.6]), near = roll([3, 1.2, 2.2], [8, 0.7, 0.9])
  const farY = (x) => 26 - far(x), gy = (x) => 32.5 - near(x)
  const first = [[60, 'house'], [128, 'graves'], [190, 'pumpkins'], [250, 'ghost'], [318, 'moon'], [372, 'cat']]
  const kinds = ['graves', 'pumpkins', 'ghost', 'tree', 'cat', 'ghosts', 'pumpkin-big', 'graves2', 'trees']
  const plots = [...first]
  let x = 450, last = '', n = 0
  while (x < W - 50) {
    let kind = n === 9 || n === 21 ? 'house' : n === 15 ? 'moon' : pick(r, kinds)
    if (kind === last) kind = kinds[(kinds.indexOf(kind) + 4) % kinds.length]
    plots.push([x, kind]); last = kind; n++
    x += { house: 76, moon: 70, graves: 62, graves2: 56, pumpkins: 54, 'pumpkin-big': 44, ghost: 46, ghosts: 62, tree: 46, trees: 70, cat: 52 }[kind] + between(r, 6, 34)
  }
  return (
    <>
      {along(r, 14, 46, [], (sx, k) => <circle key={`s${k}`} cx={n1(sx)} cy={n1(between(r, 2, 19))} r={n1(between(r, 0.3, 0.7))} fill="#fff" opacity={n1(between(r, 0.25, 0.7))} />)}
      <path d={ground(far, 26)} fill="#1c1826" />
      {along(r, 60, 150, plots.filter(([, k]) => k === 'house' || k === 'moon').map(([px]) => [px - 34, px + 34]), (tx, k) => <BareTree key={`ft${k}`} x={tx} y={farY(tx) + 1} h={between(r, 11, 16)} flip={k % 2 === 1} stroke="#2c2640" />)}
      <path d={ground(near, 32.5)} fill="#272233" />
      {[166, 540, 930, 1310, 1700, 2120].map((sx, k) => <Spider key={sx} x={sx} drop={9 + (k % 3) * 4} delay={k * 0.7} />)}
      {along(r, 90, 230, [[270, 370]], (bx, k) => <Bat key={`b${k}`} x={n1(bx)} y={n1(between(r, 4, 15))} s={n1(between(r, 0.6, 0.95))} fill={k % 2 ? '#8f7cc4' : '#b79cf0'} delay={(k % 4) * 0.15} />)}
      {plots.map(([px, kind], i) => {
        const y = gy(px) + 1
        if (kind === 'house') return <g key={i}><BareTree x={px - 26} y={y} h={22} /><HauntedHouse x={px} y={y} /><Bat x={px + 22} y={7} s={0.8} /></g>
        if (kind === 'moon') return (
          <g key={i}>
            <circle cx={px} cy="13" r="15" fill="#f6e7b0" opacity="0.12" /><circle cx={px} cy="13" r="10.500" fill="#f6e7b0" /><circle cx={px - 3.5} cy="10" r="2" fill="#e6d391" /><circle cx={px + 4} cy="15.500" r="2.600" fill="#e6d391" /><circle cx={px + 2.5} cy="8" r="1.100" fill="#e6d391" />
            <g transform={`translate(${px + 1} 13)`} fill="#17141f"><path d="M-11 2.500L9 -1.500" stroke="#17141f" strokeWidth="0.800" /><path d="M-11 2.500l-4.500-1.500.8 4.300z" /><path d="M-2.500 .5l1.500-5 3.500 1 .5 4.200z" /><circle cx=".8" cy="-5.600" r="1.500" /><path d="M-1.600 -6.600h4.800L1.300 -11.500z" /></g>
            <Bat x={px - 22} y={8} s={0.9} /><Bat x={px + 24} y={17} s={0.7} fill="#8f7cc4" delay={0.3} />
          </g>
        )
        if (kind === 'graves') return <g key={i}><Tomb x={px - 14} y={y} kind={0} s={1.25} /><Tomb x={px - 2} y={y} kind={1} s={1.2} /><Tomb x={px + 11} y={y} kind={2} s={1.1} /><Pumpkin x={px + 21} y={y - 4} s={0.42} face="smile" /></g>
        if (kind === 'graves2') return <g key={i}><Fence x={px - 22} y={y} n={5} /><Tomb x={px + 6} y={y} kind={0} s={1.5} /><Tomb x={px + 18} y={y} kind={1} s={1} /></g>
        if (kind === 'pumpkins') return <g key={i}><Pumpkin x={px - 11} y={y - 6} s={0.62} face="grin" /><Pumpkin x={px + 4} y={y - 4.6} s={0.48} face="ooh" /><Pumpkin x={px + 15} y={y - 5.4} s={0.55} face="smile" /></g>
        if (kind === 'pumpkin-big') return <Pumpkin key={i} x={px} y={y - 8.5} s={0.86} face="grin" />
        if (kind === 'ghost') return <g key={i}><Ghost x={px} y={17} s={1.05} /><Tomb x={px + 14} y={y} kind={0} s={1.1} /></g>
        if (kind === 'ghosts') return <g key={i}><Ghost x={px - 12} y={15} s={0.9} /><Ghost x={px + 6} y={20} s={0.7} delay={0.8} /><Pumpkin x={px + 20} y={y - 4.5} s={0.46} /></g>
        if (kind === 'tree') return <g key={i}><BareTree x={px} y={y} h={26} flip={i % 2 === 0} /><Fence x={px + 8} y={y} n={4} /></g>
        if (kind === 'trees') return <g key={i}><BareTree x={px - 14} y={y} h={20} /><BareTree x={px + 12} y={y} h={27} flip /><Pumpkin x={px} y={y - 4.5} s={0.46} face="ooh" /></g>
        return <g key={i}><Fence x={px - 12} y={y} n={7} /><Cat x={px + 4} y={y - 8.5} flip={i % 2 === 0} /></g>
      })}
    </>
  )
}

// ------------------------------------------------------------------
const STRIPS = {
  christmas: { draw: christmas },
  newyear: { draw: newyear },
  superbowl: { whole: superbowl },
  remembrance: { draw: remembrance },
  lunar: { draw: lunar },
  womens: { draw: womens },
  easter: { draw: easter },
  labour: { draw: labour },
  environment: { draw: environment },
  tour: { draw: tour },
  ekka: { draw: ekka },
  footy: { draw: footy },
  halloween: { draw: halloween },
}
// Each scene is worked out once, the first time it is shown
const drawn = new Map()
function sceneFor(seasonId) {
  if (!drawn.has(seasonId)) drawn.set(seasonId, STRIPS[seasonId].draw())
  return drawn.get(seasonId)
}

export function SeasonFrieze({ seasonId }) {
  const id = uid(useId())
  const strip = STRIPS[seasonId]
  if (!strip) return null
  if (strip.whole) return strip.whole(id)
  return (
    <svg width="100%" height={H} aria-hidden="true">
      <defs>
        <pattern id={id} width={W} height={H} patternUnits="userSpaceOnUse">{sceneFor(seasonId)}</pattern>
        {/* a slight wobble on every edge, so the drawing looks done by hand and not ruled */}
        <filter id={`${id}w`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="11" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <rect width="100%" height={H} fill={`url(#${id})`} filter={`url(#${id}w)`} />
    </svg>
  )
}
