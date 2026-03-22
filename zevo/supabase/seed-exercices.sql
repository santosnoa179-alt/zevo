-- ============================================================
-- ZEVO — Seed : 55 exercices standards (coach_id = NULL)
-- Colle dans Supabase Studio > SQL Editor > New query
-- À exécuter APRÈS schema-exercices-catalogue.sql
-- ============================================================

INSERT INTO exercices (coach_id, nom, description, muscle_group, equipment, category, muscles) VALUES

-- ═══════════════════════════════════
-- PECTORAUX (8 exercices)
-- ═══════════════════════════════════
(NULL, 'Développé couché', 'Allongé sur un banc plat, pieds au sol. Saisir la barre à largeur d''épaules. Descendre la barre vers le milieu de la poitrine en contrôlant la phase excentrique, puis pousser vers le haut jusqu''à l''extension complète des bras. Garder les omoplates serrées et le dos légèrement cambré.', 'Pectoraux', 'Barre + Banc', 'Musculation', ARRAY['Pectoraux', 'Triceps', 'Deltoïdes ant.']),

(NULL, 'Développé incliné haltères', 'Sur un banc incliné à 30-45°, un haltère dans chaque main au niveau des épaules. Pousser les haltères vers le haut en les rapprochant légèrement, puis redescendre en contrôlant. Cible la portion claviculaire du grand pectoral.', 'Pectoraux', 'Haltères + Banc', 'Musculation', ARRAY['Pectoraux (haut)', 'Triceps', 'Deltoïdes ant.']),

(NULL, 'Pompes', 'En position de planche, mains légèrement plus larges que les épaules. Descendre le corps en fléchissant les coudes jusqu''à ce que la poitrine frôle le sol. Pousser vers le haut pour revenir en position initiale. Garder le corps gainé et aligné tout au long du mouvement.', 'Pectoraux', 'Poids du corps', 'Musculation', ARRAY['Pectoraux', 'Triceps', 'Deltoïdes ant.']),

(NULL, 'Écarté couché haltères', 'Allongé sur banc plat, bras tendus au-dessus de la poitrine, paumes face à face. Ouvrir les bras en arc de cercle en gardant une légère flexion des coudes, jusqu''à sentir un étirement des pectoraux. Remonter en contractant la poitrine.', 'Pectoraux', 'Haltères + Banc', 'Musculation', ARRAY['Pectoraux', 'Deltoïdes ant.']),

(NULL, 'Dips (pectoraux)', 'Sur des barres parallèles, se pencher légèrement vers l''avant. Descendre en fléchissant les coudes jusqu''à un angle de 90° environ. Pousser pour remonter en contractant les pectoraux. L''inclinaison vers l''avant cible davantage les pectoraux que les triceps.', 'Pectoraux', 'Barres parallèles', 'Musculation', ARRAY['Pectoraux', 'Triceps', 'Deltoïdes ant.']),

(NULL, 'Pec deck (butterfly)', 'Assis à la machine, dos bien calé, avant-bras contre les coussins. Rapprocher les bras devant soi en contractant les pectoraux, maintenir la contraction 1 seconde, puis relâcher lentement. Mouvement d''isolation pur pour les pectoraux.', 'Pectoraux', 'Machine', 'Musculation', ARRAY['Pectoraux']),

(NULL, 'Développé couché prise serrée', 'Même position que le développé couché classique, mais avec une prise plus serrée (mains à largeur des épaules). Descendre la barre vers le bas de la poitrine, puis pousser. Cible principalement les triceps et la portion interne des pectoraux.', 'Pectoraux', 'Barre + Banc', 'Musculation', ARRAY['Triceps', 'Pectoraux (int.)']),

(NULL, 'Crossover câble', 'Debout entre deux poulies hautes, saisir les poignées. Tirer les câbles vers le bas et vers l''avant en arc de cercle, en croisant légèrement les mains devant le corps. Contrôler la remontée. Excellent pour l''isolation et la congestion musculaire.', 'Pectoraux', 'Câble', 'Musculation', ARRAY['Pectoraux', 'Deltoïdes ant.']),

-- ═══════════════════════════════════
-- DOS (8 exercices)
-- ═══════════════════════════════════
(NULL, 'Traction pronation', 'Suspendu à la barre, prise pronation à largeur d''épaules ou plus large. Tirer le corps vers le haut en contractant le dos jusqu''à ce que le menton dépasse la barre. Redescendre lentement en contrôlant le mouvement. Éviter de se balancer.', 'Dos', 'Barre de traction', 'Musculation', ARRAY['Grand dorsal', 'Biceps', 'Trapèzes']),

(NULL, 'Traction supination', 'Suspendu à la barre, prise supination (paumes vers soi) à largeur d''épaules. Tirer le corps vers le haut en serrant les omoplates. Variante qui sollicite davantage les biceps et la partie basse du grand dorsal.', 'Dos', 'Barre de traction', 'Musculation', ARRAY['Grand dorsal', 'Biceps', 'Rhomboïdes']),

(NULL, 'Rowing barre', 'Penché en avant à 45°, dos droit, saisir la barre en pronation. Tirer la barre vers le nombril en serrant les omoplates, puis redescendre lentement. Mouvement fondamental pour l''épaisseur du dos.', 'Dos', 'Barre', 'Musculation', ARRAY['Grand dorsal', 'Trapèzes', 'Rhomboïdes', 'Biceps']),

(NULL, 'Rowing haltère unilatéral', 'Un genou et une main sur le banc, l''autre pied au sol. Tirer l''haltère vers la hanche en gardant le coude près du corps. Serrer l''omoplate en haut du mouvement. Permet de corriger les déséquilibres musculaires.', 'Dos', 'Haltère + Banc', 'Musculation', ARRAY['Grand dorsal', 'Rhomboïdes', 'Biceps']),

(NULL, 'Tirage poulie haute', 'Assis à la poulie haute, saisir la barre large en pronation. Tirer la barre vers le haut de la poitrine en ouvrant la cage thoracique et en serrant les omoplates. Remonter lentement en gardant la tension.', 'Dos', 'Câble', 'Musculation', ARRAY['Grand dorsal', 'Trapèzes', 'Biceps']),

(NULL, 'Tirage poulie basse', 'Assis face à la poulie basse, pieds calés, buste droit. Tirer la poignée vers l''abdomen en serrant les omoplates, coudes le long du corps. Revenir lentement en étirant le dos. Excellent pour l''épaisseur du dos.', 'Dos', 'Câble', 'Musculation', ARRAY['Rhomboïdes', 'Trapèzes', 'Grand dorsal']),

(NULL, 'Soulevé de terre', 'Pieds sous la barre, écartés à largeur de hanches. Saisir la barre, dos droit, poitrine haute. Pousser dans les talons pour se relever en gardant la barre contre le corps. Mouvement poly-articulaire roi pour le dos et les jambes.', 'Dos', 'Barre', 'Musculation', ARRAY['Érecteurs du rachis', 'Grand dorsal', 'Fessiers', 'Ischio-jambiers']),

(NULL, 'Pull-over haltère', 'Allongé perpendiculairement sur un banc, un haltère tenu à deux mains au-dessus de la poitrine. Descendre l''haltère derrière la tête en gardant les bras quasi tendus, puis remonter en contractant le grand dorsal et les pectoraux.', 'Dos', 'Haltère + Banc', 'Musculation', ARRAY['Grand dorsal', 'Pectoraux', 'Dentelé ant.']),

-- ═══════════════════════════════════
-- JAMBES (10 exercices)
-- ═══════════════════════════════════
(NULL, 'Squat barre', 'Debout, pieds écartés à largeur d''épaules, barre sur les trapèzes. Fléchir les genoux en poussant les hanches vers l''arrière. Descendre jusqu''à ce que les cuisses soient parallèles au sol, puis remonter en poussant sur les talons. Garder le dos droit et le regard devant.', 'Jambes', 'Barre', 'Musculation', ARRAY['Quadriceps', 'Fessiers', 'Ischio-jambiers']),

(NULL, 'Squat gobelet', 'Debout, tenir un haltère ou kettlebell contre la poitrine. Descendre en squat profond en gardant le buste droit et les coudes entre les genoux. Remonter en poussant dans les talons. Idéal pour les débutants et le travail de mobilité.', 'Jambes', 'Haltère', 'Musculation', ARRAY['Quadriceps', 'Fessiers']),

(NULL, 'Fentes marchées', 'Debout, faire un grand pas en avant et fléchir les deux genoux à 90°. Le genou arrière frôle le sol. Pousser sur le pied avant pour ramener le pied arrière en avant et enchaîner de l''autre côté. Alterner en avançant.', 'Jambes', 'Haltères', 'Musculation', ARRAY['Quadriceps', 'Fessiers', 'Ischio-jambiers']),

(NULL, 'Presse à cuisses', 'Assis sur la presse, pieds à largeur d''épaules sur la plateforme. Descendre la plateforme en fléchissant les genoux à 90°, puis pousser pour remonter sans verrouiller les genoux. Placer les pieds plus haut pour cibler les fessiers.', 'Jambes', 'Machine', 'Musculation', ARRAY['Quadriceps', 'Fessiers', 'Ischio-jambiers']),

(NULL, 'Leg extension', 'Assis à la machine, chevilles sous le coussin. Étendre les jambes complètement en contractant les quadriceps, maintenir la contraction 1 seconde, puis redescendre lentement. Mouvement d''isolation pour les quadriceps.', 'Jambes', 'Machine', 'Musculation', ARRAY['Quadriceps']),

(NULL, 'Leg curl allongé', 'Allongé face contre le banc, chevilles sous le coussin. Fléchir les genoux en tirant les talons vers les fessiers. Contracter les ischio-jambiers en haut du mouvement puis relâcher lentement.', 'Jambes', 'Machine', 'Musculation', ARRAY['Ischio-jambiers']),

(NULL, 'Hip thrust', 'Dos appuyé sur un banc, barre sur les hanches (avec protection). Pieds au sol à largeur de hanches. Pousser les hanches vers le haut en contractant les fessiers jusqu''à l''alignement épaules-hanches-genoux. Redescendre lentement.', 'Jambes', 'Barre + Banc', 'Musculation', ARRAY['Fessiers', 'Ischio-jambiers']),

(NULL, 'Squat bulgare', 'Debout, un pied posé sur un banc derrière soi. Descendre en fléchissant le genou avant à 90° tout en gardant le buste droit. Remonter en poussant dans le talon avant. Excellent pour la stabilité et les fessiers.', 'Jambes', 'Haltères + Banc', 'Musculation', ARRAY['Quadriceps', 'Fessiers']),

(NULL, 'Mollets debout', 'Debout sur une marche ou une cale, talons dans le vide. Monter sur la pointe des pieds en contractant les mollets, maintenir 1 seconde en haut, puis descendre lentement en étirant. Ajouter du poids si nécessaire.', 'Jambes', 'Machine', 'Musculation', ARRAY['Mollets (gastrocnémien)']),

(NULL, 'Fentes latérales', 'Debout, pieds joints. Faire un grand pas latéral en fléchissant le genou de la jambe d''appui tout en gardant l''autre jambe tendue. Pousser pour revenir en position initiale. Travaille les adducteurs et les fessiers.', 'Jambes', 'Poids du corps', 'Musculation', ARRAY['Adducteurs', 'Fessiers', 'Quadriceps']),

-- ═══════════════════════════════════
-- ÉPAULES (7 exercices)
-- ═══════════════════════════════════
(NULL, 'Développé militaire', 'Debout ou assis, barre au niveau des clavicules. Pousser la barre au-dessus de la tête jusqu''à l''extension complète des bras. Redescendre devant le visage jusqu''aux clavicules. Garder le tronc gainé pour protéger le dos.', 'Épaules', 'Barre', 'Musculation', ARRAY['Deltoïdes', 'Triceps', 'Trapèzes']),

(NULL, 'Développé haltères assis', 'Assis sur un banc à 90°, un haltère dans chaque main au niveau des oreilles. Pousser les haltères vers le haut en les rapprochant, puis redescendre lentement. Le dossier protège le bas du dos.', 'Épaules', 'Haltères + Banc', 'Musculation', ARRAY['Deltoïdes', 'Triceps']),

(NULL, 'Élévations latérales', 'Debout, un haltère dans chaque main le long du corps. Lever les bras sur les côtés jusqu''à l''horizontale, coudes légèrement fléchis. Maintenir 1 seconde puis redescendre lentement. Ne pas balancer le corps.', 'Épaules', 'Haltères', 'Musculation', ARRAY['Deltoïdes (latéral)']),

(NULL, 'Élévations frontales', 'Debout, haltères devant les cuisses. Lever un bras ou les deux devant soi jusqu''à l''horizontale, bras quasi tendus. Redescendre lentement. Alterner ou faire les deux bras simultanément.', 'Épaules', 'Haltères', 'Musculation', ARRAY['Deltoïdes (ant.)']),

(NULL, 'Oiseau (rear delt fly)', 'Penché en avant, buste quasi parallèle au sol. Ouvrir les bras sur les côtés avec les haltères en gardant une légère flexion des coudes. Serrer les omoplates en haut. Cible le faisceau postérieur des deltoïdes.', 'Épaules', 'Haltères', 'Musculation', ARRAY['Deltoïdes (post.)', 'Trapèzes', 'Rhomboïdes']),

(NULL, 'Shrug (haussements d''épaules)', 'Debout, haltères ou barre dans les mains, bras le long du corps. Monter les épaules vers les oreilles en contractant les trapèzes. Maintenir 2 secondes en haut, puis relâcher lentement.', 'Épaules', 'Haltères', 'Musculation', ARRAY['Trapèzes']),

(NULL, 'Face pull', 'À la poulie haute avec une corde. Tirer la corde vers le visage en ouvrant les coudes vers l''extérieur. Serrer les omoplates et maintenir la contraction. Exercice essentiel pour la santé des épaules et la posture.', 'Épaules', 'Câble', 'Musculation', ARRAY['Deltoïdes (post.)', 'Trapèzes', 'Rotateurs ext.']),

-- ═══════════════════════════════════
-- BICEPS (5 exercices)
-- ═══════════════════════════════════
(NULL, 'Curl biceps barre', 'Debout, barre en supination. Fléchir les coudes en montant la barre vers les épaules sans bouger les coudes. Contracter en haut, redescendre lentement. Mouvement de base pour la masse des biceps.', 'Biceps', 'Barre', 'Musculation', ARRAY['Biceps', 'Brachial ant.']),

(NULL, 'Curl haltères alternés', 'Debout, un haltère dans chaque main, bras le long du corps, paumes vers l''avant. Fléchir un coude en montant l''haltère vers l''épaule. Contracter le biceps en haut du mouvement, puis redescendre lentement. Alterner.', 'Biceps', 'Haltères', 'Musculation', ARRAY['Biceps', 'Brachial ant.']),

(NULL, 'Curl marteau', 'Debout, haltères tenus en prise neutre (paumes face à face). Fléchir les coudes en montant les haltères vers les épaules. Cible le brachial et le brachio-radial pour des bras plus épais.', 'Biceps', 'Haltères', 'Musculation', ARRAY['Brachial ant.', 'Brachio-radial', 'Biceps']),

(NULL, 'Curl concentré', 'Assis, coude appuyé contre l''intérieur de la cuisse. Fléchir le coude en montant l''haltère vers l''épaule en supination. Contracter fortement le biceps au sommet. Mouvement d''isolation pur.', 'Biceps', 'Haltère', 'Musculation', ARRAY['Biceps']),

(NULL, 'Curl poulie basse', 'Face à la poulie basse, barre droite ou corde. Fléchir les coudes en montant les mains vers les épaules. La tension constante du câble maximise le travail musculaire sur toute l''amplitude.', 'Biceps', 'Câble', 'Musculation', ARRAY['Biceps', 'Brachial ant.']),

-- ═══════════════════════════════════
-- TRICEPS (5 exercices)
-- ═══════════════════════════════════
(NULL, 'Extension triceps poulie haute', 'Face à la poulie haute, saisir la barre ou la corde. Pousser vers le bas en gardant les coudes collés au corps jusqu''à l''extension complète. Remonter lentement. Mouvement d''isolation fondamental pour les triceps.', 'Triceps', 'Câble', 'Musculation', ARRAY['Triceps']),

(NULL, 'Dips (triceps)', 'Sur des barres parallèles, buste droit (sans se pencher en avant). Descendre en fléchissant les coudes jusqu''à 90° puis pousser pour remonter. Position verticale pour cibler les triceps.', 'Triceps', 'Barres parallèles', 'Musculation', ARRAY['Triceps', 'Deltoïdes ant.']),

(NULL, 'Barre au front (skull crusher)', 'Allongé sur banc, barre tenue bras tendus au-dessus du front. Fléchir les coudes pour descendre la barre vers le front, puis étendre les bras pour remonter. Garder les coudes fixes et pointés vers le plafond.', 'Triceps', 'Barre + Banc', 'Musculation', ARRAY['Triceps']),

(NULL, 'Extension haltère au-dessus de la tête', 'Debout ou assis, un haltère tenu à deux mains derrière la tête. Étendre les bras vers le haut jusqu''à l''extension complète, puis redescendre lentement derrière la nuque. Garder les coudes proches de la tête.', 'Triceps', 'Haltère', 'Musculation', ARRAY['Triceps (longue portion)']),

(NULL, 'Kickback triceps', 'Penché en avant, un bras en appui sur le banc. Coude fléchi à 90° le long du corps, étendre l''avant-bras vers l''arrière en contractant le triceps. Maintenir la contraction en extension complète, puis revenir.', 'Triceps', 'Haltère', 'Musculation', ARRAY['Triceps']),

-- ═══════════════════════════════════
-- ABDOMINAUX (5 exercices)
-- ═══════════════════════════════════
(NULL, 'Crunch', 'Allongé sur le dos, genoux fléchis, mains derrière la tête. Enrouler le buste en décollant les omoplates du sol. Contracter les abdominaux en haut puis redescendre lentement. Ne pas tirer sur la nuque.', 'Abdominaux', 'Poids du corps', 'Musculation', ARRAY['Grand droit', 'Obliques']),

(NULL, 'Planche (gainage)', 'En appui sur les avant-bras et la pointe des pieds, corps parfaitement aligné. Contracter les abdominaux et les fessiers. Maintenir la position le plus longtemps possible sans creuser ni arrondir le dos.', 'Abdominaux', 'Poids du corps', 'Fonctionnel', ARRAY['Transverse', 'Grand droit', 'Obliques']),

(NULL, 'Relevé de jambes suspendu', 'Suspendu à la barre, lever les jambes tendues ou genoux fléchis jusqu''à l''horizontale ou plus haut. Contrôler la descente sans balancer le corps. Exercice avancé pour les abdominaux inférieurs.', 'Abdominaux', 'Barre de traction', 'Musculation', ARRAY['Grand droit (bas)', 'Psoas-iliaque']),

(NULL, 'Russian twist', 'Assis au sol, genoux fléchis, pieds décollés ou posés. Tenir un poids devant soi et tourner le buste alternativement à droite et à gauche. Garder le dos droit et les abdominaux engagés.', 'Abdominaux', 'Haltère', 'Musculation', ARRAY['Obliques', 'Grand droit']),

(NULL, 'Mountain climbers', 'En position de planche haute. Ramener alternativement les genoux vers la poitrine à un rythme rapide, comme en sprint. Garder les hanches basses et le corps gainé. Combine gainage et cardio.', 'Abdominaux', 'Poids du corps', 'Cardio', ARRAY['Grand droit', 'Obliques', 'Psoas-iliaque']),

-- ═══════════════════════════════════
-- CARDIO (4 exercices)
-- ═══════════════════════════════════
(NULL, 'Burpees', 'Debout, descendre en squat, poser les mains au sol, sauter les pieds en arrière en position de planche, faire une pompe, ramener les pieds vers les mains, sauter en l''air bras levés. Enchaîner fluidement.', 'Cardio', 'Poids du corps', 'Cardio', ARRAY['Full body']),

(NULL, 'Jumping jacks', 'Debout, pieds joints, bras le long du corps. Sauter en écartant les pieds et en levant les bras au-dessus de la tête. Sauter à nouveau pour revenir en position initiale. Rythme rapide et régulier.', 'Cardio', 'Poids du corps', 'Cardio', ARRAY['Full body']),

(NULL, 'Corde à sauter', 'Sauter à pieds joints ou en alternant les pieds, poignets souples pour faire tourner la corde. Garder les sauts bas et le regard devant. Excellent pour l''endurance cardiovasculaire et la coordination.', 'Cardio', 'Corde à sauter', 'Cardio', ARRAY['Mollets', 'Full body']),

(NULL, 'Sprint sur place (high knees)', 'Courir sur place en montant les genoux le plus haut possible à chaque foulée. Bras en mouvement de course. Maintenir un rythme élevé. Excellent pour la fréquence cardiaque et la puissance des jambes.', 'Cardio', 'Poids du corps', 'Cardio', ARRAY['Quadriceps', 'Psoas-iliaque', 'Mollets']),

-- ═══════════════════════════════════
-- SOUPLESSE / MOBILITÉ (3 exercices)
-- ═══════════════════════════════════
(NULL, 'Étirement quadriceps debout', 'Debout, saisir la cheville d''une jambe derrière soi et tirer le talon vers le fessier. Garder les genoux joints et le buste droit. Maintenir 30 secondes de chaque côté. Améliore la souplesse de l''avant de la cuisse.', 'Souplesse', 'Poids du corps', 'Souplesse', ARRAY['Quadriceps', 'Psoas-iliaque']),

(NULL, 'Étirement ischio-jambiers', 'Assis au sol, une jambe tendue devant soi, l''autre fléchie. Se pencher en avant en gardant le dos droit pour attraper la pointe du pied. Maintenir 30 secondes. Alterner.', 'Souplesse', 'Poids du corps', 'Souplesse', ARRAY['Ischio-jambiers']),

(NULL, 'Rotation thoracique au sol', 'Allongé sur le côté, genoux fléchis. Ouvrir le bras supérieur en rotation vers l''arrière, en suivant la main du regard. Revenir lentement. 10 répétitions de chaque côté. Améliore la mobilité de la colonne thoracique.', 'Souplesse', 'Poids du corps', 'Souplesse', ARRAY['Colonne thoracique', 'Obliques'])

ON CONFLICT DO NOTHING;
