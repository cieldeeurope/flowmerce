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

const brunelloByUrl = new Map();
for (const line of source.split(/\r?\n/)) {
  const cols = [...line.matchAll(/"([^"]*)"/g)].map(match => match[1]);
  if (cols.length < 3 || cols[0] !== 'Brunello') continue;
  const [site, categoryName, siteUrl] = cols;
  brunelloByUrl.set(siteUrl, { site, categoryName, siteUrl });
}

const mappings = [
  ['https://shop.brunellocucinelli.com/en-fr/women/ready-to-wear/coats-jackets/', '50021360'],
  ['https://shop.brunellocucinelli.com/en-fr/women/ready-to-wear/knitwear/', '50021299'],
  ['https://shop.brunellocucinelli.com/en-fr/women/ready-to-wear/blazers/', '50021360'],
  ['https://shop.brunellocucinelli.com/en-fr/women/ready-to-wear/dresses-jumpsuits/', '50000807'],
  ['https://shop.brunellocucinelli.com/en-fr/women/ready-to-wear/matching-sets/', '50000816'],
  ['https://shop.brunellocucinelli.com/en-fr/women/ready-to-wear/t-shirts-tops/', '50000803'],
  ['https://shop.brunellocucinelli.com/en-fr/women/ready-to-wear/shirts/', '50000804'],
  ['https://shop.brunellocucinelli.com/en-fr/women/ready-to-wear/skirts/', '50000808'],
  ['https://shop.brunellocucinelli.com/en-fr/women/ready-to-wear/pants/', '50000810'],
  ['https://shop.brunellocucinelli.com/en-fr/women/shoes/heels/', '50003830'],
  ['https://shop.brunellocucinelli.com/en-fr/women/shoes/sneakers/', '50003822'],
  ['https://shop.brunellocucinelli.com/en-fr/women/shoes/boots/', '50004191'],
  ['https://shop.brunellocucinelli.com/en-fr/women/shoes/loafers-flat-shoes/', '50003818'],
  ['https://shop.brunellocucinelli.com/en-fr/women/shoes/sandals/', '50003842'],
  ['https://shop.brunellocucinelli.com/en-fr/women/bags/mini-bags-clutches/', '50000642'],
  ['https://shop.brunellocucinelli.com/en-fr/women/bags/crossbody-bags/', '50000641'],
  ['https://shop.brunellocucinelli.com/en-fr/women/bags/handbags-shoppers/', '50000640'],
  ['https://shop.brunellocucinelli.com/en-fr/women/accessories/womens-eyewear/', '50000554'],
  ['https://shop.brunellocucinelli.com/en-fr/women/accessories/small-leather-goods/', '50003982'],
  ['https://shop.brunellocucinelli.com/en-fr/women/accessories/scarves/', '50004010'],
  ['https://shop.brunellocucinelli.com/en-fr/women/accessories/hats/', '50000543'],
  ['https://shop.brunellocucinelli.com/en-fr/women/accessories/belts/', '50000539'],
  ['https://shop.brunellocucinelli.com/en-fr/men/ready-to-wear/coats-jackets/', '50021640'],
  ['https://shop.brunellocucinelli.com/en-fr/men/ready-to-wear/knitwear/', '50021579'],
  ['https://shop.brunellocucinelli.com/en-fr/men/ready-to-wear/blazers/', '50021640'],
  ['https://shop.brunellocucinelli.com/en-fr/men/ready-to-wear/suits/', '50000840'],
  ['https://shop.brunellocucinelli.com/en-fr/men/ready-to-wear/tuxedos/', '50000840'],
  ['https://shop.brunellocucinelli.com/en-fr/men/ready-to-wear/t-shirts-polos/', '50000830'],
  ['https://shop.brunellocucinelli.com/en-fr/men/ready-to-wear/shirts/', '50000833'],
  ['https://shop.brunellocucinelli.com/en-fr/men/ready-to-wear/pants/', '50000836'],
  ['https://shop.brunellocucinelli.com/en-fr/men/shoes/sneakers/', '50000788'],
  ['https://shop.brunellocucinelli.com/en-fr/men/shoes/lace-ups/', '50000787'],
  ['https://shop.brunellocucinelli.com/en-fr/men/shoes/loafers/', '50000787'],
  ['https://shop.brunellocucinelli.com/en-fr/men/shoes/espadrilles/', '50000783'],
  ['https://shop.brunellocucinelli.com/en-fr/men/shoes/slides-flip-flops/', '50000790'],
  ['https://shop.brunellocucinelli.com/en-fr/men/accessories/mens-eyewear/', '50000554'],
  ['https://shop.brunellocucinelli.com/en-fr/men/accessories/small-leather-goods/', '50003985'],
  ['https://shop.brunellocucinelli.com/en-fr/men/accessories/bags/', '50000647'],
  ['https://shop.brunellocucinelli.com/en-fr/men/accessories/scarves/', '50004010'],
  ['https://shop.brunellocucinelli.com/en-fr/men/accessories/hats/', '50000543'],
  ['https://shop.brunellocucinelli.com/en-fr/men/accessories/belts/', '50003989'],
];

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const rows = mappings.map(([siteUrl, code]) => {
  const sourceRow = brunelloByUrl.get(siteUrl);
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

fs.writeFileSync('brunello_mapping_insert.sql', sql, { encoding: 'utf8' });
console.log(`Wrote brunello_mapping_insert.sql (${rows.length} rows)`);
