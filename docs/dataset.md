# Export ML v1

JSON, JSONL et CSV exportent uniquement les annotations avec `validated_by_human: true`. Les champs incluent `schema_version`, `sample_id`, `document_id`, `page`, `element_id`, `element_type`, `error_category`, `error_type`, `property`, `predicted_value`, `expected_value`, `confidence`, `validated_by`, `validated_at`, `model_version`, `dataset_version`, `prediction_version`, `validation_version`, `coordinate_system` et un `delta` lorsqu'il est applicable.

La confiance non fournie est `null`, jamais estimée. Les corrections de position `loc` fournissent un delta x/y en coordonnées GoJS. La relation avec la page PDF est descriptive, sans matrice de transformation implicite.

L'archive ZIP contient un dossier par UUID de document, un manifeste et les exemples JSONL. La répartition déterministe hashée (~70/15/15) garde un document entier dans un seul split. Elle n'est ni stratifiée ni garantie d'avoir exactement ces proportions, notamment sur de petits jeux de données.

Avant entraînement, vérifier : stabilité des identifiants, doublons de PDF entre documents, répartition par familles de flowcharts, qualité des annotations et cohérence du système de coordonnées. Le backend d'entraînement reste externe à cette application.

CSV : objets JSON encodés dans les cellules, guillemets/retours ligne échappés et formules spreadsheet neutralisées. Pour préserver les types et Unicode sans ambiguïté, préférer JSONL.
