# 🌳 Git Branching Strategy - Tickr

**Version:** 1.0  
**Date:** Novembre 2025  
**Temps lecture:** 15 minutes

---

## 🎯 Vue d'Ensemble

Stratégie Git basée sur **GitFlow simplifié** avec **Trunk-Based Development** pour le déploiement continu.

### Branches Principales

```
main (production)
  ↑
  └── develop (staging)
        ↑
        ├── feature/* (nouvelles fonctionnalités)
        ├── bugfix/* (corrections non critiques)
        ├── hotfix/* (corrections critiques production)
        └── release/* (préparation releases)
```

---

## 📋 Types de Branches

### 1. **main** - Production

```yaml
Description: Code en production
Déploiement: Automatique vers production (après approval)
Protection: Oui (reviews obligatoires)
Merge depuis: develop, hotfix/*
Tests: CI complet + CD production
Durée de vie: Permanente
```

**Règles:**
- ✅ Merge uniquement via PR
- ✅ 1+ reviews obligatoires
- ✅ Tous les checks CI passés
- ✅ Approval manuel requis avant deploy
- ❌ Pas de commit direct
- ❌ Pas de force push

**Workflow:**
```bash
# Merge depuis develop (après tests staging)
git checkout main
git merge --no-ff develop
git push origin main
# → Déclenche CD production avec approval gate
```

---

### 2. **develop** - Staging

```yaml
Description: Code de développement intégré
Déploiement: Automatique vers staging
Protection: Oui (reviews obligatoires)
Merge depuis: feature/*, bugfix/*, release/*
Tests: CI complet + CD staging
Durée de vie: Permanente
```

**Règles:**
- ✅ Merge via PR uniquement
- ✅ 1+ review obligatoire
- ✅ Tous les checks CI passés
- ✅ Tests E2E passés
- ❌ Pas de commit direct
- ❌ Pas de force push

**Workflow:**
```bash
# Créer depuis main (première fois)
git checkout -b develop main
git push -u origin develop

# Merge feature
git checkout develop
git merge --no-ff feature/awesome-feature
git push origin develop
# → Déclenche auto-deploy vers staging
```

---

### 3. **feature/*** - Nouvelles Fonctionnalités

```yaml
Description: Développement de nouvelles features
Déploiement: Non (local uniquement)
Protection: Non
Merge vers: develop
Tests: CI sur PR
Durée de vie: Temporaire (supprimée après merge)
```

**Naming Convention:**
```
feature/user-authentication
feature/event-creation
feature/payment-integration
feature/TICKR-123-add-search  (avec ticket ID)
```

**Workflow:**
```bash
# 1. Créer depuis develop
git checkout develop
git pull origin develop
git checkout -b feature/user-authentication

# 2. Développer
git add .
git commit -m "feat: add user authentication"

# 3. Push régulièrement
git push origin feature/user-authentication

# 4. Créer PR vers develop
# Sur GitHub: feature/user-authentication → develop

# 5. Après merge, supprimer
git checkout develop
git pull origin develop
git branch -d feature/user-authentication
git push origin --delete feature/user-authentication
```

**Conventions de Commit:**
```bash
feat: nouvelle fonctionnalité
fix: correction de bug
docs: documentation
style: formatage code
refactor: refactoring
test: ajout tests
chore: tâches maintenance
```

---

### 4. **bugfix/*** - Corrections Non Critiques

```yaml
Description: Corrections de bugs non critiques
Déploiement: Non (local uniquement)
Protection: Non
Merge vers: develop
Tests: CI sur PR
Durée de vie: Temporaire
```

**Naming Convention:**
```
bugfix/login-redirect
bugfix/email-template
bugfix/TICKR-456-fix-search
```

**Workflow:**
```bash
# Similaire à feature/* mais préfixe bugfix/
git checkout develop
git pull origin develop
git checkout -b bugfix/login-redirect

# Développer fix
git commit -m "fix: correct login redirect issue"

# PR vers develop
```

---

### 5. **hotfix/*** - Corrections Critiques Production

```yaml
Description: Corrections urgentes en production
Déploiement: Vers production (après tests)
Protection: Non mais review accélérée
Merge vers: main ET develop
Tests: CI complet + tests manuels
Durée de vie: Temporaire (< 24h)
```

**Quand utiliser:**
- 🔥 Bug critique en production
- 🔥 Faille de sécurité
- 🔥 Panne service critique

**Naming Convention:**
```
hotfix/payment-gateway-down
hotfix/security-xss-fix
hotfix/v1.2.1  (avec version)
```

**Workflow:**
```bash
# 1. Créer depuis main
git checkout main
git pull origin main
git checkout -b hotfix/payment-gateway-down

# 2. Fix rapide
git commit -m "hotfix: fix payment gateway connection"

# 3. Tests locaux OBLIGATOIRES
make test
make test-e2e

# 4. Push et PR vers main
git push origin hotfix/payment-gateway-down
# PR: hotfix/payment-gateway-down → main

# 5. IMPORTANT: Aussi merger vers develop
git checkout develop
git merge --no-ff hotfix/payment-gateway-down
git push origin develop

# 6. Supprimer après merge
git branch -d hotfix/payment-gateway-down
git push origin --delete hotfix/payment-gateway-down
```

---

### 6. **release/*** - Préparation Releases

```yaml
Description: Préparation version pour production
Déploiement: Tests sur staging
Protection: Non
Merge vers: main ET develop
Tests: CI complet + tests manuels
Durée de vie: Temporaire (1-3 jours)
```

**Quand utiliser:**
- 📦 Préparer release majeure
- 📦 Stabilisation avant production
- 📦 Tests finaux

**Naming Convention:**
```
release/v1.2.0
release/v2.0.0-beta
```

**Workflow:**
```bash
# 1. Créer depuis develop
git checkout develop
git pull origin develop
git checkout -b release/v1.2.0

# 2. Bump version
npm version 1.2.0
# Met à jour package.json

# 3. Update CHANGELOG
echo "## v1.2.0 - $(date +%Y-%m-%d)" >> CHANGELOG.md

# 4. Commits release
git commit -am "chore: prepare release v1.2.0"

# 5. Tests approfondis
make test
make test-e2e

# 6. Merge vers main
git checkout main
git merge --no-ff release/v1.2.0
git tag -a v1.2.0 -m "Release v1.2.0"
git push origin main --tags

# 7. Back-merge vers develop
git checkout develop
git merge --no-ff release/v1.2.0
git push origin develop

# 8. Supprimer
git branch -d release/v1.2.0
git push origin --delete release/v1.2.0
```

---

## 🔄 Workflows Complets

### Workflow 1: Feature Normale

```
1. Créer feature branch depuis develop
   └─> git checkout -b feature/awesome-feature develop

2. Développer + commits réguliers
   └─> git commit -m "feat: add awesome feature"

3. Push et créer PR
   └─> PR: feature/awesome-feature → develop

4. CI s'exécute automatiquement
   └─> Lint, Tests, Build, Security

5. Code review (1+ reviewers)
   └─> Corrections si nécessaire

6. Merge vers develop
   └─> Auto-deploy vers staging

7. Tests sur staging
   └─> Validation fonctionnelle

8. Si OK, merge develop → main
   └─> Deploy production (avec approval)
```

**Durée typique:** 2-5 jours

---

### Workflow 2: Hotfix Urgent

```
1. Identifier bug critique en production
   └─> Alerte monitoring / Report utilisateur

2. Créer hotfix depuis main
   └─> git checkout -b hotfix/critical-bug main

3. Fix rapide + tests locaux
   └─> make test

4. PR vers main (review accélérée)
   └─> Review en < 1h

5. Merge vers main
   └─> Deploy production immédiat

6. Back-merge vers develop
   └─> Sync develop avec fix

7. Monitoring post-deploy
   └─> Vérifier fix en prod
```

**Durée typique:** 1-4 heures

---

### Workflow 3: Release Planifiée

```
1. Créer release branch depuis develop
   └─> git checkout -b release/v1.2.0 develop

2. Freeze features
   └─> Seulement bugfixes sur release/*

3. Tests approfondis
   └─> QA complète sur staging

4. Corrections bugs si nécessaire
   └─> Commits sur release/v1.2.0

5. Bump version + CHANGELOG
   └─> npm version 1.2.0

6. Merge vers main
   └─> Deploy production

7. Back-merge vers develop
   └─> Sync develop

8. Tag version
   └─> git tag v1.2.0
```

**Durée typique:** 1-3 jours

---

## 📊 Stratégie Sans Budget AWS (Phase Initiale)

### Adaptation pour Développement Local

```yaml
Phase 1 (Actuelle): Développement Local
  Branches: feature/*, bugfix/*, develop, main
  Deploy: Local uniquement (Docker Compose)
  CI: GitHub Actions (gratuit 2000 min/mois)
  Tests: Automatisés sur PRs
  
Phase 2 (Futur): Avec Budget
  Branches: Toutes
  Deploy: Staging + Production (AWS)
  CI/CD: Complet
```

### Workflow Adapté Sans AWS

```bash
# Feature development
feature/* → develop (CI only, no deploy)

# Testing
develop → Tests locaux avec make test

# Production simulation
develop → main (CI only)
         → Deploy local avec make deploy-staging

# Real production
main → Attendre budget AWS
     → Activer CD workflows
```

### Configuration GitHub Actions

```yaml
# .github/workflows/ci.yml
# ✅ Actif maintenant (gratuit)
on:
  pull_request:
    branches: [develop, main]
  push:
    branches: [feature/**, bugfix/**]

# .github/workflows/cd-staging.yml
# ⏸️ Désactivé (requiert AWS)
on:
  push:
    branches: [develop]
  # COMMENTÉ pour l'instant

# .github/workflows/cd-production.yml
# ⏸️ Désactivé (requiert AWS)
on:
  push:
    branches: [main]
  # COMMENTÉ pour l'instant
```

---

## 🛡️ Protection des Branches

### Configuration GitHub

#### Branch: **main**

```yaml
Protection Rules:
  ✅ Require pull request reviews: 1
  ✅ Require status checks to pass: Yes
    - ci/lint
    - ci/test-unit
    - ci/test-integration
    - ci/test-e2e
    - ci/build
    - ci/security
  ✅ Require branches to be up to date: Yes
  ✅ Require conversation resolution: Yes
  ✅ Require signed commits: No (optionnel)
  ✅ Include administrators: Yes
  ❌ Allow force pushes: No
  ❌ Allow deletions: No
```

#### Branch: **develop**

```yaml
Protection Rules:
  ✅ Require pull request reviews: 1
  ✅ Require status checks to pass: Yes
    - ci/lint
    - ci/test-unit
    - ci/test-integration
    - ci/build
  ✅ Require branches to be up to date: Yes
  ✅ Require conversation resolution: Yes
  ❌ Allow force pushes: No
  ❌ Allow deletions: No
```

---

## 🏷️ Stratégie de Tagging

### Semantic Versioning

```
MAJOR.MINOR.PATCH
  │     │     │
  │     │     └─> Bugfixes (v1.2.1)
  │     └──────> New features (v1.2.0)
  └────────────> Breaking changes (v2.0.0)
```

### Conventions de Tags

```bash
# Production releases
v1.0.0, v1.1.0, v1.2.0, v2.0.0

# Pre-releases
v1.2.0-alpha.1
v1.2.0-beta.1
v1.2.0-rc.1

# Hotfixes
v1.2.1, v1.2.2

# Automatique avec GitHub Actions
# Basé sur commits conventionnels
```

### Création de Tags

```bash
# Tag annoté (recommandé)
git tag -a v1.2.0 -m "Release v1.2.0: User authentication + Event management"
git push origin v1.2.0

# Tag léger (développement)
git tag v1.2.0-dev
git push origin v1.2.0-dev

# Lister tags
git tag -l

# Supprimer tag local
git tag -d v1.2.0

# Supprimer tag remote
git push origin --delete v1.2.0
```

---

## 📝 Conventions de Commit

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

```yaml
feat:     Nouvelle fonctionnalité
fix:      Correction de bug
docs:     Documentation
style:    Formatage code (pas de logique)
refactor: Refactoring
test:     Ajout/modification tests
chore:    Maintenance (deps, config)
perf:     Amélioration performance
ci:       CI/CD configuration
build:    Build système
```

### Exemples

```bash
# Feature
git commit -m "feat(auth): add JWT authentication"
git commit -m "feat(events): implement event creation form"

# Bugfix
git commit -m "fix(payment): resolve Stripe webhook timeout"
git commit -m "fix(ui): correct button alignment on mobile"

# Breaking change
git commit -m "feat(api)!: change authentication endpoint
BREAKING CHANGE: /api/login is now /api/auth/login"

# With body
git commit -m "feat(tickets): add QR code generation

- Implement QR code generation with qrcode library
- Add validation for ticket data
- Include error handling

Closes #123"
```

---

## 🚀 Checklist Développeur

### Avant de Commencer

```yaml
✅ Pull latest develop:
   git checkout develop && git pull origin develop

✅ Vérifier pas de branches en cours:
   git branch | grep feature/
   
✅ Créer feature branch:
   git checkout -b feature/my-feature
```

### Pendant le Développement

```yaml
✅ Commits réguliers:
   - Au moins 1x par jour
   - Messages descriptifs
   - Conventions respectées

✅ Tests locaux:
   make test
   
✅ Lint avant commit:
   make lint-fix
```

### Avant la PR

```yaml
✅ Rebase sur develop:
   git fetch origin
   git rebase origin/develop
   
✅ Tests complets:
   make test
   make test-e2e
   
✅ Build OK:
   npm run build
   
✅ Lint clean:
   make lint
   
✅ Type check:
   make type-check
```

### Après le Merge

```yaml
✅ Supprimer branch locale:
   git branch -d feature/my-feature
   
✅ Supprimer branch remote:
   git push origin --delete feature/my-feature
   
✅ Pull develop:
   git checkout develop
   git pull origin develop
```

---

## 🔧 Commandes Git Utiles

### Configuration Initiale

```bash
# User config
git config --global user.name "Your Name"
git config --global user.email "you@tickr.tn"

# Editor
git config --global core.editor "code --wait"

# Aliases utiles
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'
git config --global alias.visual '!gitk'
```

### Workflows Quotidiens

```bash
# Status propre
git status -sb

# Log compact
git log --oneline --graph --decorate --all -10

# Voir différences
git diff
git diff --staged

# Commit interactif
git add -p

# Amend dernier commit
git commit --amend --no-edit

# Stash changements
git stash save "WIP: feature description"
git stash list
git stash pop

# Reset soft (garde changements)
git reset --soft HEAD~1

# Reset hard (perd changements)
git reset --hard HEAD~1
```

### Résolution de Conflits

```bash
# Voir conflits
git status

# Accepter theirs
git checkout --theirs path/to/file
git add path/to/file

# Accepter ours
git checkout --ours path/to/file
git add path/to/file

# Annuler merge
git merge --abort

# Annuler rebase
git rebase --abort
```

---

## 📊 Métriques Git

### Objectifs

```yaml
Fréquence commits:
  Par développeur: 3-5 commits/jour
  Par feature: 5-15 commits

Taille PR:
  Optimal: < 400 lignes
  Maximum: < 1000 lignes
  
Temps review:
  Normal: < 24h
  Urgent: < 4h
  Hotfix: < 1h

Branches actives:
  Maximum: 5 par développeur
  Nettoyage: Hebdomadaire
```

### Monitoring

```bash
# Statistiques repo
git log --all --pretty=format: --name-only | sort | uniq -c | sort -rg | head -10

# Commits par auteur
git shortlog -sn --all

# Activité par jour
git log --all --format=%cd --date=short | sort | uniq -c

# Branches stales
git branch -r --merged | grep -v main | grep -v develop
```

---

## 🎓 Formation Équipe

### Onboarding

1. **Lecture documentation** (1h)
2. **Setup environnement** avec `make setup` (30min)
3. **Première PR simple** (pratique workflow)
4. **Review de PRs** (apprendre standards)

### Ressources

- [Pro Git Book](https://git-scm.com/book/en/v2)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- Documentation interne: `docs/05-git-workflow/`

---

## ✅ Checklist

```yaml
✅ Protection branches (main, develop): Configurée sur GitHub
✅ Conventions commits: Équipe formée
✅ CI sur PRs: Configuré et actif
✅ CD désactivé: Attendre budget AWS
✅ Tags: Stratégie définie
✅ Workflow: Documenté et compris
✅ Outils: Git hooks, linters installés
```

---

**Questions?** Ouvrir une issue ou contacter le lead dev!

🌳 Happy branching!
