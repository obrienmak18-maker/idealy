# Backend Idealy intégré

Cette copie contient le backend et les migrations d’Idealy sous `integrations/idealy`. Le frontend et les routes principales restent ceux de `ai-chatbot`.

Le serveur API Idealy peut être démarré séparément depuis ce dossier après installation de ses dépendances et configuration de son environnement. Par défaut, l’adaptateur Next utilise `http://localhost:3001` via `IDEALY_API_URL` et expose une vérification interne sur `/api/idealy/health`.

Les secrets ne doivent pas être copiés dans ce répertoire. Utiliser les fichiers `.env.example` comme inventaire de configuration, puis renseigner les variables dans l’environnement d’exécution.

## Répartition

| Élément | Emplacement | Rôle |
|---|---|---|
| Frontend principal | `../../app`, `../../components`, `../../hooks` | Interface complète ai-chatbot |
| Backend ai-chatbot | `../../app/api`, `../../lib` | Chat, historique, documents et authentification ai-chatbot |
| API Idealy | `api-server` | Service métier importé et extensible |
| Données Idealy | `supabase` et `db` | Schémas, migrations et accès aux données |
| Adaptateur | `../../app/api/idealy/health` | Liaison interne contrôlée vers l’API Idealy |
