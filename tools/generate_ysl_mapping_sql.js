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

const yslByUrl = new Map();
for (const line of source.split(/\r?\n/)) {
  const cols = [...line.matchAll(/"([^"]*)"/g)].map(match => match[1]);
  if (cols.length < 3 || cols[0] !== 'YSL') continue;
  const [site, categoryName, siteUrl] = cols;
  yslByUrl.set(siteUrl, { site, categoryName, siteUrl });
}

const mappings = [
  ['https://www.ysl.com/en-de/ca/shop-women/shoes/flat-sandals', '50003842'],
  ['https://www.ysl.com/en-de/ca/shop-women/shoes/sneakers', '50003822'],
  ['https://www.ysl.com/en-de/ca/shop-women/ready-to-wear/outerwear', '50021360'],
  ['https://www.ysl.com/en-de/ca/shop-women/ready-to-wear/coats', '50021360'],
  ['https://www.ysl.com/en-de/ca/shop-women/ready-to-wear/shirts-and-tops', '50000804'],
  ['https://www.ysl.com/en-de/ca/shop-women/ready-to-wear/knitwear', '50021299'],
  ['https://www.ysl.com/en-de/ca/shop-women/ready-to-wear/jersey', '50000803'],
  ['https://www.ysl.com/en-de/ca/shop-women/shoes/booties', '50004191'],
  ['https://www.ysl.com/en-de/ca/shop-women/shoes/boots', '50004191'],
  ['https://www.ysl.com/en-de/ca/shop-women/shoes/pumps-and-slingbacks', '50003830'],
  ['https://www.ysl.com/en-de/ca/shop-women/shoes/sandals', '50003842'],
  ['https://www.ysl.com/en-de/ca/shop-women/shoes/mules-and-wedges', '50003847'],
  ['https://www.ysl.com/en-de/ca/shop-women/shoes/flats-and-loafers', '50003818'],
  ['https://www.ysl.com/en-de/ca/shop-women/shoes/ballerinas', '50003817'],
  ['https://www.ysl.com/en-de/ca/shop-women/handbags/shoulder-bags', '50000639'],
  ['https://www.ysl.com/en-de/ca/shop-women/handbags/crossbody-bags', '50000641'],
  ['https://www.ysl.com/en-de/ca/shop-women/handbags/top-handles', '50000640'],
  ['https://www.ysl.com/en-de/ca/shop-women/handbags/hobos-and-buckets', '50000639'],
  ['https://www.ysl.com/en-de/ca/shop-women/handbags/buckets', '50000639'],
  ['https://www.ysl.com/en-de/ca/shop-women/handbags/clutches-and-evening', '50000642'],
  ['https://www.ysl.com/en-de/ca/shop-women/handbags/totes', '50000640'],
  ['https://www.ysl.com/en-de/ca/shop-women/small-leather-goods/pouches', '50000643'],
  ['https://www.ysl.com/en-de/ca/shop-women/small-leather-goods/wallets', '50003982'],
  ['https://www.ysl.com/en-de/ca/shop-women/small-leather-goods/card-cases', '50000662'],
  ['https://www.ysl.com/en-de/ca/shop-women/accessories/belts', '50000539'],
  ['https://www.ysl.com/en-de/ca/shop-women/accessories/sunglasses', '50000554'],
  ['https://www.ysl.com/en-de/ca/shop-women/accessories/hats', '50000546'],
  ['https://www.ysl.com/en-de/ca/shop-women/accessories/scarves-and-silk', '50004010'],
  ['https://www.ysl.com/en-de/ca/shop-women/jewelry/cuffs-and-bracelets', '50004194'],
  ['https://www.ysl.com/en-de/ca/shop-women/jewelry/earrings', '50004164'],
  ['https://www.ysl.com/en-de/ca/shop-women/jewelry/necklaces', '50004174'],
  ['https://www.ysl.com/en-de/ca/shop-men/ready-to-wear/outerwear', '50021640'],
  ['https://www.ysl.com/en-de/ca/shop-men/ready-to-wear/coats-and-trench', '50021640'],
  ['https://www.ysl.com/en-de/ca/shop-men/ready-to-wear/shirts', '50000833'],
  ['https://www.ysl.com/en-de/ca/shop-men/ready-to-wear/knitwear', '50021579'],
  ['https://www.ysl.com/en-de/ca/shop-men/ready-to-wear/jersey', '50000830'],
  ['https://www.ysl.com/en-de/ca/shop-men/shoes/loafers', '50000787'],
  ['https://www.ysl.com/en-de/ca/shop-men/shoes/boots', '50021999'],
  ['https://www.ysl.com/en-de/ca/shop-men/shoes/derbies', '50000787'],
  ['https://www.ysl.com/en-de/ca/shop-men/shoes/sandals', '50000789'],
  ['https://www.ysl.com/en-de/ca/shop-men/shoes/sneakers', '50000788'],
  ['https://www.ysl.com/en-de/ca/shop-men/bags/messengers', '50000648'],
  ['https://www.ysl.com/en-de/ca/shop-men/bags/backpacks', '50000651'],
  ['https://www.ysl.com/en-de/ca/shop-men/bags/totes', '50000647'],
  ['https://www.ysl.com/en-de/ca/shop-men/bags/briefcases', '50000650'],
  ['https://www.ysl.com/en-de/ca/shop-men/small-leather-goods/card-cases', '50000662'],
  ['https://www.ysl.com/en-de/ca/shop-men/small-leather-goods/wallets', '50003985'],
  ['https://www.ysl.com/en-de/ca/shop-men/small-leather-goods/pouches', '50000649'],
  ['https://www.ysl.com/en-de/ca/shop-men/accessories/belts', '50003989'],
  ['https://www.ysl.com/en-de/ca/shop-men/accessories/sunglasses', '50000554'],
  ['https://www.ysl.com/en-de/ca/shop-men/accessories/scarves-and-ties', '50004010'],
];

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const rows = mappings.map(([siteUrl, code]) => {
  const sourceRow = yslByUrl.get(siteUrl);
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

fs.writeFileSync('ysl_mapping_insert.sql', sql, { encoding: 'utf8' });
console.log(`Wrote ysl_mapping_insert.sql (${rows.length} rows)`);
