# Rapport final de pré-déploiement - MADA

Date : 20 juin 2026

## Statut général

Le site MADA est fonctionnel en version statique connectée à Supabase.

Le design est conservé et aucune modification esthétique majeure n'a été ajoutée. Le travail effectué porte sur la couche fonctionnelle :

- connexion Supabase ;
- formulaires réels ;
- mentions légales ;
- politique de confidentialité ;
- système d'adhésion ;
- bénévolat ;
- newsletter ;
- contributions au programme ;
- relais communaux ;
- intentions de don ;
- administration des actualités ;
- consultation admin des demandes reçues.

## Configuration Supabase

Statut : OK

Fichier configuré :

```text
assets/js/supabase-config.js
```

Projet Supabase :

```text
https://iwzdpmtlcirtdaseyqdi.supabase.co
```

La clé publique fournie est en place.

## Schéma SQL

Statut : OK, exécuté dans Supabase par l'utilisateur

Fichier source :

```text
supabase/schema.sql
```

Tables prévues :

- `memberships`
- `volunteers`
- `newsletter_subscribers`
- `contacts`
- `program_contributions`
- `local_relays`
- `donation_intents`
- `admin_profiles`
- `news_posts`

RLS activé sur toutes les tables.

## Tests des formulaires publics

Statut : OK

Commande exécutée :

```powershell
node tools/test-supabase-forms.mjs
```

Résultat :

```text
OK adhésion: insertion acceptée dans memberships
OK bénévolat: insertion acceptée dans volunteers
OK contact: insertion acceptée dans contacts
OK newsletter: insertion acceptée dans newsletter_subscribers
OK contribution programme 2028: insertion acceptée dans program_contributions
OK relais communaux: insertion acceptée dans local_relays
OK intention de don: insertion acceptée dans donation_intents
Tous les tests Supabase publics sont passés.
```

Conclusion :

Les formulaires publics enregistrent bien les données dans Supabase.

## Sécurité des données publiques

Statut : OK

Commande exécutée :

```powershell
node tools/test-supabase-security.mjs
```

Résultat :

```text
OK lecture publique memberships: aucune donnée exposée
OK lecture publique volunteers: aucune donnée exposée
OK lecture publique contacts: aucune donnée exposée
OK lecture publique newsletter_subscribers: aucune donnée exposée
OK lecture publique program_contributions: aucune donnée exposée
OK lecture publique local_relays: aucune donnée exposée
OK lecture publique donation_intents: aucune donnée exposée
Actualités publiques: HTTP 200 []
```

Conclusion :

Les données privées ne sont pas lisibles publiquement avec la clé publique.

## Espace administrateur

Statut : partiellement testé

Fichiers :

- `admin.html`
- `assets/js/mada-admin.js`
- `tools/test-supabase-admin.mjs`

Contrôles effectués :

- syntaxe JavaScript OK ;
- page admin créée ;
- connexion Supabase Auth prévue ;
- création d'actualités prévue ;
- lecture admin des demandes reçues prévue ;
- affichage des dernières demandes par catégorie prévu.

Limite actuelle :

Le test authentifié complet n'a pas pu être exécuté car aucun couple `SUPABASE_ADMIN_EMAIL` / `SUPABASE_ADMIN_PASSWORD` n'est disponible dans l'environnement local.

Commande à exécuter après création de l'administrateur Supabase :

```powershell
$env:SUPABASE_ADMIN_EMAIL="admin@mada-martinique.fr"
$env:SUPABASE_ADMIN_PASSWORD="mot-de-passe-local"
node tools/test-supabase-admin.mjs
```

Action restante :

Créer un utilisateur Supabase Auth, récupérer son `user_id`, puis l'ajouter à `admin_profiles`.

Exemple :

```sql
insert into public.admin_profiles (user_id, email)
values ('UUID_UTILISATEUR_AUTH', 'admin@mada-martinique.fr');
```

## Actualités publiques

Statut : prêt

La page `actualites.html` contient une zone dynamique :

```text
data-news-list
```

Elle affichera les actualités de `news_posts` avec :

```sql
status = 'published'
```

Résultat actuel :

```text
[]
```

C'est normal tant qu'aucune actualité publiée n'a été créée via l'administration.

## Pages légales

Statut : OK, à compléter avec l'hébergeur définitif

Pages ajoutées :

- `mentions-legales.html`
- `politique-confidentialite.html`

À compléter avant mise en ligne :

- nom de l'hébergeur ;
- adresse de l'hébergeur ;
- coordonnées de l'hébergeur ;
- éventuellement responsable de publication si une personne est désignée officiellement.

## SEO et indexation

Statut : OK de base

Présents :

- `robots.txt`
- `sitemap.xml`
- titres HTML ;
- meta descriptions ;
- pages légales ajoutées au sitemap ;
- `admin.html` bloqué dans `robots.txt`.

À améliorer avant diffusion large :

- balises Open Graph ;
- favicon ;
- données structurées `Organization` ;
- canonical URLs.

## Déploiement

Statut : prêt techniquement après validation admin

Le site peut être déployé comme site statique.

Points obligatoires avant mise en ligne publique :

1. Créer l'utilisateur administrateur dans Supabase Auth.
2. Ajouter cet utilisateur à `admin_profiles`.
3. Exécuter `node tools/test-supabase-admin.mjs` avec les variables d'environnement admin.
4. Créer une actualité publiée de test via `admin.html`.
5. Vérifier qu'elle apparaît sur `actualites.html`.
6. Compléter les informations d'hébergement dans `mentions-legales.html`.

## Conclusion

Le site MADA est prêt à recevoir de vrais adhérents côté formulaires publics.

Les flux publics ont été testés avec succès contre Supabase :

- adhésion ;
- bénévolat ;
- contact ;
- newsletter ;
- contribution programme 2028 ;
- relais communaux ;
- intention de don.

Le dernier verrou avant déploiement public complet concerne l'administration authentifiée : il faut créer l'utilisateur admin Supabase, l'ajouter à `admin_profiles`, puis exécuter le test admin automatisé.
