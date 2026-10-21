# Espaces organisateur, découverte et référencement

Recette locale du 21 octobre 2026, après intégration de `develop` (`3755dfc`).
La charte En scène v1.1 reste la référence visuelle.

## Pages livrées

- `/organizer`, `/organizer/events`, `/organizer/events/new` et
  `/organizer/events/[id]` : événements du compte, création et modification de
  brouillons, ajout de tarifs en TND et publication avec confirmation.
- `/account/notifications` : préférences lues et enregistrées dans NestJS.
- `/programme/concerts`, `/programme/festivals`, `/programme/spectacles` et
  `/programme/ateliers` : compositions photographiques et prochaines dates API.
- `/help` : aide accessible par sujets et réponses natives dépliables.

Le catalogue, les tarifs et les préférences ne sont pas des fixtures frontend.
Le seed local ajoute « La prochaine scène », un brouillon privé sans tarif.
Les textes de présentation des catégories et de l’aide sont éditoriaux.

## Performance

Le programme est rendu dans le HTML serveur. Le formulaire GET ne lance pas de
requête à chaque frappe ; les filtres et la pagination sont des liens réels.
Les liens qui lisent le catalogue ne préchargent pas toutes leurs destinations,
ce qui évite de solliciter simultanément les filtres et de déclencher le throttler.
Les métadonnées partagent les lectures API avec les pages via le cache de rendu
React. Aucune disponibilité, configuration de paiement ou donnée personnelle
n’est mise en cache entre requêtes. Seul l’inventaire des sitemaps est revalidé
pendant cinq minutes. Les polices sont locales, préchargées par `next/font`.

Mesure de laboratoire : Lighthouse 13.5.0, profil mobile simulé, Chrome headless,
backend et PostgreSQL de démonstration locaux. Un passage par version, builds
`next build --webpack` identiques pour la comparaison. Ce ne sont pas des mesures
d’utilisateurs réels ni une garantie de score en hébergement.

| Mesure `/events` | `develop` | Lot après corrections |
| --- | ---: | ---: |
| Performance | 91 | 95 |
| First contentful paint | 1,4 s | 0,9 s |
| Largest contentful paint | 3,4 s | 3,0 s |
| Total blocking time | 60 ms | 30 ms |
| Cumulative layout shift | 0,001 | 0 |
| JavaScript reçu | 202 884 octets | 196 887 octets |

L’audit du build avec indexation autorisée donne 100 en SEO et 100 en
accessibilité automatisée. La démo conserve volontairement `noindex` ; son score
SEO n’est donc pas comparable au build public. La recette lecteur d’écran reste
à compléter ; Lighthouse n’est pas une certification d’accessibilité.

## Référencement

Les métadonnées sont présentes dans le head initial : titres spécifiques,
descriptions, URL canoniques, cartes Open Graph/Twitter. Les fiches publient un
`Event` JSON-LD échappé, avec les dates, le lieu et l’organisateur réels. Aucune
offre d’achat n’est inventée lorsque le paiement est indisponible.

`SITE_URL` et `SITE_INDEXABLE=true` doivent être configurés au build et au
runtime avec le vrai domaine HTTPS. Par défaut, robots interdit l’exploration et
les sitemaps sont vides. Les espaces personnels et organisateur restent toujours
`noindex,nofollow`. Les recherches et filtres restent `noindex,follow`.

Le sitemap principal référence les pages publiques. Les événements publiés sont
répartis par pages dans `/events/sitemap/[id].xml`, référencés par robots. Un
échec API ne produit pas silencieusement un inventaire partiel. Les brouillons
retournent 404 sur la page publique et restent accessibles uniquement à leur
propriétaire via `GET /events/:id/manage`, protégé par JWT, rôle et propriété.

Références d’implémentation : [métadonnées Next.js](https://nextjs.org/docs/app/api-reference/functions/generate-metadata),
[head initial](https://nextjs.org/docs/app/api-reference/config/next-config-js/htmlLimitedBots),
[JSON-LD Next.js](https://nextjs.org/docs/app/guides/json-ld) et
[événements Google](https://developers.google.com/search/docs/appearance/structured-data/event).

## Vérifications

- Frontend : build de production par défaut et build public Webpack, TypeScript,
  ESLint, 24 tests Vitest.
- Backend : build, TypeScript, ESLint sans erreur (4 avertissements préexistants),
  2 933 tests unitaires réussis et 2 ignorés préexistants, 237 tests HTTP,
  34 vérifications d’architecture.
- Endpoint de gestion : propriétaire autorisé ; anonyme, participant et autre
  organisateur refusés ; brouillon invisible dans l’endpoint public.
- Navigateur : création, modification, tarif à 15,250 DT / 25 places, publication
  effective ; valeurs vérifiées en PostgreSQL. Événement de recette temporaire
  supprimé ensuite. Préférences persistées après rechargement et remises à leur
  valeur initiale.
- 11 routes à 320, 390, 768 et 1440 px : 44 combinaisons, sans débordement ni
  erreur d’exécution. Captures desktop et mobile examinées.
- Sans JavaScript : événements visibles, formulaire ville fonctionnel ; aucune
  requête pendant la saisie.
- 13 contrôles HTTP SEO : head, canoniques, robots privés, sitemaps, JSON-LD et
  codes 404 des brouillons et pages de sitemap absentes. Démo non indexable
  également vérifiée.
- Scheduler : une seule inscription globale ; une expiration des commandes et
  des billets par minute dans les logs locaux.

Les passerelles, le parcours espèces, l’upload de photos, le contrôle d’entrée,
les rapports analytics et la console admin ne sont pas ajoutés par ce lot. Les
limites de livraison e-mail/PDF documentées précédemment restent inchangées.
