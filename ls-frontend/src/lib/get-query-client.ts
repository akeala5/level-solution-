import { QueryClient } from '@tanstack/react-query'

// QueryClient NEUF à chaque requête serveur (jamais partagé entre utilisateurs,
// sinon fuite de données d'un visiteur à l'autre). Aligné sur le staleTime
// client (5 min) pour que l'hydratation soit considérée « fraîche » et que le
// client ne relance pas de fetch au 1er rendu.
export function getServerQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
      },
    },
  })
}
