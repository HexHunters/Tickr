# Tickr · En scène — charte graphique

Proposition visuelle v1.1 · **18 octobre 2026** · Français d’abord.

[**Document PDF · 24 pages**](tickr-charte-graphique.pdf) ·
[Source HTML](brand-book.html) ·
[Concept de lancement](coming-soon.html) ·
[Références consultées](REFERENCES.md)

![Couverture de la charte graphique Tickr](assets/previews/brand-cover.png)

**Ça se vit dehors.** Une photographie live, des titres Readex Pro francs et un
accent acide reconnaissable. L’encre pétrole et Manrope gardent les informations
pratiques nettes. Une identité de sortie culturelle, pas un habillage de logiciel.

## Direction créative

La première version était cohérente mais trop institutionnelle : cinq pastels au
même niveau, titres fins, billet abstrait et promesses génériques. **En scène**
conserve ses bases utiles, mais change la hiérarchie :

- **Marque :** photo vécue plein cadre, nom Tickr visible, titres courts Readex
	Pro 700. « Ça se vit dehors » signifie sortir de chez soi, pas uniquement des
	événements en plein air. Pas de promesse de programmation déjà disponible.
- **Signature :** acide `#D9F55C`, encre `#233A42`, corail `#FF8066` ponctuel.
	Les pastels passent au second plan. Texte encre sur les deux nouveaux accents,
	jamais blanc. Une seule action mise en avant par section.
- **Grammaire :** bandeau de programme, numérotation éditoriale, détail perforé
	inspiré du billet. Pas de stickers gratuits, de cartes imbriquées ou de décor
	animé en continu. Cartes à 8 px maximum ; sections non arrondies.
- **Produit :** Manrope, prix lisibles, états explicites, actions pétrole.
	Réservation, gestion et contrôle d’entrée ne deviennent pas des affiches.
- **Ancrage local :** artistes, salles, affiches et langues de Tunisie doivent
	porter la future programmation ; pas de clichés touristiques. La photo livrée
	est illustrative et ne documente pas un événement tunisien ou Tickr vérifié.

La sculpture pastel reste un actif secondaire. Le logo vectoriel est conservé ;
les titres éditoriaux ne doivent pas être exportés comme nouvelle signature logo.

Le document rassemble l’identité et ses variantes, les couleurs, les polices, la
hiérarchie, les grilles, les composants et leurs états, la direction photo et 3D,
les versions desktop et mobile, les exemples de découverte, achat et billet, les
supports sociaux, le mouvement et le ton de voix.

![Vue desktop du concept de lancement](assets/previews/coming-soon-desktop.png)

## Consulter

Le PDF se consulte directement. Pour les versions HTML, depuis la racine du dépôt :

```sh
python3 -m http.server 8793 --directory docs/11-brand-charter
```

Ouvrir `http://localhost:8793/brand-book.html` ou
`http://localhost:8793/coming-soon.html`. Les polices et illustrations sont locales,
sans ressource tierce nécessaire à l’affichage. Les HTML s’ouvrent aussi depuis le
disque.

## Actifs livrés

| Fichiers                                        | Rôle                                                   |
| ----------------------------------------------- | ------------------------------------------------------ |
| `brand-book.html`, `brand-book.css`             | Source éditable du document                            |
| `tickr-charte-graphique.pdf`                    | Document A4 paysage, 24 pages                          |
| `coming-soon.html`, `landing.css`, `landing.js` | Prototype responsive de lancement                      |
| `tokens.json`, `tokens.css`                     | 83 tokens synchronisés : couleurs, type, rythme, états |
| `assets/logo/`                                  | Signature et symbole SVG vectorisés, variantes, source |
| `assets/fonts/`                                 | Manrope, Readex Pro, licences et provenance            |
| `assets/live-crowd.jpg`                         | Photo illustrative locale, source et limites dans REFERENCES.md |
| `assets/ticket-sculpture.svg`                   | Illustration originale avec profondeur simulée         |
| `assets/previews/`                              | Captures du prototype et couverture du PDF             |
| `scripts/check-design.mjs`                      | Vérification des tokens, contrastes et actifs          |
| `scripts/render-artifacts.sh`                   | Régénération des captures et du PDF                    |

La sculpture simule une matière 3D dans un SVG, sans moteur WebGL. Les lettres des
logos et du billet sont vectorisées.

## Vérifier et régénérer

```sh
node docs/11-brand-charter/scripts/check-design.mjs
node docs/11-brand-charter/scripts/check-design.mjs --json
bash docs/11-brand-charter/scripts/render-artifacts.sh
```

Le contrôle vérifie les **83 tokens et 41 paires de contraste** déclarées, les
références locales et les ancres des deux HTML, ainsi que les identifiants uniques.
Le minimum
calculé pour le texte est **4,72:1**. Il ne constitue pas un audit complet
d’accessibilité. Sur sauge, lilas et coquillage, employer le pétrole pour les
contours des contrôles ; #75878C est réservé aux autres surfaces autorisées.

La régénération demande Node.js, les dépendances frontend installées (Playwright)
et Chrome/Chromium. Sur macOS, Chrome installé est détecté ; ailleurs, utiliser
`CHROME_PATH` ou le Chromium installé par Playwright. Aucun téléchargement n’est
effectué par le script. Les HTML et les actifs sont ouverts depuis le disque.
Le script contrôle 24 feuilles et les débordements avant export ; la couverture
est capturée depuis le HTML. Les fichiers livrés restent consultables sans ces outils.

### Revue du 18 octobre 2026

Parcours d’achat aligné sur la cible hors ligne approuvée ; tailles essentielles du
formulaire et bord sur sauge corrigés ; exemples de grille et supports sociaux
adaptés au mobile ; lien d’évitement au clavier corrigé. PDF et captures de lancement
régénérés lors de cette première revue technique. La révision créative v1.1
ajoute ensuite les accents, la double typographie et les campagnes photographiques.

Contrôles effectués : références locales, tokens et contrastes ; débordements des
HTML à 320, 390, 768 et 1440 px ; erreurs e-mail/consentement, confirmation locale,
remise à zéro et focus ; bouton désactivé sans JavaScript ; limites des pages
imprimées. La recette lecteur d’écran et zoom texte reste à effectuer, ainsi que
la validation des futurs composants métier ; ce n’est pas une certification WCAG.

Recette v1.1 : 83 tokens et 41 contrastes déclarés validés ; images et largeur
des deux HTML vérifiées à 320, 390, 768 et 1440 px ; revue visuelle des captures
desktop, mobile, couverture et campagnes ; absence de collision avec les pieds
de page imprimés. Le formulaire conserve sa validation e-mail/consentement, sa
confirmation locale, la remise à zéro et le focus. Lien d’évitement, mouvement
réduit et bouton désactivé sans JavaScript vérifiés dans Chrome.

## Portée

En scène remplace la proposition Porcelaine au sein de cette PR. Elle
renouvelle les choix de couleur et de typographie de
[Chaux & Faïence](../10-project-audit/08-global-design-direction.md). Les
[exigences produit et parcours](../08-frontend/README.md) restent la référence
métier. Le frontend et le backend applicatifs ne sont pas modifiés.

## Contrat de passage au frontend

- **Priorité des sources :** `tokens.json` définit les valeurs visuelles,
	`tokens.css` les expose. Les spécimens HTML/PDF sont parfois réduits pour tenir
	sur une page ; ne pas copier leurs tailles comme composants de production.
	La présente charte remplace les anciennes couleurs et polices, pas les règles
	métier. Le [plan backend approuvé](../backend-plan.md) prévaut pour le lancement.
- **Paiement :** cible hors ligne en espèces, commission 0 %, passerelles
	désactivées. Ne proposer que les méthodes réellement disponibles dans l’API.
	Une liste vide affiche une indisponibilité, jamais un faux paiement réussi.
	Le parcours hors ligne reste à livrer selon le plan backend.
- **États distincts :** réservation non payée (code de recherche, non admissible),
	paiement confirmé par le serveur (billet/PDF disponible), billet utilisé,
	annulation, expiration et remboursement. Le QR seul ne prouve pas le paiement.
	Encaissement et entrée sont deux actions et deux permissions ; aucune entrée
	automatique du groupe après encaissement. Tickr ne transfère pas les espèces.
- **Données serveur :** total TND à trois décimales, frais, disponibilités et
	échéances. Ne pas calculer un taux de commission ou un délai fixe dans l’UI.
	Dates explicites en `Africa/Tunis`, échéance absolue et relative ; annoncer les
	seuils utiles, pas chaque seconde du compteur.
- **Surfaces produit :** découverte guidée par les affiches ; achat concentré sur
	le récapitulatif ; gestion organisateur et contrôle d’entrée compacts, avec
	tableaux/listes et actions lisibles. Le concept de lancement n’est pas le
	gabarit des écrans métier. Éviter les cartes imbriquées et les grandes sections
	promotionnelles dans les outils de gestion.
- **États UI à livrer :** chargement à dimensions stables, vide, erreur avec
	reprise, indisponibilité, accès refusé et session expirée. Les permissions et
	mutations sont validées par le serveur, pas seulement par des boutons masqués.
	Menus, dialogues et filtres restent à implémenter avec leur comportement clavier,
	restitution du focus et noms accessibles ; les spécimens ne les fournissent pas.
- **Recette :** clavier seul, zoom texte 200 %, reflow à 320 px, 360/390 px,
	tablette et desktop ; contenu long, erreurs, montant et référence non tronqués.
	Tester contraste sur les fonds réellement utilisés, focus non masqué, cibles
	≥ 44 px, champs à 16 px, mouvement réduit et lecteur d’écran. Readex Pro/RTL
	sont une préparation, pas une traduction arabe livrée. Pas de thème sombre
	global avant spécification de ses états.

## Limites du prototype

Le formulaire est une **démonstration locale** : consentement décoché, validation,
erreurs et confirmation explicites ; aucune requête, adresse conservée ou
inscription réelle. Sans JavaScript, le bouton reste désactivé. Avant publication,
relier une collecte réelle et ses textes de consentement à un service adapté.

Les événements, noms, prix et références de billet sont fictifs. Le QR est
volontairement non scannable. Aucune date de lancement ou métrique d’audience n’est
annoncée comme acquise. La surface sombre du billet est un exemple ciblé ; le thème
sombre complet reste à spécifier.
