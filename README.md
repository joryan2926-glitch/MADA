# MADA - Plateforme politique martiniquaise

Site officiel de MADA, Mouvement pour l'Avenir, le Développement et l'Autodétermination.

## Objectif

MADA est une plateforme politique numérique destinée à préparer les élections de la Collectivité Territoriale de Martinique en 2028 et à structurer un mouvement politique martiniquais sur le long terme.

Le site sert à :

- présenter le mouvement MADA ;
- présenter le programme politique 2028 autour des 8 axes officiels ;
- recruter des adhérents et des bénévoles ;
- collecter des dons ;
- informer les citoyens ;
- organiser les actions de terrain ;
- diffuser les actualités du mouvement ;
- construire une communauté politique martiniquaise.

## Pages

- `index.html` : accueil et présentation stratégique
- `mouvement.html` : histoire, identité, crédibilité
- `programme-2028.html` : priorités politiques
- `actualites.html` : média du mouvement
- `communes.html` : présence territoriale
- `agir.html` : adhésion, bénévolat, engagement
- `don.html` : soutien financier
- `contact.html` : coordonnées et lien citoyen

## Identité visuelle

Les références officielles utilisées sont dans `assets/` :

- `mada-logo-reference.png`
- `mada-logo-horizontal.png`
- `mada-flag-official.jfif`
- `martinique-landscape-only.png`

Le site ne doit pas utiliser l'ancien drapeau bleu/blanc.

## Programme 2028

Les 8 axes officiels validés sont :

1. Relance économique & Entrepreneuriat
2. Jeunesse, Aînés & Emploi
3. Infrastructures, Eau & Modernisation
4. Lutte contre la vie chère
5. Autonomie alimentaire & Chlordécone
6. Autodétermination responsable & Ouverture caribéenne
7. Qualité de vie, Santé, Sécurité & Logement
8. Transparence & Bonne gestion du territoire

Signature politique :

```text
Produire ici. Décider ici. Réussir ici.
```

## Ouverture locale

Le site est statique. Il peut être ouvert directement avec :

```text
index.html
```

Point d'entrée local :

```text
C:\Users\jowst\Documents\MADA\index.html
```

## Fonctionnel Supabase

Le site contient maintenant une intégration Supabase côté client :

- formulaires d'adhésion et bénévolat ;
- inscriptions newsletter ;
- contributions au programme 2028 ;
- relais communaux ;
- formulaire de contact ;
- intentions de don ;
- administration des actualités ;
- affichage public des actualités publiées.

Avant production, renseigner `assets/js/supabase-config.js`, exécuter `supabase/schema.sql`, puis suivre `SUPABASE_SETUP.md`.
