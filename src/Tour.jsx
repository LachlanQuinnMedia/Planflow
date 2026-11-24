// src/Tour.jsx
// The first-time tutorial: a run of short cards, each one pointing at the thing it explains.
// Nothing has to be typed: read, then press Next or click the thing that lights up.
// Directors and staff get different tutorials. The words are in tourSteps.js.
//
// How it works:
//  - Pages mark the things worth pointing at with data-tour="name".
//  - Each card names the page it needs and the things to light up. The tour opens that page itself,
//    including a real job and each of its tabs.
//  - While it runs, the app underneath cannot be clicked, so nothing can be changed by accident.
//  - Whether someone has seen it is remembered on their device, per person and per role.
import { useState, useEffect, useLayoutEffect, useRef, useMemo, useId } from 'react'
import { createPortal } from 'react-dom'
import { markTourSeen } from './tourState'
import { directorTour, staffTour, MENU_LABELS, JOB_TAB_LABELS, jobTabAnchor } from './tourSteps'
import { useFirm } from './firm'

// What lights up to be clicked next, if anything: the next page in the menu, the first job in the
// list, or the next tab on the job page. Not on a phone, where the menu is tucked away.
function clickNext(step, next, isPhone, stagesTab) {
  if (!next || isPhone) return null
  if (next.page === 'jobdetail') {
    if (step.page !== 'jobdetail') return { name: 'jobs-first', kind: 'row', label: 'the first job', where: 'in the list' }
    if (next.jobTab && next.jobTab !== step.jobTab) return { name: jobTabAnchor(next.jobTab), kind: 'tab', label: next.jobTab === 'hpc stages' ? stagesTab : JOB_TAB_LABELS[next.jobTab], where: 'tab' }
    return null
  }
  if (next.page && next.page !== step.page && MENU_LABELS[next.page]) return { name: `nav-${next.page}`, kind: 'menu', label: MENU_LABELS[next.page], where: 'in the menu' }
  return null
}

// The box around every visible thing with these names, in window coordinates.
// A thing inside a scrolling area only counts for the part of it that is actually showing.
function boxOf(names, vw) {
  let box = null
  for (const name of names || []) {
    for (const el of document.querySelectorAll(`[data-tour="${name}"]`)) {
      const full = el.getBoundingClientRect()
      if (full.width < 2 || full.height < 2 || full.right <= 0 || full.left >= vw) continue // hidden, or off the side of the screen
      const view = el.parentElement?.closest('.overflow-y-auto')?.getBoundingClientRect()
      const r = view
        ? { left: Math.max(full.left, view.left), top: Math.max(full.top, view.top), right: Math.min(full.right, view.right), bottom: Math.min(full.bottom, view.bottom) }
        : { left: full.left, top: full.top, right: full.right, bottom: full.bottom }
      if (r.bottom - r.top < 2 || r.right - r.left < 2) { box = box || { ...r, el, hidden: true }; continue } // scrolled out of sight
      box = box && !box.hidden
        ? { left: Math.min(box.left, r.left), top: Math.min(box.top, r.top), right: Math.max(box.right, r.right), bottom: Math.max(box.bottom, r.bottom), el: box.el }
        : { ...r, el }
    }
  }
  return box
}

// Bring a thing into view inside its own scrolling area. Returns true if it had to move.
function reveal(el, inMenu) {
  const scroller = el.parentElement?.closest('.overflow-y-auto')
  if (!scroller) return false
  const view = scroller.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  if (inMenu) {
    if (r.top >= view.top && r.bottom <= view.bottom) return false
    // Short enough to show whole: do that. Otherwise start from its top.
    scroller.scrollTop += r.height <= view.height ? (r.top < view.top ? r.top - view.top : r.bottom - view.bottom) : r.top - view.top
    return true
  }
  if (r.top >= view.top && r.top <= view.top + view.height * 0.45) return false
  scroller.scrollTop = Math.max(0, scroller.scrollTop + (r.top - view.top) - 16)
  return true
}

const sameBox = (a, b) => (!a && !b) || (a && b && ['left', 'top', 'right', 'bottom'].every(k => Math.abs(a[k] - b[k]) < 0.75))
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const reducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const GAP = 18     // space between the card and the thing it points at
const EDGE = 12    // space kept from the edge of the window
const PAD = 6      // breathing room around the highlighted thing

// Where the card goes, and how big the highlight is. The highlight is trimmed if that is what it
// takes for the card (and its arrow) to sit beside it on screen.
function layOut(raw, step, card, vw, vh, minLeft) {
  if (!raw) return { spot: null, left: (vw - card.w) / 2, top: Math.max(EDGE, (vh - card.h) / 2), side: null, arrow: 0 }
  let t = {
    left: clamp(raw.left - PAD, 4, vw - 4), top: clamp(raw.top - PAD, 4, vh - 4),
    right: clamp(raw.right + PAD, 4, vw - 4), bottom: clamp(raw.bottom + PAD, 4, vh - 4),
  }
  if (step.maxHeight && t.bottom - t.top > step.maxHeight) t.bottom = t.top + step.maxHeight

  const room = {
    right: vw - EDGE - (t.right + GAP) >= card.w,
    left: t.left - GAP - card.w >= minLeft,
    bottom: vh - EDGE - (t.bottom + GAP) >= card.h,
    top: t.top - GAP - card.h >= EDGE,
  }
  let side = [step.prefer, 'bottom', 'right', 'top', 'left'].filter(Boolean).find(s => room[s]) || null
  if (!side) {
    // A tall thing: show the top part of it and put the card underneath
    const fit = vh - EDGE - card.h - GAP - t.top
    if (fit >= 64) { t = { ...t, bottom: t.top + fit }; side = 'bottom' }
  }
  const cx = (t.left + t.right) / 2, cy = (t.top + t.bottom) / 2
  let left, top, arrow = 0
  if (side === 'bottom' || side === 'top') {
    left = clamp(cx - card.w / 2, minLeft, vw - EDGE - card.w)
    top = side === 'bottom' ? t.bottom + GAP : t.top - GAP - card.h
    arrow = clamp(cx - left, 22, card.w - 22)
  } else if (side === 'right' || side === 'left') {
    top = clamp(cy - card.h / 2, EDGE, vh - EDGE - card.h)
    left = side === 'right' ? t.right + GAP : t.left - GAP - card.w
    arrow = clamp(cy - top, 22, card.h - 22)
  } else {
    // No room beside it at all (a very small screen): sit at the bottom, or the top if the thing is low down
    left = clamp(cx - card.w / 2, EDGE, vw - EDGE - card.w)
    top = cy < vh / 2 ? vh - EDGE - card.h : EDGE
  }
  return { spot: t, left, top, side, arrow }
}

export default function Tour({ currentUser, isDirector, activePage, hasJobs, onNavigate, onOpenJob, setSidebarOpen, onClose }) {
  const [index, setIndex] = useState(0)
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight })
  const [found, setFound] = useState({ index: -1, target: null, hot: null, ready: false })
  const [layout, setLayout] = useState(null)
  const [spot, setSpot] = useState(null) // the highlight as drawn (it glides from one thing to the next)
  const cardRef = useRef(null)
  const nextRef = useRef(null)
  const spotRef = useRef(null)
  const glideRef = useRef(0)
  const jobIdRef = useRef(null) // the job the tour was pointing at in the list, which is the one it opens
  // Fixed when the tour starts, so the number of cards cannot change half way through
  const [withJobs] = useState(hasJobs)
  const { stagesTab } = useFirm() // what this firm calls its service stages
  const maskId = `qp-tour-mask-${useId().replace(/[^a-zA-Z0-9]/g, '')}`

  const isPhone = vp.w < 1024 // below this the menu is tucked away
  const firstName = String(currentUser?.username || '').trim().split(/\s+/)[0] || ''
  const steps = useMemo(
    () => (isDirector ? directorTour : staffTour)({ firstName, isPhone, hasJobs: withJobs, stagesTab }),
    [firstName, isDirector, isPhone, withJobs, stagesTab])
  const step = steps[index]
  const nextStep = steps[index + 1]
  const isLast = index === steps.length - 1
  const click = clickNext(step, nextStep, isPhone, stagesTab)
  const clickName = click?.name || null

  const finish = () => { markTourSeen(currentUser.id, currentUser.role); onClose() }
  const goNext = () => { if (isLast) finish(); else setIndex(i => Math.min(i + 1, steps.length - 1)) }
  const goBack = () => setIndex(i => Math.max(i - 1, 0))

  // The app underneath cannot be clicked or tabbed into while the tour runs
  useEffect(() => {
    const root = document.getElementById('root')
    root?.setAttribute('inert', '')
    return () => root?.removeAttribute('inert')
  }, [])

  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); finish() }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goNext() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goBack() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Open the page this step is about. On a phone, slide the menu out when the step is about the menu.
  useEffect(() => {
    if (step.page === 'jobdetail') { if (activePage !== 'jobdetail') onOpenJob(jobIdRef.current) }
    else if (step.page && activePage !== step.page) onNavigate(step.page)
    if (isPhone) setSidebarOpen(!!step.sidebar)
    // Only when the step changes. The app's own navigation must not re-trigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, isPhone])

  // Find the things this step points at. Pages load their data after they open, so keep looking.
  useEffect(() => {
    const started = Date.now()
    let scrolled = false, hotScrolled = false, tabShown = false
    const look = () => {
      const waited = Date.now() - started
      // Remember which job is first in the list: that is the one the tour opens
      const firstJob = document.querySelector('[data-tour="jobs-first"]')
      if (firstJob?.dataset.jobId) jobIdRef.current = firstJob.dataset.jobId
      // On the job page, open the tab this card is about
      if (step.jobTab) {
        const tab = document.querySelector(`[data-tour="${jobTabAnchor(step.jobTab)}"]`)
        if (tab && tab.dataset.active !== 'true') window.dispatchEvent(new CustomEvent('qplan:job-tab', { detail: step.jobTab }))
        // On a narrow screen the row of tabs scrolls sideways: bring this one into view
        if (tab && !tabShown) { tabShown = true; const row = tab.parentElement; if (row) row.scrollLeft = Math.max(0, tab.offsetLeft - row.offsetLeft - (row.clientWidth - tab.offsetWidth) / 2) }
      }
      let target = boxOf(step.targets, window.innerWidth)
      // Nothing by that name on the page (still loading, or an empty state): point at the page itself
      if (!target && step.targets && waited > 900) target = boxOf(['page'], window.innerWidth)
      if (target && !scrolled) {
        scrolled = true
        if (reveal(target.el, !!step.sidebar)) target = boxOf(step.targets, window.innerWidth) || target
      }
      if (target?.hidden) target = null
      let hot = clickName ? boxOf([clickName], window.innerWidth) : null
      if (hot && !hotScrolled) {
        hotScrolled = true
        if (reveal(hot.el, true)) hot = boxOf([clickName], window.innerWidth)
      }
      if (hot?.hidden) hot = null
      // Wait a moment for the page to settle before showing the card, but never keep anyone waiting long
      const ready = !step.targets ? true : (target ? waited >= 220 : waited >= 1300)
      setFound(prev => (prev.index === index && prev.ready === ready && sameBox(prev.target, target) && sameBox(prev.hot, hot))
        ? prev : { index, target, hot, ready })
    }
    look()
    const timer = setInterval(look, 120)
    return () => clearInterval(timer)
    // step comes from steps and index, which are listed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, steps, clickName, vp.w, vp.h])

  const current = found.index === index && found.ready ? found : null

  // Place the card once its size is known
  useLayoutEffect(() => {
    if (!current || !cardRef.current) return
    const r = cardRef.current.getBoundingClientRect()
    // Keep the card off the menu when the menu holds the next thing to click
    const minLeft = current.hot && click?.kind === 'menu' ? Math.max(EDGE, current.hot.right + 110) : EDGE
    const next = layOut(current.target, step, { w: r.width, h: r.height }, vp.w, vp.h, minLeft)
    setLayout(prev => (prev && prev.index === index && prev.side === next.side
      && Math.abs(prev.left - next.left) < 0.75 && Math.abs(prev.top - next.top) < 0.75
      && Math.abs(prev.arrow - next.arrow) < 0.75 && sameBox(prev.spot, next.spot)) ? prev : { ...next, index, w: r.width, h: r.height })
    // step comes from index, which is listed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, index, vp.w, vp.h])

  const placed = layout && layout.index === index && current ? layout : null

  // The highlight glides from the last thing to the next
  useEffect(() => {
    if (!placed) return
    const to = placed.spot
    const from = spotRef.current
    cancelAnimationFrame(glideRef.current)
    if (!to || !from || reducedMotion()) { spotRef.current = to; setSpot(to); return }
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - start) / 320)
      const e = 1 - Math.pow(1 - p, 3)
      const mid = { left: from.left + (to.left - from.left) * e, top: from.top + (to.top - from.top) * e, right: from.right + (to.right - from.right) * e, bottom: from.bottom + (to.bottom - from.bottom) * e }
      spotRef.current = mid
      setSpot(mid)
      if (p < 1) glideRef.current = requestAnimationFrame(tick)
    }
    glideRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(glideRef.current)
    // Glide only when the highlight itself moves, not on every re-measure
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed?.spot?.left, placed?.spot?.top, placed?.spot?.right, placed?.spot?.bottom, placed?.index])

  // Put the keyboard on the Next button as each card appears
  useEffect(() => {
    if (placed) nextRef.current?.focus({ preventScroll: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed?.index])

  const hot = placed ? current.hot : null
  // The "Click here" flag. Beside a menu item it sits just to the right, or on the end of the item if
  // that would cover the thing being explained. Over a tab it sits above, pointing down.
  // If the card is in the way, it is left out: the card says what to click anyway.
  const hits = (a, b) => !!a && !!b && a.left < b.right + 6 && a.right > b.left - 6 && a.top < b.bottom + 6 && a.bottom > b.top - 6
  let tagBox = null, tagInside = false
  const tagAbove = click?.kind === 'tab'
  if (hot) {
    const mid = (hot.top + hot.bottom) / 2, cx = (hot.left + hot.right) / 2
    if (tagAbove) {
      const left = clamp(cx - 48, 4, vp.w - 100)
      tagBox = { left, right: left + 96, top: hot.top - 38, bottom: hot.top - 12 }
      if (tagBox.top < 4) tagBox = null
    } else {
      tagBox = { left: hot.right + 12, right: hot.right + 12 + 96, top: mid - 13, bottom: mid + 13 }
      if (hits(tagBox, placed.spot) || tagBox.right > vp.w - 4) { tagInside = true; tagBox = { left: hot.right - 8 - 96, right: hot.right - 8, top: mid - 13, bottom: mid + 13 } }
    }
    if (hits(tagBox, { left: placed.left, top: placed.top, right: placed.left + placed.w, bottom: placed.top + placed.h })) tagBox = null
  }
  const showTag = !!tagBox
  const cardWidth = Math.min(340, vp.w - 2 * EDGE)
  const arrowStyle = !placed || !placed.side ? null
    : placed.side === 'bottom' ? { top: -11, left: placed.arrow - 10 }
      : placed.side === 'top' ? { bottom: -11, left: placed.arrow - 10 }
        : placed.side === 'right' ? { left: -11, top: placed.arrow - 10 }
          : { right: -11, top: placed.arrow - 10 }

  return createPortal(
    <div className="qp-tour fixed inset-0 z-[300]" data-testid="tour" data-step={step.id}>
      {/* Catches every click, so the app underneath stays exactly as it is */}
      <div className="absolute inset-0" />

      <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
        <defs>
          <mask id={maskId}>
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spot && <rect x={spot.left} y={spot.top} width={Math.max(0, spot.right - spot.left)} height={Math.max(0, spot.bottom - spot.top)} rx="12" fill="black" />}
            {hot && <rect x={hot.left - 3} y={hot.top - 3} width={hot.right - hot.left + 6} height={hot.bottom - hot.top + 6} rx="10" fill="black" />}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(4, 12, 9, 0.62)" mask={`url(#${maskId})`} />
        {spot && (
          <rect className="qp-tour-ring" x={spot.left} y={spot.top} width={Math.max(0, spot.right - spot.left)} height={Math.max(0, spot.bottom - spot.top)}
            rx="12" fill="none" stroke="#34d399" strokeWidth="2" data-testid="tour-spot" />
        )}
      </svg>

      {hot && (
        <>
          <button type="button" onClick={goNext} data-testid="tour-hot" aria-label={`Open ${click.label}`}
            className="qp-tour-hot absolute rounded-[10px] cursor-pointer"
            style={{ left: hot.left - 3, top: hot.top - 3, width: hot.right - hot.left + 6, height: hot.bottom - hot.top + 6 }} />
          {showTag && (
            <div data-testid="tour-tag" data-inside={tagInside ? 'yes' : 'no'} className="absolute pointer-events-none"
              style={tagInside ? { left: tagBox.right, top: tagBox.top, transform: 'translateX(-100%)' } : { left: tagBox.left, top: tagBox.top }}>
              <div className={`${tagAbove ? 'qp-tour-tag-down' : 'qp-tour-tag'} flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-600 text-white text-xs font-semibold shadow-lg whitespace-nowrap`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {tagAbove ? <path d="M12 5v14M6 13l6 6 6-6" /> : <path d="M19 12H5M11 6l-6 6 6 6" />}
                </svg>
                Click here
              </div>
            </div>
          )}
        </>
      )}

      <div ref={cardRef} role="dialog" aria-modal="true" aria-labelledby="qp-tour-title" data-testid="tour-card"
        className="absolute"
        style={{ width: cardWidth, left: placed ? placed.left : 0, top: placed ? placed.top : 0, visibility: placed ? 'visible' : 'hidden' }}>
        <div key={placed ? index : `wait-${index}`} className="qp-tour-card relative bg-white rounded-xl border-2 border-emerald-500 shadow-2xl">
          {arrowStyle && (
            <span data-testid="tour-arrow" data-side={placed.side} className={`qp-tour-arrow qp-tour-arrow-${placed.side} absolute w-5 h-5 bg-emerald-500`} style={arrowStyle} />
          )}
          <div className="relative bg-white rounded-[10px] px-4 pt-3.5 pb-3">
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700" data-testid="tour-chapter">{step.chapter}</div>
              <div className="text-[11px] text-gray-500 flex-shrink-0">{index + 1} of {steps.length}</div>
            </div>
            <div className="h-1 rounded-full bg-gray-200 overflow-hidden mb-2.5" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={index + 1} aria-label="Tutorial progress">
              <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
            </div>
            <div id="qp-tour-title" className="text-sm font-semibold text-gray-900 mb-1.5">{step.title}</div>
            <div className="space-y-1.5">
              {step.body.map((line, i) => <p key={i} className="text-[13px] leading-relaxed text-gray-600">{line}</p>)}
            </div>
            {!isLast && index > 0 && (
              <div className="mt-2.5 flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg px-2.5 py-1.5">
                <span className="qp-tour-dot w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                {click && current?.hot
                  ? (click.kind === 'tab'
                    ? <span>Now click the <span className="font-semibold">{click.label}</span> tab, or press Next.</span>
                    : <span>Now click <span className="font-semibold">{click.label}</span> {click.where}, or press Next.</span>)
                  : <span>{isPhone ? 'Tap' : 'Click'} Next to carry on.</span>}
              </div>
            )}
            <div className="mt-3 flex items-center gap-2">
              {index > 0 && (
                <button type="button" onClick={goBack} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 font-medium text-gray-700">Back</button>
              )}
              <button type="button" ref={nextRef} onClick={goNext} data-testid="tour-next"
                className="flex-1 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
                {step.nextLabel || 'Next'}
              </button>
            </div>
            <div className="mt-2.5 pt-2 border-t border-gray-100 text-center">
              <button type="button" onClick={finish} data-testid="tour-skip" className="text-xs text-gray-500 hover:text-gray-800 hover:underline">
                Skip tutorial
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
