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

const tomfordByUrl = new Map();
for (const line of source.split(/\r?\n/)) {
  const cols = [...line.matchAll(/"([^"]*)"/g)].map(match => match[1]);
  if (cols.length < 3 || cols[0] !== 'Tomford') continue;
  const [site, categoryName, siteUrl] = cols;
  tomfordByUrl.set(siteUrl, { site, categoryName, siteUrl });
}

const mappings = [
  ['https://www.tomfordfashion.fr/en-fr/men/ready-to-wear/outerwear/', '50021640'],
  ['https://www.tomfordfashion.fr/en-fr/men/ready-to-wear/knitwear/', '50021579'],
  ['https://www.tomfordfashion.fr/en-fr/men/ready-to-wear/jackets/', '50021640'],
  ['https://www.tomfordfashion.fr/en-fr/men/ready-to-wear/suits-and-tuxedos/', '50000840'],
  ['https://www.tomfordfashion.fr/en-fr/men/ready-to-wear/shirts/', '50000833'],
  ['https://www.tomfordfashion.fr/en-fr/men/ready-to-wear/polos-and-t-shirts/', '50000830'],
  ['https://www.tomfordfashion.fr/en-fr/men/ready-to-wear/pants-and-shorts/', '50000836'],
  ['https://www.tomfordfashion.fr/en-fr/men/shoes/lace-ups/', '50000787'],
  ['https://www.tomfordfashion.fr/en-fr/men/shoes/monk-straps/', '50000787'],
  ['https://www.tomfordfashion.fr/en-fr/men/shoes/boots/', '50021999'],
  ['https://www.tomfordfashion.fr/en-fr/men/shoes/loafers/', '50000787'],
  ['https://www.tomfordfashion.fr/en-fr/men/shoes/sneakers/', '50000788'],
  ['https://www.tomfordfashion.fr/en-fr/men/shoes/espadrilles-and-sandals/', '50000789'],
  ['https://www.tomfordfashion.fr/en-fr/men/shoes/evening/', '50000787'],
  ['https://www.tomfordfashion.fr/en-fr/men/bags/backpacks/', '50000651'],
  ['https://www.tomfordfashion.fr/en-fr/men/bags/briefcases/', '50000650'],
  ['https://www.tomfordfashion.fr/en-fr/men/accessories/belts/', '50003989'],
  ['https://www.tomfordfashion.fr/en-fr/men/accessories/wallets-and-card-holders/', '50000662'],
  ['https://www.tomfordfashion.fr/en-fr/men/accessories/ties-and-bow-ties/', '50004014'],
  ['https://www.tomfordfashion.fr/en-fr/men/accessories/scarves/', '50004010'],
  ['https://www.tomfordfashion.fr/en-fr/women/ready-to-wear/matching-sets/', '50000816'],
  ['https://www.tomfordfashion.fr/en-fr/women/ready-to-wear/dresses/', '50000807'],
  ['https://www.tomfordfashion.fr/en-fr/women/ready-to-wear/jackets/', '50021360'],
  ['https://www.tomfordfashion.fr/en-fr/women/ready-to-wear/outerwear/', '50021360'],
  ['https://www.tomfordfashion.fr/en-fr/women/ready-to-wear/knitwear/', '50021299'],
  ['https://www.tomfordfashion.fr/en-fr/women/ready-to-wear/tops/', '50000803'],
  ['https://www.tomfordfashion.fr/en-fr/women/ready-to-wear/pants-and-shorts/', '50000810'],
  ['https://www.tomfordfashion.fr/en-fr/women/ready-to-wear/skirts/', '50000808'],
  ['https://www.tomfordfashion.fr/en-fr/women/shoes/slingbacks-and-pumps/', '50003830'],
  ['https://www.tomfordfashion.fr/en-fr/women/shoes/sandals/', '50003842'],
  ['https://www.tomfordfashion.fr/en-fr/women/shoes/flats/', '50003817'],
  ['https://www.tomfordfashion.fr/en-fr/women/shoes/boots/', '50004191'],
  ['https://www.tomfordfashion.fr/en-fr/women/bags/shoulder-bags/', '50000639'],
  ['https://www.tomfordfashion.fr/en-fr/women/bags/crossbody-bags/', '50000641'],
  ['https://www.tomfordfashion.fr/en-fr/women/bags/top-handles/', '50000640'],
  ['https://www.tomfordfashion.fr/en-fr/women/bags/tote-bags/', '50000640'],
  ['https://www.tomfordfashion.fr/en-fr/women/bags/clutches/', '50000642'],
  ['https://www.tomfordfashion.fr/en-fr/women/accessories/belts/', '50000539'],
  ['https://www.tomfordfashion.fr/en-fr/women/accessories/wallets-and-card-holders/', '50000662'],
  ['https://www.tomfordfashion.fr/en-fr/women/accessories/scarves/', '50004010'],
  ['https://www.tomfordfashion.fr/en-fr/eyewear/men/sunglasses/', '50000554'],
  ['https://www.tomfordfashion.fr/en-fr/eyewear/men/optical/', '50000556'],
  ['https://www.tomfordfashion.fr/en-fr/eyewear/women/sunglasses/', '50000554'],
  ['https://www.tomfordfashion.fr/en-fr/eyewear/women/optical/', '50000556'],
];

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const rows = mappings.map(([siteUrl, code]) => {
  const sourceRow = tomfordByUrl.get(siteUrl);
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

fs.writeFileSync('tomford_mapping_insert.sql', sql, { encoding: 'utf8' });
console.log(`Wrote tomford_mapping_insert.sql (${rows.length} rows)`);
