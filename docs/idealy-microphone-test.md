# Test de la fonctionnalité microphone

Date : 2026-08-19
Branche : `feat/idealy-v2-shell`

## Smoke test initial

La route locale `/design-mockup?mic-test=1` se rend correctement après le patch. L’accueil affiche le sélecteur de langue `FR`, le Composer et le bouton microphone `Dicter une idée`. La console ne montre pas d’erreur JavaScript bloquante ; seuls les avertissements attendus de configuration Supabase locale manquante apparaissent.

Les tests d’interaction et la compilation restent à compléter avant le commit.

## Sélecteur de langue

Le menu de langue s’ouvre avec trois options `Français`, `English` et `Español`. La sélection `English` change le code visible en `EN` et le placeholder du Composer en anglais. Les autres textes de la maquette restent volontairement en français : la localisation complète de toute l’interface n’est pas incluse dans cette fonctionnalité microphone.

## Activation du microphone d’accueil

Le clic sur `Dicter une idée` affiche le toast `Microphone listening…` et active le cycle d’écoute. Dans l’environnement navigateur de test, Web Speech n’a pas produit de résultat et le fallback simulé s’est terminé proprement après son délai, sans erreur console visible. Le rendu revient ensuite à l’état initial. La validation détaillée des barres de niveau nécessite un navigateur qui conserve le mode simulé assez longtemps ou un test unitaire du timer ; le build et le typecheck sont déjà verts.

Le scénario pizzeria préremplit correctement le Composer puis ouvre l’onboarding en trois étapes. Cette transition n’a pas laissé le microphone actif et ne produit pas d’erreur visible.

Le parcours d’onboarding reste fonctionnel après l’ajout du microphone : la voie Ninja est sélectionnable et l’étape 2/3 s’ouvre normalement.

Le nom Amina est accepté et l’étape 3/3 s’ouvre sans régression. Le microphone n’est pas sollicité pendant l’onboarding.

Les choix `Moi seul` et `Fondateur ou dirigeant` sont correctement mémorisés dans l’étape 3/3. Le test utilise uniquement des valeurs fictives.

Le workspace s’ouvre avec le bouton `Dicter la mission`. Lors du premier essai dans Chromium, la Web Speech API a signalé une erreur de reconnaissance. Le code a ensuite été ajusté pour basculer automatiquement vers la simulation locale au lieu de laisser l’utilisateur avec une erreur seule.

## Fallback simulé validé

Après le correctif, l’activation du microphone affiche `Écoute active…`, une bordure lumineuse, un point rouge et des barres de niveau animées. Le textarea reçoit progressivement `Une interface simple, élégante et publiable.`. Après la fin du timer, le texte reste éditable et le feedback disparaît proprement. Le navigateur de test ayant renvoyé une erreur Web Speech, ce comportement confirme le fallback gratuit et local.

## Accessibilité DOM

Le bouton vocal de l’accueil expose bien `aria-label="Dicter une idée"`, `title="Dicter"`, `aria-pressed="false"` et reste activé hors phase occupée. Le bouton du workspace est configuré séparément avec `aria-label="Dicter la mission"`, `title="Dicter"` et `disabled` pendant `thinking` ou `building`.

## Test direct dans l’environnement Manus

Le test a été exécuté directement sur `http://127.0.0.1:3000/design-mockup?mic-test=1`. Le bouton `Dicter une idée` active bien le feedback vocal, affiche `Écoute active…` et le message de fallback. Après quelques instants, le textarea contient la phrase complète `Une interface simple, élégante et publiable.` et l’animation disparaît proprement. Le fallback local fonctionne donc ici.

Le vrai accès à un microphone physique ne peut pas être validé dans cet environnement sandbox ; le navigateur local a correctement utilisé le comportement prévu quand Web Speech n’est pas disponible ou renvoie une erreur.
