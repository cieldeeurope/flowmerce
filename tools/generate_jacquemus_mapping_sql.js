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

const jacquemusByUrl = new Map();
for (const line of source.split(/\r?\n/)) {
  const cols = [...line.matchAll(/"([^"]*)"/g)].map(match => match[1]);
  if (cols.length < 3 || cols[0] !== 'Jacquemus') continue;
  const [site, categoryName, siteUrl] = cols;
  jacquemusByUrl.set(siteUrl, { site, categoryName, siteUrl });
}

const mappings = [
  ['https://www.jacquemus.com/en_nl/handbags-crossbody-bags-women', '50000641'],
  ['https://www.jacquemus.com/en_nl/shoulder-bags-women', '50000639'],
  ['https://www.jacquemus.com/en_nl/clutches-bags-women', '50000642'],
  ['https://www.jacquemus.com/en_nl/coats-and-jackets-women', '50021360'],
  ['https://www.jacquemus.com/en_nl/knits-women', '50021299'],
  ['https://www.jacquemus.com/en_nl/t-shirts-women', '50000803'],
  ['https://www.jacquemus.com/en_nl/tops-shirts-women', '50000804'],
  ['https://www.jacquemus.com/en_nl/trousers-and-shorts-women', '50000810'],
  ['https://www.jacquemus.com/en_nl/suits-women', '50000816'],
  ['https://www.jacquemus.com/en_nl/pumps-shoes-women', '50003830'],
  ['https://www.jacquemus.com/en_nl/sneakers-shoes-women', '50003822'],
  ['https://www.jacquemus.com/en_nl/loafers-flats-shoes-women', '50003818'],
  ['https://www.jacquemus.com/en_nl/boots-shoes-women', '50004191'],
  ['https://www.jacquemus.com/en_nl/hats-women', '50000546'],
  ['https://www.jacquemus.com/en_nl/sunglasses-women', '50000554'],
  ['https://www.jacquemus.com/en_nl/scarves-women', '50004010'],
  ['https://www.jacquemus.com/en_nl/belts-women', '50000539'],
  ['https://www.jacquemus.com/en_nl/t-shirts-men', '50000830'],
  ['https://www.jacquemus.com/en_nl/shirts-men', '50000833'],
  ['https://www.jacquemus.com/en_nl/coats-and-jackets-men', '50021640'],
  ['https://www.jacquemus.com/en_nl/trousers-and-shorts-men', '50000836'],
  ['https://www.jacquemus.com/en_nl/knits-men', '50021579'],
  ['https://www.jacquemus.com/en_nl/suits-men', '50000840'],
  ['https://www.jacquemus.com/en_nl/sneakers-shoes-men', '50000788'],
  ['https://www.jacquemus.com/en_nl/loafers-flats-shoes-men', '50000787'],
  ['https://www.jacquemus.com/en_nl/hats-men', '50000546'],
  ['https://www.jacquemus.com/en_nl/scarves-men', '50004010'],
  ['https://www.jacquemus.com/en_nl/belts-men', '50003989'],
];

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const rows = mappings.map(([siteUrl, code]) => {
  const sourceRow = jacquemusByUrl.get(siteUrl);
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

fs.writeFileSync('jacquemus_mapping_insert.sql', sql, { encoding: 'utf8' });
console.log(`Wrote jacquemus_mapping_insert.sql (${rows.length} rows)`);
