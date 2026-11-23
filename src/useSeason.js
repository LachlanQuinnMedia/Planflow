// src/useSeason.js
// The season on screen right now (null on Light and Dark). Follows the theme switch and the calendar.
import { useState, useEffect } from 'react'
import { seasonById } from './seasons'

const read = () => seasonById(document.documentElement.dataset.season)

export function useSeason() {
  const [season, setSeason] = useState(read)
  useEffect(() => {
    const onChange = () => setSeason(read())
    window.addEventListener('qplan:theme', onChange)
    return () => window.removeEventListener('qplan:theme', onChange)
  }, [])
  return season
}
