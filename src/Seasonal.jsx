// src/Seasonal.jsx
// The pictures for the Seasonal theme. One set per season in seasons.js.
//
// Four places show them, and none of them can cover text:
//   SeasonStrip      a picture across the top of the page. It has its own row. (Drawings: seasonStrips.jsx)
//   SeasonBanner     a card at the top of the Dashboard with the season's scene. (Drawings: seasonArt.jsx)
//   SeasonSticker    a small picture beside the logo, in space that was empty.
//   SeasonParticles  snow, petals or sparkles drifting BEHIND the page, so cards and text sit over them.
//
// Every drawing here is original and generic: no team, league, event or company marks.
import { brisbaneToday, MONTH_NAMES } from './seasons'
import { useSeason } from './useSeason'
import { SeasonScene } from './seasonArt'
import { SeasonFrieze } from './seasonStrips'

// ------------------------------------------------------------------
// Small pieces for the sticker beside the logo, each drawn in a 24 x 24 box.
// ------------------------------------------------------------------
const G = ({ at = [0, 0, 1], className, children }) => (
  <g transform={`translate(${at[0]} ${at[1]}) scale(${at[2] ?? 1})`}><g className={className}>{children}</g></g>
)

const Spark = ({ color = '#f2c94c', ...p }) => (
  <G {...p}><path d="M12 2c.8 5.2 2.8 7.2 8 8-5.2.8-7.2 2.800-8 8-.8-5.2-2.8-7.2-8-8 5.2-.8 7.2-2.8 8-8z" fill={color} /></G>
)
const Holly = (p) => (
  <G {...p}>
    <path d="M11 13C6 14 3.500 11 2 7c4-.5 7.500 1 9 6z" fill="#1f7a4d" />
    <path d="M13 13c5 1 7.500-2 9-6-4-.5-7.500 1-9 6z" fill="#2a9460" />
    <circle cx="10.6" cy="15.6" r="2.1" fill="#c8323c" /><circle cx="13.6" cy="15.6" r="2.1" fill="#dd4a52" /><circle cx="12.1" cy="13.2" r="2.1" fill="#c8323c" />
  </G>
)
const Football = (p) => (
  <G {...p}>
    <g transform="rotate(-28 12 12)">
      <path d="M1.500 12Q12 2.500 22.500 12 12 21.500 1.500 12z" fill="#8b4a2b" />
      <path d="M4.500 12Q12 5.500 19.500 12" fill="none" stroke="#a9623c" strokeWidth="1" />
      <path d="M8 12h8M9.500 10.600v2.800M12 10.600v2.800M14.500 10.600v2.800" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" />
    </g>
  </G>
)
const Lantern = (p) => (
  <G {...p}>
    <path d="M12 0v4" stroke="#b8862b" strokeWidth="1" />
    <rect x="8.500" y="3.600" width="7" height="2" rx="0.8" fill="#f0b840" />
    <ellipse cx="12" cy="11.500" rx="7.500" ry="6.200" fill="#d6362f" />
    <path d="M12 5.400v12.200M8.300 6.200Q6 11.500 8.300 16.800M15.700 6.200Q18 11.500 15.700 16.800" fill="none" stroke="#a81f24" strokeWidth="0.9" />
    <rect x="8.500" y="17.200" width="7" height="2" rx="0.8" fill="#f0b840" />
    <path d="M12 19.200v4.300M10.600 21v2.500M13.400 21v2.500" stroke="#f0b840" strokeWidth="0.9" strokeLinecap="round" />
  </G>
)
const Bow = ({ color = '#ec5f9c', deep = '#c2357a', ...p }) => (
  <G {...p}>
    <path d="M11 13.500L7 22l3.200-1.200L12 23l1-8z" fill={deep} /><path d="M13 13.500L17 22l-3.200-1.200L12 23l-1-8z" fill={deep} />
    <path d="M11.200 12C8 6.500 3 5.500 1.500 7.500c-1.200 1.800-.6 6.800.4 8.300C3.500 18 8.500 16 11.200 12z" fill={color} />
    <path d="M12.800 12C16 6.500 21 5.500 22.500 7.500c1.200 1.800.6 6.800-.4 8.300C20.500 18 15.500 16 12.800 12z" fill={color} />
    <path d="M10.500 11.600C8 9.400 5.200 9 3.800 9.800M13.500 11.600C16 9.400 18.800 9 20.200 9.800" fill="none" stroke={deep} strokeWidth="0.9" strokeLinecap="round" opacity="0.6" />
    <rect x="9.800" y="9.600" width="4.400" height="4.800" rx="1.800" fill={deep} />
  </G>
)
const EGG = 'M12 2C7.600 2 4.400 8.600 4.400 13.600a7.600 7.600 0 0 0 15.200 0C19.600 8.600 16.400 2 12 2z'
const Egg = ({ color = '#a9d3f5', mark = '#fff', kind = 'bands', ...p }) => (
  <G {...p}>
    <path d={EGG} fill={color} />
    {kind === 'bands' && <path d="M5.300 10.200h13.400M4.500 14.600h15" stroke={mark} strokeWidth="1.700" strokeLinecap="round" opacity="0.85" />}
    {kind === 'zigzag' && <path d="M5 12.800l2.300-2.600 2.400 2.600 2.300-2.600 2.300 2.600 2.400-2.600 2.300 2.600" fill="none" stroke={mark} strokeWidth="1.500" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />}
    {kind === 'dots' && [[9, 8.500], [14.500, 9.500], [7.500, 13.500], [12, 14], [16.500, 14.500], [10, 18], [14.500, 18.300]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.150" fill={mark} opacity="0.9" />)}
  </G>
)
const HardHat = (p) => (
  <G {...p}>
    <path d="M4 16.200a8 8 0 0 1 16 0z" fill="#f4c430" />
    <path d="M10.400 8.400a8 8 0 0 1 3.200 0v7.800h-3.200z" fill="#f9dc6b" />
    <rect x="2" y="15.800" width="20" height="3.200" rx="1.600" fill="#e0ac14" />
  </G>
)
const Leaf = ({ color = '#3fa34d', vein = '#2c7d39', ...p }) => (
  <G {...p}>
    <path d="M12 22C4.500 17.500 3.500 9 12 2c8.500 7 7.500 15.500 0 20z" fill={color} />
    <path d="M12 21V6M12 10.500l-3-2.300M12 14l3.400-2.600M12 17l-3.200-2.200" fill="none" stroke={vein} strokeWidth="0.9" strokeLinecap="round" />
  </G>
)
const Jersey = ({ color = '#f6cf2f', dots = false, ...p }) => (
  <G {...p}>
    <path d="M8 3l-6 3.500 2.300 4.300L6.500 9.700V21h11V9.700l2.200 1.100L22 6.500 16 3c-.6 1.700-2.100 2.800-4 2.800S8.600 4.700 8 3z" fill={color} />
    {dots && [[9.500, 11], [14, 10.500], [11.800, 14.500], [9, 17.500], [15, 16.800]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.300" fill="#e23b3b" />)}
  </G>
)
const Strawberry = (p) => (
  <G {...p}>
    <path d="M12 22c-5-3-8-7.500-8-11.500C4 7 7.500 6 12 7.500 16.500 6 20 7 20 10.500c0 4-3 8.500-8 11.500z" fill="#e8475f" />
    {[[8.500, 11], [12, 10.500], [15.500, 11], [10, 14.500], [14, 14.500], [12, 18]].map(([x, y]) => <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="0.650" ry="0.950" fill="#fde9a6" />)}
    <path d="M12 8C10 4.500 7 4.500 5.500 6c2 .2 3.500 1 4.500 2.300zM12 8c2-3.500 5-3.500 6.500-2-2 .2-3.500 1-4.500 2.300zM12 8.300V3.500" fill="#3fa34d" stroke="#3fa34d" strokeWidth="1" strokeLinejoin="round" strokeLinecap="round" />
  </G>
)
const RugbyBall = (p) => (
  <G {...p}>
    <g transform="rotate(-24 12 12)">
      <ellipse cx="12" cy="12" rx="10.500" ry="6.300" fill="#f3ead8" />
      <path d="M6.500 6.700Q4.800 12 6.500 17.300M17.500 6.700Q19.200 12 17.500 17.300" fill="none" stroke="#2f6fb5" strokeWidth="1.700" />
      <path d="M9.500 12h5" stroke="#b9ad97" strokeWidth="0.9" strokeLinecap="round" />
    </g>
  </G>
)
const Pumpkin = ({ face = true, ...p }) => (
  <G {...p}>
    <path d="M11.300 6c0-2 1-3.200 2.700-3.500l.5 1.700c-.9.200-1.400.8-1.400 1.800z" fill="#5f8a3a" />
    <ellipse cx="6.800" cy="13.500" rx="4.800" ry="7" fill="#d9701c" /><ellipse cx="17.200" cy="13.500" rx="4.800" ry="7" fill="#d9701c" />
    <ellipse cx="12" cy="13.500" rx="5.600" ry="7.600" fill="#f08a24" />
    {face && <g className="qp-s-flicker" fill="#ffd166"><path d="M7.600 10.600l2.400 2.400H6.400zM16.400 10.600l1.200 2.400h-3.600zM6.600 15.400h10.800l-1.700 3-1.700-1.500-2 1.800-2-1.800-1.700 1.500z" /></g>}
  </G>
)
const Poppy = (p) => (
  <G {...p}>
    <ellipse cx="7.600" cy="8" rx="6.600" ry="6" fill="#b00e28" transform="rotate(-18 7.600 8)" /><ellipse cx="16.400" cy="8" rx="6.600" ry="6" fill="#c8102e" transform="rotate(18 16.400 8)" />
    <ellipse cx="8" cy="15.800" rx="7" ry="5.800" fill="#d2203a" transform="rotate(14 8 15.800)" /><ellipse cx="16" cy="15.800" rx="7" ry="5.800" fill="#de3149" transform="rotate(-14 16 15.800)" />
    <circle cx="12" cy="12" r="3" fill="#1d1d1b" /><circle cx="12" cy="12" r="1.200" fill="#5d6b3f" />
  </G>
)

// ------------------------------------------------------------------
// The strip across the top of the page. It has a row to itself, so it never sits on text.
// ------------------------------------------------------------------
export function SeasonStrip() {
  const season = useSeason()
  if (!season) return null
  return (
    <div aria-hidden="true" data-testid="season-strip" className="-mx-4 md:-mx-5 -mt-4 md:-mt-5 mb-3 h-9 overflow-hidden pointer-events-none select-none">
      <SeasonFrieze seasonId={season.id} />
    </div>
  )
}

// ------------------------------------------------------------------
// The small picture beside the logo
// ------------------------------------------------------------------
const STICKERS = {
  christmas: <Holly />, newyear: <Spark />, superbowl: <Football />, lunar: <Lantern />, womens: <Bow />,
  easter: <Egg color="#c9b3f0" kind="zigzag" />, labour: <HardHat />, environment: <Leaf />, tour: <Jersey />,
  ekka: <Strawberry />, footy: <RugbyBall />, halloween: <Pumpkin />, remembrance: <Poppy />,
}

export function SeasonSticker({ size = 20 }) {
  const season = useSeason()
  if (!season || !STICKERS[season.id]) return null
  return (
    <svg data-testid="season-sticker" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="qp-sticker flex-shrink-0 pointer-events-none">
      <title>{season.name}</title>
      {STICKERS[season.id]}
    </svg>
  )
}

// ------------------------------------------------------------------
// The Dashboard banner: the greeting on the left, the season's scene on the right.
// They sit side by side, so the picture never runs under the words.
// ------------------------------------------------------------------
export function SeasonBanner() {
  const season = useSeason()
  if (!season) return null
  const today = brisbaneToday()
  const note = season.id === 'remembrance' ? 'Remembrance Day, 11 November' : `${MONTH_NAMES[season.month - 1]}'s seasonal theme`
  const fade = 'linear-gradient(90deg, transparent 0, #000 22%)'
  return (
    <div data-testid="season-banner" className="relative overflow-hidden rounded-xl border border-emerald-200 mb-4 flex items-stretch h-[96px] sm:h-[112px]"
      style={{ background: 'var(--color-emerald-50)' }}>
      <div className="min-w-0 flex-1 flex flex-col justify-center pl-4 pr-2">
        <div className="text-sm sm:text-base font-semibold text-gray-900 leading-snug" data-testid="season-greeting">{season.greeting}</div>
        <div className="text-xs text-gray-600 leading-snug mt-0.5">{note}</div>
      </div>
      <SeasonScene seasonId={season.id} year={today.year}
        className="flex-shrink-0 h-full max-w-[56%] sm:max-w-[66%] pointer-events-none select-none"
        style={{ aspectRatio: '480 / 112', maskImage: fade, WebkitMaskImage: fade }} />
    </div>
  )
}

// ------------------------------------------------------------------
// Snow, petals, leaves and sparkles. They drift behind the page: cards and text sit over them.
// ------------------------------------------------------------------
const DRIFT = {
  christmas: { way: 'fall', count: 16, colors: ['#ffffff'], shape: 'dot', size: [5, 9], shadow: '0 1px 2px rgba(70, 90, 110, 0.35)', opacity: 0.95 },
  newyear: { way: 'rise', count: 12, colors: ['#f2c94c', '#f7e3a1', '#f472b6', '#67e8f9'], shape: 'dot', size: [3, 6], opacity: 0.8 },
  lunar: { way: 'fall', count: 9, colors: ['#f6a5c0', '#f9c3d5'], shape: 'petal', size: [7, 11], opacity: 0.75 },
  womens: { way: 'fall', count: 9, colors: ['#f9b4d0', '#d9c4f5', '#f49ac1'], shape: 'petal', size: [7, 11], opacity: 0.7 },
  environment: { way: 'fall', count: 8, colors: ['#8fd18a', '#62b96a', '#b7dfa9'], shape: 'leaf', size: [8, 12], opacity: 0.7 },
}
const SHAPES = { dot: '50%', petal: '70% 0 70% 0', leaf: '0 70% 0 70%' }

export function SeasonParticles() {
  const season = useSeason()
  const drift = season && DRIFT[season.id]
  if (!drift) return null
  return (
    <div aria-hidden="true" data-testid="season-particles" className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      {Array.from({ length: drift.count }, (_, i) => {
        const size = drift.size[0] + ((i * 7) % (drift.size[1] - drift.size[0] + 1))
        return (
          <span key={i} className={drift.way === 'rise' ? 'qp-s-rise' : 'qp-s-fall'}
            style={{
              left: `${(i * 61 + 7) % 100}%`, width: size, height: size, opacity: drift.opacity,
              background: drift.colors[i % drift.colors.length], borderRadius: SHAPES[drift.shape], boxShadow: drift.shadow,
              animationDuration: `${16 + ((i * 5) % 13)}s`, animationDelay: `-${(i * 3.7) % 20}s`, '--qp-drift': `${(i % 2 ? 1 : -1) * (10 + (i * 3) % 18)}px`,
            }} />
        )
      })}
    </div>
  )
}
