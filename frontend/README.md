# Tickr Frontend

Plateforme de billetterie en ligne - Interface utilisateur moderne construite avec Next.js 16.

## 🛠️ Stack Technique

- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Language**: TypeScript 5
- **Styling**: TailwindCSS 4
- **State Management**:
  - React Query (TanStack Query) - Server state
  - Zustand - Client state
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios
- **Testing**: Vitest + Testing Library

## 🚀 Getting Started

### Prerequisites

- Node.js 20 LTS or higher
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

The app will be available at [http://localhost:3001](http://localhost:3001).

## En scène · pages connectées

L’accueil, le programme, les fiches événement, les commandes, le récapitulatif,
les billets et le compte lisent les API NestJS. Les nouvelles pages couvrent
`/auth/login`, `/auth/register`, `/auth/forgot-password`, `/verify-email`,
`/reset-password`, `/orders`, `/orders/[id]`, `/tickets/[id]` et `/account`.
Aucun tableau d’événements, commande ou billet fictif n’est utilisé à l’exécution.
Une API indisponible donne un état d’erreur avec reprise ; une liste vide reste vide.

La recherche appelle `/events/search?q=…`. Les filtres de catégorie et ville ne
s’appliquent qu’au programme `/events`, conformément aux capacités de l’API.
Les commandes et billets sont paginés. Les montants, disponibilités, statuts et
échéances viennent du serveur ; les prix estimés avant commande utilisent sa
configuration publique. Le QR n’apparaît que si le billet est `CONFIRMED` et sa
commande `PAID`. Un billet utilisé ou réservé ne présente aucun QR.

L’authentification passe par des routes Next de même origine : les JWT restent
côté serveur dans des cookies HttpOnly. Le navigateur ne conserve aucun jeton dans
localStorage. Les requêtes protégées sont validées par NestJS et les réponses
personnelles ne sont pas mises en cache HTTP. Le changement de profil et de mot de
passe utilise les endpoints existants ; la déconnexion vide les cookies et le cache
client privé.

### Données locales de test

Depuis la racine, démarrer la démo complète dans Docker (arrête au préalable les
conteneurs `backend`/`frontend` de `make dev`) :

```bash
make demo-up      # seed, backend et frontend
make demo-logs    # suivre le démarrage
make demo-seed    # relancer le seed
make demo-stop    # arrêter (données conservées)
make demo-reset   # repartir d’une base vide
```

Ouvrir `http://localhost:3001`. Le backend utilise le port 3000, PostgreSQL le port
55433 et Redis le port 56380. `API_INTERNAL_URL` peut remplacer l’origine backend
côté serveur (défaut : `http://localhost:3000`).

Le seed applique les migrations, puis insère 3 comptes vérifiés, 7 événements publiés et un brouillon privé,
leurs tarifs, 6 commandes et 6 billets (confirmé, réservé et utilisé) dans une
transaction. Il peut être relancé sans doublon et conserve les données déjà
présentes, notamment les mots de passe modifiés et les échéances. Les dates des
nouveaux événements sont relatives au premier lancement. Seule une base loopback
nommée `tickr_demo`, avec `NODE_ENV=development` et sans `DATABASE_URL`, est autorisée.
Le démarrage démo utilise `NODE_ENV=test` pour lire le schéma migré sans synchronisation
TypeORM automatique. Les horodatages sont traités en UTC et affichés en heure de Tunis.

Compte participant : `participant@demo.tickr.local` ; équipier à l’entrée sans billets
ni messages : `other@demo.tickr.local` ; organisateur : `organizer@demo.tickr.local`.
Mot de passe local commun : `TickrDemo2026!`. Ces comptes n’existent que dans le seed
local, jamais dans une migration de déploiement. Les QR ne correspondent qu’à cette
base de test et à des événements fictifs.

### Limites métier existantes

Les passerelles et le parcours espèces restent désactivés dans la configuration
de test. Le frontend présente cette indisponibilité réelle ; il ne fabrique pas de
réservation réussie ou de paiement. Les commandes payées du seed permettent de
vérifier la présentation des billets. La réception des e-mails nécessite la
configuration SES/LocalStack existante ; le seed fournit des comptes déjà vérifiés
pour tester sans service mail. Le PDF dépend de sa génération backend ; la page
l’indique lorsqu’il manque. Le règlement en ligne, le remboursement, le transfert,
le cache hors ligne persistant et la console admin restent hors de ce lot.
L’espace organisateur couvre les brouillons, tarifs et publications ; l’upload de
photos, l’encaissement et les rapports financiers ne sont pas encore exposés dans cette interface.
Le contrôle d’entrée accepte un code collé ou un lecteur externe ; la caméra n’est pas intégrée.
Le site reste `noindex` pendant cette phase de développement.

### Organisateur et préférences

- `/organizer` : vue d’ensemble et dernières créations, total fourni par l’API.
- `/organizer/events` : liste paginée des événements du compte.
- `/organizer/events/new` : création d’un brouillon avec horaires de Tunis.
- `/organizer/events/[id]` : lecture privée, modification du brouillon, ajout de
  tarifs en TND, publication avec confirmation. Les données proviennent de
  `GET /events/:id/manage`, protégé par JWT, rôle et propriété dans NestJS.
- `/account/notifications` : lecture et enregistrement des préférences réelles.
- `/help` et `/programme/concerts`, `/programme/festivals`,
  `/programme/spectacles`, `/programme/ateliers`, `/programme/comedies` : aide et découvertes publiques.
  Les textes éditoriaux sont fixes ; les événements restent fournis par l’API.

Le brouillon du seed (`…0007`, « La prochaine scène ») n’a aucun tarif et reste
privé. Le seed ne réinitialise pas les changements effectués dans cet espace.
Les événements publiés sont consultables ; l’édition complète respecte la règle
backend réservée aux brouillons. Aucun chiffre de revenu n’est fabriqué.

### Entrée, équipe et historique

- `/check-in` : événements accessibles au propriétaire, administrateur ou équipier actif.
- `/check-in/[eventId]` : code du billet et point d’entrée, validation réelle et
  confirmation horodatée par le serveur. Aucun nouvel essai automatique d’une mutation.
- `/organizer/events/[id]/team` : ajout par e-mail et retrait confirmé des accès.
- `/organizer/events/[id]/attendance` : totaux et détail par tarif, actualisation manuelle.
- `/account/messages` : historique privé des sujets, canaux et statuts fournis par l’API.

Le seed ajoute « [Démo] Les portes sont ouvertes » (`…0008`), dans la fenêtre
réelle de contrôle lors du premier lancement : début à +15 minutes, fin à +3 heures.
Trois billets couvrent les états confirmé, utilisé et réservé ; Sami possède un
accès à cet événement. Deux historiques participant et un organisateur sont déjà
terminaux, avec zéro relance possible : aucun e-mail n’est envoyé par ce seed.
Les QR, horaires, passages et révocations sont conservés à chaque relance.
Après fermeture de l’événement, créez un nouveau scénario local ou réinitialisez
explicitement la base démo pour retrouver une fenêtre de contrôle ouverte.

### Performance et référencement

Le programme, ses filtres et sa pagination sont rendus côté serveur, avec liens
explorables et formulaire GET utilisable sans JavaScript. La saisie d’une ville
ne lance aucune requête avant soumission. Les résultats sont inclus dans le HTML. Le préchargement automatique des liens
qui lisent le catalogue est désactivé pour éviter les rafales de requêtes ; les
métadonnées restent dans le head initial pour les navigateurs et les robots.
Les métadonnées et la fiche événement partagent une lecture API par rendu React ;
les prix, disponibilités et paramètres de paiement restent sans cache persistant.
Seul l’inventaire des sitemaps est revalidé toutes les cinq minutes. Les polices
locales utilisent `next/font`, avec préchargement et ajustement du repli ; les
images conservent leurs dimensions et des tailles adaptées à la grille.

Par défaut, la démo et les previews sont `noindex`, robots interdit l’exploration,
et les sitemaps sont vides. **Pour le site public, configurer ces variables au
build et au démarrage**, avec le vrai domaine HTTPS :

```dotenv
SITE_URL=https://votre-domaine-public.example
SITE_INDEXABLE=true
```

Les pages publiques disposent de titres, descriptions, URL canoniques et cartes
Open Graph/Twitter. Les fiches exposent un `Event` JSON-LD échappé, sans inventer
d’offre achetable lorsque le paiement est indisponible. Les filtres et recherches
restent `noindex,follow`. Les espaces compte, billets, commandes, organisateur, contrôle d’entrée et
authentification restent toujours `noindex,nofollow`, même en production.

`/sitemap.xml` contient les pages publiques principales ; les événements publiés
sont paginés dans `/events/sitemap/0.xml`, `/events/sitemap/1.xml`, etc. `robots.txt`
référence ces fichiers. Les brouillons et données personnelles n’y figurent pas.
Un échec API de l’inventaire produit une erreur serveur plutôt qu’un faux sitemap
incomplet. La présence de données structurées ne garantit pas un résultat enrichi.

### Direction et actifs

La [charte En scène v1.1](../docs/11-brand-charter/README.md) définit couleurs,
polices, logo et composition. Les polices locales conservent leurs licences dans
`public/brand/fonts/`. Les affiches de test de `public/demo/posters/` sont des
compositions originales exportées depuis le premier lot de design. Les photos
sont illustratives, sans association à un événement tunisien réel :

- `live-crowd.jpg` reprend l’actif de la charte, avec sa [provenance](../docs/11-brand-charter/REFERENCES.md).
- `jazz.jpg` : [source Unsplash](https://images.unsplash.com/photo-1511192336575-5a79af67a629).
- `festival.jpg` : [source Unsplash](https://images.unsplash.com/photo-1506157786151-b8491531f063).
- `stage.jpg` : [source Unsplash](https://images.unsplash.com/photo-1514525253161-7a46d19cd819).

## 📝 Available Scripts

```bash
# Development
npm run dev              # Start Next.js dev server (port 3001)
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run type-check       # Run TypeScript type checking

# Testing
npm run test             # Run unit tests with Vitest
npm run test:ui          # Run tests with UI
```

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── globals.css        # Global styles
│   ├── events/            # Events routes
│   ├── tickets/           # Tickets routes
│   ├── auth/              # Auth routes
│   └── dashboard/         # Dashboard routes
│
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── layout/           # Layout components
│
├── lib/                  # Utilities & configurations
│   ├── api/             # API client
│   ├── hooks/           # Custom React hooks
│   └── utils.ts         # Helper functions
│
└── types/               # TypeScript type definitions
```

## 🔧 Environment Variables

Create a `.env.local` file with the following variables:

```bash
# API Backend
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_API_TIMEOUT=30000

# App Configuration
NEXT_PUBLIC_APP_NAME=Tickr
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_APP_ENV=development

# Feature Flags
NEXT_PUBLIC_ENABLE_DEVTOOLS=true
NEXT_PUBLIC_ENABLE_ANALYTICS=false
```

## 🐳 Docker

### Development

```bash
docker build -f Dockerfile.dev -t tickr-frontend:dev .
docker run -p 3001:3001 -v $(pwd):/app tickr-frontend:dev
```

### Production

```bash
docker build -f Dockerfile -t tickr-frontend:prod .
docker run -p 3001:3001 tickr-frontend:prod
```

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [React Query Documentation](https://tanstack.com/query/latest)

## 🤝 Contributing

Please read the main project README for contribution guidelines.

## 📄 License

This project is proprietary and confidential.
