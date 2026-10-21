# Anomalies observées en démo locale (`make demo-up`)

Contexte initial : démo Docker (`docker-compose.demo.yml`), branche `feature/en-scene-api-experience`.
Suivi au 21 octobre 2026 sur `feature/discovery-seo-organizer-pages`.
Navigation manuelle sur http://localhost:3001 et lecture des logs `make demo-logs`.

| # | Sévérité | Zone | Résumé | État |
|---|----------|------|--------|------|
| 1 | Moyenne | Backend / Scheduling | Tâches cron exécutées en triple | Corrigé ; expirations et notifications observées une fois par échéance |
| 2 | Moyenne | Backend / Analytics | Identifiant `PLATFORM` invalide et commission fixe | Corrigé et testé ; recette Docker restante |
| 3 | Faible | Frontend / Découverte | 429 pendant la saisie de ville | Corrigé par soumission du formulaire GET |
| 4 | Info | Frontend / Hydratation | Attributs ajoutés par une extension Chrome | Vérification sans extension restante |
| 5 | Moyenne | Backend / Analytics | Métrique de publication rejetée pour UUID invalide | Corrigé et testé ; recette Docker restante |

---

## 1. Tâches planifiées exécutées en triple

**Symptôme initial** — Les jobs apparaissaient en triple à leurs échéances :
expiration des commandes et billets chaque minute, notifications toutes les cinq
minutes, analytics toutes les dix minutes.

**Cause initiale** — `ScheduleModule.forRoot()` était importé dans trois modules ; chaque import
enregistre son propre explorateur, qui planifie toutes les méthodes `@Cron` de l'application :

- [analytics.module.ts](../../backend/src/modules/analytics/infrastructure/analytics.module.ts)
- [events.module.ts](../../backend/src/modules/events/infrastructure/events.module.ts)
- [notifications.module.ts](../../backend/src/modules/notifications/infrastructure/notifications.module.ts)

**Impact** — Jobs concurrents sur les mêmes lignes (expiration commandes/billets),
risque de notifications envoyées en double, charge DB multipliée par 3.

**Correction appliquée** — `ScheduleModule.forRoot()` est enregistré une seule fois
dans [app.module.ts](../../backend/src/app.module.ts).
Le test [events.integration.spec.ts](../../backend/test/integration/events/events.integration.spec.ts#L264)
importe déjà `ScheduleModule.forRoot()` lui-même.

**Vérification** — Les logs fournis du 21 octobre montrent une expiration par minute
et un traitement des notifications à 22:35. Un test dans
[architecture.spec.ts](../../backend/test/architecture/architecture.spec.ts) impose
une seule initialisation du scheduler dans `AppModule`. Un cycle analytics reste
à observer. Cette correction ne constitue pas un verrou entre plusieurs instances backend.

---

## 2. Analytics plateforme : `invalid input syntax for type uuid: "PLATFORM"`

**Symptôme**

```
ERROR [RefreshAnalyticsHandler] Analytics refresh failed: invalid input syntax for type uuid: "PLATFORM"
```

**Cause initiale** — [refresh-analytics.handler.ts](../../backend/src/modules/analytics/application/commands/refresh-analytics/refresh-analytics.handler.ts#L196)
(`refreshPlatformAnalytics`) appelait `sumByEntityAndType('PLATFORM', …)` et
`countByEntityAndType('PLATFORM', …)`. Or `entity_id` est une colonne `uuid`
([metric.orm-entity.ts](../../backend/src/modules/analytics/infrastructure/persistence/entities/metric.orm-entity.ts#L26))
et aucune métrique n'est enregistrée avec une entité plateforme : tous les
`RecordMetricCommand` utilisent `EntityType.EVENT` (ou `USER`).

**Impact** — Toute l'exécution du refresh tombe dans le `catch` : les analytics
plateforme ne sont jamais calculées, le cache n'est pas invalidé et
`AnalyticsUpdatedEvent` n'est pas publié.

**Correction appliquée** — Les totaux billets et événements utilisent le port
`aggregate({ metricType, entityType: EntityType.EVENT, startDate, endDate })`, puis
additionnent `sum` sur les groupes. Les revenus sont lus via `findByType`, filtrés
sur `EntityType.EVENT` et additionnés. La commission additionne les frais historiques
`dimensions.platformFeeAmount`, et non 6 % du revenu ou le taux de configuration actuel.
Pas de changement de schéma, de port ni d'import entre modules métier.

**Points d'attention**

- `countByEntityAndType` fait un `SUM(value)` et non un `COUNT(*)` : à conserver
  (la valeur TICKET_SOLD représente déjà un nombre de billets).
- Les frais nuls restent nuls ; les frais absents, non numériques, non finis ou négatifs
  contribuent zéro. Les métriques historiques sans frais ne sont pas reconstituées.
- Le calcul charge les métriques de revenu de la période en mémoire. Une agrégation
  en base des dimensions pourra être envisagée si le volume le justifie.
- [refresh-analytics.handler.spec.ts](../../backend/test/unit/analytics/application/commands/refresh-analytics.handler.spec.ts)
  couvre les totaux multi-événements, les commissions, les périodes vides, les cibles
  du refresh et les échecs de persistance. La recette Docker reste à réaliser.

---

## 3. Filtre ville : 429 `ThrottlerException` pendant la saisie

**Symptôme** — Taper « sous » dans le champ ville produit 4 requêtes
(`city=s`, `so`, `sou`, `sous`) ; la dernière renvoie `429 Too Many Requests`.

**Cause initiale** — Dans [event-discovery.tsx](../../frontend/src/components/design/event-discovery.tsx),
`city` alimentait directement la clé de requête : une requête par frappe. Le throttler
global ([app.module.ts](../../backend/src/app.module.ts)) limite à 3 requêtes/seconde
(`short`).

**Impact** — Message d'erreur affiché à l'utilisateur pendant une saisie normale.

**Correction appliquée dans le lot organisateur / SEO** — Le programme est rendu
côté serveur et la ville est transmise à la soumission du formulaire GET.
Aucune requête n'est envoyée par frappe ; aucun debounce supplémentaire n'est nécessaire.

**Vérification** — Les nouvelles requêtes fournies répondent `200`, sans série par
frappe. Cela ne supprime pas les limites de débit pour des soumissions répétées.

---

## 4. Alerte d'hydratation sur `<html>` (non bloquant)

**Symptôme** — Overlay Next.js : attributs `crxlauncher` / `crxlauncher-bridged`
présents côté client mais pas dans le HTML serveur
([layout.tsx](../../frontend/src/app/layout.tsx)).

**Cause** — Extension Chrome `kiilhncajadbgbmdbdcopdpnmdhlbdle` qui modifie `<html>`
avant l'hydratation. À confirmer avec cette extension désactivée ; la navigation
privée convient uniquement si l'extension n'y est pas autorisée.

**Décision** — Aucun masquage par `suppressHydrationWarning` ajouté.

---

## 5. Métrique de publication : mauvais identifiant

**Symptôme** — À 22:35:02, la publication répond `200`, mais le listener analytics
signale `Entity ID must be a valid UUID`. La métrique n'est pas enregistrée.

**Cause** — `EventPublishedEvent.eventId` identifie le message de domaine ;
`aggregateId` est le UUID de l'événement métier. Le listener utilisait le premier.

**Correction appliquée** —
[analytics-event.listener.ts](../../backend/src/modules/analytics/application/event-handlers/analytics-event.listener.ts)
utilise `aggregateId` pour `EVENT_CREATED`. Le code applicatif conserve un contrat
de données sans importer le domaine Events. Seul le test utilise un véritable
`EventPublishedEvent` pour vérifier le contrat du producteur.

**Vérification restante** — Après reconstruction, publier un nouvel événement de
test et vérifier une métrique `EVENT_CREATED` associée à son UUID. Les publications
anciennement rejetées ne sont pas réparées automatiquement par ce correctif.

---

## Hors anomalies

- LocalStack n'est pas lancé par la démo : les fonctionnalités S3 (upload d'images)
  échouent si la stack dev est arrêtée.
- Le reste du parcours testé (recherche, filtres catégorie, compte) fonctionne.

## Validation du correctif backend

- TypeScript : `npx tsc --noEmit` passe.
- ESLint : aucune erreur ; quatre avertissements existants dans `money.vo.ts`.
- Tests ciblés du refresh et du listener : 16 réussis.
- Tests unitaires backend : 2 945 réussis, 2 ignorés.
- Tests d'architecture : 35 réussis, dont la règle d'initialisation unique du scheduler.
- Aucun rebuild, redémarrage Docker ou reset de données effectué pendant ce correctif.

## Prochaine étape : recette démo

Après accord pour reconstruire les images : vérifier `/api/health`, publier un
événement de test et vérifier sa métrique persistée, puis observer un refresh
analytics de dix minutes et sa sauvegarde sans erreur UUID. Confirmer une seule
exécution par échéance et vérifier connexion et filtres. Les tests unitaires ne
remplacent pas cette recette avec PostgreSQL et Redis.
