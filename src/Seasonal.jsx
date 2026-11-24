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

// New Year: a bottle of champagne, cork just popped
const Champagne = (p) => (
  <G {...p}>
    <g transform="translate(0 -0.6) rotate(24 9 15)">
      <path d="M5 23.800V13.400c0-2.200 1.700-3 1.900-5.200V4.600h4.200v3.600c.2 2.200 1.900 3 1.900 5.200v10.400z" fill="#1f7a4d" />
      <path d="M6.300 14c0-1.500 1-2.200 1.300-3.700" fill="none" stroke="#6fbf95" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M6.900 4.600h4.200v3.600c.1.800.4 1.400.7 2H6.200c.3-.6.6-1.200.7-2z" fill="#e9c15a" />
      <rect x="5" y="14.800" width="8" height="5" fill="#f4ead9" /><path d="M6.400 17.300h5.200" stroke="#c9a23a" strokeWidth="0.9" />
      <path d="M7.600 3.500L6.200 .900M10.400 3.500l1.400-2.600M9 3.200V.300" stroke="#f6d77a" strokeWidth="1" strokeLinecap="round" />
    </g>
    <rect x="18.600" y=".600" width="3.600" height="4" rx="1.200" fill="#d2a468" transform="rotate(30 20.400 2.600)" />
    <circle cx="21.400" cy="8.400" r="1" fill="#f6d77a" /><circle cx="18.600" cy="10.600" r="0.8" fill="#fff" /><circle cx="22.200" cy="12.200" r="0.6" fill="#f6d77a" /><circle cx="12.400" cy="2" r="0.7" fill="#fff" />
  </G>
)
const Football = (p) => (
  <G {...p}>
    <g transform="rotate(-28 12 12)">
      <path d="M1.500 12Q12 2.500 22.500 12 12 21.500 1.500 12z" fill="#b5683c" stroke="#f3ead8" strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M4.500 12Q12 5.500 19.500 12" fill="none" stroke="#d08a5c" strokeWidth="1" />
      <path d="M8 12h8M9.500 10.600v2.800M12 10.600v2.800M14.500 10.600v2.800" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" />
    </g>
  </G>
)
// Lunar New Year: lucky bamboo, three stalks tied with a red ribbon
const LuckyBamboo = (p) => (
  <G {...p}>
    <path d="M10.600 4.200C8.200 1.600 5.400 1.600 3.600 3.200c2.400.1 4.800.5 7 1zM13.600 3C15.500 .7 18.200 .5 20.200 2c-2.300.1-4.500.4-6.600 1zM17.200 8.200c1.300-2 3.500-2.500 5.300-1.500-1.800.3-3.600.8-5.300 1.500zM7.400 8.600C6 6.800 4 6.500 2.400 7.500c1.700.2 3.400.6 5 1.100z" fill="#7cc47f" />
    {[[6.400, 8.200], [10.700, 3.600], [15, 7.200]].map(([x, top]) => (
      <g key={x}>
        <rect x={x} y={top} width="2.900" height={19.4 - top} rx="1.200" fill="#58a85c" />
        <rect x={x + 0.5} y={top + 0.6} width="0.800" height={18.4 - top} rx="0.4" fill="#8fd18a" opacity="0.8" />
        {[top + 3.4, top + 6.8, top + 10.2].filter(y => y < 13.2).map(y => <path key={y} d={`M${x} ${y}h2.900`} stroke="#3d8747" strokeWidth="0.8" />)}
      </g>
    ))}
    <rect x="5.200" y="13.600" width="13.900" height="2.800" rx="0.9" fill="#d6362f" /><circle cx="12.100" cy="15" r="1.500" fill="#f0b840" />
    <path d="M5.600 19.200h13l-1.400 4.300H7z" fill="#c8322b" /><path d="M6 20.600h12.200" stroke="#f0b840" strokeWidth="0.9" />
  </G>
)
// International Women's Day: a pink awareness ribbon
const PinkRibbon = ({ color = '#ffbcd8', deep = '#f488b6', ...p }) => (
  <G {...p}>
    <path d="M18.200 23L9.300 10.400C7.400 7.600 8.700 2.200 12 2.200" fill="none" stroke={deep} strokeWidth="4" strokeLinejoin="round" />
    <path d="M5.800 23l8.900-12.600c1.900-2.800.6-8.200-2.700-8.200" fill="none" stroke={color} strokeWidth="4" strokeLinejoin="round" />
    <path d="M10.400 13.600l1.600-2.300" stroke={deep} strokeWidth="4" opacity="0.35" />
  </G>
)
// Easter: a painted egg
const EGG = 'M12 1.500C7.400 1.500 4 8.400 4 13.800a8 8 0 0 0 16 0C20 8.400 16.600 1.500 12 1.500z'
const PaintedEgg = (p) => (
  <G {...p}>
    <clipPath id="qp-sticker-egg"><path d={EGG} /></clipPath>
    <path d={EGG} fill="#c9b3f0" />
    <g clipPath="url(#qp-sticker-egg)">
      <rect x="3" y="6.200" width="18" height="2.600" fill="#f7a8c9" />
      <path d="M3 13.600l2.300-2.700 2.300 2.700 2.200-2.700 2.200 2.700 2.200-2.700 2.200 2.700 2.300-2.700 2.300 2.700" fill="none" stroke="#fff" strokeWidth="1.600" strokeLinejoin="round" />
      <rect x="3" y="16" width="18" height="2.700" fill="#f9e08a" />
      {[6, 9, 12, 15, 18].map(x => <circle key={x} cx={x} cy="17.350" r="0.750" fill="#f2a65a" />)}
      {[9, 12, 15].map(x => <circle key={x} cx={x} cy="4.300" r="0.800" fill="#fff" />)}
      {[9, 12, 15].map(x => <circle key={x} cx={x} cy="20.600" r="0.800" fill="#fff" />)}
    </g>
    <path d="M7.200 6.500C6 8.800 5.400 11 5.500 13.400" fill="none" stroke="#fff" strokeWidth="1.100" strokeLinecap="round" opacity="0.45" />
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
// Tour de France: the mountains, with the road winding up
const Mountain = (p) => (
  <G {...p}>
    <path d="M6.500 21.500L15 4l8 17.500z" fill="#5f789e" /><path d="M15 4l2.900 6.300-1.700-1-1.200 1.700-1.500-1.900-1.500 1.300z" fill="#fff" />
    <path d="M1 21.500L8 9.500l7 12z" fill="#8ba3c7" /><path d="M8 9.500l2.200 3.800-1.300-.6-.9 1.200-1-1.300-1.200.8z" fill="#fff" />
    <rect x="1" y="21" width="22" height="2" rx="0.6" fill="#6fb36b" />
    <path d="M9.800 21.200c-2.300-1.300 1.400-2.300-.3-3.800s1.100-1.900-.4-3.200" fill="none" stroke="#f6cf2f" strokeWidth="1" strokeLinecap="round" />
  </G>
)
// Ekka: the Ferris wheel
const FerrisWheel = (p) => (
  <G {...p}>
    <path d="M12 10.300L6.600 22.600M12 10.300l5.400 12.300" stroke="#f3c9cf" strokeWidth="1.300" strokeLinecap="round" /><path d="M4.500 22.700h15" stroke="#f3c9cf" strokeWidth="1.300" strokeLinecap="round" />
    <g className="qp-s-spin">
      <circle cx="12" cy="10.300" r="8.300" fill="none" stroke="#fff3d6" strokeWidth="1.300" />
      {[0, 45, 90, 135].map(a => <path key={a} d="M3.700 10.300h16.600" stroke="#fff3d6" strokeWidth="0.6" opacity="0.75" transform={`rotate(${a} 12 10.300)`} />)}
      {['#f6c445', '#1f8aa3', '#f7a8cf', '#f6c445', '#1f8aa3', '#f7a8cf', '#f6c445', '#1f8aa3'].map((c, i) => <circle key={i} cx="12" cy="2" r="1.700" fill={c} transform={`rotate(${i * 45} 12 10.300)`} />)}
    </g>
    <circle cx="12" cy="10.300" r="1.600" fill="#f6c445" />
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
// Christmas: a tree with three wrapped presents under it, each tied with a ribbon
const Present = ({ x, y, w, h, fill, ribbon }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx="0.5" fill={fill} />
    <path d={`M${x + w / 2} ${y}v${h}M${x} ${y + h * 0.45}h${w}`} stroke={ribbon} strokeWidth="1" />
    <path d={`M${x + w / 2} ${y}c-1.300-2.100-3.100-1.500-2.300-.2zM${x + w / 2} ${y}c1.300-2.100 3.100-1.500 2.300-.2z`} fill={ribbon} />
  </g>
)
const TreeAndPresents = (p) => (
  <G {...p}>
    <rect x="11" y="16.500" width="2" height="3.500" fill="#6b4a32" />
    <path d="M12 2.200l3.400 4.600h-1.600l3.400 4.600h-1.700l3.700 5.200H4.800l3.700-5.200H6.800l3.400-4.600H8.600z" fill="#1f7a4d" />
    <path d="M12 .300l.7 1.500 1.600.2-1.200 1.100.3 1.600-1.400-.8-1.400.8.300-1.600-1.200-1.100 1.600-.2z" fill="#f0b840" />
    <circle className="qp-s-twinkle" cx="10.600" cy="8.600" r="0.900" fill="#f6d77a" /><circle cx="13.800" cy="11.600" r="0.900" fill="#e2463c" /><circle className="qp-s-twinkle" style={{ animationDelay: '0.8s' }} cx="9.200" cy="13.800" r="0.900" fill="#fff" /><circle cx="14.600" cy="14.800" r="0.900" fill="#f6d77a" />
    <Present x={0.8} y={17} w={6.8} h={6.2} fill="#d94a4a" ribbon="#f6d77a" />
    <Present x={16.4} y={16.2} w={6.8} h={7} fill="#f0b840" ribbon="#c8323c" />
    <Present x={8.6} y={18.8} w={6.8} h={4.4} fill="#2f9e68" ribbon="#fff" />
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
// What each season shows beside the logo. Quinn chose these, one by one.
const STICKERS = {
  newyear: ['champagne', <Champagne key="s" />], superbowl: ['american football', <Football key="s" />], lunar: ['lucky bamboo', <LuckyBamboo key="s" />],
  womens: ['pink ribbon', <PinkRibbon key="s" />], easter: ['painted egg', <PaintedEgg key="s" />], labour: ['hard hat', <HardHat key="s" />],
  environment: ['leaf', <Leaf key="s" />], tour: ['mountain', <Mountain key="s" />], ekka: ['ferris wheel', <FerrisWheel key="s" />],
  footy: ['rugby ball', <RugbyBall key="s" />], halloween: ['jack-o-lantern', <Pumpkin key="s" />], remembrance: ['poppy', <Poppy key="s" />],
  christmas: ['christmas tree with three presents', <TreeAndPresents key="s" />],
}

export function SeasonSticker({ size = 24 }) {
  const season = useSeason()
  if (!season || !STICKERS[season.id]) return null
  const [what, drawing] = STICKERS[season.id]
  return (
    <svg data-testid="season-sticker" data-sticker={what} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="qp-sticker flex-shrink-0 pointer-events-none">
      <title>{season.name}</title>
      {drawing}
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
