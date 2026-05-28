const fs = require('fs');

const source = fs.readFileSync('source_mapping_current.txt', 'utf8');
const categorySource = fs.readFileSync('C:/Users/Owner/Desktop/smartsottrecateogry.txt', 'utf8');

const codeToName = new Map();
for (const line of categorySource.split(/\r?\n/)) {
  const match = line.match(/"(\d+)"\s+"([^"]+)"/);
  if (match) {
    codeToName.set(match[1], match[2]);
  }
}

const thomRows = [];
for (const line of source.split(/\r?\n/)) {
  const cols = [...line.matchAll(/"([^"]*)"/g)].map(match => match[1]);
  if (cols.length < 3 || cols[0] !== 'Thombrowne') continue;
  const [site, categoryName, siteUrl] = cols;
  thomRows.push({ site, categoryName, siteUrl });
}

const mappings = [
  ['MEN - READY TO WEAR - KNITWEAR & SWEATERS', 'https://www.thombrowne.com/en-eu/collections/mens-knitwear-sweaters', '50021579'],
  ['MEN - READY TO WEAR - SPORT COATS & TAILORING', 'https://www.thombrowne.com/en-eu/collections/mens-sport-coats-tailoring', '50021640'],
  ['MEN - READY TO WEAR - SHIRTS', 'https://www.thombrowne.com/en-eu/collections/mens-shirting', '50000833'],
  ['MEN - READY TO WEAR - SUITS', 'https://www.thombrowne.com/en-eu/collections/mens-suits', '50000840'],
  ['MEN - READY TO WEAR - COATS & OUTERWEAR', 'https://www.thombrowne.com/en-eu/collections/mens-outerwear', '50021640'],
  ['MEN - READY TO WEAR - PANTS', 'https://www.thombrowne.com/en-eu/collections/mens-pants', '50000836'],
  ['MEN - READY TO WEAR - CASUAL & SHIRT JACKETS', 'https://www.thombrowne.com/en-eu/collections/mens-casual-and-shirt-jackets', '50021640'],
  ['MEN - READY TO WEAR - T-SHIRTS & POLOS', 'https://www.thombrowne.com/en-eu/collections/mens-t-shirts-polos', '50000830'],
  ['MEN - READY TO WEAR - SHORTS', 'https://www.thombrowne.com/en-eu/collections/mens-shorts', '50000836'],
  ['MEN - BAGS & LEATHER GOODS - BRIEFCASES & TOTES', 'https://www.thombrowne.com/en-eu/collections/mens-briefcase-totes', '50000650'],
  ['MEN - BAGS & LEATHER GOODS - CROSSBODY BAGS', 'https://www.thombrowne.com/en-eu/collections/mens-crossbody-bags', '50000648'],
  ['MEN - BAGS & LEATHER GOODS - BACKPACKS', 'https://www.thombrowne.com/en-eu/collections/mens-backpacks-belt-bags', '50000651'],
  ['MEN - BAGS & LEATHER GOODS - WALLETS & CARDHOLDERS', 'https://www.thombrowne.com/en-eu/collections/mens-wallets-cardholders', '50000662'],
  ['MEN - FOOTWEAR - BROGUES & LOAFERS', 'https://www.thombrowne.com/en-eu/collections/mens-brogues-loafers', '50000787'],
  ['MEN - FOOTWEAR - SNEAKERS', 'https://www.thombrowne.com/en-eu/collections/mens-sneakers', '50000788'],
  ['MEN - FOOTWEAR - BOOTS', 'https://www.thombrowne.com/en-eu/collections/mens-boots', '50021999'],
  ['MEN - FOOTWEAR - SANDALS', 'https://www.thombrowne.com/en-eu/collections/mens-slippers-sandals', '50000789'],
  ['MEN - ACCESSORIES - EYEGLASSES', 'https://www.thombrowne.com/en-eu/collections/eyeglasses', '50000556'],
  ['MEN - ACCESSORIES - SUNGLASSES', 'https://www.thombrowne.com/en-eu/collections/sunglasses', '50000554'],
  ['MEN - ACCESSORIES - HATS', 'https://www.thombrowne.com/en-eu/collections/mens-hats', '50000546'],
  ['MEN - ACCESSORIES - TIES & TIE BARS', 'https://www.thombrowne.com/en-eu/collections/ties', '50004014'],
  ['WOMEN - READY TO WEAR - KNITWEAR & SWEATERS', 'https://www.thombrowne.com/en-eu/collections/womens-knitwear', '50021299'],
  ['WOMEN - READY TO WEAR - TOPS & SHIRTS', 'https://www.thombrowne.com/en-eu/collections/womens-tops-shirts', '50000804'],
  ['WOMEN - READY TO WEAR - DRESSES', 'https://www.thombrowne.com/en-eu/collections/womens-dresses', '50000807'],
  ['WOMEN - READY TO WEAR - SPORT COAT & TAILORING', 'https://www.thombrowne.com/en-eu/collections/womens-sport-coats-tailoring', '50021360'],
  ['WOMEN - READY TO WEAR - COATS & OUTERWEAR', 'https://www.thombrowne.com/en-eu/collections/womens-outerwear', '50021360'],
  ['WOMEN - READY TO WEAR - SKIRTS', 'https://www.thombrowne.com/en-eu/collections/womens-skirts', '50000808'],
  ['WOMEN - READY TO WEAR - T-SHIRTS & POLOS', 'https://www.thombrowne.com/en-eu/collections/womens-t-shirts-and-polos', '50000803'],
  ['WOMEN - READY TO WEAR - CASUAL JACKETS', 'https://www.thombrowne.com/en-eu/collections/womens-casual-jackets', '50021360'],
  ['WOMEN - READY TO WEAR - PANTS & SHORTS', 'https://www.thombrowne.com/en-eu/collections/womens-pants-shorts', '50000810'],
  ['WOMEN - BAGS & LEATHER GOODS - TOTES & TOP HANDLE BAGS', 'https://www.thombrowne.com/en-eu/collections/womens-totes-top-handle-bags', '50000640'],
  ['WOMEN - BAGS & LEATHER GOODS - CROSSBODY BAGS', 'https://www.thombrowne.com/en-eu/collections/womens-crossbody-bags', '50000641'],
  ['WOMEN - BAGS & LEATHER GOODS - PURSES & WALLETS', 'https://www.thombrowne.com/en-eu/collections/womens-purses-wallets', '50003982'],
  ['WOMEN - BAGS & LEATHER GOODS - POUCHES', 'https://www.thombrowne.com/en-eu/collections/womens-pouches', '50000643'],
  ['WOMEN - FOOTWEAR - BROGUES & LOAFERS', 'https://www.thombrowne.com/en-eu/collections/womens-brogues-loafers', '50003818'],
  ['WOMEN - FOOTWEAR - HEELS', 'https://www.thombrowne.com/en-eu/collections/womens-heels', '50003830'],
  ['WOMEN - FOOTWEAR - BOOTS', 'https://www.thombrowne.com/en-eu/collections/womens-boots', '50004191'],
  ['WOMEN - FOOTWEAR - SLIPPERS & SANDALS', 'https://www.thombrowne.com/en-eu/collections/womens-slippers-sandals', '50003842'],
  ['WOMEN - FOOTWEAR - SNEAKERS', 'https://www.thombrowne.com/en-eu/collections/womens-sneakers', '50003822'],
  ['WOMEN - ACCESSORIES - EYEGLASSES', 'https://www.thombrowne.com/en-eu/collections/eyeglasses', '50000556'],
  ['WOMEN - ACCESSORIES - SUNGLASSES', 'https://www.thombrowne.com/en-eu/collections/sunglasses', '50000554'],
  ['WOMEN - ACCESSORIES - TIES & TIE BARS', 'https://www.thombrowne.com/en-eu/collections/ties', '50004014'],
  ['WOMEN - ACCESSORIES - BROOCHES', 'https://www.thombrowne.com/en-eu/collections/brooches', '50004028'],
  ['WOMEN - ACCESSORIES - HAIR ACCESSORIES', 'https://www.thombrowne.com/en-eu/collections/womens-hair-accessories', '50000563'],
];

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const rows = mappings.map(([categoryName, siteUrl, code]) => {
  const sourceRow = thomRows.find(row => row.categoryName === categoryName && row.siteUrl === siteUrl);
  if (!sourceRow) throw new Error(`Missing source row: ${categoryName} / ${siteUrl}`);
  const godoMallCategoryName = codeToName.get(code);
  if (!godoMallCategoryName) throw new Error(`Missing category code: ${code}`);

  return `(${[
    sqlString(sourceRow.site),
    sqlString(sourceRow.siteUrl),
    sqlString(sourceRow.categoryName),
    sqlString(godoMallCategoryName),
    sqlString(code),
    'NULL',
    'NULL',
    sqlString('bcm499'),
    sqlString('smartstore_2'),
  ].join(', ')})`;
});

const sql = `INSERT INTO mapping (
  site,
  "siteUrl",
  "categoryName",
  "godoMallCategoryName",
  "godoMallCategoryCode",
  designers,
  "afterDesigners",
  "customId",
  "accountPlatform"
) VALUES
${rows.join(',\n')};
`;

fs.writeFileSync('thombrowne_mapping_insert.sql', sql, { encoding: 'utf8' });
console.log(`Wrote thombrowne_mapping_insert.sql (${rows.length} rows)`);
