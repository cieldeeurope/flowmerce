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

const amiByUrl = new Map();
for (const line of source.split(/\r?\n/)) {
  const cols = [...line.matchAll(/"([^"]*)"/g)].map(match => match[1]);
  if (cols.length < 3 || cols[0] !== 'Ami') continue;
  const [site, categoryName, siteUrl] = cols;
  amiByUrl.set(siteUrl, { site, categoryName, siteUrl });
}

const mappings = [
  ['https://www.amiparis.com/en-nl/collections/women-jackets-and-coats', '50021360'],
  ['https://www.amiparis.com/en-nl/collections/women-sweaters-and-cardigans', '50021299'],
  ['https://www.amiparis.com/en-nl/collections/women-t-shirts-and-tops', '50000803'],
  ['https://www.amiparis.com/en-nl/collections/women-dresses-and-jumpsuits', '50000807'],
  ['https://www.amiparis.com/en-nl/collections/women-shirts', '50000804'],
  ['https://www.amiparis.com/en-nl/collections/women-shorts-and-skirts', '50000808'],
  ['https://www.amiparis.com/en-nl/collections/women-pants', '50000810'],
  ['https://www.amiparis.com/en-nl/collections/women-belts', '50000539'],
  ['https://www.amiparis.com/en-nl/collections/women-hats-and-beanies', '50000546'],
  ['https://www.amiparis.com/en-nl/collections/women-caps', '50000546'],
  ['https://www.amiparis.com/en-nl/collections/women-sunglasses', '50000554'],
  ['https://www.amiparis.com/en-nl/collections/women-sneakers', '50003822'],
  ['https://www.amiparis.com/en-nl/collections/women-flat-shoes', '50003817'],
  ['https://www.amiparis.com/en-nl/collections/men-jackets-and-coats', '50021640'],
  ['https://www.amiparis.com/en-nl/collections/men-sweaters-and-cardigans', '50021579'],
  ['https://www.amiparis.com/en-nl/collections/men-t-shirts-and-polos', '50000830'],
  ['https://www.amiparis.com/en-nl/collections/men-shirts', '50000833'],
  ['https://www.amiparis.com/en-nl/collections/men-pants', '50000836'],
  ['https://www.amiparis.com/en-nl/collections/men-shorts', '50000836'],
  ['https://www.amiparis.com/en-nl/collections/men-belts', '50003989'],
  ['https://www.amiparis.com/en-nl/collections/men-hats-and-beanies', '50000546'],
  ['https://www.amiparis.com/en-nl/collections/men-caps', '50000546'],
  ['https://www.amiparis.com/en-nl/collections/men-sunglasses', '50000554'],
  ['https://www.amiparis.com/en-nl/collections/men-sneakers', '50000788'],
  ['https://www.amiparis.com/en-nl/collections/men-flat-shoes', '50000787'],
  ['https://www.amiparis.com/en-nl/collections/unisex-tote-bags', '50000640'],
  ['https://www.amiparis.com/en-nl/collections/unisex-shoulder-bags', '50000641'],
  ['https://www.amiparis.com/en-nl/collections/unisex-card-holder', '50000662'],
  ['https://www.amiparis.com/en-nl/collections/unisex-wallets', '50003982'],
  ['https://www.amiparis.com/en-nl/collections/unisex-pouches', '50000643'],
];

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const rows = mappings.map(([siteUrl, code]) => {
  const sourceRow = amiByUrl.get(siteUrl);
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

fs.writeFileSync('ami_mapping_insert.sql', sql, { encoding: 'utf8' });
console.log(`Wrote ami_mapping_insert.sql (${rows.length} rows)`);
