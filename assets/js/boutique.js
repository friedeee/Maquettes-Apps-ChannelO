/* ==========================================================
   Données FICTIVES de la boutique « Montres Azur » (Cotonou).
   Partagées par les maquettes Catalogue, Commande et Paiement.
   Les photos sont dessinées en SVG : aucune image externe.
   ========================================================== */
'use strict';

(function () {
  var B = window.BOUTIQUE = {};

  B.entity = { name: 'Montres Azur', initials: 'MA', sub: 'Boutique · Cotonou · répond en moins d\'une heure' };
  B.categories = ['Hommes', 'Femmes', 'Connectées', 'Accessoires'];

  /* art : forme du boîtier (round / square / band / box), couleurs du cadran, du bracelet, du fond */
  B.seed = function () {
    return [
      { id: 'p1', name: 'Montre Classique Acier', cat: 'Hommes', price: 35000, stock: 8, desc: 'Boîtier acier 40 mm, verre minéral, étanche 30 m. Garantie 1 an.', variants: [{ label: 'Couleur', options: ['Argent', 'Noir'] }], art: { shape: 'round', dial: '#F4F6FA', strap: '#9AA3B2', bg: '#E8EEF8' }, photos: 3 },
      { id: 'p2', name: 'Montre Dorée Élégance', cat: 'Femmes', price: 42000, stock: 4, desc: 'Boîtier doré 32 mm, bracelet maille milanaise, fermoir aimanté.', variants: [{ label: 'Taille du poignet', options: ['S', 'M', 'L'] }], art: { shape: 'round', dial: '#FFF7E6', strap: '#D4A64A', bg: '#FBF1DD' }, photos: 4 },
      { id: 'p3', name: 'Montre Connectée Sport', cat: 'Connectées', price: 28500, stock: 12, desc: 'Écran couleur, suivi des pas et du sommeil, autonomie 7 jours.', variants: [{ label: 'Couleur', options: ['Noir', 'Bleu', 'Rose'] }], art: { shape: 'square', dial: '#111827', strap: '#1F3A80', bg: '#E3E9F7' }, photos: 5 },
      { id: 'p4', name: 'Montre Cuir Marron', cat: 'Hommes', price: 31000, stock: 0, desc: 'Bracelet cuir véritable, cadran crème, boîtier 41 mm.', variants: [], art: { shape: 'round', dial: '#FBF3E4', strap: '#7A4A2A', bg: '#F3E7DA' }, photos: 2 },
      { id: 'p5', name: 'Montre Enfant Arc-en-ciel', cat: 'Connectées', price: 15000, stock: 20, desc: 'Silicone doux, chiffres lisibles, résistante aux chocs.', variants: [{ label: 'Couleur', options: ['Rouge', 'Vert', 'Jaune'] }], art: { shape: 'round', dial: '#FFFFFF', strap: '#E25555', bg: '#FDE8E8' }, photos: 2 },
      { id: 'p6', name: 'Montre Céramique Blanche', cat: 'Femmes', price: 54000, stock: 2, desc: 'Céramique blanche, cadran nacré, mouvement à quartz.', variants: [], art: { shape: 'round', dial: '#F7F2EE', strap: '#F1EFEA', bg: '#ECEFF4' }, photos: 3 },
      { id: 'p7', name: 'Bracelet Cuir de rechange', cat: 'Accessoires', price: 6500, stock: 30, desc: 'Largeur 20 mm, pompes rapides, s\'adapte à la plupart des montres.', variants: [{ label: 'Couleur', options: ['Marron', 'Noir'] }], art: { shape: 'band', dial: '#7A4A2A', strap: '#7A4A2A', bg: '#F3E7DA' }, photos: 1 },
      { id: 'p8', name: 'Écrin de rangement', cat: 'Accessoires', price: 9000, stock: 6, desc: 'Écrin 6 places, intérieur velours, fermeture à clé.', variants: [], art: { shape: 'box', dial: '#1F3A80', strap: '#0E1A38', bg: '#E3E9F7' }, photos: 1, hidden: true },
      { id: 'p9', name: 'Montre Plongée Bleue', cat: 'Hommes', price: 47500, stock: 3, desc: 'Lunette tournante, étanche 100 m, aiguilles luminescentes.', variants: [], art: { shape: 'round', dial: '#0B3A8C', strap: '#30394A', bg: '#DCE6F7' }, photos: 4 }
    ];
  };

  /* Catalogue de 300 produits, pour montrer que la recherche suffit */
  B.many = function () {
    var base = B.seed(), names = ['Montre', 'Chrono', 'Montre connectée', 'Bracelet', 'Montre de poche'], adj = ['Acier', 'Dorée', 'Noire', 'Sport', 'Fine', 'Vintage', 'Bleue', 'Rose', 'Titane', 'Céramique'];
    var out = base.slice();
    for (var i = out.length; i < 300; i++) {
      var b = base[i % base.length];
      out.push({ id: 'g' + i, name: names[i % names.length] + ' ' + adj[(i * 7) % adj.length] + ' ' + (100 + i), cat: B.categories[i % 4], price: 5000 + (i * 1370) % 60000, stock: (i % 9 === 0) ? 0 : (i % 13) + 1, desc: b.desc, variants: [], art: b.art, photos: 1 });
    }
    return out;
  };

  B.art = function (a, cls) {
    a = a || {};
    var bg = a.bg || '#E8EEF8', s = a.strap || '#9AA3B2', d = a.dial || '#fff';
    var body;
    if (a.shape === 'band') {
      body = '<rect x="86" y="18" width="28" height="164" rx="12" fill="' + s + '"/><circle cx="100" cy="150" r="4" fill="#0003"/><circle cx="100" cy="130" r="4" fill="#0003"/><rect x="80" y="40" width="40" height="14" rx="4" fill="#C9CED6"/>';
    } else if (a.shape === 'box') {
      body = '<rect x="38" y="70" width="124" height="80" rx="10" fill="' + s + '"/><rect x="38" y="58" width="124" height="26" rx="8" fill="' + d + '"/><rect x="92" y="78" width="16" height="12" rx="3" fill="#D4A64A"/>';
    } else {
      var face = a.shape === 'square'
        ? '<rect x="58" y="58" width="84" height="84" rx="20" fill="#2B2F38"/><rect x="66" y="66" width="68" height="68" rx="14" fill="' + d + '"/><text x="100" y="106" font-family="Exo 2, sans-serif" font-size="20" font-weight="700" fill="#7FB0FF" text-anchor="middle">10:24</text>'
        : '<circle cx="100" cy="100" r="44" fill="#C9CED6"/><circle cx="100" cy="100" r="37" fill="' + d + '"/><path d="M100 100V74M100 100l17 9" stroke="#1F2937" stroke-width="4" stroke-linecap="round"/><circle cx="100" cy="100" r="4" fill="#1F2937"/><path d="M100 67v5M133 100h-5M100 133v-5M67 100h5" stroke="#1F293799" stroke-width="3" stroke-linecap="round"/><rect x="142" y="94" width="8" height="12" rx="2" fill="#C9CED6"/>';
      body = '<rect x="80" y="10" width="40" height="60" rx="10" fill="' + s + '"/><rect x="80" y="130" width="40" height="60" rx="10" fill="' + s + '"/>' + face;
    }
    return '<svg class="art ' + (cls || '') + '" viewBox="0 0 200 200" role="img" aria-label="Photo du produit"><rect width="200" height="200" fill="' + bg + '"/>' + body + '</svg>';
  };

  B.stockBadge = function (p) {
    if (p.hidden) return '<span class="badge">Masqué</span>';
    if (p.stock === 0) return '<span class="badge badge--bad">Épuisé</span>';
    if (p.stock <= 3) return '<span class="badge badge--warn">Plus que ' + p.stock + '</span>';
    return '<span class="badge badge--ok">Disponible</span>';
  };
})();
