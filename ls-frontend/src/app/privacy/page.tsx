import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description: 'Comment LS Marketplace collecte, utilise et protège vos données personnelles.',
  robots: { index: true, follow: false },
}

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">Politique de confidentialité</h1>
      <p className="text-gray-400 text-sm mb-10">Dernière mise à jour : mai 2026</p>

      <div className="prose prose-invert prose-sm max-w-none space-y-8 text-gray-300">

        <section>
          <h2 className="text-xl font-semibold text-white">1. Responsable du traitement</h2>
          <p>
            LS Marketplace (Level Solution IT), opérateur de la plateforme accessible sur{' '}
            <strong>ls-marketplace.com</strong>, est responsable du traitement de vos données personnelles.
            Contact DPO : <a href="mailto:privacy@ls-marketplace.com" className="text-blue-400 hover:underline">privacy@ls-marketplace.com</a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">2. Données collectées</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Données d&apos;identification</strong> : nom, prénom, adresse email, numéro de téléphone</li>
            <li><strong>Données de vérification (KYC)</strong> : pièce d&apos;identité, selfie (uniquement pour les vendeurs)</li>
            <li><strong>Données de transaction</strong> : historique des achats, montants, méthodes de paiement</li>
            <li><strong>Données de navigation</strong> : pages visitées, clics, recherches (si cookies analytiques acceptés)</li>
            <li><strong>Données de communication</strong> : messages échangés via la messagerie interne</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">3. Finalités du traitement</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Exécution du contrat de service (achats, ventes, paiements)</li>
            <li>Vérification d&apos;identité et prévention de la fraude</li>
            <li>Envoi de notifications relatives à vos commandes</li>
            <li>Amélioration de la plateforme (statistiques anonymisées)</li>
            <li>Respect des obligations légales et fiscales</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">4. Base légale</h2>
          <p>
            Le traitement est fondé sur l&apos;exécution du contrat (Art. 6.1.b RGPD) pour les données
            nécessaires au service, le consentement (Art. 6.1.a) pour les cookies non essentiels,
            et l&apos;intérêt légitime (Art. 6.1.f) pour la prévention de la fraude.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">5. Conservation des données</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Données de compte : durée de la relation contractuelle + 3 ans</li>
            <li>Données de transaction : 10 ans (obligations comptables)</li>
            <li>Documents KYC : 5 ans après clôture du compte</li>
            <li>Données de navigation (cookies) : 13 mois maximum</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">6. Partage des données</h2>
          <p>Vos données ne sont jamais vendues. Elles peuvent être partagées avec :</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Stripe</strong> (traitement paiements par carte) — politique : stripe.com/privacy</li>
            <li><strong>FedaPay</strong> (paiements Mobile Money) — politique : fedapay.com</li>
            <li><strong>SendGrid</strong> (emails transactionnels)</li>
            <li><strong>Autorités légales</strong> sur réquisition judiciaire</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">7. Vos droits</h2>
          <p>Conformément au RGPD, vous disposez des droits suivants :</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Accès</strong> : obtenir une copie de vos données</li>
            <li><strong>Rectification</strong> : corriger des données inexactes</li>
            <li><strong>Effacement</strong> : demander la suppression de votre compte</li>
            <li><strong>Portabilité</strong> : recevoir vos données dans un format structuré</li>
            <li><strong>Opposition</strong> : vous opposer au traitement à des fins marketing</li>
          </ul>
          <p className="mt-2">
            Pour exercer vos droits : <a href="mailto:privacy@ls-marketplace.com" className="text-blue-400 hover:underline">privacy@ls-marketplace.com</a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">8. Sécurité</h2>
          <p>
            Vos données sont chiffrées en transit (TLS 1.2/1.3) et au repos. Les mots de passe sont
            hachés avec bcrypt (facteur 12). Les secrets 2FA sont chiffrés avec AES-256-GCM.
            Nous réalisons des audits de sécurité réguliers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">9. Cookies</h2>
          <p>
            Nous utilisons des cookies essentiels (session, authentification) et optionnels (analytiques,
            marketing). Vous pouvez gérer vos préférences via la bannière cookie ou en
            supprimant les cookies dans les paramètres de votre navigateur.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">10. Contact et réclamation</h2>
          <p>
            DPO : <a href="mailto:privacy@ls-marketplace.com" className="text-blue-400 hover:underline">privacy@ls-marketplace.com</a><br />
            Vous avez le droit de déposer une plainte auprès de votre autorité de protection des données.
          </p>
        </section>
      </div>
    </div>
  )
}
