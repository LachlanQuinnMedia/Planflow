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
import { Firework, Sparkle, BallPale, BallBrown, Poppy, Egg, Pumpkin, Bat, Tulip, Heart, Lantern, Bow } from './seasonArt'

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
// The nine seasons not redrawn yet still use their old garland: one short tile, repeated.
// ------------------------------------------------------------------
const rope = (w, dip) => `M0 4Q${w / 2} ${4 + dip * 2} ${w} 4`
const pennant = (x, y, a, b, c) => (
  <g key={x} transform={`translate(${x} ${y})`}>
    <path d="M0 0h16l-8 17z" fill={a} />{b && <path d="M3.300 0h3.200l-1.300 11.500z" fill={b} />}{b && <path d="M9.500 0h3.200L10.800 11.500z" fill={c || b} />}
  </g>
)
const bulb = (x, y, c, i) => (
  <g key={x} className="qp-s-twinkle" style={{ animationDelay: `${(i % 4) * 0.5}s` }}>
    <rect x={x - 1.300} y={y - 3} width="2.600" height="2.600" rx="0.5" fill="#5b6470" /><ellipse cx={x} cy={y + 2.600} rx="2.900" ry="3.900" fill={c} /><ellipse cx={x - 0.9} cy={y + 1.300} rx="0.8" ry="1.300" fill="#fff" opacity="0.6" />
  </g>
)
const OLD_GARLANDS = {
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
      {[[2, 5, 'broncos'], [22, 6.500, 'lions'], [42, 7.500, 'titans'], [100, 7.500, 'suns'], [120, 7.500, 'dolphins'], [140, 6.500, 'cowboys'], [160, 5, 'storm']].map(([x, y, club]) => pennant(x, y, ...CLUBS[club]))}
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
}

// ------------------------------------------------------------------
const STRIPS = {
  christmas: { draw: christmas },
  newyear: { draw: newyear },
  superbowl: { whole: superbowl },
  remembrance: { draw: remembrance },
}
// Each scene is worked out once, the first time it is shown
const drawn = new Map()
function sceneFor(seasonId) {
  if (!drawn.has(seasonId)) drawn.set(seasonId, STRIPS[seasonId].draw())
  return drawn.get(seasonId)
}

export function SeasonFrieze({ seasonId }) {
  const id = uid(useId())
  const strip = STRIPS[seasonId], old = OLD_GARLANDS[seasonId]
  if (strip?.whole) return strip.whole(id)
  if (!strip && !old) return null
  const art = strip ? sceneFor(seasonId) : old.tile
  const w = strip ? W : old.w, h = strip ? H : 30
  return (
    <svg width="100%" height={h} aria-hidden="true">
      <defs><pattern id={id} width={w} height={h} patternUnits="userSpaceOnUse">{art}</pattern></defs>
      <rect width="100%" height={h} fill={`url(#${id})`} />
    </svg>
  )
}
