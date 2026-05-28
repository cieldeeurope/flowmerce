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

const celineByUrl = new Map();
for (const line of source.split(/\r?\n/)) {
  const cols = [...line.matchAll(/"([^"]*)"/g)].map(match => match[1]);
  if (cols.length < 3 || cols[0] !== 'Celine') continue;
  const [site, categoryName, siteUrl] = cols;
  celineByUrl.set(siteUrl, { site, categoryName, siteUrl });
}

const mappings = [
  ['https://www.celine.com/en-de/women/handbags/cross-body-bags/', '50000641'],
  ['https://www.celine.com/en-de/women/handbags/shoulder-bags/', '50000639'],
  ['https://www.celine.com/en-de/women/handbags/top-handle-bags/', '50000640'],
  ['https://www.celine.com/en-de/women/handbags/hobo-and-tote-bags/', '50000640'],
  ['https://www.celine.com/en-de/women/small-leather-goods/wallets/', '50003982'],
  ['https://www.celine.com/en-de/women/small-leather-goods/coin-and-card-holders/', '50000662'],
  ['https://www.celine.com/en-de/women/small-leather-goods/pouches-and-tech-accessories/', '50000643'],
  ['https://www.celine.com/en-de/women/ready-to-wear/shirts-and-tops/', '50000804'],
  ['https://www.celine.com/en-de/women/ready-to-wear/pants-and-shorts/', '50000810'],
  ['https://www.celine.com/en-de/women/ready-to-wear/jackets/', '50021360'],
  ['https://www.celine.com/en-de/women/ready-to-wear/coats/', '50021360'],
  ['https://www.celine.com/en-de/women/ready-to-wear/knitwear/', '50021299'],
  ['https://www.celine.com/en-de/women/ready-to-wear/t-shirts-and-sweatshirts/', '50000803'],
  ['https://www.celine.com/en-de/women/shoes/the-flat/', '50003817'],
  ['https://www.celine.com/en-de/women/shoes/ballet/', '50003817'],
  ['https://www.celine.com/en-de/women/shoes/triomphe-slide/', '50000780'],
  ['https://www.celine.com/en-de/women/shoes/sandals/', '50003842'],
  ['https://www.celine.com/en-de/women/shoes/loafers-and-flats/', '50003818'],
  ['https://www.celine.com/en-de/women/shoes/sneakers/', '50003822'],
  ['https://www.celine.com/en-de/women/shoes/pumps/', '50003830'],
  ['https://www.celine.com/en-de/women/shoes/boots-and-ankle-boots/', '50004191'],
  ['https://www.celine.com/en-de/women/accessories/belts/', '50000539'],
  ['https://www.celine.com/en-de/women/accessories/sunglasses/', '50000554'],
  ['https://www.celine.com/en-de/women/accessories/silk-squares-and-accessories/', '50004010'],
  ['https://www.celine.com/en-de/women/accessories/scarves-and-shawls/', '50004010'],
  ['https://www.celine.com/en-de/women/accessories/hair-accessories/', '50000563'],
  ['https://www.celine.com/en-de/women/jewellery/earrings/', '50004164'],
  ['https://www.celine.com/en-de/women/jewellery/bracelets/', '50004194'],
  ['https://www.celine.com/en-de/women/jewellery/necklaces/', '50004174'],
  ['https://www.celine.com/en-de/women/jewellery/rings/', '50004155'],
  ['https://www.celine.com/en-de/men/bags/cross-body-bags/', '50000648'],
  ['https://www.celine.com/en-de/men/bags/tote-bags/', '50000647'],
  ['https://www.celine.com/en-de/men/bags/backpacks-1/', '50000651'],
  ['https://www.celine.com/en-de/men/small-leather-goods/wallets/', '50003985'],
  ['https://www.celine.com/en-de/men/small-leather-goods/coin-and-card-holders/', '50000662'],
  ['https://www.celine.com/en-de/men/ready-to-wear/shirts/', '50000833'],
  ['https://www.celine.com/en-de/men/ready-to-wear/t-shirts-and-sweatshirts/', '50000830'],
  ['https://www.celine.com/en-de/men/ready-to-wear/knitwear/', '50021579'],
  ['https://www.celine.com/en-de/men/ready-to-wear/pants-and-shorts/', '50000836'],
  ['https://www.celine.com/en-de/men/ready-to-wear/coats-and-blousons/', '50021640'],
  ['https://www.celine.com/en-de/men/shoes/derbies-and-mocassins/', '50000787'],
  ['https://www.celine.com/en-de/men/shoes/sneakers/', '50000788'],
  ['https://www.celine.com/en-de/men/shoes/sandals/', '50000789'],
  ['https://www.celine.com/en-de/men/shoes/boots/', '50021999'],
  ['https://www.celine.com/en-de/men/accessories/sunglasses/', '50000554'],
  ['https://www.celine.com/en-de/men/accessories/belts/', '50003989'],
  ['https://www.celine.com/en-de/men/jewellery/necklaces/', '50004174'],
  ['https://www.celine.com/en-de/men/jewellery/earrings/', '50004164'],
];

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const rows = mappings.map(([siteUrl, code]) => {
  const sourceRow = celineByUrl.get(siteUrl);
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

fs.writeFileSync('celine_mapping_insert.sql', sql, { encoding: 'utf8' });
console.log(`Wrote celine_mapping_insert.sql (${rows.length} rows)`);
