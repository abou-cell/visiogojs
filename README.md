# FlowChart AI Validator

Application Angular de validation humaine des flowcharts PDF / JSON GoJS. Design bleu et clair, trois panneaux PDF / GoJS / JSON, inspecteurs d'écarts et d'éléments.

## Démarrer

Prérequis : Node.js 24 LTS et npm.

```bash
git clone https://github.com/abou-cell/visiogojs.git
cd visiogojs/frontend
npm ci
npm start
```

Ouvrir http://localhost:4200. Cliquer sur **Charger l'exemple** pour démarrer avec un vrai PDF généré localement et son JSON. Le texte du nœud N17 contient volontairement une erreur OCR.

## Fonctionnalités

- Import multiple PDF / JSON ou dossier ; jusqu'à 50 documents, 50 Mo par fichier ; association par nom et réassociation manuelle.
- Validation des tableaux GoJS, des clés et des extrémités des liens. Les importations invalides remontent une erreur sans remplacer un original existant.
- PDF.js : rendu canvas, pages, zoom, rotation, ajustement à la largeur et plein écran.
- GoJS : diagramme interactif, nœuds, liens, zoom, sélection, déplacement, identifiants, surlignage d'écarts, annuler/rétablir.
- CodeMirror : coloration JSON, numéros de lignes, recherche, formater/minifier, copier, édition et application explicite.
- Sélection synchronisée JSON / GoJS ; inspecteur des propriétés.
- Vues trois panneaux, comparaison PDF / GoJS, JSON / GoJS ; largeur PDF et hauteur de la zone de travail ajustables sur desktop.
- Validation manuelle valide / partiel / invalide / à revoir ; classement des anomalies OCR, nœuds, liens, géométrie, structure.
- Corrections appliquées au JSON corrigé avec auteur, date, version et historique. La prédiction originale et son texte brut sont conservés.
- Comparaison automatique **avec un JSON de référence annoté**, par clés stables ; scores explicites par famille lorsqu'une référence existe.
- Rapports PDF / JSON individuels ; archive ZIP batch avec rapports individuels et résumé CSV / JSON.
- Export d'apprentissage JSON / JSONL / CSV ; ZIP complet avec PDF, prédictions, corrections, rapports et révisions.
- Sauvegarde persistante locale dans IndexedDB ; rechargement du projet à la prochaine ouverture du même navigateur.

## Parcours recommandé

1. Importer les fichiers nommés `diagram_001.pdf` et `diagram_001.json`.
2. Ouvrir le Workspace et comparer visuellement le PDF et le diagramme.
3. Sélectionner un objet, puis **Ajouter un écart** ; saisir la catégorie, la propriété, la valeur attendue et la page PDF.
4. Cocher **Appliquer la correction et la valider pour le dataset**.
5. Si un JSON de référence validé existe, le charger puis lancer **Comparer à la référence**.
6. Traiter les écarts, marquer le document valide et exporter ses rapports.
7. Exporter régulièrement le dataset ZIP pour conserver les fichiers hors du navigateur.

## Périmètre et limites explicites

Cette version est une application locale utilisable, sans compte ni serveur. Les données ne sont pas envoyées sur GitHub ou à un modèle. Aucun moteur OCR, alignement automatique PDF/GoJS, authentification multi-utilisateur ou réentraînement ML n'est connecté : le backend FastAPI reste une extension future, comme prévu au cahier des charges. La comparaison du PDF est humaine, et aucun faux score n'est calculé à partir d'une simple visualisation.

- Les scores nécessitent un JSON de référence avec les mêmes identifiants stables. Ils portent sur la prédiction initiale, et ne représentent pas la confiance OCR.
- Les coordonnées exportées sont celles de GoJS ; elles ne sont pas des pixels PDF tant qu'un alignement explicite n'est pas fourni.
- Les rapports PDF incluent la page 1 du document et les diagrammes prédit/corrigé. Les annotations gardent leur numéro de page ; l'archive complète garde le PDF entier.
- Le rapport PDF utilise la police standard jsPDF : pour des textes CJK/arabes, ajouter une police Unicode embarquée avant usage en production. JSON/JSONL préservent Unicode.
- Le stockage dépend du quota du navigateur. Effacer les données du site efface le projet local. Export ZIP recommandé pour l'archivage ; la restauration d'une archive ZIP complète n'est pas encore prise en charge (PDF et JSON peuvent être réimportés).
- Les catégories GoJS personnalisées utilisent un rendu générique, sauf les décisions et terminators. Les propriétés personnalisées sont conservées. Les modèles avec des noms de propriétés de clés autres que `key/from/to` doivent être convertis avant import.

## Licence GoJS

GoJS est commercial. Sans clé, le diagramme fonctionne en évaluation avec le filigrane de Northwoods. Une clé acquise auprès de Northwoods peut être renseignée dans **Paramètres**, puis recharger la page. Le filigrane n'est pas supprimé par le code.

[Documentation officielle GoJS et licence](https://gojs.net/latest/learn/deployment)

## Tests et production

```bash
cd frontend
npm test
npm run build
npx playwright install --with-deps chromium
npm run e2e
```

Le build statique se trouve dans `frontend/dist/validator/browser`. Le workflow CI installe les dépendances verrouillées, exécute les tests métier, compile puis exécute les tests navigateur. Il conserve le build et les résultats de tests comme artifacts GitHub Actions.

Pour héberger sous un sous-chemin : `npm run build -- --base-href /visiogojs/`. Aucun déploiement public automatique n'est activé.

## Organisation

- `frontend/src/app/domain.ts` : modèles, validation, différences, application des corrections, métriques et dataset.
- `frontend/src/app/store.ts` : sauvegarde IndexedDB et appariement de fichiers.
- `frontend/src/app/components/` : GoJS, CodeMirror, PDF.js.
- `frontend/src/app/exports.ts` : PDF, ZIP, JSON et CSV.
- `frontend/src/app/app.*` : navigation et écrans.
- `docs/` : architecture, formats et notes de validation.
- `samples/json/` : prédiction et vérité terrain du scénario de démonstration.

Références techniques : [Angular](https://angular.dev/installation), [GoJS GraphLinksModel](https://gojs.net/latest/api/symbols/GraphLinksModel.html), [PDF.js](https://mozilla.github.io/pdf.js/examples/).
