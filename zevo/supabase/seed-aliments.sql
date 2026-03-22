-- ============================================================
-- ZEVO — Seed : Bibliothèque d'aliments de base (officiels)
-- coach_id = NULL → aliments Zevo visibles par tous les coachs
-- ============================================================

INSERT INTO aliments (coach_id, nom, categorie, kcal_100g, proteines, glucides, lipides, fibres) VALUES
-- ── Protéines ──
(NULL, 'Blanc de poulet',      'Protéine',  165, 31, 0,   3.6, 0),
(NULL, 'Saumon frais',         'Protéine',  208, 20, 0,  13,   0),
(NULL, 'Oeuf entier',          'Protéine',  155, 13, 1.1, 11,   0),
(NULL, 'Blanc d''oeuf',        'Protéine',   52, 11, 0.7,  0.2, 0),
(NULL, 'Thon en conserve',     'Protéine',  116, 26, 0,   1,   0),
(NULL, 'Steak haché 5%',       'Protéine',  137, 26, 0,   5,   0),
(NULL, 'Crevettes',            'Protéine',   99, 24, 0.2,  0.3, 0),
(NULL, 'Dinde',                'Protéine',  135, 30, 0,   1,   0),
(NULL, 'Tofu ferme',           'Protéine',   76,  8, 1.9,  4.8, 0.3),
(NULL, 'Whey protéine',        'Protéine',  370, 80, 5,   3,   0),

-- ── Féculents ──
(NULL, 'Riz blanc cuit',       'Féculent',  130,  2.7, 28,  0.3, 0.4),
(NULL, 'Riz complet cuit',     'Féculent',  111,  2.6, 23,  0.9, 1.8),
(NULL, 'Pâtes cuites',         'Féculent',  131,  5,  25,   1.1, 1.8),
(NULL, 'Patate douce cuite',   'Féculent',   86,  1.6, 20,  0.1, 3),
(NULL, 'Pomme de terre cuite', 'Féculent',   77,  2,  17,   0.1, 2.2),
(NULL, 'Quinoa cuit',          'Féculent',  120,  4.4, 21,  1.9, 2.8),
(NULL, 'Flocons d''avoine',    'Féculent',  389, 17,  66,  6.9, 11),
(NULL, 'Pain complet',         'Féculent',  247,  9,  41,   3.4, 7),

-- ── Légumes ──
(NULL, 'Brocoli',              'Légume',     34,  2.8,  7,  0.4, 2.6),
(NULL, 'Épinards',             'Légume',     23,  2.9,  3.6, 0.4, 2.2),
(NULL, 'Haricots verts',       'Légume',     31,  1.8,  7,  0.1, 3.4),
(NULL, 'Courgette',            'Légume',     17,  1.2,  3.1, 0.3, 1),
(NULL, 'Tomate',               'Légume',     18,  0.9,  3.9, 0.2, 1.2),
(NULL, 'Carotte',              'Légume',     41,  0.9,  10,  0.2, 2.8),
(NULL, 'Concombre',            'Légume',     15,  0.7,  3.6, 0.1, 0.5),
(NULL, 'Poivron rouge',        'Légume',     31,  1,    6,  0.3, 2.1),

-- ── Fruits ──
(NULL, 'Banane',               'Fruit',      89,  1.1, 23,  0.3, 2.6),
(NULL, 'Pomme',                'Fruit',      52,  0.3, 14,  0.2, 2.4),
(NULL, 'Fraises',              'Fruit',      32,  0.7,  7.7, 0.3, 2),
(NULL, 'Myrtilles',            'Fruit',      57,  0.7, 14,  0.3, 2.4),
(NULL, 'Orange',               'Fruit',      47,  0.9, 12,  0.1, 2.4),

-- ── Lipides ──
(NULL, 'Avocat',               'Lipide',    160,  2,    9,  15,  6.7),
(NULL, 'Huile d''olive',       'Lipide',    884,  0,    0,  100, 0),
(NULL, 'Beurre de cacahuète',  'Lipide',    588, 25,   20,  50,  6),
(NULL, 'Amandes',              'Lipide',    579, 21,   22,  50,  12),
(NULL, 'Noix',                 'Lipide',    654, 15,   14,  65,  6.7),
(NULL, 'Graines de chia',      'Lipide',    486, 17,   42,  31,  34),

-- ── Laitiers ──
(NULL, 'Fromage blanc 0%',     'Laitier',    46,  7,    4,  0.1, 0),
(NULL, 'Yaourt grec 0%',       'Laitier',    59, 10,    3.6, 0.4, 0),
(NULL, 'Lait demi-écrémé',     'Laitier',    46,  3.5,  5,  1.5, 0),
(NULL, 'Mozzarella',           'Laitier',   280, 28,    3, 17,   0),
(NULL, 'Parmesan',             'Laitier',   431, 38,    4, 29,   0),

-- ── Céréales & Légumineuses ──
(NULL, 'Lentilles cuites',     'Légumineuse', 116, 9,   20,  0.4, 7.9),
(NULL, 'Pois chiches cuits',   'Légumineuse', 164, 9,   27,  2.6, 7.6),
(NULL, 'Haricots rouges cuits','Légumineuse', 127, 9,   23,  0.5, 6.4)

ON CONFLICT DO NOTHING;
