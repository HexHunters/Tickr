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

Depuis la racine, démarrer les services isolés :

```bash
docker-compose -p tickr-demo -f docker-compose.demo.yml up -d
cd backend
npm ci
npm run seed:demo
npm run build
npm run start:demo
```

Dans un autre terminal :

```bash
cd frontend
npm ci
npm run dev
```

Ouvrir `http://localhost:3001`. Le backend utilise le port 3000, PostgreSQL le port
55433 et Redis le port 56380. `API_INTERNAL_URL` peut remplacer l’origine backend
côté serveur (défaut : `http://localhost:3000`).

Le seed applique les migrations, puis insère 3 comptes vérifiés, 6 événements,
leurs tarifs, 3 commandes et 3 billets (confirmé, réservé et utilisé) dans une
transaction. Il peut être relancé sans doublon et conserve les données déjà
présentes, notamment les mots de passe modifiés et les échéances. Les dates des
nouveaux événements sont relatives au premier lancement. Seule une base loopback
nommée `tickr_demo`, avec `NODE_ENV=development` et sans `DATABASE_URL`, est autorisée.
Le démarrage démo utilise `NODE_ENV=test` pour lire le schéma migré sans synchronisation
TypeORM automatique. Les horodatages sont traités en UTC et affichés en heure de Tunis.

Compte participant : `participant@demo.tickr.local` ; compte vide pour vérifier
l’isolation : `other@demo.tickr.local` ; organisateur : `organizer@demo.tickr.local`.
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
le cache hors ligne persistant et les consoles organisateur/admin restent hors de ce lot.
Le site reste `noindex` pendant cette phase de développement.

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

