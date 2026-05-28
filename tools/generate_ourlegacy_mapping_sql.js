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

const ourlegacyByUrl = new Map();
for (const line of source.split(/\r?\n/)) {
  const cols = [...line.matchAll(/"([^"]*)"/g)].map(match => match[1]);
  if (cols.length < 3 || cols[0] !== 'Ourlegacy') continue;
  const [site, categoryName, siteUrl] = cols;
  ourlegacyByUrl.set(siteUrl, { site, categoryName, siteUrl });
}

const mappings = [
  ['https://www.ourlegacy.com/mens/shirting', '50000833'],
  ['https://www.ourlegacy.com/mens/jersey', '50000830'],
  ['https://www.ourlegacy.com/mens/outerwear', '50021640'],
  ['https://www.ourlegacy.com/mens/knitwear', '50021579'],
  ['https://www.ourlegacy.com/mens/suiting', '50000840'],
  ['https://www.ourlegacy.com/mens/trousers', '50000836'],
  ['https://www.ourlegacy.com/mens/shorts', '50000836'],
  ['https://www.ourlegacy.com/womens/shirting', '50000804'],
  ['https://www.ourlegacy.com/womens/jersey', '50000803'],
  ['https://www.ourlegacy.com/womens/tops', '50000803'],
  ['https://www.ourlegacy.com/womens/knitwear', '50021299'],
  ['https://www.ourlegacy.com/womens/skirts', '50000808'],
  ['https://www.ourlegacy.com/womens/dresses', '50000807'],
  ['https://www.ourlegacy.com/womens/trousers', '50000810'],
  ['https://www.ourlegacy.com/womens/shorts', '50000810'],
  ['https://www.ourlegacy.com/womens/suiting', '50000816'],
  ['https://www.ourlegacy.com/womens/outerwear', '50021360'],
  ['https://www.ourlegacy.com/footwear/mens-footwear/mens-boots', '50021999'],
  ['https://www.ourlegacy.com/footwear/mens-footwear/mens-mules', '50000790'],
  ['https://www.ourlegacy.com/footwear/mens-footwear/mens-sneakers', '50000788'],
  ['https://www.ourlegacy.com/footwear/womens-footwear/womens-boots', '50004191'],
  ['https://www.ourlegacy.com/footwear/womens-footwear/womens-mules', '50003847'],
  ['https://www.ourlegacy.com/footwear/womens-footwear/womens-sneakers', '50003822'],
  ['https://www.ourlegacy.com/accessories/belts', '50000539'],
  ['https://www.ourlegacy.com/accessories/eyewear', '50000554'],
  ['https://www.ourlegacy.com/accessories/hats', '50000546'],
  ['https://www.ourlegacy.com/accessories/scarves', '50004010'],
  ['https://www.ourlegacy.com/accessories/ties', '50004014'],
];

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const rows = mappings.map(([siteUrl, code]) => {
  const sourceRow = ourlegacyByUrl.get(siteUrl);
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

fs.writeFileSync('ourlegacy_mapping_insert.sql', sql, { encoding: 'utf8' });
console.log(`Wrote ourlegacy_mapping_insert.sql (${rows.length} rows)`);
