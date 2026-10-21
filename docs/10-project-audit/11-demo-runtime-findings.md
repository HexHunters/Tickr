# Anomalies observées en démo locale (`make demo-up`)

Contexte : démo Docker (`docker-compose.demo.yml`), branche `feature/en-scene-api-experience`.
Navigation manuelle sur http://localhost:3001 et lecture des logs `make demo-logs`.

| # | Sévérité | Zone | Résumé |
|---|----------|------|--------|
| 1 | Moyenne | Backend / Scheduling | Chaque tâche cron s'exécute 3 fois |
| 2 | Moyenne | Backend / Analytics | Le rafraîchissement des analytics plateforme échoue toutes les 10 min |
| 3 | Faible | Frontend / Découverte | Le filtre ville déclenche des 429 en cours de saisie |
| 4 | Info | Frontend / Hydratation | Alerte d'hydratation causée par une extension Chrome |

---

## 1. Tâches planifiées exécutées en triple

**Symptôme** — À chaque minute, les logs montrent trois fois `Expire pending orders`,
`Expire reserved tickets`, `Running scheduled notification processing` et
`Starting scheduled analytics refresh`.

**Cause** — `ScheduleModule.forRoot()` est importé dans trois modules ; chaque import
enregistre son propre explorateur, qui planifie toutes les méthodes `@Cron` de l'application :

- [analytics.module.ts](../../backend/src/modules/analytics/infrastructure/analytics.module.ts#L124)
- [events.module.ts](../../backend/src/modules/events/infrastructure/events.module.ts#L160)
- [notifications.module.ts](../../backend/src/modules/notifications/infrastructure/notifications.module.ts#L136)

**Impact** — Jobs concurrents sur les mêmes lignes (expiration commandes/billets),
risque de notifications envoyées en double, charge DB multipliée par 3.

**Correction proposée** — Retirer `ScheduleModule.forRoot()` (et l'import) des trois
modules et l'importer une seule fois dans [app.module.ts](../../backend/src/app.module.ts).
Le test [events.integration.spec.ts](../../backend/test/integration/events/events.integration.spec.ts#L264)
importe déjà `ScheduleModule.forRoot()` lui-même.

**Vérification** — Après redémarrage, chaque job ne doit apparaître qu'une fois par minute.

---

## 2. Analytics plateforme : `invalid input syntax for type uuid: "PLATFORM"`

**Symptôme**

```
ERROR [RefreshAnalyticsHandler] Analytics refresh failed: invalid input syntax for type uuid: "PLATFORM"
```

**Cause** — [refresh-analytics.handler.ts](../../backend/src/modules/analytics/application/commands/refresh-analytics/refresh-analytics.handler.ts#L196)
(`refreshPlatformAnalytics`) appelle `sumByEntityAndType('PLATFORM', …)` et
`countByEntityAndType('PLATFORM', …)`. Or `entity_id` est une colonne `uuid`
([metric.orm-entity.ts](../../backend/src/modules/analytics/infrastructure/persistence/entities/metric.orm-entity.ts#L26))
et aucune métrique n'est enregistrée avec une entité plateforme : tous les
`RecordMetricCommand` utilisent `EntityType.EVENT` (ou `USER`).

**Impact** — Toute l'exécution du refresh tombe dans le `catch` : les analytics
plateforme ne sont jamais calculées, le cache n'est pas invalidé et
`AnalyticsUpdatedEvent` n'est pas publié.

**Correction proposée** — Calculer les totaux plateforme en agrégeant toutes les
métriques `EntityType.EVENT` de la période, via la méthode existante du port
`aggregate({ metricType, entityType: EntityType.EVENT, startDate, endDate })`, puis
sommer `sum` sur les groupes. Pas de changement de schéma ni de port.

**Points d'attention**

- `countByEntityAndType` fait un `SUM(value)` et non un `COUNT(*)` : à conserver
  (la valeur TICKET_SOLD représente déjà un nombre de billets).
- `platformCommission: totalRevenue * 0.06` est codé en dur alors que
  `PLATFORM_COMMISSION_RATE` est configurable (0 en démo) — à aligner.
- Ajouter un test unitaire du handler (aucun n'existe aujourd'hui).

---

## 3. Filtre ville : 429 `ThrottlerException` pendant la saisie

**Symptôme** — Taper « sous » dans le champ ville produit 4 requêtes
(`city=s`, `so`, `sou`, `sous`) ; la dernière renvoie `429 Too Many Requests`.

**Cause** — Dans [event-discovery.tsx](../../frontend/src/components/design/event-discovery.tsx#L107),
`city` alimente directement la clé de requête : une requête par frappe. Le throttler
global ([app.module.ts](../../backend/src/app.module.ts)) limite à 3 requêtes/seconde
(`short`).

**Impact** — Message d'erreur affiché à l'utilisateur pendant une saisie normale.

**Correction proposée** — Débouncer la valeur utilisée dans `params`
(état `debouncedCity` mis à jour via `setTimeout` ~400 ms dans un `useEffect`),
en gardant `city` pour la valeur affichée de l'input. Le champ de recherche texte
n'est pas concerné (déclenché à la soumission).

**Vérification** — Saisie rapide d'un nom de ville : une seule requête, aucun 429.

---

## 4. Alerte d'hydratation sur `<html>` (non bloquant)

**Symptôme** — Overlay Next.js : attributs `crxlauncher` / `crxlauncher-bridged`
présents côté client mais pas dans le HTML serveur
([layout.tsx](../../frontend/src/app/layout.tsx#L20)).

**Cause** — Extension Chrome `kiilhncajadbgbmdbdcopdpnmdhlbdle` qui modifie `<html>`
avant l'hydratation. Pas un bug applicatif ; disparaît en navigation privée.

**Option** — Ajouter `suppressHydrationWarning` sur `<html>` (n'affecte que les
attributs de cet élément, pas ses enfants).

---

## Hors anomalies

- LocalStack n'est pas lancé par la démo : les fonctionnalités S3 (upload d'images)
  échouent si la stack dev est arrêtée.
- Le reste du parcours testé (recherche, filtres catégorie, compte) fonctionne.

## Mise à jour — lot espaces organisateur / SEO

- **#1 corrigée** : le scheduler est enregistré une seule fois dans `AppModule` ;
  les trois modules métier ne le réinitialisent plus. La recette locale observe
  une expiration des commandes et des billets par minute.
- **#3 corrigée** : le programme est rendu côté serveur et la ville est soumise
  avec le formulaire GET. Aucune requête de recherche n’est envoyée par frappe.
- **#2 et #4** : constats conservés. La console organisateur de ce lot utilise
  les événements du compte, pas le tableau de revenus analytics.
