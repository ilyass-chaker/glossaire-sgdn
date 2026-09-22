# Glossaire interactif – SGdN – 1re STMG

Application web pédagogique dédiée aux Sciences de Gestion et du Numérique en Première STMG.

## Interfaces

- `/` : interface élève en lecture seule, avec glossaire, filtres, flashcards et export PDF.
- `/admin/` : interface enseignant protégée par authentification, permettant d’ajouter, modifier, supprimer et importer les notions depuis Excel.

Les deux interfaces utilisent une base Supabase commune. Les modifications réalisées dans l’administration sont donc visibles dans l’interface élève.

## Sécurité

L’interface élève ne contient aucune fonction d’écriture ni aucun accès au mode enseignant. Les autorisations sont contrôlées côté base de données par des règles RLS Supabase : les visiteurs peuvent lire le glossaire mais ne peuvent pas ajouter, modifier ou supprimer son contenu.

Le site n’utilise qu’une clé publique Supabase prévue pour les applications web. Aucune clé `service_role` n’est publiée dans le dépôt.

## GitHub Pages

Le projet est conçu pour être publié depuis la branche `main`, dossier `/ (root)`.

Une fois GitHub Pages activé :

- l’interface élève est accessible à la racine du site ;
- l’administration est accessible à l’adresse `/admin/`.

## Import Excel

L’interface enseignant accepte les fichiers `.xlsx` et `.xls`. La première feuille du classeur est analysée automatiquement.

Colonnes obligatoires :

- `Notion`
- `Chapitre`
- `Définition`

Colonne facultative : `Exemple`.

L’ordre des colonnes n’a pas d’importance. Les chapitres absents sont créés automatiquement et une notion existante dans le même chapitre est mise à jour plutôt que dupliquée.
