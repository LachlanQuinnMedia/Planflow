// src/icons.jsx
// Small line icons used in place of emojis, so the app looks the same on every device.
// They take the colour of the surrounding text.

// Used by the theme switch
export const IconSun = (p) => <Svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Svg>
export const IconMoon = (p) => <Svg {...p}><path d="M20 14.5A8 8 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5z" /></Svg>
export const IconAuto = (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none" /></Svg>

function Svg({ size = 14, className = '', children, filled = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill={filled ? 'currentColor' : 'none'} stroke={filled ? 'none' : 'currentColor'}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={`inline-block flex-shrink-0 ${className}`}>
      {children}
    </svg>
  )
}

export const IconPlay = (p) => <Svg filled {...p}><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" /></Svg>
export const IconStop = (p) => <Svg filled {...p}><rect x="5" y="5" width="14" height="14" rx="2" /></Svg>
export const IconRefresh = (p) => <Svg {...p}><path d="M20 11a8 8 0 0 0-14.6-4.2L3.5 9" /><path d="M3.5 4v5h5" /><path d="M4 13a8 8 0 0 0 14.6 4.2l1.9-2.2" /><path d="M20.5 20v-5h-5" /></Svg>
export const IconChevronDown = (p) => <Svg {...p}><path d="M6 9l6 6 6-6" /></Svg>
export const IconFolder = (p) => <Svg {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></Svg>
export const IconPencil = (p) => <Svg {...p}><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></Svg>
export const IconCalendar = (p) => <Svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></Svg>
export const IconPeople = (p) => <Svg {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.5A6.5 6.5 0 0 1 21.5 20" /></Svg>
export const IconLink = (p) => <Svg {...p}><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" /><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" /></Svg>
export const IconAlert = (p) => <Svg {...p}><path d="M12 4 2.5 20h19z" /><path d="M12 10v4.5M12 17.5v.01" /></Svg>
