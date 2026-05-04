import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mentions légales',
  description: 'Mentions légales de LS Marketplace — Level Solution IT.',
  robots: { index: true, follow: false },
}

export default function LegalPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">Mentions légales</h1>
      <p className="text-gray-400 text-sm mb-10">Dernière mise à jour : mai 2026</p>

      <div className="space-y-8 text-gray-300 text-sm">

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">Éditeur</h2>
          <p><strong className="text-white">Raison sociale</strong> : Level Solution IT (LS)</p>
          <p><strong className="text-white">Forme juridique</strong> : SARL</p>
          <p><strong className="text-white">Siège social</strong> : Lomé, Togo</p>
          <p><strong className="text-white">Email</strong> : <a href="mailto:contact@ls-marketplace.com" className="text-blue-400 hover:underline">contact@ls-marketplace.com</a></p>
          <p><strong className="text-white">Directeur de publication</strong> : Level Solution IT</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">Hébergement</h2>
          <p><strong className="text-white">Serveur</strong> : Contabo VPS</p>
          <p><strong className="text-white">Localisation</strong> : Europe</p>
          <p><strong className="text-white">Stockage médias</strong> : Cloudflare R2</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">Propriété intellectuelle</h2>
          <p>
            L&apos;ensemble des contenus présents sur LS Marketplace (textes, images, logo, code) sont protégés
            par le droit de la propriété intellectuelle. Toute reproduction sans autorisation est interdite.
            Les annonces publiées par les vendeurs restent leur propriété exclusive.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">Responsabilité</h2>
          <p>
            LS Marketplace est une plateforme de mise en relation entre acheteurs et vendeurs.
            Nous n&apos;intervenons pas directement dans les transactions et ne pouvons être tenus responsables
            des litiges entre utilisateurs, sous réserve des mécanismes d&apos;escrow et de médiation mis en place.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">Droit applicable</h2>
          <p>
            Les présentes mentions légales sont soumises au droit togolais.
            En cas de litige, les tribunaux de Lomé (Togo) sont seuls compétents.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">Conditions d&apos;utilisation</h2>
          <p>
            L&apos;utilisation de la plateforme implique l&apos;acceptation des{' '}
            <a href="/terms" className="text-blue-400 hover:underline">Conditions Générales d&apos;Utilisation</a>{' '}
            et de la{' '}
            <a href="/privacy" className="text-blue-400 hover:underline">Politique de confidentialité</a>.
          </p>
        </section>
      </div>
    </div>
  )
}
