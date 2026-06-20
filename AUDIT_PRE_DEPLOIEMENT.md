# Audit pré-déploiement - Site MADA

Date : 20 juin 2026

## Synthèse

Le site MADA est navigable et opérationnel en statique. Les pages principales sont présentes, les liens internes sont valides, le logo MADA et le drapeau officiel rouge, vert et noir sont utilisés sur l'ensemble du site, et le programme 2028 est aligné avec les 8 axes officiels validés.

Signature politique intégrée :

```text
Produire ici. Décider ici. Réussir ici.
```

## Pages vérifiées

- `index.html`
- `mouvement.html`
- `programme-2028.html`
- `actualites.html`
- `communes.html`
- `agir.html`
- `don.html`
- `contact.html`

## Navigation et liens internes

Statut : OK

- Aucun lien interne cassé détecté.
- Le menu complet est présent sur les pages.
- Les liens vers les pages principales fonctionnent en statique.
- Les ancres importantes sont présentes, notamment `agir.html#adherer`, `agir.html#benevole` et `programme-2028.html#contribuer`.

## Identité visuelle

Statut : OK

- Logo MADA présent sur toutes les pages.
- Drapeau officiel rouge, vert et noir présent sur toutes les pages.
- Aucun usage détecté de l'ancien drapeau bleu/blanc.
- Couleurs principales conformes à la direction validée : vert profond, jaune doré, marron, blanc, rouge/vert/noir du drapeau.

## Programme 2028

Statut : OK

Les 8 axes officiels sont présents sur `programme-2028.html` :

1. Relance économique & Entrepreneuriat
2. Jeunesse, Aînés & Emploi
3. Infrastructures, Eau & Modernisation
4. Lutte contre la vie chère
5. Autonomie alimentaire & Chlordécone
6. Autodétermination responsable & Ouverture caribéenne
7. Qualité de vie, Santé, Sécurité & Logement
8. Transparence & Bonne gestion du territoire

Les contenus de l'accueil, du mouvement, des actualités, de l'engagement et du don ont été harmonisés autour de ces axes.

## Formulaires

Statut : branché sur Supabase, configuration projet requise avant production

Formulaires présents :

- Newsletter / information : `actualites.html`
- Engagement : `agir.html`
- Relais communal : `communes.html`
- Contact : `contact.html`
- Contribution programme : `programme-2028.html`
- Information mouvement : `mouvement.html`

État actuel :

- Les formulaires utilisent `data-supabase-table` et le script `assets/js/mada-supabase.js`.
- Les consentements sont présents sur les formulaires.
- Les données sont segmentées : adhérents, bénévoles, donateurs, relais communaux, contributeurs programme, contacts et newsletter.

À finaliser avant mise en ligne :

- Renseigner les clés Supabase dans `assets/js/supabase-config.js`.
- Exécuter `supabase/schema.sql` dans Supabase.
- Tester chaque formulaire avec un vrai projet Supabase.
- Ajouter une protection anti-spam si les formulaires deviennent publics à fort trafic.

## Responsive

Statut : structure responsive en place, validation visuelle finale à refaire manuellement

Éléments vérifiés :

- Meta viewport présent sur toutes les pages.
- CSS responsive présent avec deux ruptures principales :
  - tablette : `@media (max-width: 1180px)`
  - mobile : `@media (max-width: 760px)`
- Les grilles passent en 2 colonnes puis 1 colonne selon la largeur.
- Le menu mobile est prévu via un bouton burger CSS.
- Les tailles typographiques utilisent `clamp()` sur les grands titres.

Limite de validation :

- Les tentatives de captures headless Chrome/Edge ont échoué dans l'environnement local sans générer de PNG. Le rendu responsive doit donc être revu manuellement dans un navigateur avant mise en ligne.

Points à vérifier manuellement :

- Menu mobile : ouverture, fermeture, lisibilité, hauteur du panneau.
- Hero mobile : lisibilité du texte sur image.
- Cartes programme : équilibre visuel des 8 axes sur mobile et tablette.
- Formulaires : confort de saisie sur mobile.
- Footer : empilement et lisibilité sur petits écrans.

## Images

Statut : OK avec optimisation recommandée

Images présentes :

- `mada-flag-official.jfif` : 3,299 octets
- `mada-logo-horizontal.png` : 780,230 octets
- `mada-logo-reference.png` : 856,408 octets
- `martinique-landscape-only.png` : 2,780,680 octets

Points positifs :

- Toutes les images utilisées dans les pages ont un attribut `alt`.
- Le drapeau officiel est utilisé.
- Le logo MADA est bien visible.

À corriger avant mise en ligne :

- Optimiser `martinique-landscape-only.png`, actuellement trop lourd pour un hero web.
- Créer des versions WebP/AVIF.
- Ajouter `loading="lazy"` sur les images non critiques.
- Conserver le logo principal en bonne qualité, mais produire une version web plus légère.

## Performance

Statut : acceptable pour prototype statique, optimisation nécessaire avant production

Poids total approximatif du projet hors `.git` : 4,487,564 octets.

Risque principal :

- Le hero image dépasse 2.7 Mo, ce qui peut ralentir le premier affichage mobile.

Recommandations :

- Générer un hero optimisé autour de 250-500 Ko.
- Minifier le CSS avant production.
- Ajouter des dimensions explicites `width` / `height` aux images critiques pour limiter les décalages de mise en page.
- Prévoir un cache long pour les assets versionnés.

## SEO de base

Statut : OK, améliorable

Contrôles OK :

- Chaque page possède un `<title>`.
- Chaque page possède une meta description.
- Chaque page possède un seul H1.
- `robots.txt` présent.
- `sitemap.xml` présent.

À corriger avant mise en ligne :

- Ajouter des balises Open Graph et Twitter Card.
- Ajouter une URL canonique sur chaque page.
- Ajouter des données structurées `Organization` pour MADA.
- Mettre à jour le sitemap avec des dates `lastmod`.
- Préparer une page mentions légales et politique de confidentialité.

## Accessibilité

Statut : base correcte, audit manuel recommandé

Points positifs :

- Les images ont des textes alternatifs.
- Les liens principaux sont textuels.
- Les contrastes principaux vert/blanc et jaune/vert sont globalement lisibles.

À vérifier :

- Navigation clavier complète.
- Focus visible sur tous les boutons et liens.
- Lisibilité des textes sur le hero selon les écrans.
- Labels et aide RGPD pour les formulaires.

## Sécurité et conformité

Statut : à compléter avant production

À ajouter :

- Mentions légales.
- Politique de confidentialité.
- Gestion du consentement pour les formulaires.
- Procédure de traitement des données personnelles.
- Si dons en ligne : prestataire de paiement conforme, traçabilité et cadre légal.

## Points restants avant mise en ligne

Priorité haute :

1. Remplacer les formulaires `mailto:` par une vraie collecte sécurisée.
2. Ajouter mentions légales, confidentialité et consentement RGPD.
3. Optimiser les images lourdes, surtout le hero.
4. Faire une revue visuelle manuelle mobile/tablette/desktop dans un navigateur.
5. Vérifier le menu burger sur mobile.

Priorité moyenne :

1. Ajouter Open Graph, Twitter Card et canonical.
2. Ajouter données structurées `Organization`.
3. Ajouter `loading="lazy"` aux images non critiques.
4. Ajouter dimensions explicites aux images.
5. Préparer une page médias plus complète avec futurs communiqués.

Priorité basse :

1. Minifier CSS pour production.
2. Ajouter favicon et icônes d'application.
3. Ajouter une page historique ou équipe lorsque les contenus seront validés.
4. Préparer une future intégration CRM pour les contacts militants.

## Conclusion

Le site est prêt comme version statique de préproduction éditoriale et visuelle. Il n'est pas encore prêt pour une mise en ligne publique complète tant que les formulaires, la conformité RGPD, l'optimisation des images et la validation responsive visuelle finale ne sont pas traités.
