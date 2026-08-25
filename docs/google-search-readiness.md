# Référencement Google Search — Idealy

## Ce qui est prêt

Idealy expose désormais un `robots.txt`, un `sitemap.xml`, un manifest web, des titres et descriptions propres aux pages publiques, des canonicals et des données structurées `WebApplication` sur la landing `/welcome`. Les zones authentifiées, APIs, démos et maquettes sont explicitement exclues de l’indexation. Le sitemap ne contient que les pages publiques canoniques : accueil, à propos, documentation, confidentialité et conditions.

Google indique qu’un sitemap aide à découvrir les URLs mais ne garantit ni exploration ni classement. Il doit lister des URLs absolues et canoniques ; c’est la raison pour laquelle les espaces utilisateurs et les démos ne sont pas ajoutés. [1]

## Configuration à réaliser dans Google Search Console

| Étape | Action future | Pourquoi |
|---|---|---|
| 1 | Choisir et connecter un domaine Idealy propriétaire au site Netlify. | La propriété Search Console et les URLs canoniques doivent refléter le domaine public final. |
| 2 | Définir `NEXT_PUBLIC_SITE_URL` avec ce domaine sur Netlify, puis publier. | Les métadonnées, canonicals, sitemap et robots doivent annoncer le domaine final, pas une URL d’aperçu. |
| 3 | Ajouter une propriété de domaine dans Google Search Console et la vérifier via DNS. | Une propriété de domaine couvre les variantes `http`, `https`, `www` et sous-domaines. |
| 4 | Soumettre `https://<domaine-idealy>/sitemap.xml` dans le rapport Sitemaps. | Google peut afficher l’état de lecture et les erreurs de traitement. [1] |
| 5 | Contrôler `/welcome`, `/about` et `/docs` dans l’outil Inspection d’URL, puis demander leur indexation si nécessaire. | Google prévient que l’exploration peut prendre de quelques jours à quelques semaines et ne garantit pas l’inclusion. [3] |
| 6 | Suivre Couverture/Indexation, Performances et Core Web Vitals avant de modifier les contenus. | Les améliorations de référencement doivent être observées avec des données, pas supposées. |

## Règles éditoriales

Le référencement d’Idealy doit venir de pages utiles, lisibles et honnêtes : à qui le produit s’adresse, ce qu’il permet réellement, ses limites et la documentation de ses fonctions. Il ne faut pas faire de bourrage de mots-clés, promettre des connecteurs non activés ou écrire que les agents publient automatiquement des applications. Google recommande un contenu utile et centré sur l’utilisateur, ainsi que des titres et descriptions précis. [2]

## Limites actuelles

La propriété Search Console n’est pas créée dans cette itération et aucun sitemap n’est soumis, car les accès au compte Google ne sont pas disponibles. La landing canonique `/welcome` est maintenant publique et indexable ; `/` reste l’espace authentifié et redirige vers la connexion. Quand le domaine propre sera prêt, `NEXT_PUBLIC_SITE_URL` devra être remplacé et les pages publiques devront être contrôlées à nouveau.

## Références

[1]: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap "Google Search Central — Build and submit a sitemap"
[2]: https://developers.google.com/search/docs/fundamentals/seo-starter-guide "Google Search Central — SEO Starter Guide"
[3]: https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl "Google Search Central — Ask Google to recrawl URLs"
