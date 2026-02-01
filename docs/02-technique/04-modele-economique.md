# 💰 Modèle Économique - Tickr

**Version:** 1.0  
**Temps lecture:** 10 minutes

---

## 🎯 Modèle Revenus

### Commission Plateforme

**Taux:** 6% sur prix billet HT

**Benchmark Concurrents Tunisie:**
```
Teskerti : 10-18% + 1-5 TND/ticket
Ija      : 8% + frais remboursement
Ayo      : 6%
Tunis.Events : 2.8-4% (online only)
```

**Positionnement Tickr:** 6% = compétitif vs leaders (Teskerti/Ija), aligné avec Ayo

```
Prix billet: 50 TND
Commission Tickr: 3 TND (6%)
Prix final participant: 53 TND

Organisateur reçoit: 47 TND
Tickr reçoit brut: 3 TND
```

### Répartition Revenus par Transaction

```
Exemple: Billet à 50 TND

┌─────────────────────────────────────┐
│ Participant paie: 53.00 TND         │
└────────────┬────────────────────────┘
             │
    ┌────────┴──────────┐
    │                   │
    ▼                   ▼
┌──────────┐      ┌──────────┐
│ 47.00 TND│      │  6.00 TND│
│Organisat.│      │ Plateforme│
└──────────┘      └────┬─────┘
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
         ┌─────────┐      ┌─────────┐
         │ 3.00 TND│      │ 1.58 TND│
         │  Tickr  │      │ Gateway │
         └─────────┘      └─────────┘
```

**Détail:**
- Prix billet HT: 50.00 TND
- Commission Tickr (6%): 3.00 TND
- **Total participant:** 53.00 TND
- Frais Clictopay (2.5% + 0.3): ~1.58 TND
- **Tickr net:** 1.42 TND (47% de la commission)
- **Organisateur net:** 47.00 TND (94%)

✅ **Marges saines permettant rentabilité plus rapide**

---

## 📊 Projections Revenus

### Scénario Conservateur (Année 1)

**Hypothèses:**
- 50 événements/mois (mois 6-12)
- 200 billets/événement moyenne
- Prix moyen billet: 40 TND
- Commission: 6%

```
Mois 1:  5 événements × 100 billets × 40 TND × 6% =   1,200 TND
Mois 2: 10 événements × 150 billets × 40 TND × 6% =   3,600 TND
Mois 3: 20 événements × 200 billets × 40 TND × 6% =   9,600 TND
Mois 4: 30 événements × 200 billets × 40 TND × 6% =  14,400 TND
Mois 5: 40 événements × 200 billets × 40 TND × 6% =  19,200 TND
Mois 6-12: 50 événements/mois × 7 mois             = 168,000 TND

TOTAL ANNÉE 1: ~216,000 TND brut
```

**Après frais gateway (-47%):**
```
Revenus nets: 114,500 TND/an
            = 9,500 TND/mois (mois 6-12)
```

### Scénario Optimiste (Année 2)

**Hypothèses:**
- 100 événements/mois
- 300 billets/événement moyenne
- Prix moyen: 45 TND
- Amélioration marges (négociation gateway)

```
Revenus bruts mensuels: 540,000 TND
Revenus nets (après frais): 350,000 TND/an
```

---

## 💸 Structure Coûts

### Coûts Fixes Mensuels

```yaml
Infrastructure AWS:
  - ECS Fargate (2 tasks): 50 TND
  - RDS PostgreSQL: 30 TND
  - S3 Storage: 5 TND
  - CloudWatch/X-Ray: 5 TND
  TOTAL: 90 TND/mois

Services SaaS:
  - Domaine .tn: 10 TND/an = 0.8 TND/mois
  - GitHub Pro (optionnel): 4 USD = 13 TND/mois
  TOTAL: ~14 TND/mois

TOTAL FIXES: ~104 TND/mois (~1,250 TND/an)
```

### Coûts Variables

```yaml
Paiements Gateway:
  Clictopay: 2.5% + 0.3 TND par transaction
  Stripe: 2.9% + 0.3 USD (fallback)
  
  Exemple 10,000 billets/mois à 40 TND:
  = 10,000 × 1.3 TND = 13,000 TND/mois

SMS Notifications:
  Twilio: ~0.05 TND par SMS
  2 SMS par billet (confirmation + rappel)
  
  10,000 billets/mois:
  = 20,000 SMS × 0.05 = 1,000 TND/mois

Emails:
  AWS SES: 0.1 USD per 1000 emails
  Quasi gratuit: ~10 TND/mois

TOTAL VARIABLES: ~14,010 TND/mois (pour 10k billets)
```

---

## 📈 Break-Even Analysis

### Point Mort Mensuel

```
Coûts fixes: 104 TND
Marge nette par billet: 0.40 TND (après tous frais)

Break-even: 104 / 0.40 = 260 billets/mois
```

**Soit:**
- 3 événements de 87 billets
- ou 5 événements de 52 billets
- ou 10 événements de 26 billets

✅ **Atteignable dès mois 2!**

### Rentabilité

```
Année 1:
Revenus nets: 86,400 TND
Coûts totaux: 1,250 + (14,000 × 8 mois) = ~113,250 TND
PERTE: -26,850 TND

Année 2:
Revenus nets: 350,000 TND
Coûts totaux: 1,250 + (30,000 × 12) = ~361,250 TND
PERTE: -11,250 TND (amélioration!)

Année 3:
Rentabilité positive si volume × 2
```

⚠️ **Modèle nécessite investissement initial ou sponsors**

---

## 💡 Optimisations Possibles

### 1. Réduire Frais Gateway (Priorité Haute)

**Actions:**
- Négocier taux avec Clictopay (volume > 100k TND/mois)
- Cible: 2% au lieu de 2.5% = +20% marges
- Contacter directement banques (taux négociés)

**Impact:**
```
Économie mensuelle (10k billets): 2,000 TND
Économie annuelle: 24,000 TND
```

### 2. Optimiser Coûts SMS

**Actions:**
- API locale Tunisie Telecom au lieu Twilio
- Coût potentiel: 0.03 TND vs 0.05 TND = -40%
- Grouper envois (batch API)

**Impact:**
```
Économie mensuelle: 400 TND
Économie annuelle: 4,800 TND
```

### 3. Valeur Ajoutée Justifiant 6%

**Vs Concurrents Tunisie:**
- 40% moins cher que Teskerti (10-18%)
- 25% moins cher que Ija (8%)
- Égal à Ayo (6%) mais meilleure UX
- Plus cher que Tunis.Events (2.8-4%) mais support complet

**Justification 6%:**
- ✅ Support client réactif
- ✅ Dashboard analytics avancé
- ✅ Check-in mobile temps réel
- ✅ Paiement multi-gateway (Clictopay + Stripe)
- ✅ Notifications SMS/Email automatiques

**Recommandation:** 6% validé par benchmark marché

### 4. Revenus Additionnels (V2/V3)

```yaml
Sponsoring Événements:
  - Bannières publicitaires homepage
  - Push événements sponsors
  Potentiel: +5,000 TND/mois

Services Premium Organisateurs:
  - Analytics avancés: 50 TND/mois
  - Email marketing: 100 TND/mois
  - Support prioritaire: 30 TND/mois
  Potentiel: 50 organisateurs × 50 TND = +2,500 TND/mois

Affiliation Partenaires:
  - Hotels, restaurants, transport
  - Commission 5-10% sur ventes
  Potentiel: +3,000 TND/mois
```

---

## 🎯 KPIs Financiers

### Métriques à Suivre

```yaml
Revenus:
  - GMV (Gross Merchandise Value): volume total billets
  - Take rate: % commission effectif
  - ARPU: revenu moyen par utilisateur
  - Revenue growth: croissance MoM

Coûts:
  - CAC: coût acquisition client
  - Gateway fees: % du GMV
  - Infrastructure: coût par billet vendu

Marges:
  - Contribution margin: après coûts variables
  - Operating margin: après coûts fixes
  - Net margin: profitabilité finale
```

### Objectifs V1 (Mois 3)

```
✅ GMV: 80,000 TND
✅ Billets vendus: 2,000
✅ Commission brute: 4,800 TND (6%)
✅ Marge nette: 2,400 TND
✅ Break-even largement dépassé
```

---

## 🏦 Gestion Trésorerie

### Délais Paiement

```
Participant → Tickr: Immédiat (J+0)
Tickr → Organisateur: J+7 après événement

Exemple:
- Événement: 15 juin
- Paiements participants: 1-14 juin
- Paiement organisateur: 22 juin

Trésorerie immobilisée: 7-21 jours
```

### Besoins Trésorerie

**Mois 1-3 (Lancement):**
```
Développement: 0 TND (solo dev)
Infrastructure: 300 TND
Marketing initial: 500 TND
Légal (SARL): 1,000 TND

TOTAL: 1,800 TND
```

**Mois 4-12 (Croissance):**
```
Infrastructure: 1,000 TND
Marketing: 2,000 TND
Support client (temps partiel): 2,000 TND

TOTAL: 5,000 TND
```

**Recommandation:** Bootstrapping + financement ami/famille ou incubateur

---

## 📋 Modèle Financier Excel

### Structure Recommandée

```
Onglets:
1. Assumptions (hypothèses)
2. Revenue Model (revenus)
3. Cost Structure (coûts)
4. P&L (compte résultat)
5. Cash Flow (trésorerie)
6. Scenarios (sensibilité)
```

### Formules Clés

```excel
# Revenus Mensuels
= Événements × Billets/Event × Prix_Moyen × Commission%

# Coûts Gateway
= GMV × Gateway_Rate + Transactions × Gateway_Fixed

# Marge Nette par Billet
= (Prix × Commission%) - (Prix × Gateway_Rate) - Gateway_Fixed - SMS_Cost

# Break-Even Billets
= Coûts_Fixes / Marge_Nette_Par_Billet
```

---

## ✅ Checklist Économique

```yaml
✅ Revenus:
  - [ ] Commission 6% définie et configurable via environnement
  - [ ] Projections 12 mois établies
  - [ ] Scenarios optimiste/réaliste/pessimiste

✅ Coûts:
  - [ ] Fixes identifiés (infra, SaaS)
  - [ ] Variables calculés (gateway, SMS)
  - [ ] Marges par transaction comprises

✅ Trésorerie:
  - [ ] Besoins lancement estimés (~2k TND)
  - [ ] Délais paiements connus (J+7)
  - [ ] Sources financement identifiées

✅ KPIs:
  - [ ] Dashboard financier prévu
  - [ ] Métriques trackées (GMV, margins)
  - [ ] Objectifs mois 3 définis

✅ Optimisations:
  - [ ] Plan négociation gateway (mois 6)
  - [ ] Revenus additionnels V2 listés
  - [ ] Stratégie pricing validée
```

---

**Prochaine lecture:** `../03-architecture/01-principes-hexagonaux.md` pour l'architecture technique.
