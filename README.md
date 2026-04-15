# Mess-App — Gestion de Messages Vocaux

Application web professionnelle pour gérer les demandes de messages vocaux (absence, fermeture, congés) destinés aux serveurs de téléphonie.

**Client** : Konectik

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + Vite + TypeScript |
| Styling | TailwindCSS |
| Validation | Zod (front & back) |
| Backend | Supabase (Auth, PostgreSQL, Storage, Edge Functions) |
| Hébergement BDD | Supabase Cloud (eu-west-1) |
| Repo | [github.com/Willux1603/Mess-App](https://github.com/Willux1603/Mess-App) |

---

## Architecture du projet

```
Mess-App/
├── index.html
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
├── postcss.config.js
├── .env                        # Variables Supabase (non versionné)
├── .env.example                # Template des variables
└── src/
    ├── main.tsx                # Point d'entrée React
    ├── App.tsx                 # Routing principal
    ├── styles/
    │   └── globals.css         # Tailwind directives + styles globaux
    ├── lib/
    │   ├── supabase.ts         # Client Supabase
    │   ├── constants.ts        # Statuts, rôles, horaires, URL logo
    │   ├── types.ts            # Interfaces TypeScript (Profile, Request, etc.)
    │   ├── utils.ts            # Helpers (dates, horaires, cn)
    │   └── validators.ts       # Schémas Zod (login, register, request, audio)
    ├── components/
    │   ├── layout/
    │   │   └── AppLayout.tsx   # Layout principal (header, nav, logo)
    │   └── shared/
    │       └── StatusBadge.tsx  # Badge coloré par statut
    └── features/
        ├── auth/
        │   ├── AuthContext.tsx  # Contexte React (session, profil, signOut)
        │   ├── AuthGuard.tsx   # Protection de routes par rôle
        │   ├── LoginPage.tsx   # Page de connexion
        │   └── RegisterPage.tsx # Page d'inscription
        ├── requests/
        │   ├── ClientDashboard.tsx  # Dashboard client (liste des demandes)
        │   └── NewRequestPage.tsx   # Formulaire multi-étapes (form → recap → success)
        ├── admin/
        │   └── AdminDashboard.tsx   # Panel admin (stats, filtres, assignation)
        └── profile/
            └── ProfilePage.tsx      # Page de profil utilisateur
```

---

## Base de données Supabase

### Enums

| Enum | Valeurs |
|------|---------|
| `user_role` | `client`, `admin`, `technician` |
| `request_status` | `draft`, `submitted`, `to_process`, `assigned`, `pending`, `completed`, `cancelled` |

### Tables

#### `profiles`
Créé automatiquement via trigger au signup Supabase Auth.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid (PK, FK auth.users) | ID utilisateur |
| `email` | text | Email |
| `first_name` | text | Prénom |
| `last_name` | text | Nom |
| `company` | text | Société |
| `phone` | text | Téléphone |
| `role` | user_role | Rôle (défaut: client) |
| `created_at` | timestamptz | Date création |
| `updated_at` | timestamptz | Dernière mise à jour |

#### `requests`
Demandes de messages vocaux.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid (PK) | ID demande |
| `reference` | text (unique) | N° auto-généré (MSG-YYYYMMDD-XXXX) |
| `client_id` | uuid (FK profiles) | Demandeur |
| `first_name`, `last_name`, `company` | text | Infos snapshot au moment de la demande |
| `start_datetime` | timestamptz | Début de la période |
| `end_datetime` | timestamptz | Fin de la période |
| `has_audio` | boolean | Fichier audio déposé |
| `audio_file_path` | text | Chemin dans le bucket Storage |
| `needs_tts` | boolean | Génération vocale demandée |
| `tts_text` | text | Texte à convertir |
| `additional_notes` | text | Notes supplémentaires |
| `status` | request_status | Statut courant |
| `assigned_to` | uuid (FK profiles) | Technicien assigné |
| `submitted_at` | timestamptz | Date de soumission |
| `completed_at` | timestamptz | Date de clôture |
| `created_at`, `updated_at` | timestamptz | Timestamps |

#### `request_notes`
Notes internes sur une demande.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid (PK) | ID note |
| `request_id` | uuid (FK requests) | Demande associée |
| `author_id` | uuid (FK profiles) | Auteur |
| `content` | text | Contenu |
| `created_at` | timestamptz | Date |

#### `request_history`
Historique des changements de statut.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid (PK) | ID entrée |
| `request_id` | uuid (FK requests) | Demande |
| `changed_by` | uuid (FK profiles) | Auteur du changement |
| `old_status`, `new_status` | request_status | Ancien / nouveau statut |
| `created_at` | timestamptz | Date |

### Storage

| Bucket | Accès | Limite | Types |
|--------|-------|--------|-------|
| `audio-files` | Privé (RLS) | 10 Mo | audio/mpeg, wav, ogg, mp3 |
| `assets` | Public | 5 Mo | image/png, jpeg, svg, webp |

### RLS (Row Level Security)

Toutes les tables ont RLS activé :
- **profiles** : chaque user voit/modifie son propre profil ; admins voient tout
- **requests** : clients voient leurs demandes ; admins/techniciens voient toutes
- **request_notes** : visibles par le client propriétaire et les admins
- **request_history** : idem
- **audio-files** : upload par le propriétaire, lecture par admins
- **assets** : lecture publique

---

## Règles métier

### Soumission de demande
1. **Délai minimum 24h** : avertissement si la demande commence dans moins de 24h
2. **Blocage à 2h** : impossible de soumettre si le début est dans moins de 2h
3. **Horaires ouvrés** : lun-ven 08h30-17h30, avertissement si hors plage
4. **Audio OU TTS** : le client choisit entre déposer un fichier audio ou saisir un texte
5. **Fichier audio** : formats acceptés (MP3, WAV, OGG), max 10 Mo
6. **Texte TTS** : minimum 10 caractères, max 2000
7. **Flux** : Formulaire → Récapitulatif → Confirmation → N° de référence

### Statuts et cycle de vie
```
draft → submitted → to_process → assigned → pending → completed
                                                   ↘ cancelled
```

### Rôles
| Rôle | Droits |
|------|--------|
| `client` | Créer/voir ses demandes, modifier son profil |
| `admin` | Voir toutes les demandes, changer statut, assigner, filtrer |
| `technician` | Idem admin (traitement technique) |

---

## Variables d'environnement

```env
VITE_SUPABASE_URL=https://rymjelbxqnrghjmzeybp.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
```

Copier `.env.example` en `.env` et remplir les valeurs.

---

## Commandes

```bash
# Installer les dépendances
npm install

# Lancer le serveur de dev
npm run dev

# Build de production
npm run build

# Preview du build
npm run preview
```

---

## Supabase

- **Projet** : Konectik
- **ID** : `rymjelbxqnrghjmzeybp`
- **Région** : `eu-west-1`
- **Dashboard** : [supabase.com/dashboard/project/rymjelbxqnrghjmzeybp](https://supabase.com/dashboard/project/rymjelbxqnrghjmzeybp)
- **Logo** : stocké dans le bucket `assets` (`Konectik_logo_blanc.png`)

---

## Roadmap

### V1 (actuel)
- [x] Architecture et conception
- [x] Schéma BDD + RLS + triggers
- [x] Storage audio + assets
- [x] Auth (login, register, contexte, guard)
- [x] Layout Konectik (header, nav, logo)
- [x] Dashboard client (liste demandes)
- [x] Formulaire nouvelle demande (multi-étapes)
- [x] Panel admin (stats, filtres, statuts, assignation)
- [x] Page profil
- [x] Push GitHub

### V1.1 (à venir)
- [ ] Page détail d'une demande (client + admin)
- [ ] Notes internes sur une demande
- [ ] Historique des changements de statut
- [ ] Notifications par email (Edge Functions)
- [ ] Lecteur audio intégré pour les admins

### V2
- [ ] Intégration Microsoft 365 (calendrier)
- [ ] Google TTS (génération vocale automatique)
- [ ] Export CSV des demandes
- [ ] Tableau de bord statistiques avancé
- [ ] Mode multi-tenant (plusieurs sociétés)

---

## Design

- **Fond** : gris clair (`#f5f5f5`)
- **Cards** : blanc, `rounded-xl`, `shadow-sm`
- **Accent** : teal/turquoise (`#0cb8b6`)
- **Boutons** : arrondis (`rounded-full`), fond teal
- **Police** : système (Inter recommandée)
- **Logo** : Konectik, centré en haut des pages auth, à gauche dans le header
