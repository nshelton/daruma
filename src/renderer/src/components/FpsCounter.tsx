import React, { useState, useEffect, useRef } from 'react'

interface FpsCounterProps {
  className?: string
  style?: React.CSSProperties
}

export const FpsCounter: React.FC<FpsCounterProps> = ({ className = '', style = {} }) => {
  const [fps, setFps] = useState<number>(0)
  const frameCountRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(performance.now())
  const animationFrameRef = useRef<number>()

  useEffect(() => {
    const updateFps = (): void => {
      const now = performance.now()
      frameCountRef.current++
      
      const delta = now - lastTimeRef.current
      
      // Update FPS every second
      if (delta >= 1000) {
        const currentFps = Math.round((frameCountRef.current * 1000) / delta)
        setFps(currentFps)
        frameCountRef.current = 0
        lastTimeRef.current = now
      }
      
      animationFrameRef.current = requestAnimationFrame(updateFps)
    }

    animationFrameRef.current = requestAnimationFrame(updateFps)

    return (): void => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  const defaultStyle: React.CSSProperties = {
    position: 'absolute',
    top: '10px',
    right: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: '#00ff00',
    padding: '4px 8px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '12px',
    fontWeight: 'bold',
    zIndex: 1000,
    userSelect: 'none',
    pointerEvents: 'none',
    ...style
  }

  return (
    <div className={className} style={defaultStyle}>
      FPS: {fps}
    </div>
  )
}

export default FpsCounter 