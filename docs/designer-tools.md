# Outils images du Designer

Idealy utilise Pexels uniquement côté serveur pour les photos réalistes. La clé est `PEXELS_API_KEY` dans les secrets de l’Edge Function `designer-tools`; elle n’est jamais placée dans `VITE_*`, le navigateur, le localStorage ou le VFS.

Le endpoint officiel utilisé est `GET https://api.pexels.com/v1/search`, avec la clé envoyée dans l’en-tête `Authorization`. La réponse conserve l’URL de la photo, le nom du photographe et son URL afin que le projet généré puisse afficher l’attribution « Photos provided by Pexels » et créditer le photographe lorsque c’est possible.

Pexels indique que l’API est gratuite, avec des limites par défaut de 200 requêtes par heure et 20 000 par mois. Le Designer limite donc chaque recherche à 12 résultats et ne tente jamais de contourner les limites.

Les logos, icônes, illustrations et visuels sur mesure passent par `generateImage` côté serveur. Le résultat est téléchargé dans `assets/` du WebContainer sous un nom aléatoire; aucune clé fournisseur ni réponse sensible n’est exposée au client.

Références :

- [Documentation API Pexels](https://www.pexels.com/api/documentation/)
- [Pexels — Is the Pexels API free to use?](https://help.pexels.com/hc/en-us/articles/47677890260761-Is-the-Pexels-API-free-to-use)
