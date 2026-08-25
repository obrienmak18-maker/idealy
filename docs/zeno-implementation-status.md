# Zeno — état d’implémentation

## Décision produit

Le dépôt conserve l’application Idealy existante et ajoute Zeno comme package web indépendant dans `artifacts/zeno`. Cette approche évite de détruire l’existant tout en permettant à Netlify de publier Zeno comme application opérationnelle.

La fondation visuelle suit Stitch : Inter, Zeno Blue, surfaces lavande très claires, cartes blanches peu arrondies, ombres discrètes, hiérarchie institutionnelle et rythme d’espacement régulier. Les parcours et la segmentation par rôle reprennent les meilleurs éléments d’UXPilot.

## Fonctionnalités livrées dans cette première tranche

Le shell principal comprend une navigation latérale, un en-tête de recherche, un établissement actif, une année scolaire active, un sélecteur de rôle et une adaptation des menus pour les rôles Directeur, Enseignant, Secrétaire et Comptable.

Les écrans disponibles sont le tableau de bord par rôle, la liste des élèves, le personnel, les classes, les présences, la saisie des notes, le planning, les finances et les paramètres de l’établissement.

Les interactions principales fonctionnent côté frontend : ajout local d’un élève, recherche locale, sélection Présent/Retard/Absent avec recalcul des compteurs, validation de l’appel, changement de rôle et navigation entre les espaces. Les élèves ajoutés sont conservés dans le stockage local du navigateur pour la démonstration.

## Limites explicites

Cette tranche n’est pas encore le backend production. Elle ne remplace pas les tables Supabase, les politiques RLS, les permissions serveur, l’import XLSX/CSV réel, les documents, la synchronisation offline, l’archivage annuel ni les workflows complets de validation et de bulletin.

Les données affichées sont des données de démonstration réalistes. Elles sont volontairement isolées dans le frontend jusqu’à la prochaine tranche de modélisation multi-école et de sécurité.

## Vérifications réalisées

Le package Zeno passe le typecheck TypeScript et le build Vite de production. Le rendu a été contrôlé dans le navigateur sur le tableau de bord Directeur, la liste Élèves, le parcours Présences et l’espace Enseignant. La console navigateur ne signalait aucune erreur lors de ces contrôles.

## Prochaine tranche recommandée

La prochaine étape doit connecter le shell à Supabase avec les entités `schools`, `academic_years`, `school_memberships`, `roles`, `permissions`, `classes`, `students`, `subjects`, `teacher_assignments`, `timetable_entries` et `attendance_records`. Les contrôles de scope école et de permissions devront être appliqués côté serveur avant d’activer de vraies données.
