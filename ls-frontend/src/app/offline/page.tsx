'use client'

export default function OfflinePage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="text-6xl mb-6">📡</div>
      <h1 className="text-2xl font-bold mb-3 text-white">Vous êtes hors ligne</h1>
      <p className="text-gray-400 max-w-sm">
        Vérifiez votre connexion internet et réessayez. Les pages visitées récemment restent disponibles.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
      >
        Réessayer
      </button>
    </div>
  )
}
