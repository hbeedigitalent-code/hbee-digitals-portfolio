'use client'

import { useEffect, useState, useRef } from 'react'

export function useParallax(intensity: number = 10) {
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!ref.current) return
      
      const rect = ref.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      
      const rotateYValue = ((e.clientX - centerX) / (rect.width / 2)) * (intensity / 2)
      const rotateXValue = ((e.clientY - centerY) / (rect.height / 2)) * (intensity / 2)
      
      setRotateY(rotateYValue)
      setRotateX(-rotateXValue)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [intensity])

  return { rotateX, rotateY, ref }
}
