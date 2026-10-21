import Link from 'next/link'
import {
  ArrowRightIcon,
  TicketIcon,
  CalendarDaysIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'

import { publicMetadata } from '@/lib/seo'

export const metadata = publicMetadata(
  'Aide pour vos sorties et vos billets',
  'Retrouvez les réponses sur les réservations, les billets, votre compte Tickr et la publication de vos événements en Tunisie.',
  '/help',
)

export default function HelpPage() {
  return (
    <main id="contenu" className="container help-main" tabIndex={-1}>
      <div className="help-heading">
        <p className="section-caption">Un coup de main</p>
        <h1>
          Tout pour profiter
          <br />
          du moment.
        </h1>
        <p>
          Un billet à retrouver, une réservation à vérifier ou une scène à
          préparer.
        </p>
      </div>
      <nav className="help-topics" aria-label="Sujets d’aide">
        <a href="#billets">
          <TicketIcon />
          <strong>Billets & réservations</strong>
          <ArrowRightIcon />
        </a>
        <a href="#compte">
          <UserCircleIcon />
          <strong>Mon compte</strong>
          <ArrowRightIcon />
        </a>
        <a href="#organiser">
          <CalendarDaysIcon />
          <strong>Organiser une sortie</strong>
          <ArrowRightIcon />
        </a>
      </nav>
      <div className="help-body">
        <aside>
          <p>Votre espace, en un clic.</p>
          <Link href="/tickets">
            Mes billets
            <ArrowRightIcon />
          </Link>
          <Link href="/orders">
            Mes commandes
            <ArrowRightIcon />
          </Link>
          <Link href="/account">
            Mon compte
            <ArrowRightIcon />
          </Link>
        </aside>
        <div className="help-answers">
          <section id="billets">
            <h2>Billets & réservations</h2>
            <details open>
              <summary>Où retrouver mon billet ?</summary>
              <p>
                Connectez-vous au compte utilisé lors de la réservation, puis
                ouvrez « Mes billets ». Un billet confirmé et lié à une commande
                payée affiche son code d’entrée. Les billets réservés, expirés,
                annulés ou déjà utilisés n’affichent pas de code d’entrée actif.
              </p>
              <Link className="text-link" href="/tickets">
                Retrouver mes billets
                <ArrowRightIcon />
              </Link>
            </details>
            <details>
              <summary>Une réservation me permet-elle d’entrer ?</summary>
              <p>
                Une réservation en attente de paiement ne permet pas l’entrée.
                Vérifiez le statut et l’échéance dans « Mes commandes ». Les
                moyens de paiement disponibles et les frais sont indiqués au
                moment de la réservation.
              </p>
            </details>
            <details>
              <summary>
                Que faire si aucun moyen de paiement n’est proposé ?
              </summary>
              <p>
                La réservation ne peut pas être finalisée tant qu’aucun moyen de
                paiement n’est disponible pour cet événement. Revenez consulter
                sa billetterie plus tard.
              </p>
            </details>
            <details>
              <summary>Mon billet est-il disponible en PDF ?</summary>
              <p>
                Le téléchargement est proposé dans le détail du billet lorsqu’un
                PDF a été généré. S’il n’est pas disponible, consultez le statut
                du billet dans votre espace.
              </p>
            </details>
            <details>
              <summary>Dans quel fuseau sont les horaires ?</summary>
              <p>
                Les dates et les heures de Tickr sont affichées dans le fuseau
                de Tunis, y compris lorsque vous consultez le site depuis un
                autre pays.
              </p>
            </details>
          </section>
          <section id="compte">
            <h2>Mon compte</h2>
            <details>
              <summary>Je ne retrouve plus mon mot de passe.</summary>
              <p>
                Demandez un lien de réinitialisation avec l’adresse e-mail de
                votre compte. Si cette adresse correspond à un compte, les
                instructions lui sont envoyées.
              </p>
              <Link className="text-link" href="/auth/forgot-password">
                Réinitialiser mon mot de passe
                <ArrowRightIcon />
              </Link>
            </details>
            <details>
              <summary>Comment modifier mes informations ?</summary>
              <p>
                Votre prénom, votre nom, votre téléphone et votre mot de passe
                peuvent être modifiés dans « Mon compte ».
              </p>
              <Link className="text-link" href="/account">
                Ouvrir mon compte
                <ArrowRightIcon />
              </Link>
            </details>
            <details>
              <summary>Comment choisir les messages que je reçois ?</summary>
              <p>
                Ouvrez « Mes notifications » pour régler les canaux, les rappels
                et les nouvelles de Tickr. Les informations essentielles à vos
                commandes et à vos billets restent actives.
              </p>
              <Link className="text-link" href="/account/notifications">
                Mes préférences
                <ArrowRightIcon />
              </Link>
            </details>
          </section>
          <section id="organiser">
            <h2>Organiser une sortie</h2>
            <details>
              <summary>Comment préparer un événement ?</summary>
              <p>
                Avec un compte organisateur, ouvrez l’espace organisateur et
                créez un brouillon. Indiquez le lieu et les horaires, puis
                ajoutez au moins un tarif avec sa quantité et sa période de
                vente. Le brouillon reste privé jusqu’à sa publication.
              </p>
              <Link className="text-link" href="/organizer">
                Ouvrir les coulisses
                <ArrowRightIcon />
              </Link>
            </details>
            <details>
              <summary>Quand mon événement devient-il visible ?</summary>
              <p>
                Après la confirmation de sa publication. Vérifiez les
                informations et les tarifs avant de publier. Le serveur vérifie
                que l’événement est prêt et que vous êtes son organisateur.
              </p>
            </details>
          </section>
        </div>
      </div>
    </main>
  )
}
