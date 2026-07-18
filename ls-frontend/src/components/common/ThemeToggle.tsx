'use client'
import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Évite le mismatch d'hydratation : le thème n'est connu qu'au montage
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <span className={`btn-icon ${className}`} aria-hidden="true" />
  }

  const isDark = resolvedTheme === 'dark'
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      className={`btn-icon text-dark hover:bg-gray-100 ${className}`}
    >
      {isDark ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
    </button>
  )
}
