# Vérification visuelle V2 — 17 août 2026

La route `/v2` compile et se charge sur la preview locale. L’état vide affiche une sidebar sombre avec bouton « Nouvelle mission », historique vide, footer « Profil local » avec paramètres, ainsi qu’un bouton « Se connecter » non bloquant.

Le menu de la pièce jointe est bien accessible depuis le compositeur et expose les trois choix attendus : « Importer depuis l’ordinateur », « Connecter un service » et « Ajouter un plugin ». Le micro est affiché à droite, à proximité du bouton d’envoi.

La vérification du Canvas après lancement d’une mission reste à effectuer, notamment le handle de redimensionnement et le fonctionnement des onglets Code / Preview / Terminal.

Le build V2 produit `IdealyV2Page` à 27,22 kB brut / 7,64 kB gzip et conserve `WorkspacePage` à 179,71 kB brut / 55,27 kB gzip.


Après lancement de la mission pizzeria, le Canvas apparaît en deux colonnes. Le handle vertical est visible entre la conversation et le Canvas. Les onglets sont fonctionnels : en sélectionnant « Code », la surface `src/App.tsx` et son contenu de démonstration apparaissent, y compris avant toute connexion backend. Le texte « Idealy travaille avec toi » est encore présent et doit être remplacé par une formulation plus naturelle.

Le build final recharge correctement l’état vide : le header est bien structuré, le libellé de mission ne déborde pas et la sidebar se replie en rail de 68 px via le bouton desktop, avec le compositeur qui récupère l’espace central. Aucun backend ni secret n’a été touché.
