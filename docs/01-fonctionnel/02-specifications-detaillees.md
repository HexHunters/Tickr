# 📋 Spécifications Détaillées - Tickr MVP V1

**Version:** 1.0  
**Timeline:** 3 mois (12 sprints de 2 semaines)  
**Temps lecture:** 30 minutes

---

## 🎯 Scope MVP V1 (3 mois)

### Objectif

Livrer plateforme fonctionnelle permettant de:
- Créer et publier événements
- Vendre billets en ligne
- Payer par carte (Tunisie + international)
- Recevoir billets QR code
- Check-in entrée événement

### Non-Scope V1

❌ **Exclus de V1:**
- Application mobile native
- Paiement D17/Mobicash
- Système affiliation
- Billets places numérotées
- Événements récurrents
- Mode sombre
- Multi-langue (seulement Français V1)

---

## 📦 Features V1 par Module

### Module 1: Authentification & Utilisateurs

#### US-1.1: Inscription Participant
**En tant que** participant  
**Je veux** créer un compte  
**Pour** acheter des billets

**Critères acceptation:**
- [ ] Formulaire: email, téléphone (+216), mot de passe, nom/prénom
- [ ] Validation email unique
- [ ] Validation téléphone format tunisien
- [ ] Mot de passe min 8 caractères
- [ ] Email confirmation envoyé
- [ ] Redirection vers page accueil après inscription

**Estimé:** 3 points

---

#### US-1.2: Connexion
**En tant qu'** utilisateur  
**Je veux** me connecter  
**Pour** accéder à mon compte

**Critères acceptation:**
- [ ] Login par email OU téléphone + mot de passe
- [ ] JWT token généré (expiration 24h)
- [ ] Refresh token (expiration 30 jours)
- [ ] Message erreur si identifiants incorrects
- [ ] Rate limiting: max 5 tentatives/15 min

**Estimé:** 2 points

---

#### US-1.3: Profil Organisateur
**En tant qu'** utilisateur  
**Je veux** devenir organisateur  
**Pour** créer des événements

**Critères acceptation:**
- [ ] Switch "Devenir Organisateur" dans profil
- [ ] Informations additionnelles:
  - Nom organisation
  - Description
  - Logo (optionnel)
  - Réseaux sociaux (optionnel)
- [ ] Validation automatique (pas de modération V1)
- [ ] Badge "Organisateur" visible sur profil

**Estimé:** 3 points

---

### Module 2: Événements

#### US-2.1: Créer Événement
**En tant qu'** organisateur  
**Je veux** créer un événement  
**Pour** vendre des billets

**Critères acceptation:**
- [ ] Formulaire création:
  - Nom événement (max 200 char)
  - Description riche (WYSIWYG editor)
  - Catégorie (Concert/Sport/Formation)
  - Lieu: nom + adresse + GPS (Google Maps picker)
  - Date/heure début et fin
  - Image couverture (max 5MB, JPG/PNG)
- [ ] Upload image → S3
- [ ] Événement créé status BROUILLON
- [ ] URL unique générée: `/events/{slug}`
- [ ] Temps création < 5 min

**Estimé:** 8 points

---

#### US-2.2: Définir Types Billets
**En tant qu'** organisateur  
**Je veux** définir différents types de billets  
**Pour** proposer plusieurs tarifs

**Critères acceptation:**
- [ ] Ajouter 1 à 5 types billets par événement
- [ ] Chaque type:
  - Nom (ex: VIP, Standard, Early Bird)
  - Prix en TND
  - Quantité disponible
  - Description courte (optionnel)
- [ ] Validation: prix > 0, quantité > 0
- [ ] Possibilité modifier/supprimer types (si 0 ventes)

**Estimé:** 5 points

---

#### US-2.3: Publier Événement
**En tant qu'** organisateur  
**Je veux** publier mon événement  
**Pour** le rendre visible au public

**Critères acceptation:**
- [ ] Bouton "Publier" visible si événement complet
- [ ] Validation avant publication:
  - Au moins 1 type billet défini
  - Image couverture présente
  - Date événement dans le futur
- [ ] Changement status: BROUILLON → PUBLIÉ
- [ ] Événement visible dans recherche
- [ ] Notification email confirmation publication

**Estimé:** 3 points

---

#### US-2.4: Modifier Événement
**En tant qu'** organisateur  
**Je veux** modifier mon événement  
**Pour** corriger des informations

**Critères acceptation:**
- [ ] Possibilité modifier tous champs sauf:
  - Date (si < 48h)
  - Prix billets (si ventes en cours)
- [ ] Historique modifications sauvegardé
- [ ] Notification participants si changement majeur (date, lieu)

**Estimé:** 5 points

---

### Module 3: Recherche & Découverte

#### US-3.1: Rechercher Événements
**En tant que** participant  
**Je veux** rechercher des événements  
**Pour** trouver ce qui m'intéresse

**Critères acceptation:**
- [ ] Barre recherche: texte libre (nom événement)
- [ ] Filtres:
  - Ville (Tunis, Sousse, Sfax, Autre)
  - Catégorie (Concert, Sport, Formation)
  - Date (Aujourd'hui, Ce weekend, Ce mois, Tout)
  - Prix (Gratuit, < 20 TND, 20-50 TND, > 50 TND)
- [ ] Tri: Date (asc/desc), Prix (asc/desc), Popularité
- [ ] Pagination: 12 événements par page
- [ ] Temps réponse < 500ms

**Estimé:** 8 points

---

#### US-3.2: Consulter Détails Événement
**En tant que** participant  
**Je veux** voir les détails d'un événement  
**Pour** décider d'acheter

**Critères acceptation:**
- [ ] Page détails affiche:
  - Image couverture en grand
  - Nom + description complète
  - Date/heure (format local)
  - Lieu: nom + adresse + carte intégrée
  - Organisateur (nom + logo)
  - Types billets disponibles + prix
  - Nombre billets restants
- [ ] Bouton "Acheter" proéminent
- [ ] Bouton "Partager" (Facebook, Twitter, WhatsApp, Copier lien)
- [ ] SEO optimisé (meta tags)

**Estimé:** 5 points

---

### Module 4: Achat & Paiement

#### US-4.1: Panier Billets
**En tant que** participant  
**Je veux** ajouter des billets au panier  
**Pour** les acheter ensemble

**Critères acceptation:**
- [ ] Sélection type + quantité billets
- [ ] Validation disponibilité temps réel
- [ ] Affichage prix unitaire + total
- [ ] Commission 6% visible séparément (lecture depuis configuration)
- [ ] Prix final TTC affiché
- [ ] Réservation temporaire 15 min
- [ ] Timer countdown visible

**Estimé:** 5 points

---

#### US-4.2: Paiement Clictopay/Edinar
**En tant que** participant  
**Je veux** payer par carte bancaire tunisienne  
**Pour** obtenir mes billets

**Critères acceptation:**
- [ ] Redirection vers gateway Clictopay OU Edinar
- [ ] Passage paramètres:
  - Montant TND
  - Email participant
  - Référence commande
  - URL callback succès/échec
- [ ] Gestion statuts paiement:
  - PENDING: en attente validation
  - COMPLETED: paiement réussi
  - FAILED: paiement échoué
- [ ] Webhook pour notification asynchrone
- [ ] Timeout: 10 min max
- [ ] Retry automatique si échec réseau

**Estimé:** 13 points (complexe)

---

#### US-4.3: Paiement Stripe International
**En tant que** participant  
**Je veux** payer par carte internationale  
**Pour** obtenir mes billets si carte tunisienne refusée

**Critères acceptation:**
- [ ] Intégration Stripe Checkout
- [ ] Support cartes: Visa, Mastercard, Amex
- [ ] 3D Secure activé
- [ ] Conversion TND → USD/EUR automatique
- [ ] Frais conversion affichés
- [ ] Fallback si Clictopay indisponible

**Estimé:** 8 points

---

#### US-4.4: Confirmation Achat
**En tant que** participant  
**Je veux** recevoir confirmation immédiate  
**Pour** avoir mes billets

**Critères acceptation:**
- [ ] Après paiement réussi:
  - Redirection page confirmation
  - Email avec PDF billets (QR codes)
  - SMS avec lien téléchargement
- [ ] Chaque billet contient:
  - QR code unique
  - Nom événement + date/lieu
  - Nom participant
  - Type billet
  - Numéro billet (ex: #001234)
- [ ] PDF généré côté serveur (pas client)
- [ ] QR code format: `TICKR-{eventId}-{ticketId}`

**Estimé:** 8 points

---

### Module 5: Billets & QR Codes

#### US-5.1: Génération QR Codes
**En tant que** système  
**Je veux** générer QR codes uniques  
**Pour** chaque billet vendu

**Critères acceptation:**
- [ ] QR code contient: `{eventId}|{ticketId}|{userId}|{hash}`
- [ ] Hash HMAC-SHA256 pour sécurité
- [ ] Format image: PNG 300x300px
- [ ] Génération temps réel (< 2s par billet)
- [ ] Stockage URL S3 dans DB
- [ ] QR codes lisibles par scanners standards

**Estimé:** 5 points

---

#### US-5.2: Consulter Mes Billets
**En tant que** participant  
**Je veux** voir tous mes billets  
**Pour** les retrouver facilement

**Critères acceptation:**
- [ ] Page "Mes Billets" dans menu utilisateur
- [ ] Liste billets:
  - Événements à venir en premier
  - Événements passés en second
  - Billets annulés/remboursés séparés
- [ ] Chaque billet affiche:
  - Miniature événement
  - Nom + date
  - QR code cliquable (plein écran)
  - Bouton "Télécharger PDF"
  - Bouton "Ajouter au calendrier"

**Estimé:** 5 points

---

### Module 6: Check-in Entrée

#### US-6.1: Scanner QR Code
**En tant que** staff événement  
**Je veux** scanner les QR codes  
**Pour** valider l'entrée

**Critères acceptation:**
- [ ] Page dédiée: `/checkin/{eventId}`
- [ ] Authentification staff requise
- [ ] Activation caméra smartphone/webcam
- [ ] Scan QR code:
  - Décodage données
  - Appel API validation
  - Affichage résultat < 1s
- [ ] Si valide:
  - ✅ Écran vert "ACCÈS AUTORISÉ"
  - Nom participant + type billet
  - Son + vibration succès
  - Marque billet comme "UTILISÉ"
- [ ] Si invalide:
  - ❌ Écran rouge "ACCÈS REFUSÉ"
  - Raison: déjà utilisé / faux / mauvais événement
  - Son + vibration erreur
- [ ] Mode hors-ligne: cache derniers scans (sync quand réseau)

**Estimé:** 13 points (complexe)

---

### Module 7: Dashboard Organisateur

#### US-7.1: Statistiques Ventes
**En tant qu'** organisateur  
**Je veux** voir mes statistiques  
**Pour** suivre les ventes

**Critères acceptation:**
- [ ] Dashboard affiche:
  - Billets vendus / Total (%)
  - Chiffre affaires brut (TND)
  - Commission plateforme (6% - configurable)
  - Chiffre affaires net
  - Graphique ventes par jour
  - Top types billets vendus
  - Taux conversion (vues → achats)
- [ ] Données temps réel (rafraîchissement auto 30s)
- [ ] Export CSV statistiques

**Estimé:** 8 points

---

#### US-7.2: Liste Participants
**En tant qu'** organisateur  
**Je veux** voir la liste des participants  
**Pour** gérer l'événement

**Critères acceptation:**
- [ ] Table participants:
  - Nom, Email, Téléphone
  - Type billet
  - Date achat
  - Statut: Confirmé / Check-in / Remboursé
- [ ] Recherche par nom/email
- [ ] Tri par colonne
- [ ] Export CSV/Excel
- [ ] Export PDF liste check-in (avec cases à cocher)

**Estimé:** 5 points

---

### Module 8: Notifications

#### US-8.1: Email Transactionnel
**En tant que** système  
**Je veux** envoyer des emails  
**Pour** confirmer les actions

**Critères acceptation:**
- [ ] Templates emails:
  - Confirmation inscription
  - Confirmation achat + PDF billets
  - Rappel événement (J-7, J-1)
  - Confirmation remboursement
- [ ] Service: AWS SES
- [ ] Envoi asynchrone (queue)
- [ ] Tracking ouverture (pixel)
- [ ] Taux délivrabilité > 95%

**Estimé:** 5 points

---

#### US-8.2: SMS Notifications
**En tant que** participant  
**Je veux** recevoir SMS  
**Pour** ne pas manquer l'événement

**Critères acceptation:**
- [ ] SMS envoyés:
  - Confirmation achat (avec lien billets)
  - Rappel J-1 événement
- [ ] Service: Twilio OU local (Tunisie Telecom API)
- [ ] Format international: +216XXXXXXXX
- [ ] Limite: 160 caractères
- [ ] Opt-out possible

**Estimé:** 5 points

---

## 📊 Récapitulatif Estimations

### Par Module

| Module | User Stories | Points | Priorité |
|--------|-------------|--------|----------|
| 1. Auth & Users | 3 | 8 | P0 |
| 2. Événements | 4 | 21 | P0 |
| 3. Recherche | 2 | 13 | P0 |
| 4. Achat & Paiement | 4 | 34 | P0 |
| 5. Billets & QR | 2 | 10 | P0 |
| 6. Check-in | 1 | 13 | P1 |
| 7. Dashboard | 2 | 13 | P1 |
| 8. Notifications | 2 | 10 | P1 |
| **TOTAL** | **20** | **122** | - |

### Vélocité Estimée

- **Équipe:** 1-2 développeurs
- **Points par sprint (2 sem):** 10-15 points
- **Sprints nécessaires:** 8-12 sprints
- **Durée totale:** 16-24 semaines (4-6 mois)

⚠️ **Ajustement:** Avec 20-40h/semaine, viser **12 sprints = 3 mois**

---

## 🎯 Roadmap MVP V1

### Sprint 1-2: Infrastructure & Auth (Semaines 1-4)
```
- Setup projet NestJS + React
- Configuration AWS (ECS, RDS, S3)
- CI/CD GitHub Actions
- Module Auth (inscription, connexion)
- Module Users (profils)
```

### Sprint 3-4: Événements (Semaines 5-8)
```
- Création événements
- Types billets
- Publication
- Upload images S3
```

### Sprint 5-6: Recherche & Achat (Semaines 9-12)
```
- Recherche événements
- Page détails
- Panier billets
- Intégration paiement Clictopay
```

### Sprint 7-8: Billets & QR (Semaines 13-16)
```
- Génération QR codes
- PDF billets
- Email/SMS notifications
- Page "Mes Billets"
```

### Sprint 9-10: Check-in & Dashboard (Semaines 17-20)
```
- Scanner QR code
- Validation entrée
- Dashboard organisateur
- Statistiques ventes
```

### Sprint 11-12: Polish & Tests (Semaines 21-24)
```
- Tests E2E
- Optimisations performance
- Fix bugs
- Documentation
- Déploiement production
```

---

## ✅ Critères Succès MVP V1

### Techniques

```yaml
✅ Performance:
  - [ ] Temps réponse API < 500ms (p95)
  - [ ] Temps chargement page < 2s
  - [ ] Score Lighthouse > 80

✅ Fiabilité:
  - [ ] Disponibilité > 99.5%
  - [ ] Taux succès paiement > 85%
  - [ ] 0 perte de données

✅ Sécurité:
  - [ ] HTTPS partout
  - [ ] JWT tokens sécurisés
  - [ ] Rate limiting API
  - [ ] Validation inputs
```

### Business

```yaml
✅ Adoption:
  - [ ] 10 organisateurs actifs mois 1
  - [ ] 50 événements créés mois 3
  - [ ] 1,000 billets vendus mois 3

✅ Revenus:
  - [ ] 2,000 TND commissions mois 3
  - [ ] Taux conversion > 5%

✅ Satisfaction:
  - [ ] NPS > 50
  - [ ] Taux support < 5%
```

---

## 📅 Planning Détaillé

Voir document séparé: `docs/05-planning/roadmap-sprints.md`

---

**Prochaine lecture:** `03-regles-metier.md` pour les contraintes business spécifiques Tunisie.
