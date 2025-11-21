# 🎫 Tickr - Plateforme de Billetterie en Ligne

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/IhebRjeb/Tickr)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Stack](https://img.shields.io/badge/stack-React%20%7C%20NestJS%20%7C%20PostgreSQL-orange.svg)](docs/02-technique/01-stack-technique.md)

> Plateforme web de billetterie en ligne pour le marché tunisien, permettant aux organisateurs d'événements de créer, gérer et vendre des billets digitaux avec paiement en ligne et entrée par QR code.

---

## 🚀 Vue d'Ensemble

**Tickr** est une solution complète de gestion de billetterie développée avec une architecture **Monolithe Modulaire Hexagonal** avec migration progressive vers microservices. Le projet cible spécifiquement le marché tunisien avec support des paiements locaux (Clictopay/Edinar) et internationaux (Stripe).

### 🎯 Proposition de Valeur

**Pour Organisateurs :**
- ✅ Création d'événement en moins de 5 minutes
- ✅ Paiement en ligne sécurisé (cartes locales + internationales)
- ✅ Gestion des billets en temps réel
- ✅ Statistiques de ventes instantanées
- ✅ Check-in par QR code à l'entrée

**Pour Participants :**
- ✅ Achat de billets mobile-first
- ✅ Paiement par carte locale ou internationale
- ✅ Réception instantanée du QR code (email/SMS)
- ✅ Notifications et rappels automatiques

---

## 📂 Structure du Repository

Ce repository est organisé comme un **monorepo** contenant tous les composants du projet :

```
Tickr/
├── docs/                          # 📚 Documentation complète
│   ├── 01-fonctionnel/            # Spécifications métier
│   ├── 02-technique/              # Stack & API
│   ├── 03-architecture/           # Architecture hexagonale
│   └── 04-infrastructure/         # AWS & déploiement
│
├── backend/                       # ⚙️ API NestJS (à venir)
│   ├── src/
│   │   ├── modules/
│   │   │   ├── events/           # Module Événements
│   │   │   ├── tickets/          # Module Billets
│   │   │   ├── payments/         # Module Paiements
│   │   │   ├── users/            # Module Utilisateurs
│   │   │   ├── notifications/    # Module Notifications
│   │   │   └── analytics/        # Module Analytics
│   │   ├── shared/               # Code partagé
│   │   └── config/               # Configuration
│   ├── test/                     # Tests
│   └── migrations/               # Migrations DB
│
├── frontend/                      # 🎨 Application React (à venir)
│   ├── src/
│   │   ├── app/                  # Routes & pages
│   │   ├── components/           # Composants UI
│   │   ├── lib/                  # Hooks & utilities
│   │   └── types/                # TypeScript types
│   └── public/
│
├── mobile/                        # 📱 App Mobile (V2)
│   └── (React Native - planifié)
│
├── infrastructure/                # 🏗️ Infrastructure as Code (à venir)
│   ├── terraform/                # Configuration Terraform
│   │   ├── modules/
│   │   ├── environments/
│   │   └── main.tf
│   └── docker/                   # Docker configurations
│       ├── docker-compose.yml
│       └── Dockerfile.*
│
├── scripts/                       # 🛠️ Scripts utilitaires
│   ├── setup.sh                  # Setup environnement local
│   ├── deploy.sh                 # Déploiement
│   └── seed-data.ts              # Données de test
│
└── README.md                      # 📖 Ce fichier
```

---

## 🛠️ Stack Technique

### Backend
- **Framework :** NestJS 10+ (Node.js 20 LTS)
- **Langage :** TypeScript 5.3+
- **Base de données :** PostgreSQL 15.4
- **Cache :** Redis 7.x
- **ORM :** TypeORM
- **Architecture :** Hexagonale (Ports & Adapters)

### Frontend
- **Framework :** React 18+ avec TypeScript
- **Build Tool :** Vite 5.x
- **UI/Styling :** TailwindCSS + Headless UI
- **State Management :** React Query + Zustand
- **Forms :** React Hook Form + Zod

### Infrastructure (AWS)
- **Compute :** ECS Fargate
- **Database :** RDS PostgreSQL
- **Cache :** ElastiCache Redis
- **Storage :** S3 (images)
- **CDN :** CloudFront (V2)
- **Monitoring :** CloudWatch + X-Ray
- **IaC :** Terraform

### Paiements
- **Tunisie :** Clictopay / Edinar
- **International :** Stripe

### Notifications
- **Email :** Amazon SES
- **SMS :** Amazon SNS / Twilio

---

## 📊 Architecture

### 6 Modules Bounded Contexts

Le backend est structuré en **6 modules isolés** communiquant uniquement via **événements** :

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│  USERS   │  │  EVENTS  │  │ TICKETS  │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │              │
     └─────────────┼──────────────┘
                   │
            ┌──────▼──────┐
            │ EVENT BUS   │
            └──────┬──────┘
                   │
     ┌─────────────┼──────────────┐
     │             │              │
┌────▼─────┐  ┌───▼──────┐  ┌───▼──────┐
│ PAYMENTS │  │  NOTIFS  │  │ANALYTICS │
└──────────┘  └──────────┘  └──────────┘
```

| Module | Responsabilité |
|--------|----------------|
| **Users** | Authentification, profils, autorisation |
| **Events** | Création/gestion événements, types de billets |
| **Tickets** | Génération billets, QR codes, check-in |
| **Payments** | Commandes, paiements, remboursements |
| **Notifications** | Emails, SMS, notifications push |
| **Analytics** | Statistiques, métriques, rapports |

**📖 Plus de détails :** [Structure Modules](docs/03-architecture/02-structure-modules.md)

---

## 🚦 Démarrage Rapide

### Prérequis

```bash
# Vérifier les versions
node --version    # >= 20.0.0
npm --version     # >= 10.0.0
docker --version  # >= 24.0.0
psql --version    # >= 15.0
```

### Installation

```bash
# 1. Cloner le repository
git clone https://github.com/IhebRjeb/Tickr.git
cd Tickr

# 2. Installer les dépendances Backend
cd backend
npm install

# 3. Installer les dépendances Frontend
cd ../frontend
npm install

# 4. Configurer les variables d'environnement
cd ../backend
cp .env.example .env
# Éditer .env avec vos configurations

# 5. Lancer les services Docker (PostgreSQL + Redis)
docker-compose up -d

# 6. Exécuter les migrations
npm run migration:run

# 7. Seed data (optionnel)
npm run seed

# 8. Lancer le backend
npm run start:dev

# 9. Dans un nouveau terminal, lancer le frontend
cd ../frontend
npm run dev
```

### Accès

- **Frontend :** http://localhost:5173
- **Backend API :** http://localhost:3000
- **API Docs (Swagger) :** http://localhost:3000/api/docs
- **PostgreSQL :** localhost:5432
- **Redis :** localhost:6379

---

## 📚 Documentation

La documentation complète est disponible dans le dossier [`docs/`](docs/README.md).

### 🎯 Parcours Recommandé (1h30)

**Lecture essentielle avant de coder :**

1. **[Vue d'Ensemble Fonctionnelle](docs/01-fonctionnel/01-vue-ensemble.md)** (15 min)  
   → Comprendre les acteurs et workflows métier

2. **[Stack Technique](docs/02-technique/01-stack-technique.md)** (10 min)  
   → Valider les choix technologiques

3. **[Principes Hexagonaux](docs/03-architecture/01-principes-hexagonaux.md)** (20 min)  
   → Maîtriser les fondamentaux de l'architecture

4. **[Structure Modules](docs/03-architecture/02-structure-modules.md)** (30 min)  
   → Comprendre l'organisation des 6 modules

5. **[Database Schema](docs/02-technique/03-database-schema.md)** (20 min)  
   → Étudier la structure de la base de données

### 📖 Documentation Complète

| Catégorie | Documents | Description |
|-----------|-----------|-------------|
| **01-Fonctionnel** | [📁](docs/01-fonctionnel/) | Vision produit, user stories, règles métier |
| **02-Technique** | [📁](docs/02-technique/) | Stack, API, database, modèle économique |
| **03-Architecture** | [📁](docs/03-architecture/) | Hexagonal, modules, event-driven, microservices |
| **04-Infrastructure** | [📁](docs/04-infrastructure/) | AWS, Terraform, CI/CD, monitoring |

**📖 Index complet :** [Documentation README](docs/README.md)

---

## 🧪 Tests

```bash
# Backend - Tests unitaires
cd backend
npm run test

# Backend - Tests E2E
npm run test:e2e

# Backend - Coverage
npm run test:cov

# Frontend - Tests
cd frontend
npm run test
```

**Objectifs de couverture :**
- Unitaires : > 80%
- Intégration : > 70%
- E2E : Workflows critiques couverts

---

## 🚀 Déploiement

### Environnements

```yaml
Development:
  URL: http://localhost:5173
  Backend: http://localhost:3000
  Database: Docker local

Staging:
  URL: https://staging.tickr.tn
  Backend: https://api-staging.tickr.tn
  Database: RDS (db.t3.small)

Production:
  URL: https://tickr.tn
  Backend: https://api.tickr.tn
  Database: RDS (db.t3.medium, Multi-AZ)
```

### CI/CD Pipeline

```yaml
GitHub Actions:
  - ✅ Lint & Tests sur Pull Request
  - ✅ Build Docker image
  - ✅ Push vers ECR
  - ✅ Deploy ECS Fargate

Branches:
  - main → Production
  - develop → Staging
  - feature/* → Preview (optionnel)
```

**📖 Plus de détails :** [CI/CD Pipeline](docs/04-infrastructure/03-cicd-pipeline.md)

---

## 💰 Modèle Économique

- **Commission plateforme :** 4% par billet vendu (payé par l'organisateur)
- **Frais de transaction :** Absorbés par la plateforme
- **Remboursements :** Politique configurable par organisateur

**Exemple :**
```
Billet à 50 TND
→ Participant paie : 50 TND
→ Organisateur reçoit : 48 TND (50 - 4%)
→ Tickr reçoit : 2 TND
```

**📖 Plus de détails :** [Modèle Économique](docs/02-technique/04-modele-economique.md)

---

## 🗺️ Roadmap

### ✅ V1 - MVP (3 mois) - **En cours**

**Objectif :** Lancer la plateforme avec fonctionnalités essentielles

- [x] Documentation complète
- [ ] Backend NestJS (6 modules)
- [ ] Frontend React
- [ ] Authentification JWT
- [ ] CRUD Événements
- [ ] Paiement Clictopay/Stripe
- [ ] Génération QR codes
- [ ] Emails transactionnels
- [ ] Dashboard organisateur
- [ ] Déploiement AWS (ECS)

**Date cible :** T1 2026

### 🔄 V2 - Croissance (6 mois)

**Objectif :** Améliorer l'expérience et scaler

- [ ] Application mobile React Native
- [ ] Notifications push
- [ ] Multilangue (Français, Arabe, Anglais)
- [ ] Recommandations événements (ML)
- [ ] Programme de fidélité
- [ ] API publique (partenaires)
- [ ] Migration microservices (Payments)
- [ ] CloudFront CDN
- [ ] Multi-AZ RDS

**Date cible :** T3 2026

### 🚀 V3 - Scale & Innovation (12 mois)

**Objectif :** Devenir leader régional

- [ ] Expansion Maghreb (Algérie, Maroc)
- [ ] Places numérotées / Plans de salles
- [ ] Marketplace merchandising
- [ ] Live streaming événements
- [ ] Chatbot support (IA)
- [ ] Architecture microservices complète
- [ ] Multi-région AWS

**Date cible :** T4 2027

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Veuillez suivre ces étapes :

1. **Fork** le projet
2. Créer une **branche** (`git checkout -b feature/AmazingFeature`)
3. **Commit** vos changements (`git commit -m 'Add: AmazingFeature'`)
4. **Push** vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une **Pull Request**

### Standards de Code

- **Backend :** ESLint + Prettier (config NestJS)
- **Frontend :** ESLint + Prettier (config React)
- **Commits :** Convention Conventional Commits
- **Tests :** Obligatoires pour nouvelles features

---

## 📄 Licence

Ce projet est sous licence **MIT**. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

## 👥 Équipe

**Développé par :** [Iheb Rjeb](https://github.com/IhebRjeb)

**Contact :**
- **Email :** contact@tickr.tn
- **Twitter :** [@tickrtn](https://twitter.com/tickrtn)
- **LinkedIn :** [Tickr](https://linkedin.com/company/tickr-tn)

---

## 🙏 Remerciements

- [NestJS](https://nestjs.com/) pour le framework backend
- [React](https://react.dev/) pour le framework frontend
- [AWS](https://aws.amazon.com/) pour l'infrastructure cloud
- [Stripe](https://stripe.com/) pour les paiements internationaux
- La communauté open-source pour les nombreuses bibliothèques utilisées

---

## 📊 Métriques du Projet

![GitHub stars](https://img.shields.io/github/stars/IhebRjeb/Tickr?style=social)
![GitHub forks](https://img.shields.io/github/forks/IhebRjeb/Tickr?style=social)
![GitHub issues](https://img.shields.io/github/issues/IhebRjeb/Tickr)
![GitHub pull requests](https://img.shields.io/github/issues-pr/IhebRjeb/Tickr)

---

<div align="center">

**[Documentation](docs/README.md)** • **[Changelog](CHANGELOG.md)** • **[Contribute](CONTRIBUTING.md)**

Made with ❤️ for the Tunisian tech community

</div>
