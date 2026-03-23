-- ============================================================
-- ZEVO — Seed V2 : 70+ exercices en 6 catégories
-- coach_id = NULL → exercices Zevo visibles par tous les coachs
-- À exécuter APRÈS schema-exercices-images.sql
-- ============================================================

INSERT INTO exercices (coach_id, nom, description, muscle_group, equipment, category, muscles) VALUES

-- ═══════════════════════════════════
-- FORCE (15 exercices)
-- ═══════════════════════════════════
(NULL, 'Back Squat', 'Barre sur les trapèzes, pieds écartés largeur d''épaules. Descendre en fléchissant hanches et genoux jusqu''à ce que les cuisses soient parallèles au sol. Remonter en poussant sur les talons.', 'Jambes', 'Barre', 'Force', ARRAY['Quadriceps', 'Fessiers', 'Ischio-jambiers']),
(NULL, 'Front Squat', 'Barre en position frontale sur les deltoïdes. Descendre en gardant le buste droit et les coudes hauts. Excellent pour les quadriceps et le core.', 'Jambes', 'Barre', 'Force', ARRAY['Quadriceps', 'Core', 'Fessiers']),
(NULL, 'Soulevé de terre', 'Pieds sous la barre, prise à largeur d''épaules. Dos plat, pousser avec les jambes puis verrouiller les hanches en haut. Mouvement roi pour la chaîne postérieure.', 'Dos', 'Barre', 'Force', ARRAY['Ischio-jambiers', 'Fessiers', 'Lombaires', 'Trapèzes']),
(NULL, 'Soulevé de terre roumain', 'Jambes quasi-tendues, descendre la barre le long des cuisses en poussant les hanches vers l''arrière. Étirement intense des ischio-jambiers. Remonter en serrant les fessiers.', 'Jambes', 'Barre', 'Force', ARRAY['Ischio-jambiers', 'Fessiers', 'Lombaires']),
(NULL, 'Développé couché', 'Allongé sur banc plat, descendre la barre vers le milieu de la poitrine, pousser jusqu''à l''extension. Omoplates serrées, dos légèrement cambré.', 'Pectoraux', 'Barre + Banc', 'Force', ARRAY['Pectoraux', 'Triceps', 'Deltoïdes ant.']),
(NULL, 'Développé incliné', 'Sur banc incliné 30-45°, pousser la barre ou les haltères vers le haut. Cible la portion claviculaire du pectoral.', 'Pectoraux', 'Barre + Banc', 'Force', ARRAY['Pectoraux (haut)', 'Triceps', 'Deltoïdes ant.']),
(NULL, 'Développé militaire', 'Debout, barre au niveau des clavicules. Pousser vers le haut jusqu''à l''extension complète. Gainage du core essentiel. Roi des exercices d''épaules.', 'Épaules', 'Barre', 'Force', ARRAY['Deltoïdes', 'Triceps', 'Trapèzes']),
(NULL, 'Rowing barre', 'Penché à 45°, dos plat. Tirer la barre vers le nombril en serrant les omoplates. Contrôler la descente. Excellent pour l''épaisseur du dos.', 'Dos', 'Barre', 'Force', ARRAY['Grand dorsal', 'Rhomboïdes', 'Trapèzes', 'Biceps']),
(NULL, 'Hip Thrust', 'Dos contre un banc, barre sur les hanches. Pousser les hanches vers le haut en serrant les fessiers au sommet. Meilleur exercice pour l''activation des fessiers.', 'Jambes', 'Barre + Banc', 'Force', ARRAY['Fessiers', 'Ischio-jambiers']),
(NULL, 'Presse à cuisses', 'Assis sur la machine, pieds à largeur d''épaules sur la plateforme. Descendre en contrôlant puis pousser. Permet de charger lourd en sécurité.', 'Jambes', 'Machine', 'Force', ARRAY['Quadriceps', 'Fessiers']),
(NULL, 'Tirage vertical', 'Assis à la poulie haute, tirer la barre vers la poitrine en serrant les omoplates. Coudes vers le bas et l''arrière. Excellent pour la largeur du dos.', 'Dos', 'Machine', 'Force', ARRAY['Grand dorsal', 'Biceps', 'Rhomboïdes']),
(NULL, 'Rowing unilatéral haltère', 'Un genou et une main sur le banc. Tirer l''haltère vers la hanche en gardant le coude près du corps. Contrôler la descente.', 'Dos', 'Haltère + Banc', 'Force', ARRAY['Grand dorsal', 'Rhomboïdes', 'Biceps']),
(NULL, 'Fentes avec barre', 'Barre sur les trapèzes, faire un grand pas en avant. Descendre le genou arrière vers le sol. Pousser pour revenir. Alterner les jambes.', 'Jambes', 'Barre', 'Force', ARRAY['Quadriceps', 'Fessiers', 'Ischio-jambiers']),
(NULL, 'Dips lestés', 'Sur barres parallèles avec ceinture de lest. Descendre en fléchissant les coudes à 90°, remonter en poussant. Inclinaison avant = pectoraux, droit = triceps.', 'Pectoraux', 'Barres parallèles', 'Force', ARRAY['Pectoraux', 'Triceps', 'Deltoïdes ant.']),
(NULL, 'Tractions lestées', 'Prise pronation, bras tendus. Tirer le corps jusqu''à ce que le menton dépasse la barre. Ajouter du poids via ceinture pour la progression.', 'Dos', 'Barre de traction', 'Force', ARRAY['Grand dorsal', 'Biceps', 'Trapèzes']),

-- ═══════════════════════════════════
-- HALTÈRES (12 exercices)
-- ═══════════════════════════════════
(NULL, 'Curl biceps haltères', 'Debout, un haltère dans chaque main. Fléchir les coudes en gardant les coudes collés au corps. Monter en supination, descendre lentement.', 'Biceps', 'Haltères', 'Haltères', ARRAY['Biceps', 'Brachial']),
(NULL, 'Curl marteau', 'Même position, mais paumes face à face (prise neutre). Travailler le brachial et le brachio-radial en plus du biceps.', 'Biceps', 'Haltères', 'Haltères', ARRAY['Brachial', 'Biceps', 'Brachio-radial']),
(NULL, 'Extension triceps overhead', 'Assis ou debout, un haltère tenu à deux mains derrière la tête. Étendre les bras vers le haut en gardant les coudes fixes et serrés.', 'Triceps', 'Haltère', 'Haltères', ARRAY['Triceps (longue portion)']),
(NULL, 'Kickback triceps', 'Penché en avant, coude à 90°. Étendre l''avant-bras vers l''arrière en contractant le triceps. Contrôler le retour.', 'Triceps', 'Haltère', 'Haltères', ARRAY['Triceps']),
(NULL, 'Élévations latérales', 'Debout, haltères le long du corps. Lever les bras sur les côtés jusqu''à l''horizontale, paumes vers le sol. Contrôler la descente.', 'Épaules', 'Haltères', 'Haltères', ARRAY['Deltoïdes latéraux']),
(NULL, 'Élévations frontales', 'Haltères devant les cuisses. Lever un bras à la fois devant soi jusqu''à l''horizontale. Contrôler la descente.', 'Épaules', 'Haltères', 'Haltères', ARRAY['Deltoïdes antérieurs']),
(NULL, 'Oiseau (reverse fly)', 'Penché à 90°, haltères sous la poitrine. Ouvrir les bras en arc de cercle en serrant les omoplates. Cible le deltoïde postérieur.', 'Épaules', 'Haltères', 'Haltères', ARRAY['Deltoïdes postérieurs', 'Rhomboïdes']),
(NULL, 'Développé Arnold', 'Assis, haltères devant le visage en supination. Pousser en tournant les mains pour finir en pronation. Travail complet des deltoïdes.', 'Épaules', 'Haltères', 'Haltères', ARRAY['Deltoïdes', 'Triceps']),
(NULL, 'Goblet Squat', 'Tenir un haltère contre la poitrine. Descendre en squat profond, coudes entre les genoux. Excellent pour les débutants.', 'Jambes', 'Haltère', 'Haltères', ARRAY['Quadriceps', 'Fessiers', 'Core']),
(NULL, 'Écarté couché haltères', 'Allongé sur banc, bras tendus, ouvrir en arc de cercle. Étirement des pectoraux en bas, contraction en haut. Coudes légèrement fléchis.', 'Pectoraux', 'Haltères + Banc', 'Haltères', ARRAY['Pectoraux']),
(NULL, 'Shrug haltères', 'Debout, haltères le long du corps. Hausser les épaules vers les oreilles sans plier les coudes. Maintenir 2s en haut.', 'Trapèzes', 'Haltères', 'Haltères', ARRAY['Trapèzes supérieurs']),
(NULL, 'Fentes haltères', 'Un haltère dans chaque main, faire un grand pas en avant, descendre le genou arrière. Pousser pour revenir. Alterner.', 'Jambes', 'Haltères', 'Haltères', ARRAY['Quadriceps', 'Fessiers']),

-- ═══════════════════════════════════
-- POIDS DU CORPS (12 exercices)
-- ═══════════════════════════════════
(NULL, 'Pompes classiques', 'Mains largeur d''épaules, corps gainé. Descendre la poitrine vers le sol, pousser. Mouvement fondamental du haut du corps.', 'Pectoraux', 'Poids du corps', 'Poids du corps', ARRAY['Pectoraux', 'Triceps', 'Deltoïdes']),
(NULL, 'Pompes diamant', 'Mains rapprochées formant un losange. Accentue le travail des triceps. Plus difficile que les pompes classiques.', 'Triceps', 'Poids du corps', 'Poids du corps', ARRAY['Triceps', 'Pectoraux']),
(NULL, 'Tractions pronation', 'Prise mains en pronation (dos des mains vers soi). Tirer le corps jusqu''au menton au-dessus de la barre. Le roi du dos.', 'Dos', 'Barre de traction', 'Poids du corps', ARRAY['Grand dorsal', 'Biceps', 'Trapèzes']),
(NULL, 'Tractions supination (chin-up)', 'Prise en supination (paumes vers soi). Tirer le corps vers la barre. Sollicite davantage les biceps que la pronation.', 'Dos', 'Barre de traction', 'Poids du corps', ARRAY['Biceps', 'Grand dorsal']),
(NULL, 'Dips', 'Sur barres parallèles, descendre en fléchissant les coudes. Remonter en poussant. Penché = pectoraux, droit = triceps.', 'Pectoraux', 'Barres parallèles', 'Poids du corps', ARRAY['Pectoraux', 'Triceps']),
(NULL, 'Planche (gainage)', 'Appui sur avant-bras et pointes de pieds, corps aligné. Contracter abdos et fessiers. Maintenir le plus longtemps possible.', 'Abdominaux', 'Poids du corps', 'Poids du corps', ARRAY['Transverse', 'Grand droit', 'Obliques']),
(NULL, 'Crunch', 'Allongé, genoux fléchis. Enrouler le buste en décollant les omoplates. Contracter les abdos, redescendre lentement. Ne pas tirer la nuque.', 'Abdominaux', 'Poids du corps', 'Poids du corps', ARRAY['Grand droit']),
(NULL, 'Mountain climbers', 'Position de planche haute. Ramener alternativement les genoux vers la poitrine à rythme rapide. Combine gainage et cardio.', 'Abdominaux', 'Poids du corps', 'Poids du corps', ARRAY['Core', 'Psoas', 'Quadriceps']),
(NULL, 'Pistol Squat', 'Squat sur une jambe, l''autre tendue devant soi. Descendre le plus bas possible et remonter. Requiert force et équilibre.', 'Jambes', 'Poids du corps', 'Poids du corps', ARRAY['Quadriceps', 'Fessiers', 'Core']),
(NULL, 'Muscle-up', 'Traction explosive qui se transforme en dip au-dessus de la barre. Nécessite force et technique. Mouvement avancé.', 'Dos', 'Barre de traction', 'Poids du corps', ARRAY['Grand dorsal', 'Pectoraux', 'Triceps']),
(NULL, 'L-sit', 'Suspendu aux barres ou anneaux, lever les jambes à l''horizontale et maintenir. Travail intense des abdos et des fléchisseurs de hanche.', 'Abdominaux', 'Barres parallèles', 'Poids du corps', ARRAY['Grand droit', 'Psoas', 'Quadriceps']),
(NULL, 'Handstand push-up', 'En équilibre sur les mains contre un mur. Fléchir les bras pour descendre la tête vers le sol, pousser pour remonter. Exercice avancé d''épaules.', 'Épaules', 'Poids du corps', 'Poids du corps', ARRAY['Deltoïdes', 'Triceps', 'Trapèzes']),

-- ═══════════════════════════════════
-- CARDIO / HIIT (10 exercices)
-- ═══════════════════════════════════
(NULL, 'Burpees', 'Squat → planche → pompe → squat → saut. Enchaîner fluidement. L''exercice cardio ultime en HIIT.', 'Full body', 'Poids du corps', 'Cardio / HIIT', ARRAY['Full body']),
(NULL, 'Corde à sauter', 'Sauts réguliers avec rotation des poignets. Varier : pieds joints, alternés, doubles tours. Excellent pour l''endurance et la coordination.', 'Cardio', 'Corde', 'Cardio / HIIT', ARRAY['Mollets', 'Cardio']),
(NULL, 'Sprint (30m)', 'Sprint explosif sur 30 mètres. Récupération active en marchant. Idéal pour le HIIT et la puissance des jambes.', 'Cardio', 'Aucun', 'Cardio / HIIT', ARRAY['Quadriceps', 'Ischio-jambiers', 'Mollets']),
(NULL, 'Jumping jacks', 'Sauter en écartant pieds et bras, revenir. Rythme rapide. Échauffement classique ou exercice HIIT.', 'Cardio', 'Poids du corps', 'Cardio / HIIT', ARRAY['Full body']),
(NULL, 'Box jumps', 'Sauter sur une box depuis le sol, atterrir pieds à plat. Redescendre en contrôlant. Puissance et explosivité.', 'Jambes', 'Box', 'Cardio / HIIT', ARRAY['Quadriceps', 'Fessiers', 'Mollets']),
(NULL, 'Vélo assault', 'Pédaler intensément sur un air bike en utilisant aussi les bras. Résistance proportionnelle à l''effort.', 'Cardio', 'Air bike', 'Cardio / HIIT', ARRAY['Full body', 'Cardio']),
(NULL, 'Rameur (500m)', 'Effort court et intense sur rameur. Pousser avec les jambes, tirer avec le dos, finir avec les bras. Full body.', 'Cardio', 'Rameur', 'Cardio / HIIT', ARRAY['Dos', 'Jambes', 'Biceps', 'Cardio']),
(NULL, 'Battle ropes', 'Onduler deux cordes lourdes alternativement ou simultanément. Travail intense du haut du corps et du cardio.', 'Épaules', 'Cordes', 'Cardio / HIIT', ARRAY['Deltoïdes', 'Core', 'Avant-bras']),
(NULL, 'Thrusters', 'Squat frontal suivi d''un développé au-dessus de la tête en un mouvement fluide. Combine force et cardio.', 'Full body', 'Barre ou Haltères', 'Cardio / HIIT', ARRAY['Quadriceps', 'Deltoïdes', 'Core']),
(NULL, 'Ski erg', 'Mouvement de ski de fond sur machine. Tirer les poignées vers le bas en engageant le dos et les abdos. Excellent cardio du haut du corps.', 'Cardio', 'Ski erg', 'Cardio / HIIT', ARRAY['Grand dorsal', 'Triceps', 'Core']),

-- ═══════════════════════════════════
-- FONCTIONNEL (10 exercices)
-- ═══════════════════════════════════
(NULL, 'Kettlebell Swing', 'Balancer le kettlebell entre les jambes puis le propulser à hauteur d''épaules avec une extension explosive des hanches. Core engagé en permanence.', 'Full body', 'Kettlebell', 'Fonctionnel', ARRAY['Fessiers', 'Ischio-jambiers', 'Core']),
(NULL, 'Turkish Get-Up', 'Allongé au sol avec un kettlebell bras tendu. Se lever en passant par plusieurs positions intermédiaires. Exercice de mobilité, stabilité et force combinées.', 'Full body', 'Kettlebell', 'Fonctionnel', ARRAY['Core', 'Épaules', 'Fessiers']),
(NULL, 'Clean & Press kettlebell', 'Monter le kettlebell d''un mouvement de hanches jusqu''à l''épaule (clean), puis le pousser au-dessus de la tête (press). Mouvement complet.', 'Full body', 'Kettlebell', 'Fonctionnel', ARRAY['Deltoïdes', 'Core', 'Fessiers']),
(NULL, 'TRX Row', 'Suspendu aux sangles TRX, corps incliné. Tirer le corps vers les poignées en serrant les omoplates. Ajuster la difficulté avec l''angle.', 'Dos', 'TRX', 'Fonctionnel', ARRAY['Grand dorsal', 'Rhomboïdes', 'Biceps']),
(NULL, 'TRX Push-up', 'Pieds dans les sangles TRX, mains au sol. Faire des pompes avec l''instabilité des sangles. Travail intense du core.', 'Pectoraux', 'TRX', 'Fonctionnel', ARRAY['Pectoraux', 'Core', 'Triceps']),
(NULL, 'Farmer''s Walk', 'Marcher en tenant un poids lourd dans chaque main. Dos droit, épaules basses. Travaille la poigne, le core et la posture.', 'Full body', 'Haltères ou Kettlebells', 'Fonctionnel', ARRAY['Avant-bras', 'Trapèzes', 'Core']),
(NULL, 'Bear Crawl', 'À quatre pattes, genoux décollés du sol. Avancer en coordonnant bras et jambes opposés. Exercice fondamental de locomotion.', 'Full body', 'Poids du corps', 'Fonctionnel', ARRAY['Core', 'Épaules', 'Quadriceps']),
(NULL, 'Snatch kettlebell', 'Propulser le kettlebell du sol au-dessus de la tête en un seul mouvement explosif. Technique avancée, puissance pure.', 'Full body', 'Kettlebell', 'Fonctionnel', ARRAY['Épaules', 'Core', 'Fessiers']),
(NULL, 'Sled Push', 'Pousser un traîneau chargé sur le sol. Angle bas, poussée des jambes. Travail explosif des jambes et du cardio.', 'Jambes', 'Traîneau', 'Fonctionnel', ARRAY['Quadriceps', 'Fessiers', 'Mollets']),
(NULL, 'Rope Climb', 'Grimper à la corde en utilisant les bras et les jambes. Technique de verrouillage des pieds. Force de préhension et de traction.', 'Dos', 'Corde', 'Fonctionnel', ARRAY['Grand dorsal', 'Biceps', 'Avant-bras']),

-- ═══════════════════════════════════
-- MOBILITÉ / STRETCHING (10 exercices)
-- ═══════════════════════════════════
(NULL, 'Étirement quadriceps debout', 'Debout, saisir la cheville derrière soi et tirer le talon vers le fessier. Genoux joints. Maintenir 30s par côté.', 'Jambes', 'Aucun', 'Mobilité / Stretching', ARRAY['Quadriceps']),
(NULL, 'Étirement ischio-jambiers', 'Assis, jambe tendue. Se pencher en avant dos droit pour attraper le pied. Maintenir 30s. Alterner.', 'Jambes', 'Aucun', 'Mobilité / Stretching', ARRAY['Ischio-jambiers']),
(NULL, 'Rotation thoracique', 'Allongé sur le côté, ouvrir le bras en rotation vers l''arrière. Suivre la main du regard. 10 reps par côté.', 'Dos', 'Aucun', 'Mobilité / Stretching', ARRAY['Colonne thoracique', 'Obliques']),
(NULL, 'Cat-Cow (Chat-Vache)', 'À quatre pattes, alterner entre dos creux (inspiration) et dos rond (expiration). Fluidifier le mouvement vertébral. 10 cycles.', 'Dos', 'Aucun', 'Mobilité / Stretching', ARRAY['Colonne vertébrale', 'Core']),
(NULL, 'Pigeon Pose', 'Position du pigeon : jambe avant fléchie, jambe arrière tendue. Descendre le buste vers l''avant. Étirement profond des fessiers et du psoas.', 'Hanches', 'Aucun', 'Mobilité / Stretching', ARRAY['Fessiers', 'Psoas', 'Piriformes']),
(NULL, 'Foam rolling dos', 'Allongé sur un rouleau en mousse, rouler le long du dos de la nuque aux lombaires. Relâcher les tensions myofasciales. 2-3 min.', 'Dos', 'Foam roller', 'Mobilité / Stretching', ARRAY['Dorsaux', 'Trapèzes']),
(NULL, 'Foam rolling quadriceps', 'Face au sol, rouleau sous les cuisses. Rouler du genou à la hanche en cherchant les points de tension. 2 min par jambe.', 'Jambes', 'Foam roller', 'Mobilité / Stretching', ARRAY['Quadriceps']),
(NULL, 'World''s Greatest Stretch', 'Fente avant, main au sol, rotation du buste bras tendu vers le ciel. Combine étirement des hanches, thorax et ischio-jambiers. Le stretch ultime.', 'Full body', 'Aucun', 'Mobilité / Stretching', ARRAY['Psoas', 'Thorax', 'Ischio-jambiers']),
(NULL, 'Downward Dog (Chien tête en bas)', 'Mains et pieds au sol, former un V inversé. Pousser les talons vers le sol, étirer la chaîne postérieure. Position fondamentale du yoga.', 'Full body', 'Aucun', 'Mobilité / Stretching', ARRAY['Mollets', 'Ischio-jambiers', 'Épaules']),
(NULL, 'Hip 90/90', 'Assis au sol, une jambe devant à 90°, l''autre derrière à 90°. Tourner d''un côté à l''autre. Améliore la rotation interne et externe de la hanche.', 'Hanches', 'Aucun', 'Mobilité / Stretching', ARRAY['Rotateurs de hanche', 'Fessiers'])

ON CONFLICT DO NOTHING;
