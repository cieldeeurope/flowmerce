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

const givenchyByUrl = new Map();
for (const line of source.split(/\r?\n/)) {
  const cols = [...line.matchAll(/"([^"]*)"/g)].map(match => match[1]);
  if (cols.length < 3 || cols[0] !== 'Givenchy') continue;
  const [site, categoryName, siteUrl] = cols;
  givenchyByUrl.set(siteUrl, { site, categoryName, siteUrl });
}

const mappings = [
  ['https://www.givenchy.com/nl/en/women/ready-to-wear/tailoring/', '50000816'],
  ['https://www.givenchy.com/nl/en/women/ready-to-wear/dresses/', '50000807'],
  ['https://www.givenchy.com/nl/en/women/ready-to-wear/jackets-coats/', '50021360'],
  ['https://www.givenchy.com/nl/en/women/ready-to-wear/pants/', '50000810'],
  ['https://www.givenchy.com/nl/en/women/ready-to-wear/skirts/', '50000808'],
  ['https://www.givenchy.com/nl/en/women/ready-to-wear/tops-shirts/', '50000804'],
  ['https://www.givenchy.com/nl/en/women/ready-to-wear/t-shirts/', '50000803'],
  ['https://www.givenchy.com/nl/en/women/ready-to-wear/sweaters/', '50021299'],
  ['https://www.givenchy.com/nl/en/women/ready-to-wear/knitwear/', '50021299'],
  ['https://www.givenchy.com/nl/en/women/bags/cross-body-bags/', '50000641'],
  ['https://www.givenchy.com/nl/en/women/bags/shoulder-bags/', '50000639'],
  ['https://www.givenchy.com/nl/en/women/bags/top-handle-bags/', '50000640'],
  ['https://www.givenchy.com/nl/en/women/bags/clutches/', '50000642'],
  ['https://www.givenchy.com/nl/en/women/bags/wallets/', '50003982'],
  ['https://www.givenchy.com/nl/en/women/shoes/pumps/', '50003830'],
  ['https://www.givenchy.com/nl/en/women/shoes/sandals-mules/', '50003842'],
  ['https://www.givenchy.com/nl/en/women/shoes/loafers-ballerinas/', '50003818'],
  ['https://www.givenchy.com/nl/en/women/shoes/boots-ankle-boots/', '50004191'],
  ['https://www.givenchy.com/nl/en/women/shoes/sneakers/', '50003822'],
  ['https://www.givenchy.com/nl/en/women/shoes/shark-boots/', '50004191'],
  ['https://www.givenchy.com/nl/en/women/jewelry/bracelets/', '50004194'],
  ['https://www.givenchy.com/nl/en/women/jewelry/earrings/', '50004164'],
  ['https://www.givenchy.com/nl/en/women/jewelry/necklaces/', '50004174'],
  ['https://www.givenchy.com/nl/en/women/jewelry/rings/', '50004155'],
  ['https://www.givenchy.com/nl/en/women/accessories/sunglasses/', '50000554'],
  ['https://www.givenchy.com/nl/en/women/accessories/belts/', '50000539'],
  ['https://www.givenchy.com/nl/en/women/accessories/scarves/', '50004010'],
  ['https://www.givenchy.com/nl/en/men/ready-to-wear/jackets-coats/', '50021640'],
  ['https://www.givenchy.com/nl/en/men/ready-to-wear/bombers-blousons/', '50000837'],
  ['https://www.givenchy.com/nl/en/men/ready-to-wear/t-shirts-polos/', '50000830'],
  ['https://www.givenchy.com/nl/en/men/ready-to-wear/shirts/', '50000833'],
  ['https://www.givenchy.com/nl/en/men/ready-to-wear/pants-shorts/', '50000836'],
  ['https://www.givenchy.com/nl/en/men/ready-to-wear/knitwear/', '50021579'],
  ['https://www.givenchy.com/nl/en/men/ready-to-wear/tailoring/', '50000840'],
  ['https://www.givenchy.com/nl/en/men/bags/cross-body-bags/', '50000648'],
  ['https://www.givenchy.com/nl/en/men/bags/backpacks/', '50000651'],
  ['https://www.givenchy.com/nl/en/men/bags/weekend-bags/', '50000647'],
  ['https://www.givenchy.com/nl/en/men/bags/wallets/', '50003985'],
  ['https://www.givenchy.com/nl/en/men/shoes/sneakers/', '50000788'],
  ['https://www.givenchy.com/nl/en/men/shoes/loafers/', '50000787'],
  ['https://www.givenchy.com/nl/en/men/shoes/sandals/', '50000789'],
  ['https://www.givenchy.com/nl/en/men/shoes/boots-derbies/', '50021999'],
  ['https://www.givenchy.com/nl/en/men/accessories/sunglasses/', '50000554'],
  ['https://www.givenchy.com/nl/en/men/accessories/belts/', '50003989'],
  ['https://www.givenchy.com/nl/en/men/accessories/caps/', '50000546'],
];

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const rows = mappings.map(([siteUrl, code]) => {
  const sourceRow = givenchyByUrl.get(siteUrl);
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

fs.writeFileSync('givenchy_mapping_insert.sql', sql, { encoding: 'utf8' });
console.log(`Wrote givenchy_mapping_insert.sql (${rows.length} rows)`);
