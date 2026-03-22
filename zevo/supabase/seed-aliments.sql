-- ============================================================
-- ZEVO — Seed : Bibliothèque complète d'aliments (120+ items)
-- coach_id = NULL → aliments Zevo visibles par tous les coachs
-- Valeurs nutritionnelles pour 100g
-- ============================================================

INSERT INTO aliments (coach_id, nom, categorie, kcal_100g, proteines, glucides, lipides, fibres) VALUES

-- ═══════════════════════════════════════
-- PROTÉINES (25 aliments)
-- ═══════════════════════════════════════
(NULL, 'Blanc de poulet',         'Protéine',  165, 31,   0,    3.6,  0),
(NULL, 'Cuisse de poulet',        'Protéine',  209, 26,   0,   11,    0),
(NULL, 'Saumon frais',            'Protéine',  208, 20,   0,   13,    0),
(NULL, 'Saumon fumé',             'Protéine',  117, 18,   0,    4.3,  0),
(NULL, 'Oeuf entier',             'Protéine',  155, 13,   1.1, 11,    0),
(NULL, 'Blanc d''oeuf',           'Protéine',   52, 11,   0.7,  0.2,  0),
(NULL, 'Thon en conserve',        'Protéine',  116, 26,   0,    1,    0),
(NULL, 'Thon frais',              'Protéine',  144, 23,   0,    5,    0),
(NULL, 'Steak haché 5%',          'Protéine',  137, 26,   0,    5,    0),
(NULL, 'Steak haché 15%',         'Protéine',  217, 24,   0,   15,    0),
(NULL, 'Filet de boeuf',          'Protéine',  218, 26,   0,   12,    0),
(NULL, 'Crevettes',               'Protéine',   99, 24,   0.2,  0.3,  0),
(NULL, 'Dinde',                   'Protéine',  135, 30,   0,    1,    0),
(NULL, 'Tofu ferme',              'Protéine',   76,  8,   1.9,  4.8,  0.3),
(NULL, 'Tofu soyeux',             'Protéine',   55,  5,   2.4,  2.7,  0),
(NULL, 'Whey protéine',           'Protéine',  370, 80,   5,    3,    0),
(NULL, 'Caséine',                 'Protéine',  360, 78,   4,    2,    0),
(NULL, 'Cabillaud',               'Protéine',   82, 18,   0,    0.7,  0),
(NULL, 'Sardines en conserve',    'Protéine',  208, 25,   0,   11,    0),
(NULL, 'Maquereau',               'Protéine',  205, 19,   0,   14,    0),
(NULL, 'Jambon blanc',            'Protéine',  115, 21,   1,    3,    0),
(NULL, 'Poulet rôti (avec peau)', 'Protéine',  239, 27,   0,   14,    0),
(NULL, 'Tempeh',                  'Protéine',  192, 20,   7.6,  11,   0),
(NULL, 'Seitan',                  'Protéine',  370, 75,   14,    2,   0.6),
(NULL, 'Protéine de pois',        'Protéine',  360, 80,   3,    2,    0),

-- ═══════════════════════════════════════
-- FÉCULENTS (20 aliments)
-- ═══════════════════════════════════════
(NULL, 'Riz blanc cuit',          'Féculent',  130,  2.7, 28,   0.3,  0.4),
(NULL, 'Riz complet cuit',        'Féculent',  111,  2.6, 23,   0.9,  1.8),
(NULL, 'Riz basmati cuit',        'Féculent',  121,  3.5, 25,   0.4,  0.4),
(NULL, 'Pâtes cuites',            'Féculent',  131,  5,   25,   1.1,  1.8),
(NULL, 'Pâtes complètes cuites',  'Féculent',  124,  5.3, 25,   0.5,  3.2),
(NULL, 'Patate douce cuite',      'Féculent',   86,  1.6, 20,   0.1,  3),
(NULL, 'Pomme de terre cuite',    'Féculent',   77,  2,   17,   0.1,  2.2),
(NULL, 'Quinoa cuit',             'Féculent',  120,  4.4, 21,   1.9,  2.8),
(NULL, 'Flocons d''avoine',       'Féculent',  389, 17,   66,   6.9, 11),
(NULL, 'Pain complet',            'Féculent',  247,  9,   41,   3.4,  7),
(NULL, 'Pain blanc',              'Féculent',  265,  9,   49,   3.2,  2.7),
(NULL, 'Pain de seigle',          'Féculent',  259,  8.5, 48,   3.3,  5.8),
(NULL, 'Semoule cuite',           'Féculent',  112,  3.8, 23,   0.2,  1.4),
(NULL, 'Boulgour cuit',           'Féculent',   83,  3.1, 19,   0.2,  4.5),
(NULL, 'Sarrasin cuit',           'Féculent',   92,  3.4, 20,   0.6,  2.7),
(NULL, 'Muesli',                  'Féculent',  340, 10,   56,   8,    8),
(NULL, 'Galettes de riz',         'Féculent',  387,  8,   81,   3.5,  3.5),
(NULL, 'Tortilla blé',            'Féculent',  312, 8.5,  52,   8,    2),
(NULL, 'Gnocchi',                 'Féculent',  133,  3,   27,   1,    1),
(NULL, 'Couscous cuit',           'Féculent',  112,  3.8, 23,   0.2,  1.4),

-- ═══════════════════════════════════════
-- LÉGUMES (20 aliments)
-- ═══════════════════════════════════════
(NULL, 'Brocoli',                 'Légume',     34,  2.8,  7,   0.4,  2.6),
(NULL, 'Épinards',                'Légume',     23,  2.9,  3.6, 0.4,  2.2),
(NULL, 'Haricots verts',          'Légume',     31,  1.8,  7,   0.1,  3.4),
(NULL, 'Courgette',               'Légume',     17,  1.2,  3.1, 0.3,  1),
(NULL, 'Tomate',                  'Légume',     18,  0.9,  3.9, 0.2,  1.2),
(NULL, 'Carotte',                 'Légume',     41,  0.9, 10,   0.2,  2.8),
(NULL, 'Concombre',               'Légume',     15,  0.7,  3.6, 0.1,  0.5),
(NULL, 'Poivron rouge',           'Légume',     31,  1,    6,   0.3,  2.1),
(NULL, 'Poivron vert',            'Légume',     20,  0.9,  4.6, 0.2,  1.7),
(NULL, 'Aubergine',               'Légume',     25,  1,    6,   0.2,  3),
(NULL, 'Chou-fleur',              'Légume',     25,  1.9,  5,   0.3,  2),
(NULL, 'Chou kale',               'Légume',     49,  4.3,  9,   0.9,  3.6),
(NULL, 'Asperges',                'Légume',     20,  2.2,  3.9, 0.1,  2.1),
(NULL, 'Champignons',             'Légume',     22,  3.1,  3.3, 0.3,  1),
(NULL, 'Oignon',                  'Légume',     40,  1.1,  9,   0.1,  1.7),
(NULL, 'Ail',                     'Légume',    149,  6.4, 33,   0.5,  2.1),
(NULL, 'Salade verte (laitue)',   'Légume',     15,  1.4,  2.9, 0.2,  1.3),
(NULL, 'Céleri',                  'Légume',     16,  0.7,  3,   0.2,  1.6),
(NULL, 'Betterave cuite',         'Légume',     44,  1.7, 10,   0.2,  2),
(NULL, 'Petits pois',             'Légume',     81,  5.4, 14,   0.4,  5.7),

-- ═══════════════════════════════════════
-- FRUITS (15 aliments)
-- ═══════════════════════════════════════
(NULL, 'Banane',                  'Fruit',      89,  1.1, 23,   0.3,  2.6),
(NULL, 'Pomme',                   'Fruit',      52,  0.3, 14,   0.2,  2.4),
(NULL, 'Fraises',                 'Fruit',      32,  0.7,  7.7, 0.3,  2),
(NULL, 'Myrtilles',               'Fruit',      57,  0.7, 14,   0.3,  2.4),
(NULL, 'Orange',                  'Fruit',      47,  0.9, 12,   0.1,  2.4),
(NULL, 'Mangue',                  'Fruit',      60,  0.8, 15,   0.4,  1.6),
(NULL, 'Ananas',                  'Fruit',      50,  0.5, 13,   0.1,  1.4),
(NULL, 'Kiwi',                    'Fruit',      61,  1.1, 15,   0.5,  3),
(NULL, 'Raisin',                  'Fruit',      69,  0.7, 18,   0.2,  0.9),
(NULL, 'Poire',                   'Fruit',      57,  0.4, 15,   0.1,  3.1),
(NULL, 'Pastèque',                'Fruit',      30,  0.6,  8,   0.2,  0.4),
(NULL, 'Melon',                   'Fruit',      34,  0.8,  8,   0.2,  0.9),
(NULL, 'Pêche',                   'Fruit',      39,  0.9, 10,   0.3,  1.5),
(NULL, 'Framboises',              'Fruit',      52,  1.2, 12,   0.7,  6.5),
(NULL, 'Dattes séchées',          'Fruit',     277,  1.8, 75,   0.2,  6.7),

-- ═══════════════════════════════════════
-- LIPIDES (12 aliments)
-- ═══════════════════════════════════════
(NULL, 'Avocat',                  'Lipide',    160,  2,    9,  15,    6.7),
(NULL, 'Huile d''olive',          'Lipide',    884,  0,    0, 100,    0),
(NULL, 'Huile de coco',           'Lipide',    862,  0,    0,  99,    0),
(NULL, 'Beurre de cacahuète',     'Lipide',    588, 25,   20,  50,    6),
(NULL, 'Beurre d''amande',        'Lipide',    614, 21,   19,  56,   10),
(NULL, 'Amandes',                 'Lipide',    579, 21,   22,  50,   12),
(NULL, 'Noix',                    'Lipide',    654, 15,   14,  65,    6.7),
(NULL, 'Noix de cajou',           'Lipide',    553, 18,   30,  44,    3.3),
(NULL, 'Noix de macadamia',       'Lipide',    718,  8,   14,  76,    8.6),
(NULL, 'Graines de chia',         'Lipide',    486, 17,   42,  31,   34),
(NULL, 'Graines de lin',          'Lipide',    534, 18,   29,  42,   27),
(NULL, 'Graines de tournesol',    'Lipide',    584, 21,   20,  51,    8.6),

-- ═══════════════════════════════════════
-- LAITIERS (12 aliments)
-- ═══════════════════════════════════════
(NULL, 'Fromage blanc 0%',        'Laitier',    46,  7,    4,   0.1,  0),
(NULL, 'Fromage blanc 3%',        'Laitier',    73,  7,    4,   3,    0),
(NULL, 'Yaourt grec 0%',          'Laitier',    59, 10,    3.6, 0.4,  0),
(NULL, 'Yaourt grec 5%',          'Laitier',    97,  9,    3.6, 5,    0),
(NULL, 'Skyr',                    'Laitier',    63, 11,    4,   0.2,  0),
(NULL, 'Lait demi-écrémé',        'Laitier',    46,  3.5,  5,   1.5,  0),
(NULL, 'Lait d''amande',          'Laitier',    17,  0.6,  0.3, 1.1,  0.2),
(NULL, 'Lait d''avoine',          'Laitier',    46,  1,    7,   1.5,  0.8),
(NULL, 'Mozzarella',              'Laitier',   280, 28,    3,  17,    0),
(NULL, 'Parmesan',                'Laitier',   431, 38,    4,  29,    0),
(NULL, 'Ricotta',                 'Laitier',   174, 11,    3,  13,    0),
(NULL, 'Cottage cheese',          'Laitier',    98, 11,    3.4, 4.3,  0),

-- ═══════════════════════════════════════
-- LÉGUMINEUSES (8 aliments)
-- ═══════════════════════════════════════
(NULL, 'Lentilles cuites',        'Légumineuse', 116,  9,  20,   0.4,  7.9),
(NULL, 'Lentilles corail cuites', 'Légumineuse', 100,  7.6, 17,  0.4,  4.9),
(NULL, 'Pois chiches cuits',      'Légumineuse', 164,  9,  27,   2.6,  7.6),
(NULL, 'Haricots rouges cuits',   'Légumineuse', 127,  9,  23,   0.5,  6.4),
(NULL, 'Haricots blancs cuits',   'Légumineuse', 139,  9.7, 25,  0.5,  6.3),
(NULL, 'Pois cassés cuits',       'Légumineuse', 118,  8.3, 21,  0.4,  8.3),
(NULL, 'Edamame',                 'Légumineuse', 121, 12,   9,   5,    5.2),
(NULL, 'Fèves cuites',            'Légumineuse',  88,  7.6, 13,  0.7,  5.4),

-- ═══════════════════════════════════════
-- SNACKS & COMPLÉMENTS (10 aliments)
-- ═══════════════════════════════════════
(NULL, 'Chocolat noir 85%',       'Snack',     580, 13,   22,  46,   11),
(NULL, 'Chocolat noir 70%',       'Snack',     530, 10,   32,  42,    8),
(NULL, 'Miel',                    'Snack',     304,  0.3, 82,   0,    0.2),
(NULL, 'Confiture',               'Snack',     250,  0.4, 65,   0.1,  0.8),
(NULL, 'Barre protéinée',         'Snack',     350, 30,   35,  10,    3),
(NULL, 'Compote de pomme',        'Snack',      42,  0.2, 11,   0,    1),
(NULL, 'Crackers complets',       'Snack',     430, 10,   65,  14,    5),
(NULL, 'Galette de riz soufflé',  'Snack',     387,  8,   81,   3.5,  3.5),
(NULL, 'Pop-corn nature',         'Snack',     375, 12,   74,   4.3, 15),
(NULL, 'Fruits secs mélangés',    'Snack',     359, 10,   50,  15,    5)

ON CONFLICT DO NOTHING;
