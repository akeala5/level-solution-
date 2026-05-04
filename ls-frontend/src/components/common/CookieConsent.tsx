'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Consent = { analytics: boolean; marketing: boolean }

const STORAGE_KEY = 'ls_cookie_consent'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [consent, setConsent] = useState<Consent>({ analytics: false, marketing: false })

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) setVisible(true)
  }, [])

  const save = (c: Consent & { essential: boolean }) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...c, savedAt: new Date().toISOString() }))
    setVisible(false)
    // Ici on pourrait initialiser Analytics si c.analytics === true
  }

  const acceptAll = () => save({ essential: true, analytics: true, marketing: true })
  const rejectAll = () => save({ essential: true, analytics: false, marketing: false })
  const saveCustom = () => save({ essential: true, ...consent })

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Gestion des cookies"
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#0F0F1A] border-t border-white/10 shadow-2xl"
    >
      <div className="max-w-6xl mx-auto px-4 py-5">
        {!showDetails ? (
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-1 text-sm text-gray-300">
              <span className="font-semibold text-white">Nous utilisons des cookies</span> pour améliorer votre
              expérience sur LS Marketplace. En continuant, vous acceptez notre{' '}
              <Link href="/privacy" className="text-blue-400 hover:underline">politique de confidentialité</Link>.
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                onClick={() => setShowDetails(true)}
                className="px-4 py-2 text-sm border border-white/20 text-gray-300 hover:border-white/40 rounded-lg transition-colors"
              >
                Personnaliser
              </button>
              <button
                onClick={rejectAll}
                className="px-4 py-2 text-sm border border-white/20 text-gray-300 hover:border-white/40 rounded-lg transition-colors"
              >
                Refuser
              </button>
              <button
                onClick={acceptAll}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Tout accepter
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-white font-semibold">Paramètres des cookies</h3>

            {[
              {
                key: 'essential',
                label: 'Cookies essentiels',
                desc: 'Authentification, panier, session. Indispensables au fonctionnement du site.',
                forced: true,
                value: true,
              },
              {
                key: 'analytics' as keyof Consent,
                label: 'Cookies analytiques',
                desc: 'Mesure d\'audience anonyme (pages vues, temps passé). Aucune donnée personnelle transmise.',
                forced: false,
                value: consent.analytics,
              },
              {
                key: 'marketing' as keyof Consent,
                label: 'Cookies marketing',
                desc: 'Personnalisation des recommandations de produits et publicités pertinentes.',
                forced: false,
                value: consent.marketing,
              },
            ].map((item) => (
              <div key={item.key} className="flex items-start gap-3">
                <button
                  role="switch"
                  aria-checked={item.value}
                  disabled={item.forced}
                  onClick={() =>
                    !item.forced &&
                    setConsent((prev) => ({ ...prev, [item.key]: !prev[item.key as keyof Consent] }))
                  }
                  className={`mt-1 w-10 h-5 rounded-full transition-colors shrink-0 ${
                    item.value ? 'bg-blue-600' : 'bg-white/20'
                  } ${item.forced ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                >
                  <span
                    className={`block w-4 h-4 bg-white rounded-full m-0.5 transition-transform ${
                      item.value ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <div>
                  <p className="text-white text-sm font-medium">
                    {item.label} {item.forced && <span className="text-gray-500 text-xs">(obligatoire)</span>}
                  </p>
                  <p className="text-gray-400 text-xs">{item.desc}</p>
                </div>
              </div>
            ))}

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={rejectAll}
                className="px-4 py-2 text-sm border border-white/20 text-gray-300 hover:border-white/40 rounded-lg transition-colors"
              >
                Tout refuser
              </button>
              <button
                onClick={saveCustom}
                className="px-4 py-2 text-sm border border-blue-500 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
              >
                Enregistrer mes choix
              </button>
              <button
                onClick={acceptAll}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Tout accepter
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
