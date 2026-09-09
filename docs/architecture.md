# Architecture et contrat de données

## Application

Angular standalone, TypeScript strict, changement de vue côté client. Aucun appel serveur métier. Les dépendances sont embarquées dans le build, y compris le worker PDF.js ; aucun CDN n'est requis à l'exécution.

`AppComponent` coordonne les services et composants. `Store` encapsule IndexedDB. `domain.ts` est indépendant d'Angular et testable sous Node. Les trois visualiseurs sont séparés de la persistance. Un backend futur pourra remplacer le stockage par des méthodes asynchrones équivalentes sans changer les règles de correction.

## Documents

Chaque document possède un UUID, un nom d'association, un PDF Blob, un JSON brut, une prédiction originale normalisée, un JSON corrigé, une référence optionnelle et des révisions immuables. Les fichiers JSON originaux déjà présents ne sont jamais remplacés lors d'un nouvel import. Un nouvel import doit utiliser un autre nom s'il représente une nouvelle prédiction.

Le modèle accepté est `GraphLinksModel`, `nodeDataArray`, `linkDataArray`. Clés string/number distinctes et uniques. Les liens sans clé obtiennent `link-1`, `link-2`, etc. Pour comparer des liens de versions différentes, fournir des clés explicites stables ; sinon une réorganisation des tableaux change leur identité.

Les groupes GoJS et les attributs personnalisés sont conservés. Les diagrammes sans coordonnées utilisent un placement LayeredDigraphLayout ; un diagramme possédant toutes ses positions ne reçoit pas de mise en page automatique.

## Corrections

Une différence comprend : document, page, ID et type d'objet, catégorie, type d'erreur, propriété, valeur détectée et attendue, confiance optionnelle, commentaire, auteur et date de validation.

Les ajouts/suppressions d'objets utilisent la propriété `$object` et une valeur attendue sous forme d'objet JSON complet pour l'ajout. Supprimer un nœud supprime aussi ses liens incidents. Une modification de lien doit conserver des extrémités existantes. La mise à jour est validée avant sauvegarde.

Un changement remet le document à « à revoir ». Marquer « valide » exige un PDF, un JSON et aucun écart ouvert. Les révisions précédentes restent disponibles ; restaurer crée une nouvelle révision.

## Métriques

Les métriques comparent la prédiction originale à une référence JSON. Le dénominateur est l'union des identifiants typés prédits et attendus ; objets absents et supplémentaires diminuent le score. Une famille vide renvoie null.

- Nœuds : égalité des champs category et figure.
- Liens : égalité from/to.
- Texte : égalité exacte du texte des nœuds.
- Géométrie : égalité loc/size/angle.

Ce sont des métriques exact-match, pas un calcul CER/WER, pas une IoU et pas une moyenne de confiance. Il n'existe pas de score global arbitraire.

## Extensions prévues

Pour connecter FastAPI : prévoir un stockage distant des documents et versions, upload signé des PDF, API de prédiction avec version du modèle, schéma de bounding boxes et transformation coordonnées PDF/GoJS, tâches batch asynchrones, puis authentification et contrôle des accès. Un moteur OCR constitue une phase distincte et doit être évalué sur des documents tenus à l'écart de l'entraînement.
