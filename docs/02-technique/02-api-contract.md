# 🔌 API Contract - Tickr REST API

**Version:** 1.0  
**Base URL:** `https://api.tickr.tn/v1`  
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
- Expiration: 24h
- Refresh token: 30 jours
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

**Description:** Récupère la configuration publique de la plateforme (taux de commission, version)

**Authentification:** Non requise (public)

**Response 200:**
```json
{
  "commission": {
    "rate": 0.06,
    "displayPercentage": "6.0%"
  },
  "version": "1.0.0"
}
```

**Utilisation Frontend:**
- Cache recommandé: 1 heure
- Fallback si échec: 6% par défaut
- Utilisé pour afficher prix dynamiquement

**Notes:**
- ✅ Endpoint public (pas de token requis)
- ✅ Réponse cachée côté serveur (5 min)
- ✅ Permet changement commission sans redéployer frontend

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

### POST /auth/refresh

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
      "price": 50.00,
      "quantity": 500,
      "sold": 120,
      "available": 380
    },
    {
      "id": "uuid",
      "name": "VIP",
      "price": 100.00,
      "quantity": 100,
      "sold": 45,
      "available": 55
    }
  ],
  "stats": {
    "views": 1250,
    "sold": 165,
    "revenue": 10500.00
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
          "price": 50.00,
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
  "price": 35.00,
  "quantity": 200,
  "description": "Prix réduit pour les premiers"
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "name": "Early Bird",
  "price": 35.00,
  "quantity": 200,
  "sold": 0,
  "available": 200
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
        "unitPrice": 50.00,
        "quantity": 2,
        "subtotal": 100.00
      }
    ],
    "subtotal": 100.00,
    "platformFee": 4.00,
    "total": 104.00,
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
**Description:** Créer commande (avant paiement)

**Body:**
```json
{
  "paymentMethod": "CLICTOPAY"
}
```

**Response 201:**
```json
{
  "orderId": "uuid",
  "amount": 104.00,
  "status": "PENDING",
  "paymentUrl": "https://clictopay.com/pay/abc123",
  "expiresAt": "2024-01-15T10:45:00Z"
}
```

---

## 💳 Paiements

### POST /payments/webhook/clictopay

**Auth:** Webhook signature  
**Description:** Callback Clictopay

**Body:**
```json
{
  "orderId": "uuid",
  "status": "COMPLETED",
  "transactionId": "CTP123456789",
  "amount": 104.00,
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

### POST /payments/webhook/stripe

**Auth:** Stripe signature  
**Description:** Callback Stripe

**Body:** (Stripe Event Object)

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

### GET /checkin/:eventId/init

**Auth:** Required (Staff)  
**Description:** Initialiser session check-in

**Response 200:**
```json
{
  "event": {
    "id": "uuid",
    "name": "Concert Balti 2024",
    "startDate": "2024-06-15T20:00:00Z"
  },
  "stats": {
    "totalSold": 165,
    "checkedIn": 42,
    "remaining": 123
  }
}
```

---

### POST /checkin/:eventId/scan

**Auth:** Required (Staff)  
**Description:** Valider QR code

**Body:**
```json
{
  "qrCodeData": "TICKR|evt-uuid|tkt-uuid|hash"
}
```

**Response 200 (Success):**
```json
{
  "valid": true,
  "ticket": {
    "id": "uuid",
    "ticketNumber": "TICKR-001234",
    "ticketType": "Standard",
    "participant": {
      "firstName": "John",
      "lastName": "Doe"
    }
  },
  "checkedInAt": "2024-06-15T19:45:00Z"
}
```

**Response 409 (Conflict - already used):**
```json
{
  "valid": false,
  "reason": "ALREADY_USED",
  "message": "Billet déjà scanné à 19:30",
  "checkedInAt": "2024-06-15T19:30:00Z"
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
      "gross": 10500.00,
      "platformFee": 420.00,
      "net": 10080.00
    }
  },
  "salesByTicketType": [
    {
      "name": "Standard",
      "sold": 120,
      "revenue": 6000.00
    },
    {
      "name": "VIP",
      "sold": 45,
      "revenue": 4500.00
    }
  ],
  "salesByDay": [
    {
      "date": "2024-01-10",
      "sold": 23,
      "revenue": 1380.00
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

Endpoint: /checkin/:id/scan
Limite: 60 requêtes / min / staff

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
