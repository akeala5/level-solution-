'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

const LOCALES = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
] as const

export default function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const switchLocale = (code: string) => {
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000; SameSite=Lax`
    setOpen(false)
    router.refresh()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Changer la langue / Change language"
        aria-expanded={open}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors text-xs font-semibold"
      >
        <Globe size={12} aria-hidden="true" />
        <span className="uppercase">{locale}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden z-50 min-w-[130px]">
            {LOCALES.map(({ code, label }) => (
              <button
                key={code}
                onClick={() => switchLocale(code)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors text-left',
                  locale === code
                    ? 'bg-primary/5 text-primary font-semibold'
                    : 'text-dark hover:bg-gray-50'
                )}
              >
                <span className="font-bold text-xs w-6 uppercase text-muted">{code}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
