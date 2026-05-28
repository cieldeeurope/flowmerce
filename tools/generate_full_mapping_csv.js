const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INPUT = path.join(ROOT, 'mapping_full_input.txt');
const OUTPUT = path.join(ROOT, 'full_celine_to_brunello_mapping.csv');
const OUTPUT_EXCEL = path.join(ROOT, 'full_celine_to_brunello_mapping_excel.csv');
const SKIPPED = path.join(ROOT, 'full_celine_to_brunello_mapping_skipped.csv');

const FIXED = {
  designers: '',
  afterDesigners: '',
  customId: 'bcm499',
  accountPlatform: 'smartstore_2',
};

const C = {
  women: {
    jacket: ['패션의류>여성의류>아우터>재킷', '50021360'],
    coat: ['패션의류>여성의류>아우터>기타 코트', '50021479'],
    trench: ['패션의류>여성의류>아우터>트렌치코트', '50021419'],
    padding: ['패션의류>여성의류>아우터>패딩', '50021321'],
    jumper: ['패션의류>여성의류>아우터>점퍼', '50000814'],
    leatherJacket: ['패션의류>여성의류>아우터>가죽자켓', '50021320'],
    vest: ['패션의류>여성의류>아우터>베스트', '50021441'],
    knit: ['패션의류>여성의류>니트>스웨터', '50021299'],
    cardigan: ['패션의류>여성의류>니트>카디건', '50021319'],
    dress: ['패션의류>여성의류>원피스', '50000807'],
    tshirt: ['패션의류>여성의류>티셔츠', '50000803'],
    shirt: ['패션의류>여성의류>블라우스/셔츠', '50000804'],
    pants: ['패션의류>여성의류>바지', '50000810'],
    jeans: ['패션의류>여성의류>청바지', '50000809'],
    skirt: ['패션의류>여성의류>스커트', '50000808'],
    shorts: ['패션의류>여성의류>바지', '50000810'],
    suitSet: ['패션의류>여성의류>정장세트', '50000816'],
    swimwear: ['패션의류>여성의류>수영복', '50000819'],
    tote: ['패션잡화>여성가방>토트백', '50000640'],
    shoulder: ['패션잡화>여성가방>숄더백', '50000639'],
    crossbody: ['패션잡화>여성가방>크로스백', '50000641'],
    backpack: ['패션잡화>여성가방>백팩', '50000642'],
    clutch: ['패션잡화>여성가방>클러치백', '50000638'],
    pouch: ['패션잡화>여성가방>파우치', '50000643'],
    beltBag: ['패션잡화>여성가방>힙색/슬링백', '50000645'],
    bucket: ['패션잡화>여성가방>숄더백', '50000639'],
    boston: ['패션잡화>여성가방>토트백', '50000640'],
    wallet: ['패션잡화>지갑>여성지갑>반지갑', '50003982'],
    longWallet: ['패션잡화>지갑>여성지갑>장지갑', '50003984'],
    cardWallet: ['패션잡화>지갑>카드/명함지갑', '50000662'],
    sneakers: ['패션잡화>여성신발>운동화>스니커즈', '50003822'],
    boots: ['패션잡화>여성신발>부츠>앵클/숏부츠', '50004191'],
    sandals: ['패션잡화>여성신발>샌들>스트랩샌들', '50003842'],
    pumps: ['패션잡화>여성신발>힐/펌프스>펌프스', '50003830'],
    slingback: ['패션잡화>여성신발>힐/펌프스>슬링백', '50003832'],
    flats: ['패션잡화>여성신발>단화>플랫', '50003817'],
    loafers: ['패션잡화>여성신발>단화>로퍼', '50003818'],
    slippers: ['패션잡화>여성신발>단화>슬립온', '50003821'],
    espadrilles: ['패션잡화>여성신발>단화>슬립온', '50003821'],
    belt: ['패션잡화>벨트>여성벨트', '50000539'],
  },
  men: {
    jacket: ['패션의류>남성의류>아우터>재킷', '50021640'],
    coat: ['패션의류>남성의류>아우터>기타 코트', '50021759'],
    trench: ['패션의류>남성의류>아우터>트렌치코트', '50021719'],
    padding: ['패션의류>남성의류>아우터>패딩', '50021660'],
    jumper: ['패션의류>남성의류>아우터>점퍼', '50000839'],
    leatherJacket: ['패션의류>남성의류>아우터>가죽자켓', '50021659'],
    vest: ['패션의류>남성의류>아우터>베스트', '50021699'],
    knit: ['패션의류>남성의류>니트>스웨터', '50021579'],
    cardigan: ['패션의류>남성의류>니트>카디건', '50021599'],
    tshirt: ['패션의류>남성의류>티셔츠', '50000830'],
    shirt: ['패션의류>남성의류>셔츠/남방', '50000833'],
    pants: ['패션의류>남성의류>바지', '50000836'],
    jeans: ['패션의류>남성의류>청바지', '50000835'],
    shorts: ['패션의류>남성의류>바지', '50000836'],
    suitSet: ['패션의류>남성의류>정장세트', '50000840'],
    swimwear: ['패션의류>남성의류>수영복', '50000845'],
    tote: ['패션잡화>남성가방>토트백', '50000647'],
    shoulder: ['패션잡화>남성가방>숄더백', '50000646'],
    crossbody: ['패션잡화>남성가방>크로스백', '50000648'],
    backpack: ['패션잡화>남성가방>백팩', '50000651'],
    clutch: ['패션잡화>남성가방>클러치백', '50000649'],
    pouch: ['패션잡화>남성가방>클러치백', '50000649'],
    beltBag: ['패션잡화>남성가방>힙색/슬링백', '50000652'],
    messenger: ['패션잡화>남성가방>메신저백', '50017420'],
    briefcase: ['패션잡화>남성가방>서류가방', '50000650'],
    wallet: ['패션잡화>지갑>남성지갑>반지갑', '50003985'],
    longWallet: ['패션잡화>지갑>남성지갑>장지갑', '50003987'],
    cardWallet: ['패션잡화>지갑>카드/명함지갑', '50000662'],
    sneakers: ['패션잡화>남성신발>스니커즈', '50000788'],
    boots: ['패션잡화>남성신발>부츠>앵클/숏부츠', '50021999'],
    sandals: ['패션잡화>남성신발>샌들', '50000789'],
    loafers: ['패션잡화>남성신발>구두', '50000787'],
    slippers: ['패션잡화>남성신발>슬립온', '50000783'],
    espadrilles: ['패션잡화>남성신발>슬립온', '50000783'],
    belt: ['패션잡화>벨트>남성벨트>캐주얼벨트', '50003989'],
  },
  common: {
    sunglasses: ['패션잡화>선글라스/안경테>선글라스', '50000554'],
    hat: ['패션잡화>모자>사파리모자', '50000543'],
    scarfLong: ['패션잡화>패션소품>스카프/머플러>롱', '50004010'],
    hairBand: ['패션잡화>헤어액세서리>헤어밴드', '50000560'],
    necklace: ['패션잡화>주얼리>목걸이>패션목걸이', '50004174'],
    earrings: ['패션잡화>주얼리>귀걸이>패션귀걸이', '50004164'],
    ring: ['패션잡화>주얼리>반지>패션반지', '50004155'],
    bracelet: ['패션잡화>주얼리>팔찌>패션팔찌', '50004194'],
  },
};

const skipWords = [
  'view all', 'all products', 'all ready-to-wear', 'all ready to wear', 'the entire collection',
  'entire collection', 'new arrivals', 'new in', 'new bags', 'new accessories', 'new ready to wear',
  'highlights', 'highlight', 'runway', 'campaign', 'gifts', 'gift', 'books', 'fragrances', 'beauty',
  'perfume', 'make-up', 'publications', 'resort', 'occasion edit', 'mother', 'holiday', 'icons',
  'collection book cover', 'personnaliser', 'personalise', 'customize', 'customise', 'my gommino',
  'travelwear', 'activewear', 'leather goods', 'small leather goods', 'accessories', 'bags by collection',
  'ready-to-wear - c', 'bags - c', 'shoes - c', 'ready to wear - ready to wear', 'ready-to-wear - ready-to-wear',
  'bags - bags', 'shoes - shoes', 'new_in', 'boys', 'girls', 'junior', 'kids', 'children', 'baby',
  'mode enfant', '베이비', '키즈', '아동', '주니어',
];

const vagueLeafWords = new Set([
  'new', 'more-lines', 'more lines', 'c', 'all', 'view all', 'bags', 'handbags', 'sacs', 'shoes',
  'ready-to-wear', 'ready to wear', 'accessories', 'leather goods', 'small leather goods',
  'more', 'lines', 'line', 'collection', 'collections',
]);

function parseRows(text) {
  return text.split(/\r?\n/)
    .map(line => {
      const m = [...line.matchAll(/"([^"]*)"/g)].map(x => x[1]);
      if (m.length < 3) return null;
      return { site: m[0].trim(), categoryName: m[1].trim(), siteUrl: m[2].trim() };
    })
    .filter(row => row && row.site && row.categoryName && row.siteUrl);
}

function norm(value) {
  return value
    .toLowerCase()
    .replace(/[·∙＆]/g, ' ')
    .replace(/[_]/g, ' ')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(row) {
  const all = norm(`${row.categoryName} ${row.siteUrl}`);
  const parts = norm(row.categoryName)
    .split(/\s+-\s+|\/|>| - |-/)
    .map(x => x.trim())
    .filter(Boolean);
  return { all, parts, last: parts[parts.length - 1] || '' };
}

function genderOf(row, t) {
  const s = ` ${norm(row.categoryName)} ${norm(row.siteUrl)} `;
  if (s.includes('남성') || s.includes('남자') || s.includes('herrenschuhe') || s.includes('herrenbekleidung')) return 'men';
  if (s.includes('여성') || s.includes('여자') || s.includes('damenschuhe') || s.includes('damenbekleidung')) return 'women';
  if (/(^|[\s\/-])(men|mens|man|남성|homme)([\s\/-]|$)/.test(s) || s.includes('남성 ') || s.includes(' man ')) return 'men';
  if (/(^|[\s\/-])(women|womens|woman|female|여성|femme)([\s\/-]|$)/.test(s) || s.includes('여성 ') || s.includes(' woman ')) return 'women';
  return 'women';
}

function hasAny(text, arr) {
  return arr.some(x => text.includes(x));
}

function isSkip(row, t) {
  const s = t.all;
  if (vagueLeafWords.has(t.last)) return true;
  if (skipWords.some(w => s.includes(w))) return true;
  if (/\bdenim\b/.test(s) || s.includes('데님')) return true;
  if (/\bsocks?\b/.test(s) || s.includes('chaussettes') || s.includes('양말')) return true;
  if (s.includes('여아') || s.includes('남아') || s.includes('fuer-maedchen') || s.includes('fuer-jungen')) return true;
  if (s.includes('underwear') || s.includes('lingerie') || s.includes('pajamas') || s.includes('pyjamas') || s.includes('언더웨어')) return true;
  if (s.includes('key ring') || s.includes('keyring') || s.includes('key rings') || s.includes('bag charm') || s.includes('charms')) return true;
  if (s.includes('tech accessories') || s.includes('phone') || s.includes('watch') || s.includes('bracelets') && s.includes('horlogerie')) return true;
  return false;
}

function pick(row) {
  const t = tokens(row);
  if (isSkip(row, t)) return null;
  const g = genderOf(row, t);
  const G = C[g];
  const s = t.all;
  const last = t.last;

  // Jewelry is intentionally genderless.
  if (hasAny(s, ['earrings', 'boucles d', '귀걸이'])) return C.common.earrings;
  if (hasAny(s, ['necklace', 'collier', 'pendant', '목걸이'])) return C.common.necklace;
  if (hasAny(s, ['bracelet', '팔찌'])) return C.common.bracelet;
  if (hasAny(s, ['ring', 'bague', '반지'])) return C.common.ring;

  // Accessories.
  if (hasAny(s, ['tie band', 'hair band', 'headband', 'accessoires pour cheveux', 'hair accessories', '헤어'])) return C.common.hairBand;
  if (hasAny(s, ['sunglasses', 'eyewear', 'glasses', 'lunettes', '선글라스', '아이웨어'])) return C.common.sunglasses;
  if (hasAny(s, ['scarves', 'scarfs', 'scarf', 'shawls', 'shawl', 'stoles', 'stole', 'foulard', 'twilly', 'écharpes', 'carrés', '머플러', '스카프'])) return C.common.scarfLong;
  if (hasAny(s, ['hats', 'hat', 'caps', 'cap', 'beanies', 'beanie', 'chapeaux', '모자'])) return C.common.hat;
  if (hasAny(s, ['belts', 'belt', 'ceintures', '벨트'])) return G.belt;

  // Wallets and small leather goods.
  if (hasAny(s, ['card holders', 'card holder', 'cardholders', 'card cases', 'card-cases', 'porte-cartes', 'coin purses', 'coin-and-card', 'wallets & card', 'wallets and card', '카드'])) return G.cardWallet;
  if (hasAny(s, ['long wallets', 'large-wallets', 'large wallets', 'continental wallets'])) return G.longWallet;
  if (hasAny(s, ['wallets', 'wallet', 'portefeuilles', '지갑'])) return G.wallet;

  // Bags. Bag rules must run before clothing rules, but only on bag-ish contexts.
  const bagContext = hasAny(s, ['bags', 'bag', 'handbags', 'sacs', '가방', 'travel']) || hasAny(last, ['totes', 'shopper', 'clutch', 'pouch', 'backpack']);
  if (bagContext) {
    if (hasAny(s, ['belt bags', 'belt-bags', 'belted', 'hip', 'sling'])) return G.beltBag;
    if (hasAny(s, ['messenger'])) return G.messenger || G.crossbody;
    if (hasAny(s, ['briefcases', 'briefcase', 'porte-documents'])) return G.briefcase || G.tote;
    if (hasAny(s, ['backpacks', 'backpack', '백팩'])) return G.backpack;
    if (hasAny(s, ['clutches', 'clutch', 'pochette', 'pochettes'])) return G.clutch;
    if (hasAny(s, ['pouches', 'pouch'])) return G.pouch;
    if (hasAny(s, ['cross-body', 'crossbody', 'cross body', 'bandoulière', 'bandouliere', 'shoulder and crossbody'])) return G.crossbody;
    if (hasAny(s, ['shoulder', '숄더'])) return G.shoulder;
    if (hasAny(s, ['top handle', 'top handles', 'top-handles', 'sacs à main', 'sacs a main'])) return G.tote;
    if (hasAny(s, ['tote', 'totes', 'shopper', 'shopping', 'cabas', 'basket', 'baskets', 'panier', 'boston', 'travel-bags', 'luggage', '토트'])) return G.tote;
    if (hasAny(s, ['bucket', 'hobo', 'mini bags', 'mini-bags', 'mini et micro', 'micro sacs'])) return G.shoulder;
  }

  // Shoes.
  const shoeContext = hasAny(s, ['shoes', 'shoe', 'footwear', 'chaussures', 'souliers', 'sneakers', 'boots', 'sandals', 'mules', 'loafers', 'pumps', 'ballerinas', 'ballet', '신발', '슈즈']);
  if (shoeContext) {
    if (hasAny(s, ['sneakers', 'sneaker', '스니커즈'])) return G.sneakers;
    if (hasAny(s, ['boots', 'booties', 'ankle boots', 'bottines', '부츠'])) return G.boots;
    if (hasAny(s, ['sandals', 'sandales', 'mules', 'slides', 'slide', '샌들'])) return G.sandals;
    if (hasAny(s, ['espadrilles'])) return G.espadrilles;
    if (hasAny(s, ['pumps', 'heels', 'heel', 'slingbacks', 'slingback', 'escapins', 'escarpins'])) return hasAny(s, ['slingback']) ? G.slingback || G.pumps : G.pumps;
    if (hasAny(s, ['ballerinas', 'ballerina', 'ballet', 'flats', 'flat', '플랫'])) return G.flats;
    if (hasAny(s, ['loafers', 'moccasins', 'mocassin', 'derbies', 'brogues', 'lace-ups'])) return G.loafers;
    if (hasAny(s, ['slippers', 'slipper'])) return G.slippers;
    return null;
  }

  // Ready-to-wear.
  if (hasAny(s, ['knitwear and sweatshirts', 'knitwear-and-sweatshirts', 'mailles-et-sweatshirts', 'knitwearandsweatshirts'])) return G.knit;
  if (hasAny(s, ['hoodies', 'hoodie', 'sweatshirts', 'sweatshirt', 'jersey', 'fleecewear', 'fleece'])) return G.tshirt;
  if (hasAny(s, ['t-shirts', 't shirts', 'tee-shirts', 'tees', 'polos', 'polo', 'tops & t-shirts', 'tops and t-shirts'])) return G.tshirt;
  if (hasAny(s, ['shirts', 'shirt', 'blouses', 'blouse', 'tops & shirts', 'tops and shirts', 'camicie', '셔츠', '블라우스'])) return G.shirt;
  if (/\b(vest|vests|waistcoat|waist coat)\b/.test(s) || s.includes('웨이스트 코트')) return G.vest;
  if (hasAny(s, ['leather', 'shearling', 'cuir', '가죽']) && hasAny(s, ['jacket', 'outerwear', 'coats', '아우터'])) return G.leatherJacket;
  if (hasAny(s, ['down jacket', 'down jackets', '다운'])) return G.padding;
  if (hasAny(s, ['bomber', '봄버'])) return G.jumper;
  if (hasAny(s, ['trench', '트렌치'])) return G.trench;
  if (hasAny(s, ['coats & jackets', 'coats and jackets', 'jackets & coats', 'jackets and coats', 'coats · jackets', '코트 재킷', '파카 재킷', 'coats and outerwear', 'jacket', 'jackets', 'blazer', 'blazers', 'outerwear', '아우터', '재킷', '블레이저', '파카'])) return G.jacket;
  if (hasAny(s, ['coats', 'coat', 'manteaux', '코트'])) return G.coat;
  if (hasAny(s, ['matching sets', 'sets', 'suits', 'suit', 'tailoring', 'costumes', 'outfits', '수트', '정장'])) return G.suitSet;
  if (hasAny(s, ['cardigans', 'cardigan', '카디건'])) return G.cardigan;
  if (hasAny(s, ['knitwear and sweatshirts', 'knitwear-and-sweatshirts', 'mailles-et-sweatshirts', 'knitwearandsweatshirts'])) return G.knit;
  if (hasAny(s, ['knitwear', 'knit', 'sweaters', 'sweater', 'mailles', 'pulls', '니트', '스웨터'])) return G.knit;
  if (hasAny(s, ['후디', '스웨트셔츠'])) return G.tshirt;
  if (hasAny(s, ['티셔츠', '탑'])) return G.tshirt;
  if (hasAny(s, ['dresses', 'dress', 'gowns', 'jumpsuits', 'robe', 'robes', '원피스', '드레스', '점프수트'])) return G.dress;
  if (hasAny(s, ['skirts', 'skirt', 'jupes', '스커트'])) return G.skirt;
  if (hasAny(s, ['shorts', 'short', '쇼츠'])) return G.shorts;
  if (hasAny(s, ['trousers', 'pants', 'pantalons', '바지', '트라우저', '팬츠'])) return G.pants;
  if (hasAny(s, ['jeans', '청바지'])) return G.jeans;
  if (hasAny(s, ['swimwear', 'beachwear', 'maillots de bain', '스윔웨어'])) return G.swimwear;

  return null;
}

function csvValue(value) {
  const v = String(value ?? '');
  return `"${v.replace(/"/g, '""')}"`;
}

function toCsv(rows, headers) {
  return [
    headers.map(csvValue).join(','),
    ...rows.map(row => headers.map(h => csvValue(row[h])).join(',')),
  ].join('\r\n') + '\r\n';
}

const input = fs.readFileSync(INPUT, 'utf8');
const rows = parseRows(input);
const mapped = [];
const skipped = [];
const seen = new Set();

for (const row of rows) {
  const picked = pick(row);
  if (!picked) {
    skipped.push({ ...row, reason: 'ambiguous_or_excluded' });
    continue;
  }
  const [godoMallCategoryName, godoMallCategoryCode] = picked;
  const key = [row.site, row.siteUrl, godoMallCategoryCode, FIXED.customId, FIXED.accountPlatform].join('\u0000');
  if (seen.has(key)) continue;
  seen.add(key);
  mapped.push({
    site: row.site,
    siteUrl: row.siteUrl,
    categoryName: row.categoryName,
    godoMallCategoryName,
    godoMallCategoryCode,
    designers: FIXED.designers,
    afterDesigners: FIXED.afterDesigners,
    customId: FIXED.customId,
    accountPlatform: FIXED.accountPlatform,
  });
}

const headers = ['site', 'siteUrl', 'categoryName', 'godoMallCategoryName', 'godoMallCategoryCode', 'designers', 'afterDesigners', 'customId', 'accountPlatform'];
const csv = toCsv(mapped, headers);
fs.writeFileSync(OUTPUT, csv, 'utf8');
fs.writeFileSync(OUTPUT_EXCEL, '\ufeff' + csv, 'utf8');
fs.writeFileSync(SKIPPED, toCsv(skipped, ['site', 'siteUrl', 'categoryName', 'reason']), 'utf8');

const bySite = new Map();
for (const row of mapped) bySite.set(row.site, (bySite.get(row.site) || 0) + 1);
console.log(`input=${rows.length}`);
console.log(`mapped=${mapped.length}`);
console.log(`skipped=${skipped.length}`);
for (const [site, count] of [...bySite.entries()].sort()) {
  console.log(`${site}\t${count}`);
}
console.log(OUTPUT);
console.log(OUTPUT_EXCEL);
console.log(SKIPPED);
