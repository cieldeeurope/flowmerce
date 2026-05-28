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

const apcRows = [];
for (const line of source.split(/\r?\n/)) {
  const cols = [...line.matchAll(/"([^"]*)"/g)].map(match => match[1]);
  if (cols.length < 3 || cols[0] !== 'Apc') continue;
  const [site, categoryName, siteUrl] = cols;
  apcRows.push({ site, categoryName, siteUrl });
}

const mappings = [
  ['woman - ready-to-wear - outerwear & jackets', 'https://www.apcstore.com/collections/outerwear-women', '50021360'],
  ['woman - ready-to-wear - blouses & shirts', 'https://www.apcstore.com/collections/blouses-shirts-women', '50000804'],
  ['woman - ready-to-wear - knitwear', 'https://www.apcstore.com/collections/knitwear-women', '50021299'],
  ['woman - ready-to-wear - pants & shorts', 'https://www.apcstore.com/collections/pants-shorts-women', '50000810'],
  ['woman - ready-to-wear - t-shirts', 'https://www.apcstore.com/collections/t-shirts-women', '50000803'],
  ['woman - bags - shoulder bags', 'https://www.apcstore.com/collections/shoulder-bags-women', '50000639'],
  ['woman - bags - totes & shopping bags', 'https://www.apcstore.com/collections/totes-shopping-bags-women', '50000640'],
  ['woman - bags - crossbody bags', 'https://www.apcstore.com/collections/sling-bags-women', '50000641'],
  ['woman - accessories - glasses', 'https://www.apcstore.com/collections/eyewear', '50000554'],
  ['woman - accessories - hats & caps', 'https://www.apcstore.com/collections/hats-caps-women', '50000546'],
  ['woman - accessories - scarves', 'https://www.apcstore.com/collections/scarves-women', '50004010'],
  ['woman - accessories - belts', 'https://www.apcstore.com/collections/belts-women', '50000539'],
  ['man - ready-to-wear - outerwear & jackets', 'https://www.apcstore.com/collections/outerwear-men', '50021640'],
  ['man - ready-to-wear - shirts', 'https://www.apcstore.com/collections/shirts-men', '50000833'],
  ['man - ready-to-wear - t-shirts & polos', 'https://www.apcstore.com/collections/t-shirts-men', '50000830'],
  ['man - ready-to-wear - knitwear', 'https://www.apcstore.com/collections/knitwear-men', '50021579'],
  ['man - ready-to-wear - pants & shorts', 'https://www.apcstore.com/collections/pants-men', '50000836'],
  ['man - bags - tote & shopping bags', 'https://www.apcstore.com/collections/totes-shopping-bag-men', '50000647'],
  ['man - bags - crossbody bags', 'https://www.apcstore.com/collections/sling-bags-men', '50000648'],
  ['man - bags - backpacks', 'https://www.apcstore.com/collections/backpacks-men', '50000651'],
  ['man - accessories - glasses', 'https://www.apcstore.com/collections/eyewear', '50000554'],
  ['man - accessories - scarves', 'https://www.apcstore.com/collections/scarves-men', '50004010'],
  ['man - accessories - hat & caps', 'https://www.apcstore.com/collections/hats-caps-men', '50000546'],
  ['man - accessories - belts', 'https://www.apcstore.com/collections/belts-men', '50003989'],
];

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const rows = mappings.map(([categoryName, siteUrl, code]) => {
  const sourceRow = apcRows.find(row => row.categoryName === categoryName && row.siteUrl === siteUrl);
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

fs.writeFileSync('apc_mapping_insert.sql', sql, { encoding: 'utf8' });
console.log(`Wrote apc_mapping_insert.sql (${rows.length} rows)`);
