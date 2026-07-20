// Fetch CÔTÉ SERVEUR uniquement (n'importer que dans des Server Components).
// Tape le backend EN INTERNE (localhost:3001), sans passer par Apache et SANS
// cookie → réservé aux données PUBLIQUES (home).
// NB : le package 'server-only' n'est pas installé dans ce projet ; on ne l'ajoute
// pas (évite un npm install ERESOLVE). Ce module n'est importé que par page.tsx.
// Le cache Next (next.revalidate) s'aligne sur l'ISR de la page (revalidate=300)
// → une seule requête backend par fenêtre de 5 min, mutualisée entre visiteurs.
const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://localhost:3001/api/v1'

export async function serverGet<T>(path: string): Promise<T> {
  const res = await fetch(`${INTERNAL_API_URL}${path}`, {
    next: { revalidate: 300 },
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`serverGet ${path} -> ${res.status}`)
  const json = await res.json()
  // Même forme que les queryFn clients (axios r.data.data) → hydratation exacte.
  return json.data as T
}
