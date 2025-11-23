## 📝 Description

<!-- Décrivez clairement les changements apportés par cette PR -->

## 🎯 Type de changement

- [ ] 🐛 **Bugfix** - Correction d'un bug (non-breaking change)
- [ ] ✨ **Feature** - Nouvelle fonctionnalité (non-breaking change)
- [ ] 💥 **Breaking Change** - Changement cassant la compatibilité
- [ ] 📚 **Documentation** - Mise à jour de la documentation
- [ ] 🎨 **Style** - Formatage, indentation (pas de changement de logique)
- [ ] ♻️ **Refactoring** - Refactoring du code (pas de changement fonctionnel)
- [ ] ⚡ **Performance** - Amélioration des performances
- [ ] ✅ **Tests** - Ajout ou modification de tests
- [ ] 🔧 **Chore** - Maintenance (dépendances, configuration)

## 🔗 Issue liée

<!-- Lien vers l'issue GitHub si applicable -->
Closes #
Fixes #
Relates to #

## 🧪 Tests effectués

- [ ] Tests unitaires ajoutés/modifiés
- [ ] Tests d'intégration ajoutés/modifiés
- [ ] Tests E2E ajoutés/modifiés
- [ ] Tests manuels effectués

### Commandes de test

```bash
make test           # ✅ Tests passent
make lint           # ✅ Lint OK
npm run build       # ✅ Build réussit
```

## ✅ Checklist pré-merge

### Code Quality

- [ ] Le code respecte les conventions du projet
- [ ] Pas de console.log ou code de debug
- [ ] Pas de commentaires TODO non justifiés
- [ ] Code lint (`make lint`)
- [ ] TypeScript type check (`make type-check`)
- [ ] Tests passent (`make test`)
- [ ] Build réussit localement

### Documentation

- [ ] README mis à jour (si nécessaire)
- [ ] Documentation technique mise à jour
- [ ] Commentaires JSDoc ajoutés pour fonctions publiques
- [ ] CHANGELOG.md mis à jour (pour features/breaking changes)

### Git

- [ ] Commits suivent les conventions (conventional commits)
- [ ] Branch à jour avec develop/main
- [ ] Pas de merge conflicts
- [ ] Historique Git propre (squash si nécessaire)

### Testing

- [ ] Coverage tests maintenu/amélioré
- [ ] Tests E2E passent
- [ ] Testé sur environnement de développement
- [ ] Testé sur différents navigateurs (si frontend)

## 📸 Screenshots / Vidéos

<!-- Si changements visuels, ajoutez des captures d'écran -->

### Avant
<!-- Screenshot de l'état avant -->

### Après
<!-- Screenshot de l'état après -->

## 🚀 Déploiement

### Environnements affectés

- [ ] Development
- [ ] Staging
- [ ] Production

### Migrations nécessaires

- [ ] Base de données
- [ ] Configuration
- [ ] Variables d'environnement

### Instructions de déploiement

<!-- Si nécessaire, détaillez les étapes spéciales de déploiement -->

```bash
# Commandes spéciales si nécessaire
```

## 📋 Notes pour les reviewers

<!-- Informations supplémentaires pour faciliter la review -->
<!-- Points d'attention, zones à vérifier particulièrement, etc. -->

### Points d'attention

- 
- 
- 

### Questions ouvertes

- 
- 

## 🔍 Review checklist (pour les reviewers)

- [ ] Code est compréhensible et maintenable
- [ ] Logique métier est correcte
- [ ] Pas de régression fonctionnelle
- [ ] Sécurité: pas de faille évidente
- [ ] Performance: pas de problème de performance
- [ ] Tests couvrent les cas importants
- [ ] Documentation suffisante

---

**Merci de prendre le temps de review cette PR! 🙏**
