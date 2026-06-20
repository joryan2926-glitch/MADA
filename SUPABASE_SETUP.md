# Configuration Supabase - MADA

## 1. Créer le projet Supabase

Créer un projet Supabase, puis récupérer :

- Project URL
- `anon public` key

Renseigner ensuite :

```js
// assets/js/supabase-config.js
window.MADA_SUPABASE = {
  url: "https://votre-projet.supabase.co",
  anonKey: "votre-cle-anon-public",
};
```

## 2. Créer les tables et politiques RLS

Dans Supabase SQL Editor, exécuter le fichier :

```text
supabase/schema.sql
```

Le schéma crée les tables :

- `memberships`
- `volunteers`
- `newsletter_subscribers`
- `contacts`
- `program_contributions`
- `local_relays`
- `donation_intents`
- `news_posts`
- `admin_profiles`

## 3. Créer un administrateur

Exécuter ensuite le fichier de mise à niveau administration :

```text
supabase/admin-setup.sql
```

Ce script :

- crée la table `admin_invites` ;
- ajoute le rôle `owner/admin` aux profils administrateurs ;
- installe le trigger Supabase Auth qui crée automatiquement `admin_profiles` ;
- invite l'email officiel `contact@mada-martinique.fr` comme administrateur propriétaire ;
- rattache automatiquement cet email si l'utilisateur Auth existe déjà.

Créer ensuite un utilisateur dans Supabase Auth avec :

```text
Email : contact@mada-martinique.fr
Mot de passe : mot de passe fort à définir dans Supabase Auth
```

Si l'utilisateur Auth est créé après `supabase/admin-setup.sql`, le profil administrateur est créé automatiquement dans `admin_profiles`.

## 4. Administration des actualités et des demandes

Ouvrir :

```text
admin.html
```

Se connecter avec l'utilisateur Supabase Auth administrateur.

L'administration permet :

- de créer des actualités en brouillon ou publiées ;
- de publier, repasser en brouillon ou supprimer une actualité ;
- de voir les actualités enregistrées ;
- de consulter les dernières adhésions ;
- de consulter les dernières demandes de bénévolat ;
- de consulter les inscriptions newsletter ;
- de consulter les contacts, relais communaux, contributions programme et intentions de don.
- d'exporter les demandes reçues en CSV.

## 5. Vérifications avant production

- Tester chaque formulaire.
- Vérifier les lignes créées dans Supabase.
- Vérifier qu'un visiteur anonyme ne peut pas lire les données privées.
- Vérifier que seules les actualités publiées apparaissent sur `actualites.html`.
- Remplacer les valeurs de test avant mise en ligne.

## 6. Test automatisé des formulaires

Après avoir renseigné `assets/js/supabase-config.js` et exécuté `supabase/schema.sql`,
lancer :

```powershell
node tools/test-supabase-forms.mjs
```

Ce script insère une ligne de test dans :

- `memberships`
- `volunteers`
- `contacts`
- `newsletter_subscribers`
- `program_contributions`
- `local_relays`
- `donation_intents`

## 7. Test automatisé de l'administration

Créer d'abord l'utilisateur Supabase Auth `contact@mada-martinique.fr` et exécuter `supabase/admin-setup.sql`.

Ensuite, dans PowerShell :

```powershell
$env:SUPABASE_ADMIN_EMAIL="contact@mada-martinique.fr"
$env:SUPABASE_ADMIN_PASSWORD="mot-de-passe-local"
node tools/test-supabase-admin.mjs
```

Ne jamais committer les identifiants administrateur.
