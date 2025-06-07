'use client'

import { useEffect, useState } from 'react'

export function useAnimation(delay: number = 0) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [delay])

  return isVisible
}

export function useStaggeredAnimation(itemCount: number, baseDelay: number = 100) {
  const [visibleItems, setVisibleItems] = useState<number>(0)

  useEffect(() => {
    const timers: NodeJS.Timeout[] = []

    for (let i = 0; i <= itemCount; i++) {
      const timer = setTimeout(() => {
        setVisibleItems(i)
      }, i * baseDelay)
      timers.push(timer)
    }

    return () => {
      timers.forEach(timer => clearTimeout(timer))
    }
  }, [itemCount, baseDelay])

  return visibleItems
}

export function useScrollAnimation() {
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting)
      },
      { threshold: 0.1 }
    )

    const elements = document.querySelectorAll('[data-animate-on-scroll]')
    elements.forEach(el => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  return isInView
}

export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion
}
