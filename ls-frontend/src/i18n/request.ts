import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

const locales = ['fr', 'en'] as const
type Locale = (typeof locales)[number]

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const cookie = cookieStore.get('NEXT_LOCALE')?.value
  const locale: Locale = (locales.includes(cookie as Locale) ? cookie : 'fr') as Locale

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
