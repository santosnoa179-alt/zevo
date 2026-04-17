-- ════════════════════════════════════════════════════════════════════
-- ZEVO — Seed V2 : Extension bibliothèque aliments (~180 items)
-- Complément du seed-aliments.sql (122 aliments) → total ~300
-- coach_id = NULL → aliments Zevo visibles par tous les coachs
-- Valeurs nutritionnelles pour 100g (sources Ciqual / USDA)
-- À exécuter dans Supabase Studio > SQL Editor > Run
-- ════════════════════════════════════════════════════════════════════

INSERT INTO aliments (coach_id, nom, categorie, kcal_100g, proteines, glucides, lipides, fibres) VALUES

-- ═══════════════════════════════════════
-- PROTÉINES — Viandes françaises & charcuterie (20)
-- ═══════════════════════════════════════
(NULL, 'Magret de canard',           'Protéine',  337, 19,   0,   28,    0),
(NULL, 'Cuisse de canard confite',   'Protéine',  285, 22,   0,   22,    0),
(NULL, 'Côte d''agneau',             'Protéine',  294, 25,   0,   21,    0),
(NULL, 'Gigot d''agneau',            'Protéine',  230, 27,   0,   13,    0),
(NULL, 'Lapin',                      'Protéine',  173, 21,   0,    9,    0),
(NULL, 'Filet mignon de porc',       'Protéine',  143, 22,   0,    5.5,  0),
(NULL, 'Rôti de porc',               'Protéine',  189, 22,   0,   11,    0),
(NULL, 'Bacon',                      'Protéine',  541, 37,   1.4, 42,    0),
(NULL, 'Lardons',                    'Protéine',  350, 14,   0,   33,    0),
(NULL, 'Escalope de veau',           'Protéine',  150, 22,   0,    7,    0),
(NULL, 'Boudin noir',                'Protéine',  379, 14,   1,   35,    0),
(NULL, 'Saucisse',                   'Protéine',  300, 12,   2,   27,    0),
(NULL, 'Chorizo',                    'Protéine',  455, 24,   1,   39,    0),
(NULL, 'Jambon cru',                 'Protéine',  241, 26,   1,   15,    0),
(NULL, 'Jambon de Parme',            'Protéine',  250, 27,   0,   16,    0),
(NULL, 'Rillettes',                  'Protéine',  385, 16,   0,   35,    0),
(NULL, 'Pâté de campagne',           'Protéine',  340, 14,   1,   31,    0),
(NULL, 'Foie de volaille',           'Protéine',  135, 18,   1,    5,    0),
(NULL, 'Foie gras',                  'Protéine',  462,  7,   5,   45,    0),
(NULL, 'Merguez',                    'Protéine',  265, 18,   0,   22,    0),

-- ═══════════════════════════════════════
-- PROTÉINES — Poissons & fruits de mer (18)
-- ═══════════════════════════════════════
(NULL, 'Bar (loup)',                 'Protéine',   97, 20,   0,    1.5,  0),
(NULL, 'Dorade',                     'Protéine',   90, 18,   0,    2,    0),
(NULL, 'Lotte',                      'Protéine',   74, 17,   0,    0.6,  0),
(NULL, 'Lieu noir',                  'Protéine',   75, 18,   0,    0.5,  0),
(NULL, 'Hareng',                     'Protéine',  158, 18,   0,    9,    0),
(NULL, 'Anchois (conserve huile)',   'Protéine',  210, 29,   0,   10,    0),
(NULL, 'Truite',                     'Protéine',  141, 20,   0,    6,    0),
(NULL, 'Haddock fumé',               'Protéine',   95, 21,   0,    1,    0),
(NULL, 'Sole',                       'Protéine',   83, 17,   0,    1,    0),
(NULL, 'Merlan',                     'Protéine',   80, 18,   0,    0.7,  0),
(NULL, 'Colin',                      'Protéine',   72, 16,   0,    0.7,  0),
(NULL, 'Moules cuites',              'Protéine',   86, 12,   3.4,  2,    0),
(NULL, 'Huîtres',                    'Protéine',   66,  9,   4,    2,    0),
(NULL, 'Saint-Jacques',              'Protéine',   92, 16,   4,    1,    0),
(NULL, 'Poulpe',                     'Protéine',   82, 15,   2,    1,    0),
(NULL, 'Encornets / Calamars',       'Protéine',   92, 16,   3,    1.4,  0),
(NULL, 'Crabe',                      'Protéine',   83, 18,   0,    1,    0),
(NULL, 'Oeuf de caille',             'Protéine',  158, 13,   0.4, 11,    0),

-- ═══════════════════════════════════════
-- FÉCULENTS — Pains, céréales, pâtes (20)
-- ═══════════════════════════════════════
(NULL, 'Ravioli (cuits)',            'Féculent',  155,  6,   24,   4,    2),
(NULL, 'Tagliatelles fraîches',      'Féculent',  171,  7,   31,   1.5,  2),
(NULL, 'Millet cuit',                'Féculent',  119,  3.5, 23,   1,    1.3),
(NULL, 'Épeautre cuit',              'Féculent',  127,  5.5, 26,   0.9,  4),
(NULL, 'Amarante cuite',             'Féculent',  102,  4,   19,   1.6,  2.1),
(NULL, 'Pain aux céréales',          'Féculent',  245,  9,   42,   3.5,  6),
(NULL, 'Pain pita',                  'Féculent',  275,  9,   55,   1,    2),
(NULL, 'Bagel',                      'Féculent',  245, 10,   48,   1.5,  2),
(NULL, 'Baguette',                   'Féculent',  250,  8,   52,   1,    2.3),
(NULL, 'Croissant',                  'Féculent',  406,  8.2, 45,  21,    2.6),
(NULL, 'Pain au chocolat',           'Féculent',  440,  7,   55,  22,    2),
(NULL, 'Riz gluant cuit',            'Féculent',  116,  2.4, 26,   0.2,  0.3),
(NULL, 'Riz rouge cuit',             'Féculent',  111,  2.3, 23,   1,    2),
(NULL, 'Riz noir cuit',              'Féculent',  144,  4,   31,   1.4,  2.2),
(NULL, 'Purée de pommes de terre',   'Féculent',   88,  1.9, 16,   2,    1.4),
(NULL, 'Frites',                     'Féculent',  312,  3.8, 41,  15,    3),
(NULL, 'Chips de pomme de terre',    'Féculent',  536,  6.5, 53,  34,    4.4),
(NULL, 'Polenta cuite',              'Féculent',   70,  1.6, 15,   0.3,  1.2),
(NULL, 'Knödel',                     'Féculent',  165,  4,   30,   3,    2),
(NULL, 'Biscotte',                   'Féculent',  395, 13,   75,   6,    4),

-- ═══════════════════════════════════════
-- LÉGUMES — Variés & saison (25)
-- ═══════════════════════════════════════
(NULL, 'Topinambour cuit',           'Légume',     73,  2,   17,   0,    1.6),
(NULL, 'Panais cuit',                'Légume',     75,  1.2, 18,   0.3,  3.6),
(NULL, 'Rutabaga',                   'Légume',     37,  1.1,  8,   0.2,  2.3),
(NULL, 'Navet cuit',                 'Légume',     22,  0.9,  5,   0.1,  2),
(NULL, 'Céleri rave',                'Légume',     42,  1.5,  9,   0.3,  1.8),
(NULL, 'Fenouil',                    'Légume',     31,  1.2,  7,   0.2,  3.1),
(NULL, 'Artichaut cuit',             'Légume',     53,  2.9, 12,   0.3,  5.4),
(NULL, 'Endive',                     'Légume',     15,  1,    3,   0.1,  3.1),
(NULL, 'Cresson',                    'Légume',     11,  2.3,  1.3, 0.1,  1.1),
(NULL, 'Mâche',                      'Légume',     21,  2,    3.6, 0.4,  1.9),
(NULL, 'Roquette',                   'Légume',     25,  2.6,  3.7, 0.7,  1.6),
(NULL, 'Chou blanc',                 'Légume',     25,  1.3,  6,   0.1,  2.5),
(NULL, 'Chou rouge',                 'Légume',     31,  1.4,  7,   0.2,  2.1),
(NULL, 'Chou de Bruxelles',          'Légume',     43,  3.4,  9,   0.3,  3.8),
(NULL, 'Chou chinois',               'Légume',     13,  1.5,  2.2, 0.2,  1),
(NULL, 'Maïs doux',                  'Légume',     86,  3.2, 19,   1.2,  2.7),
(NULL, 'Potimarron cuit',            'Légume',     26,  1,    5,   0.1,  1.4),
(NULL, 'Butternut cuit',             'Légume',     45,  1,   12,   0.1,  2),
(NULL, 'Courge spaghetti',           'Légume',     31,  0.6,  7,   0.6,  1.5),
(NULL, 'Potiron',                    'Légume',     26,  1.2,  5,   0.1,  0.5),
(NULL, 'Radis rose',                 'Légume',     16,  0.7,  3.4, 0.1,  1.6),
(NULL, 'Échalote',                   'Légume',     72,  2.5, 17,   0.1,  3.2),
(NULL, 'Poireau cuit',               'Légume',     29,  1.2,  7,   0.3,  1.8),
(NULL, 'Blettes cuites',             'Légume',     20,  1.9,  4.1, 0.2,  3.7),
(NULL, 'Cœur de palmier',            'Légume',     31,  2,    5,   0.7,  1.4),

-- ═══════════════════════════════════════
-- FRUITS — Variés & séchés (22)
-- ═══════════════════════════════════════
(NULL, 'Grenade',                    'Fruit',      83,  1.7, 19,   1.2,  4),
(NULL, 'Papaye',                     'Fruit',      43,  0.5, 11,   0.3,  1.7),
(NULL, 'Fruit de la passion',        'Fruit',      97,  2.2, 23,   0.7, 10),
(NULL, 'Litchi',                     'Fruit',      66,  0.8, 17,   0.4,  1.3),
(NULL, 'Kaki',                       'Fruit',      70,  0.6, 19,   0.2,  3.6),
(NULL, 'Goyave',                     'Fruit',      68,  2.5, 14,   1,    5.4),
(NULL, 'Figue fraîche',              'Fruit',      74,  0.8, 19,   0.3,  2.9),
(NULL, 'Figue séchée',               'Fruit',     249,  3.3, 64,   0.9,  9.8),
(NULL, 'Abricot frais',              'Fruit',      48,  1.4, 11,   0.4,  2),
(NULL, 'Abricot sec',                'Fruit',     241,  3.4, 63,   0.5,  7.3),
(NULL, 'Cerises',                    'Fruit',      63,  1.1, 16,   0.2,  2.1),
(NULL, 'Nectarine',                  'Fruit',      44,  1.1, 10,   0.3,  1.7),
(NULL, 'Prune',                      'Fruit',      46,  0.7, 11,   0.3,  1.4),
(NULL, 'Cassis',                     'Fruit',      63,  1.4, 15,   0.4,  4.3),
(NULL, 'Groseille',                  'Fruit',      56,  1.4, 14,   0.2,  4.3),
(NULL, 'Mûre',                       'Fruit',      43,  1.4, 10,   0.5,  5.3),
(NULL, 'Clémentine',                 'Fruit',      47,  0.9, 12,   0.2,  1.7),
(NULL, 'Pamplemousse',               'Fruit',      42,  0.8, 11,   0.1,  1.6),
(NULL, 'Citron',                     'Fruit',      29,  1.1,  9,   0.3,  2.8),
(NULL, 'Pruneaux',                   'Fruit',     240,  2.2, 64,   0.4,  7.1),
(NULL, 'Raisins secs',               'Fruit',     299,  3.1, 79,   0.5,  3.7),
(NULL, 'Cranberries séchées',        'Fruit',     308,  0.1, 82,   1.4,  5.7),

-- ═══════════════════════════════════════
-- LAITIERS — Fromages français (20)
-- ═══════════════════════════════════════
(NULL, 'Comté',                      'Laitier',   396, 28,   0,   31,    0),
(NULL, 'Roquefort',                  'Laitier',   369, 22,   2,   31,    0),
(NULL, 'Camembert',                  'Laitier',   300, 20,   0.5, 24,    0),
(NULL, 'Brie',                       'Laitier',   334, 20,   0.4, 28,    0),
(NULL, 'Chèvre bûche',               'Laitier',   268, 20,   1,   21,    0),
(NULL, 'Chèvre frais',               'Laitier',   148, 11,   2,   11,    0),
(NULL, 'Reblochon',                  'Laitier',   327, 20,   0.1, 27,    0),
(NULL, 'Emmental',                   'Laitier',   380, 28,   0.5, 29,    0),
(NULL, 'Gruyère',                    'Laitier',   413, 30,   0.4, 32,    0),
(NULL, 'Gouda',                      'Laitier',   356, 25,   2,   27,    0),
(NULL, 'Cheddar',                    'Laitier',   403, 25,   1.3, 33,    0),
(NULL, 'Feta',                       'Laitier',   264, 14,   4,   21,    0),
(NULL, 'Mascarpone',                 'Laitier',   429,  4,   3,   45,    0),
(NULL, 'Mozzarella di bufala',       'Laitier',   245, 17,   1,   20,    0),
(NULL, 'Bleu d''Auvergne',           'Laitier',   354, 19,   0.5, 30,    0),
(NULL, 'Saint-Nectaire',             'Laitier',   354, 22,   0.2, 28,    0),
(NULL, 'Mimolette',                  'Laitier',   383, 25,   0.5, 31,    0),
(NULL, 'Kiri',                       'Laitier',   298,  6.6, 4,   28,    0),
(NULL, 'Vache qui rit',              'Laitier',   273,  8,   7,   23,    0),
(NULL, 'Burrata',                    'Laitier',   330, 18,   2,   28,    0),

-- ═══════════════════════════════════════
-- LAITIERS — Yaourts & crèmes (10)
-- ═══════════════════════════════════════
(NULL, 'Yaourt nature sucré',        'Laitier',    85,  4,   13,   1.2,  0),
(NULL, 'Yaourt brassé',              'Laitier',    76,  4,   10,   1.5,  0),
(NULL, 'Yaourt aux fruits',          'Laitier',    97,  3.6, 15,   1.1,  0),
(NULL, 'Kéfir',                      'Laitier',    41,  3.3,  4.5, 1,    0),
(NULL, 'Lait entier',                'Laitier',    64,  3.2,  4.8, 3.5,  0),
(NULL, 'Lait écrémé',                'Laitier',    34,  3.4,  5,   0.2,  0),
(NULL, 'Crème fraîche épaisse 30%',  'Laitier',   292,  2.5,  3,  30,    0),
(NULL, 'Crème liquide 30%',          'Laitier',   292,  2.5,  3,  30,    0),
(NULL, 'Crème liquide 15%',          'Laitier',   160,  2.5,  3.5, 15,   0),
(NULL, 'Yaourt à boire',             'Laitier',    79,  3,   13,   1.5,  0),

-- ═══════════════════════════════════════
-- LIPIDES — Huiles (7)
-- ═══════════════════════════════════════
(NULL, 'Huile de colza',             'Lipide',    900,  0,    0, 100,    0),
(NULL, 'Huile de tournesol',         'Lipide',    899,  0,    0, 100,    0),
(NULL, 'Huile de sésame',            'Lipide',    884,  0,    0, 100,    0),
(NULL, 'Huile de lin',               'Lipide',    884,  0,    0, 100,    0),
(NULL, 'Huile d''avocat',            'Lipide',    884,  0,    0, 100,    0),
(NULL, 'Huile de noix',              'Lipide',    884,  0,    0, 100,    0),
(NULL, 'Huile d''argan',             'Lipide',    884,  0,    0, 100,    0),

-- ═══════════════════════════════════════
-- LIPIDES — Oléagineux & beurres (10)
-- ═══════════════════════════════════════
(NULL, 'Noix de pécan',              'Lipide',    691,  9,   14,  72,    9.6),
(NULL, 'Pistaches',                  'Lipide',    560, 20,   28,  45,   10),
(NULL, 'Noix du Brésil',             'Lipide',    659, 14,   12,  66,    7.5),
(NULL, 'Noisettes',                  'Lipide',    628, 15,   17,  61,    9.7),
(NULL, 'Graines de courge',          'Lipide',    559, 30,   11,  49,    6),
(NULL, 'Graines de sésame',          'Lipide',    573, 18,   23,  50,   12),
(NULL, 'Tahiné',                     'Lipide',    595, 17,   21,  53,    9.3),
(NULL, 'Pignons de pin',             'Lipide',    673, 14,   13,  68,    3.7),
(NULL, 'Beurre doux',                'Lipide',    717,  0.9,  0.1,81,    0),
(NULL, 'Ghee',                       'Lipide',    900,  0.3,  0,100,    0),

-- ═══════════════════════════════════════
-- LIPIDES — Olives (2)
-- ═══════════════════════════════════════
(NULL, 'Olives vertes',              'Lipide',    145,  1,    3.8,15,    3.3),
(NULL, 'Olives noires',              'Lipide',    115,  0.8,  6.3,11,    3.2),

-- ═══════════════════════════════════════
-- LÉGUMINEUSES — Variétés (6)
-- ═══════════════════════════════════════
(NULL, 'Lentilles vertes du Puy',    'Légumineuse', 115,  9,  20,   0.4,  8),
(NULL, 'Lentilles beluga cuites',    'Légumineuse', 119, 10,  20,   0.4,  7.8),
(NULL, 'Haricots noirs cuits',       'Légumineuse', 132,  9,  24,   0.5,  8.7),
(NULL, 'Pois chiches grillés',       'Légumineuse', 384, 20,  58,   7,   11),
(NULL, 'Houmous',                    'Légumineuse', 166,  8,  14,  10,    6),
(NULL, 'Falafels',                   'Légumineuse', 333, 13,  32,  18,    5),

-- ═══════════════════════════════════════
-- SNACKS — Chocolats & pâtisseries (12)
-- ═══════════════════════════════════════
(NULL, 'Chocolat au lait',           'Snack',     535,  7.6, 59,  30,    3),
(NULL, 'Chocolat blanc',             'Snack',     539,  5.9, 58,  30,    0),
(NULL, 'Nutella',                    'Snack',     539,  6.3, 58,  30,    0.5),
(NULL, 'Pâte à tartiner protéinée',  'Snack',     540, 25,   25,  32,    2),
(NULL, 'Speculoos',                  'Snack',     490,  6,   70,  20,    2),
(NULL, 'Oreo',                       'Snack',     480,  5,   70,  20,    2),
(NULL, 'Sablé',                      'Snack',     485,  6,   62,  23,    2),
(NULL, 'Cookie',                     'Snack',     480,  6,   63,  22,    2),
(NULL, 'Brownie',                    'Snack',     405,  4,   54,  20,    2),
(NULL, 'Macaron',                    'Snack',     410,  5,   58,  18,    2),
(NULL, 'Pain d''épices',             'Snack',     320,  5,   70,   2.5,  2),
(NULL, 'Nougat',                     'Snack',     420,  5,   75,  11,    1),

-- ═══════════════════════════════════════
-- SNACKS — Céréales petit-déjeuner (7)
-- ═══════════════════════════════════════
(NULL, 'Chocapic',                   'Snack',     402,  7,   74,   8,    5),
(NULL, 'Special K original',         'Snack',     375, 10,   77,   1.5,  3),
(NULL, 'Trésor Kellogg''s',          'Snack',     420,  6,   70,  13,    3),
(NULL, 'Corn Flakes',                'Snack',     378,  7,   84,   0.9,  3),
(NULL, 'Granola',                    'Snack',     446, 10,   65,  17,    8),
(NULL, 'Porridge instantané',        'Snack',     358, 11,   62,   7,    8),
(NULL, 'Barre Grany',                'Snack',     428,  7,   68,  14,    5),

-- ═══════════════════════════════════════
-- SNACKS — Sucres & glaces (5)
-- ═══════════════════════════════════════
(NULL, 'Sucre blanc',                'Snack',     400,  0,  100,   0,    0),
(NULL, 'Cassonade',                  'Snack',     380,  0,   98,   0,    0),
(NULL, 'Sirop d''érable',            'Snack',     260,  0,   67,   0,    0),
(NULL, 'Sirop d''agave',             'Snack',     310,  0,   76,   0,    0),
(NULL, 'Glace vanille',              'Snack',     207,  3.5, 24,  11,    0),

-- ═══════════════════════════════════════
-- BOISSONS (nouvelle catégorie) (12)
-- ═══════════════════════════════════════
(NULL, 'Café noir',                  'Boisson',     2,  0.1,  0,   0,    0),
(NULL, 'Thé vert',                   'Boisson',     1,  0,    0,   0,    0),
(NULL, 'Thé noir',                   'Boisson',     1,  0,    0,   0,    0),
(NULL, 'Lait de soja nature',        'Boisson',    33,  3,    1.2, 1.8,  0.3),
(NULL, 'Lait de soja vanille',       'Boisson',    56,  3,    7,   1.8,  0.3),
(NULL, 'Lait de riz',                'Boisson',    47,  0.3,  9.2, 1,    0),
(NULL, 'Lait de noisette',           'Boisson',    30,  0.4,  3.4, 1.6,  0),
(NULL, 'Jus d''orange',              'Boisson',    45,  0.7, 10,   0.2,  0.2),
(NULL, 'Jus de pomme',               'Boisson',    46,  0.1, 11,   0.1,  0.2),
(NULL, 'Coca-Cola',                  'Boisson',    42,  0,   10.6, 0,    0),
(NULL, 'Coca-Cola Zero',             'Boisson',     0.2, 0,   0,   0,    0),
(NULL, 'Red Bull',                   'Boisson',    45,  0,   11,   0,    0),

-- ═══════════════════════════════════════
-- CONDIMENTS & SAUCES (nouvelle catégorie) (13)
-- ═══════════════════════════════════════
(NULL, 'Moutarde',                   'Condiment',  66,  4.4,  5.3, 3.4,  3.3),
(NULL, 'Ketchup',                    'Condiment', 112,  1.7, 26,   0.4,  0.3),
(NULL, 'Mayonnaise',                 'Condiment', 680,  1.1,  0.6,75,    0),
(NULL, 'Mayonnaise allégée',         'Condiment', 290,  0.8,  8,  28,    0),
(NULL, 'Harissa',                    'Condiment',  92,  3,   13,   4,    5),
(NULL, 'Sauce soja',                 'Condiment',  53,  8,    5,   0.6,  0),
(NULL, 'Tamari',                     'Condiment',  60, 10,    6,   0.1,  0),
(NULL, 'Sauce tomate',               'Condiment',  70,  1.6,  9,   2.5,  2),
(NULL, 'Pesto',                      'Condiment', 473,  6,    5,  49,    2),
(NULL, 'Vinaigrette',                'Condiment', 430,  0.5,  3,  47,    0),
(NULL, 'Sauce barbecue',             'Condiment', 170,  1,   40,   0.5,  0.5),
(NULL, 'Vinaigre balsamique',        'Condiment',  88,  0.5, 17,   0,    0),
(NULL, 'Bouillon cube',              'Condiment', 213,  9,   15,  13,    0)

ON CONFLICT DO NOTHING;
