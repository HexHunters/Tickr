# 🔌 API Contract - Tickr REST API

**Version:** 1.0  
**Base URL:** `https://api.tickr.tn/api`  
**Temps lecture:** 20 minutes

---

## 🎯 Principes Généraux

### Format

```yaml
Protocol: HTTPS only
Format: JSON
Charset: UTF-8
```

### Authentification

```http
Authorization: Bearer <JWT_TOKEN>
```

**JWT Token:**

- Expiration: **7 jours** (`JWT_EXPIRES_IN`, défaut `'7d'` — `jwt.service.ts:74`)
- Refresh token: **30 jours** (`JWT_REFRESH_EXPIRES_IN`, défaut `'30d'` — `jwt.service.ts:75`)
- Algorithme: HS256

### Codes Statut HTTP

```
200 OK              - Succès GET/PUT/PATCH
201 Created         - Succès POST (création)
204 No Content      - Succès DELETE
400 Bad Request     - Validation échouée
401 Unauthorized    - Token manquant/invalide
403 Forbidden       - Accès refusé
404 Not Found       - Ressource inexistante
409 Conflict        - Contrainte métier (ex: stock épuisé)
429 Too Many Requests - Rate limit dépassé
500 Internal Error  - Erreur serveur
```

### Pagination

```http
GET /events?page=1&limit=12
```

**Response:**

```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 12,
    "total": 156,
    "totalPages": 13
  }
}
```

### Erreurs

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email must be valid"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## ⚙️ Configuration Publique

### GET /config/public

**Description:** Récupère le taux global ou le taux effectif d'un événement.

**Authentification:** Non requise (public)

**Response 200:**

```json
{
  "globalCommissionRate": 0.06,
  "availablePaymentMethods": [],
  "globalFreeTicketsEnabled": false,
  "freeTicketsEnabledOverride": true,
  "effectiveFreeTicketsEnabled": true,
  "commissionRateOverride": 0.03,
  "effectiveCommissionRate": 0.03,
  "currency": "TND",
  "reservationTtlMinutes": 15
}
```

**Utilisation Frontend:**

- Sans `eventId`: cache recommandé 1 heure
- Avec `eventId`: rafraîchir à l'ouverture de la sélection de billets
- Ne pas inventer un fallback à 6 % pour un événement; une surcharge peut s'appliquer
- Les montants retournés par `POST /orders` restent autoritaires

**Notes:**

- ✅ Endpoint public (pas de token requis)
- ✅ Permet changement commission sans redéployer frontend

**Query optionnelle:** `eventId` (UUID). Un événement inconnu retourne `404`.

Free-ticket permission is independent of commission and payment-method availability.
The event override wins over `FREE_TICKETS_ENABLED`, including explicit `false`.
Without `eventId`, the override is `null` and the effective value is the global default.

### PATCH /events/:id/free-tickets

**Auth:** `ADMIN`. Body must contain `enabled`: `true`, `false`, or `null` (inherit).
Missing values, strings, and numbers are rejected. Organizers cannot change this policy.

```json
{ "enabled": true }
```

**Response 200:**

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440001",
  "freeTicketsEnabledOverride": true,
  "effectiveFreeTicketsEnabled": true
}
```

Errors: `400` invalid input, `401` unauthenticated, `403` non-admin,
`404` unknown event, `500` persistence failure. Changes apply to new free ticket
types, zero-price updates, and new bookings; already issued tickets remain valid.
Paid ticket types remain available when free tickets are disabled.

### PATCH /events/:id/commission

**Auth:** Required (`ADMIN` uniquement)

**Body:**

```json
{ "commissionRate": 0.03 }
```

Utiliser `null` pour rétablir le taux global. Valeurs acceptées: 0 à 0.20, maximum 4 décimales.

**Response 200:**

```json
{
  "eventId": "uuid",
  "commissionRateOverride": 0.03,
  "effectiveCommissionRate": 0.03,
  "usesGlobalRate": false
}
```

---

## 🔐 Authentification

### POST /auth/register

**Description:** Inscription nouveau participant

**Body:**

```json
{
  "email": "john@example.com",
  "phone": "+21698123456",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response 201:**

```json
{
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "PARTICIPANT"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

---

### POST /auth/login

**Description:** Connexion utilisateur

**Body:**

```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response 200:**

```json
{
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "role": "PARTICIPANT"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

---

### POST /auth/refresh-token

**Description:** Renouveler access token

**Body:**

```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response 200:**

```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

---

## 👤 Utilisateurs

### GET /users/me

**Auth:** Required  
**Description:** Profil utilisateur connecté

**Response 200:**

```json
{
  "id": "uuid",
  "email": "john@example.com",
  "phone": "+21698123456",
  "firstName": "John",
  "lastName": "Doe",
  "role": "PARTICIPANT",
  "isOrganizer": false,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

### PATCH /users/me

**Auth:** Required  
**Description:** Modifier profil

**Body:**

```json
{
  "firstName": "Johnny",
  "phone": "+21698765432"
}
```

**Response 200:**

```json
{
  "id": "uuid",
  "firstName": "Johnny",
  "phone": "+21698765432"
}
```

---

### POST /users/me/become-organizer

**Auth:** Required  
**Description:** Devenir organisateur

**Body:**

```json
{
  "organizationName": "TunisConcerts",
  "description": "Organisation événements musicaux",
  "logo": "https://s3.../logo.png",
  "socialLinks": {
    "facebook": "https://fb.com/tunisconcerts",
    "instagram": "@tunisconcerts"
  }
}
```

**Response 200:**

```json
{
  "id": "uuid",
  "isOrganizer": true,
  "organizerProfile": {
    "organizationName": "TunisConcerts",
    "description": "...",
    "logo": "https://..."
  }
}
```

---

## 🎉 Événements

### POST /events

**Auth:** Required (Organizer)  
**Description:** Créer événement (brouillon)

**Body:**

```json
{
  "name": "Concert Balti 2024",
  "description": "<p>Concert exceptionnel...</p>",
  "category": "CONCERT",
  "location": {
    "name": "Théâtre de Carthage",
    "address": "2078 La Marsa, Tunis",
    "coordinates": {
      "lat": 36.8065,
      "lng": 10.1815
    }
  },
  "startDate": "2024-06-15T20:00:00Z",
  "endDate": "2024-06-15T23:00:00Z",
  "coverImage": "https://s3.../cover.jpg"
}
```

**Response 201:**

```json
{
  "id": "uuid",
  "slug": "concert-balti-2024",
  "name": "Concert Balti 2024",
  "status": "DRAFT",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

---

### GET /events/:id

**Auth:** Optional  
**Description:** Détails événement

**Response 200:**

```json
{
  "id": "uuid",
  "slug": "concert-balti-2024",
  "name": "Concert Balti 2024",
  "description": "<p>Concert exceptionnel...</p>",
  "category": "CONCERT",
  "status": "PUBLISHED",
  "location": {
    "name": "Théâtre de Carthage",
    "address": "2078 La Marsa, Tunis",
    "coordinates": {
      "lat": 36.8065,
      "lng": 10.1815
    }
  },
  "startDate": "2024-06-15T20:00:00Z",
  "endDate": "2024-06-15T23:00:00Z",
  "coverImage": "https://s3.../cover.jpg",
  "organizer": {
    "id": "uuid",
    "organizationName": "TunisConcerts",
    "logo": "https://..."
  },
  "ticketTypes": [
    {
      "id": "uuid",
      "name": "Standard",
      "price": 50.0,
      "quantity": 500,
      "sold": 120,
      "available": 380
    },
    {
      "id": "uuid",
      "name": "VIP",
      "price": 100.0,
      "quantity": 100,
      "sold": 45,
      "available": 55
    }
  ],
  "stats": {
    "views": 1250,
    "sold": 165,
    "revenue": 10500.0
  }
}
```

---

### GET /events

**Auth:** Optional  
**Description:** Rechercher événements

**Query Params:**

```
?q=concert              # Recherche texte
&category=CONCERT       # CONCERT|SPORT|TRAINING
&city=Tunis             # Ville
&dateFrom=2024-06-01    # Date min
&dateTo=2024-06-30      # Date max
&priceMin=0             # Prix min TND
&priceMax=100           # Prix max TND
&sort=date              # date|price|popularity
&order=asc              # asc|desc
&page=1                 # Pagination
&limit=12               # Items par page
```

**Response 200:**

```json
{
  "data": [
    {
      "id": "uuid",
      "slug": "concert-balti-2024",
      "name": "Concert Balti 2024",
      "coverImage": "https://...",
      "category": "CONCERT",
      "startDate": "2024-06-15T20:00:00Z",
      "location": {
        "name": "Théâtre de Carthage",
        "city": "Tunis"
      },
      "ticketTypes": [
        {
          "name": "Standard",
          "price": 50.0,
          "available": 380
        }
      ]
    }
  ],
  "meta": {
    "page": 1,
    "limit": 12,
    "total": 42,
    "totalPages": 4
  }
}
```

---

### PATCH /events/:id

**Auth:** Required (Organizer - owner)  
**Description:** Modifier événement

**Body:**

```json
{
  "description": "<p>Nouvelle description...</p>",
  "startDate": "2024-06-16T20:00:00Z"
}
```

**Response 200:**

```json
{
  "id": "uuid",
  "description": "<p>Nouvelle description...</p>",
  "startDate": "2024-06-16T20:00:00Z"
}
```

---

### POST /events/:id/ticket-types

**Auth:** Required (Organizer - owner)  
**Description:** Ajouter type billet

**Body:**

```json
{
  "name": "Early Bird",
  "description": "Prix réduit pour les premiers",
  "price": 35.0,
  "currency": "TND",
  "quantity": 200,
  "salesStartDate": "2026-06-01T00:00:00Z",
  "salesEndDate": "2026-07-14T23:59:59Z",
  "isActive": true
}
```

`price` est le **prix facial organisateur hors frais de service**, pas un total participant cible.
Le backend V1 n'accepte ni `pricingMode` ni `targetBuyerTotal`.

**Response 201:**

```json
{
  "ticketTypeId": "uuid",
  "message": "Ticket type added successfully"
}
```

---

### POST /events/:id/publish

**Auth:** Required (Organizer - owner)  
**Description:** Publier événement

**Response 200:**

```json
{
  "id": "uuid",
  "status": "PUBLISHED",
  "publishedAt": "2024-01-15T10:30:00Z"
}
```

---

## 🛒 Panier & Commandes

### POST /cart/add

**Auth:** Required  
**Description:** Ajouter billets au panier

**Body:**

```json
{
  "ticketTypeId": "uuid",
  "quantity": 2
}
```

**Response 200:**

```json
{
  "cart": {
    "items": [
      {
        "ticketTypeId": "uuid",
        "eventName": "Concert Balti 2024",
        "ticketTypeName": "Standard",
        "unitPrice": 50.0,
        "quantity": 2,
        "subtotal": 100.0
      }
    ],
    "subtotal": 100.0,
    "platformFee": 4.0,
    "total": 104.0,
    "expiresAt": "2024-01-15T10:45:00Z"
  }
}
```

---

### GET /cart

**Auth:** Required  
**Description:** Voir panier

**Response 200:**

```json
{
  "items": [...],
  "subtotal": 100.00,
  "platformFee": 4.00,
  "total": 104.00,
  "expiresAt": "2024-01-15T10:45:00Z"
}
```

---

### POST /orders

**Auth:** Required  
**Description:** Reserve a paid/mixed basket, or fulfill a wholly free basket without a gateway.
Prices come from the server, never the request. All types must belong to the event,
use one currency, be distinct, and have positive integer quantities matching holder counts.

**Body:**

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440001",
  "items": [{
    "ticketTypeId": "550e8400-e29b-41d4-a716-446655440002",
    "quantity": 1,
    "holders": [{ "name": "Ahmed", "email": "ahmed@example.com" }]
  }],
  "holder": { "firstName": "Ahmed", "lastName": "Ben Ali", "email": "ahmed@example.com" }
}
```

**Response 201 (free):**

```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440003",
  "subtotal": 0,
  "platformFee": 0,
  "total": 0,
  "currency": "TND",
  "status": "PAID",
  "requiresPayment": false,
  "expiresAt": "2026-11-01T10:45:00Z"
}
```

`PAID` also means fulfilled free admission, not evidence of a financial transaction.
Free orders have no payment record, payment method, gateway fees, or transaction ID.
Their reservation deadline does not expire issued tickets. Do not call `/pay` or
`/refund`; use the existing ticket cancellation flow when applicable.

Paid/mixed responses use the same fields with `status: "PENDING"`,
`requiresPayment: true`, and server-calculated totals. Continue with
`POST /orders/:id/pay`. Free lines in a mixed basket are confirmed only when the
whole order is paid. A zero commission rate does not make a paid ticket free.

Errors include `403` with `code: "FREE_TICKETS_DISABLED"` when any free line is
disallowed, `403 PAYMENT_METHOD_DISABLED` for a paid/mixed basket with gateways
off, `400` invalid basket/availability/limit, `404` unknown event or mismatched
ticket type, `429` rate limit, and `500` fulfillment/persistence failure.
On a timeout or failure, inspect orders/tickets before retrying: order creation
does not yet provide idempotent replay. No auto-confirmation occurs for paid lines.

---

## 💳 Paiements

### GET /payments/webhooks/konnect

**Auth:** Webhook signature  
**Description:** Callback Konnect (gateway TN principal)

**Body:**

```json
{
  "orderId": "uuid",
  "status": "COMPLETED",
  "transactionId": "CTP123456789",
  "amount": 104.0,
  "timestamp": "2024-01-15T10:35:00Z",
  "signature": "sha256..."
}
```

**Response 200:**

```json
{
  "received": true
}
```

---

### POST /payments/webhooks/stripe

**Auth:** Stripe signature  
**Description:** Callback Stripe (paiements internationaux)

**Body:** (Stripe Event Object)

---

### POST /payments/webhooks/paymee

**Auth:** Webhook signature  
**Description:** Callback Paymee (gateway TN fallback)

---

## 🎫 Billets

### GET /tickets/me

**Auth:** Required  
**Description:** Mes billets

**Response 200:**

```json
{
  "upcoming": [
    {
      "id": "uuid",
      "ticketNumber": "TICKR-001234",
      "event": {
        "id": "uuid",
        "name": "Concert Balti 2024",
        "startDate": "2024-06-15T20:00:00Z",
        "location": {
          "name": "Théâtre de Carthage"
        }
      },
      "ticketType": "Standard",
      "price": 50.00,
      "qrCode": "https://s3.../qr-001234.png",
      "qrCodeData": "TICKR|evt-uuid|tkt-uuid|hash",
      "status": "VALID",
      "purchasedAt": "2024-01-15T10:35:00Z"
    }
  ],
  "past": [...],
  "cancelled": [...]
}
```

---

### GET /tickets/:id/pdf

**Auth:** Required (owner)  
**Description:** Télécharger PDF billet

**Response:** Binary PDF file

---

## ✅ Check-in

Le staff de check-in n'est pas un rôle global. Un compte `PARTICIPANT` ou `ORGANIZER` peut recevoir
une affectation limitée à un événement. Le propriétaire de l'événement et un `ADMIN` ont un accès
implicite. Toutes les décisions relisent l'état courant du compte, de l'événement et de
l'affectation.

### POST /events/:eventId/check-in-staff

**Auth:** Required (`ORGANIZER`, propriétaire uniquement)  
**Description:** Affecter un compte Tickr existant et vérifié au check-in de l'événement

```json
{ "email": "staff@example.com" }
```

**Response 201:** affectation avec `id`, `eventId`, identité du compte et `assignedAt`.

**Erreurs:** `403` non-propriétaire, `404` événement absent, `409` déjà affecté, `422` compte
absent/inactif/non vérifié. Le `422` reste volontairement générique pour ne pas révéler l'existence
d'un compte.

### GET /events/:eventId/check-in-staff

**Auth:** Required (`ORGANIZER`, propriétaire uniquement)  
**Description:** Lister les affectations actives avec pagination plate (`page`, `limit`).

### DELETE /events/:eventId/check-in-staff/:assignmentId

**Auth:** Required (`ORGANIZER`, propriétaire uniquement)  
**Description:** Révoquer une affectation précise. La révocation est conservée pour audit.

**Response:** `204 No Content`

### GET /events/check-in-access/me

**Auth:** Required (tout compte actif et vérifié)  
**Description:** Lister les événements publiés non terminés que le compte peut scanner comme
propriétaire, administrateur ou staff affecté.

### POST /tickets/check-in

**Auth:** Required (propriétaire, `ADMIN` actuel ou staff activement affecté à l'événement)  
**Description:** Valider un billet dans la fenêtre `début - 1 h` jusqu'à la fin de l'événement.

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440001",
  "qrCode": "v1-550e8400-e29b-41d4-a716-446655440010-a1b2",
  "deviceId": "scanner-gate-a-001",
  "locationGate": "Gate A"
}
```

**Response 200:**

```json
{
  "isValid": true,
  "ticketId": "550e8400-e29b-41d4-a716-446655440010",
  "holderName": "John Doe",
  "ticketTypeName": "General Admission",
  "checkedInAt": "2026-09-01T19:45:00Z",
  "failureReason": null
}
```

Le billet doit appartenir à `eventId`. La transition vers `CHECKED_IN` et l'audit sont atomiques:
deux scanners concurrents ne peuvent pas valider le même billet. Les refus sont `400`, un billet
inconnu pour l'événement est `404`, et un opérateur non autorisé reçoit `403`.

### GET /tickets/event/:eventId/stats

**Auth:** Required (propriétaire, `ADMIN` actuel ou staff activement affecté)  
**Description:** Compteurs agrégés limités aux billets `CONFIRMED` et `CHECKED_IN`.

```json
{
  "totalTickets": 165,
  "checkedIn": 42,
  "remaining": 123,
  "checkInRate": 25,
  "byType": [
    {
      "ticketTypeName": "Standard",
      "total": 120,
      "checkedIn": 30,
      "rate": 25
    }
  ]
}
```

---

## 📊 Dashboard Organisateur

### GET /dashboard/events/:eventId/stats

**Auth:** Required (Organizer - owner)  
**Description:** Statistiques événement

**Response 200:**

```json
{
  "sales": {
    "sold": 165,
    "total": 600,
    "soldPercentage": 27.5,
    "revenue": {
      "gross": 10500.0,
      "platformFee": 420.0,
      "net": 10080.0
    }
  },
  "salesByTicketType": [
    {
      "name": "Standard",
      "sold": 120,
      "revenue": 6000.0
    },
    {
      "name": "VIP",
      "sold": 45,
      "revenue": 4500.0
    }
  ],
  "salesByDay": [
    {
      "date": "2024-01-10",
      "sold": 23,
      "revenue": 1380.0
    }
  ],
  "conversion": {
    "views": 1250,
    "conversions": 165,
    "rate": 13.2
  }
}
```

---

### GET /dashboard/events/:eventId/participants

**Auth:** Required (Organizer - owner)  
**Description:** Liste participants

**Query:** `?page=1&limit=50&search=john`

**Response 200:**

```json
{
  "data": [
    {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+21698123456",
      "ticketType": "Standard",
      "purchasedAt": "2024-01-15T10:35:00Z",
      "status": "VALID",
      "checkedIn": false
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 165
  }
}
```

---

## 🛡️ Administration (back-office)

Toutes les routes `/admin/*` exigent un JWT `ADMIN`. Elles vivent dans le module qui possède la
donnée (users, events, payments). Limite de débit élargie : 10 req/s, 300 req/min.

Les commandes d'administration ne font pas confiance au rôle du JWT (valable jusqu'à expiration) :
elles relisent le compte et exigent un `ADMIN` actif (`403`, code `ACTOR_NOT_AUTHORIZED`, ou
`ACCESS_DENIED` pour un remboursement). Les changements de rôle et de statut sont sérialisés dans une
transaction sous un verrou PostgreSQL partagé (`pg_advisory_xact_lock`) : des requêtes simultanées
(deux administrateurs qui se rétrogradent mutuellement, jeton périmé) s'appliquent l'une après
l'autre, et la plateforme garde toujours au moins un administrateur actif (`409 LAST_ACTIVE_ADMIN`).
Un administrateur ne peut ni changer son propre rôle ni suspendre son propre compte (`403`, code
`SELF_MODIFICATION`).

### GET /admin/users/stats

**Response 200:** `{ total, active, inactive, byRole: { ADMIN, ORGANIZER, PARTICIPANT } }`

### GET /admin/users

**Query:** `search` (e-mail, prénom, nom), `role`, `status` (`active` | `inactive`), `page`, `limit` (≤ 100)  
**Response 200:** profils paginés (`data`, `total`, `page`, `limit`, `totalPages`).

### GET /admin/users/:id

**Response 200:** profil complet (`isActive`, `lastLoginAt`, `createdAt`…).

### PATCH /admin/users/:id/role

```json
{ "role": "ORGANIZER" }
```

**Response 200:** profil mis à jour. Le nouveau rôle prend effet au prochain renouvellement de
session (`/auth/refresh-token` relit désormais le compte).

**Retrait du rôle organisateur** (`ORGANIZER` ou `ADMIN` → `PARTICIPANT`) : refusé tant que le compte
a des obligations ouvertes, sans rien annuler ni rembourser à sa place :

```json
{
  "statusCode": 409,
  "code": "ORGANIZER_HAS_OPEN_OBLIGATIONS",
  "message": "…",
  "details": { "obligations": { "openEvents": 2, "unsettledOrders": 1, "pendingRefunds": 0 } }
}
```

- `openEvents` : événements `DRAFT` ou `PUBLISHED` (en cours compris), vendus ou non ;
- `unsettledOrders` : commandes `PENDING`/`PROCESSING`, ou `PAID` sur un événement annulé
  (remboursement dû) ;
- `pendingRefunds` : remboursements `PENDING`, y compris ceux à traiter manuellement (commande sans
  moyen de paiement) — aucun flux ne permet encore de les clôturer.

La rétrogradation est autorisée une fois tout soldé ; l'historique (événements, commandes) est
conservé. La création d'événement et la rétrogradation se vérifient mutuellement après leur propre
écriture : si elles se croisent, au moins l'une est refusée (rôle restauré ou brouillon supprimé),
jamais un participant propriétaire d'un événement ouvert. Il n'existe pas encore de transfert de
propriété : la transition est refusée plutôt que de réassigner ou supprimer des données.

**Erreurs:** `403` propre compte ou administrateur inactif, `404` absent, `409`
`LAST_ACTIVE_ADMIN` ou `ORGANIZER_HAS_OPEN_OBLIGATIONS`.

### PATCH /admin/users/:id/status

```json
{ "isActive": false }
```

**Response 200:** profil mis à jour. Un compte suspendu ne peut plus se connecter ni renouveler sa
session ; son jeton d'accès en cours expire après sa durée de vie (15 min). Opération idempotente.

La suspension est une mesure d'urgence : elle s'applique même si l'organisateur a des obligations
ouvertes. Ses événements restent en ligne et se gèrent depuis `GET /admin/events?organizerId=…`. Un
organisateur suspendu ne peut plus créer d'événement ni scanner ; le staff qu'il a affecté garde son
propre accès.

### GET /admin/events/stats

**Response 200:** `{ DRAFT, PUBLISHED, CANCELLED, COMPLETED }`

### GET /admin/events

**Query:** `search` (titre), `status`, `category`, `organizerId`, `page`, `limit`  
**Response 200:** événements de tous statuts avec organisateur (`id`, `name`, `email`), billets
vendus, capacité, ventes, `commissionRateOverride`, `freeTicketsEnabledOverride` et
`cancellationReason`.

### POST /admin/events/:id/cancel

```json
{ "reason": "Contenu non conforme" }
```

**Description:** annule n'importe quel événement `DRAFT` ou `PUBLISHED` non commencé. Mêmes règles
de cycle de vie que l'annulation organisateur.

> L'annulation **ne rembourse pas** les commandes payées : `EventCancelledEvent` est seulement
> journalisé (intégration Payments encore à faire). Les commandes restent `PAID` et se remboursent
> une par une via `POST /admin/orders/:id/refund` ; tant qu'elles ne le sont pas, elles bloquent la
> rétrogradation de l'organisateur.

**Erreurs:** `400` déjà annulé/terminé/commencé, `403` administrateur inactif, `404` absent.

La commission et la politique de billets gratuits par événement restent sur
`PATCH /events/:id/commission` et `PATCH /events/:id/free-tickets`.

### GET /admin/orders/stats

**Response 200:** une entrée par statut : `{ status, count, totalAmount, platformFeeAmount }`.

### GET /admin/orders

**Query:** `status`, `eventId`, `userId`, `page`, `limit`  
**Response 200:** commandes paginées avec `eventTitle`, acheteur (`buyerName`, `buyerEmail` issus du
titulaire saisi au paiement), `ticketCount`, montants et dates.

### POST /admin/orders/:id/refund

```json
{ "reason": "Geste commercial" }
```

**Description:** rembourse une commande `PAID` quel que soit l'acheteur. Même politique que le
remboursement client : commission non remboursée, billets annulés, et aucune commande marquée
remboursée si la passerelle refuse ou est désactivée (`403 PAYMENT_METHOD_DISABLED`). L'identifiant
de l'administrateur est journalisé avec la commande et le remboursement.

Avant tout appel à la passerelle, le remboursement réserve la commande en insérant un remboursement
`PENDING` (index unique partiel `UQ_refunds_order_open` : un seul `PENDING`/`COMPLETED` par
commande). Deux demandes simultanées (client et admin, double clic) ne peuvent donc pas rembourser
deux fois : la seconde reçoit `400` « already in progress or completed ». Un refus de la passerelle
passe la réservation en `FAILED` pour permettre un nouvel essai. Cette règle s'applique aussi à
`POST /orders/:id/refund`.

---

## 📤 Uploads

### POST /upload/image

**Auth:** Required  
**Description:** Upload image événement  
**Content-Type:** `multipart/form-data`

**Body:**

```
file: [Binary]
```

**Response 201:**

```json
{
  "url": "https://s3.amazonaws.com/tickr-images/evt-uuid-123456.jpg",
  "size": 2048576,
  "mimeType": "image/jpeg"
}
```

---

## 🔒 Rate Limiting

```
Endpoint: /auth/login
Limite: 5 requêtes / 15 min / IP

Endpoint: /orders
Limite: 10 requêtes / min / user

Endpoint: /tickets/check-in
Limite: 10 requêtes / s, 80 / 10 s, 300 / min / client

Endpoint: /events/:id/check-in-staff
Limite: 3 requêtes / s, 10 / 10 s, 20 / heure / organisateur

Général (autres endpoints):
Limite: 100 requêtes / min / IP
```

**Response 429:**

```json
{
  "statusCode": 429,
  "message": "Too many requests",
  "retryAfter": 300
}
```

---

## ✅ Checklist API

Validation implémentation:

```yaml
✅ Auth:
  - [ ] JWT tokens générés correctement
  - [ ] Refresh token implémenté
  - [ ] Rate limiting login actif

✅ Validation:
  - [ ] DTOs avec class-validator
  - [ ] Messages erreur clairs
  - [ ] Codes statut HTTP corrects

✅ Sécurité:
  - [ ] HTTPS uniquement
  - [ ] CORS configuré
  - [ ] Rate limiting global

✅ Documentation:
  - [ ] Swagger UI accessible
  - [ ] Exemples requêtes/réponses
  - [ ] Authentification testée

✅ Performance:
  - [ ] Pagination implémentée
  - [ ] Temps réponse < 500ms
  - [ ] Cache Redis actif
```

---

**Prochaine lecture:** `03-database-schema.md` pour la structure des tables PostgreSQL.
