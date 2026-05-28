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

const fendiByUrl = new Map();
for (const line of source.split(/\r?\n/)) {
  const cols = [...line.matchAll(/"([^"]*)"/g)].map(match => match[1]);
  if (cols.length < 3 || cols[0] !== 'Fendi') continue;
  const [site, categoryName, siteUrl] = cols;
  fendiByUrl.set(siteUrl, { site, categoryName, siteUrl });
}

const mappings = [
  ['https://www.fendi.com/de-en/woman/bags/backpacks', '50000644'],
  ['https://www.fendi.com/de-en/woman/bags/shoulder-crossbody-bags', '50000639'],
  ['https://www.fendi.com/de-en/woman/bags/tote-bags', '50000640'],
  ['https://www.fendi.com/de-en/woman/bags/bucket-bags', '50000639'],
  ['https://www.fendi.com/de-en/woman/bags/boston-bags', '50000640'],
  ['https://www.fendi.com/de-en/woman/bags/clutches-pochette', '50000642'],
  ['https://www.fendi.com/de-en/woman/ready-to-wear/tops-shirts', '50000804'],
  ['https://www.fendi.com/de-en/woman/ready-to-wear/t-shirts-sweatshirts', '50000803'],
  ['https://www.fendi.com/de-en/woman/ready-to-wear/knitwear', '50021299'],
  ['https://www.fendi.com/de-en/woman/ready-to-wear/jackets', '50021360'],
  ['https://www.fendi.com/de-en/woman/ready-to-wear/dresses', '50000807'],
  ['https://www.fendi.com/de-en/woman/ready-to-wear/skirts', '50000808'],
  ['https://www.fendi.com/de-en/woman/ready-to-wear/pants-shorts', '50000810'],
  ['https://www.fendi.com/de-en/woman/ready-to-wear/coats-outerwear', '50021360'],
  ['https://www.fendi.com/de-en/woman/shoes/sneakers', '50003822'],
  ['https://www.fendi.com/de-en/woman/shoes/slides', '50000780'],
  ['https://www.fendi.com/de-en/woman/shoes/sandals-mules', '50003842'],
  ['https://www.fendi.com/de-en/woman/shoes/mocassins-loafers', '50003818'],
  ['https://www.fendi.com/de-en/woman/shoes/pumps-slingbacks', '50003830'],
  ['https://www.fendi.com/de-en/woman/shoes/boots-ankle-boots', '50004191'],
  ['https://www.fendi.com/de-en/woman/fashion-jewellery/earrings', '50004164'],
  ['https://www.fendi.com/de-en/woman/fashion-jewellery/rings', '50004155'],
  ['https://www.fendi.com/de-en/woman/fashion-jewellery/bracelets', '50004194'],
  ['https://www.fendi.com/de-en/woman/fashion-jewellery/necklaces', '50004174'],
  ['https://www.fendi.com/de-en/woman/accessories/sunglasses', '50000554'],
  ['https://www.fendi.com/de-en/woman/accessories/silk-scarves', '50004010'],
  ['https://www.fendi.com/de-en/woman/accessories/scarves-ponchos', '50004010'],
  ['https://www.fendi.com/de-en/woman/accessories/belts', '50000539'],
  ['https://www.fendi.com/de-en/woman/accessories/hair-accessories', '50000563'],
  ['https://www.fendi.com/de-en/woman/small-leather-goods_1/wallets', '50003982'],
  ['https://www.fendi.com/de-en/woman/small-leather-goods_1/card-holders', '50000662'],
  ['https://www.fendi.com/de-en/woman/small-leather-goods_1/pouches', '50000643'],
  ['https://www.fendi.com/de-en/man/ready-to-wear/t-shirts-polos', '50000830'],
  ['https://www.fendi.com/de-en/man/ready-to-wear/shirts', '50000833'],
  ['https://www.fendi.com/de-en/man/ready-to-wear/knitwear', '50021579'],
  ['https://www.fendi.com/de-en/man/ready-to-wear/denim-trousers', '50000836'],
  ['https://www.fendi.com/de-en/man/ready-to-wear/coats-outerwear', '50021640'],
  ['https://www.fendi.com/de-en/man/ready-to-wear/jackets-suits', '50021640'],
  ['https://www.fendi.com/de-en/man/ready-to-wear/coordinated-sets', '50000840'],
  ['https://www.fendi.com/de-en/man/shoes/sneakers', '50000788'],
  ['https://www.fendi.com/de-en/man/shoes/loafers-drivers', '50000787'],
  ['https://www.fendi.com/de-en/man/shoes/lace-ups-boots', '50000787'],
  ['https://www.fendi.com/de-en/man/shoes/slides-sandals', '50000789'],
  ['https://www.fendi.com/de-en/man/bags/pouches', '50000649'],
  ['https://www.fendi.com/de-en/man/bags/tote-bags', '50000647'],
  ['https://www.fendi.com/de-en/man/small-leather-goods_1/wallets', '50003985'],
  ['https://www.fendi.com/de-en/man/small-leather-goods_1/card-holders', '50000662'],
  ['https://www.fendi.com/de-en/man/small-leather-goods_1/pouches-other-accessories', '50000649'],
  ['https://www.fendi.com/de-en/man/accessories/sunglasses', '50000554'],
  ['https://www.fendi.com/de-en/man/accessories/belts', '50003989'],
  ['https://www.fendi.com/de-en/man/accessories/scarves', '50004010'],
  ['https://www.fendi.com/de-en/man/accessories/ties', '50004014'],
  ['https://www.fendi.com/de-en/man/fashion-jewellery/bracelets', '50004194'],
  ['https://www.fendi.com/de-en/man/fashion-jewellery/earrings', '50004164'],
  ['https://www.fendi.com/de-en/man/fashion-jewellery/necklaces', '50004174'],
  ['https://www.fendi.com/de-en/man/fashion-jewellery/rings', '50004155'],
];

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const rows = mappings.map(([siteUrl, code]) => {
  const sourceRow = fendiByUrl.get(siteUrl);
  if (!sourceRow) throw new Error(`Missing source row: ${siteUrl}`);
  const categoryName = codeToName.get(code);
  if (!categoryName) throw new Error(`Missing category code: ${code}`);

  return `(${[
    sqlString(sourceRow.site),
    sqlString(sourceRow.siteUrl),
    sqlString(sourceRow.categoryName),
    sqlString(categoryName),
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

fs.writeFileSync('fendi_mapping_insert.sql', sql, { encoding: 'utf8' });
console.log(`Wrote fendi_mapping_insert.sql (${rows.length} rows)`);
