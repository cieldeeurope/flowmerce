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

const alexanderByUrl = new Map();
for (const line of source.split(/\r?\n/)) {
  const cols = [...line.matchAll(/"([^"]*)"/g)].map(match => match[1]);
  if (cols.length < 3 || cols[0] !== 'Alexander') continue;
  const [site, categoryName, siteUrl] = cols;
  alexanderByUrl.set(siteUrl, { site, categoryName, siteUrl });
}

const mappings = [
  ['https://www.alexandermcqueen.com/en-nl/ca/women/ready-to-wear/tailoring', '50000816'],
  ['https://www.alexandermcqueen.com/en-nl/ca/women/ready-to-wear/coats-and-outerwear', '50021360'],
  ['https://www.alexandermcqueen.com/en-nl/ca/women/ready-to-wear/jackets', '50021360'],
  ['https://www.alexandermcqueen.com/en-nl/ca/women/ready-to-wear/dresses', '50000807'],
  ['https://www.alexandermcqueen.com/en-nl/ca/women/ready-to-wear/knitwear', '50021299'],
  ['https://www.alexandermcqueen.com/en-nl/ca/women/ready-to-wear/tops-and-shirts', '50000804'],
  ['https://www.alexandermcqueen.com/en-nl/ca/women/ready-to-wear/t-shirts-and-sweatshirts', '50000803'],
  ['https://www.alexandermcqueen.com/en-nl/ca/women/ready-to-wear/skirts', '50000808'],
  ['https://www.alexandermcqueen.com/en-nl/ca/women/ready-to-wear/trousers', '50000810'],
  ['https://www.alexandermcqueen.com/en-nl/ca/women/handbags/clutches', '50000642'],
  ['https://www.alexandermcqueen.com/en-nl/ca/women/handbags/shoulder-bags', '50000639'],
  ['https://www.alexandermcqueen.com/en-nl/ca/women/handbags/crossbody-bags', '50000641'],
  ['https://www.alexandermcqueen.com/en-nl/ca/women/handbags/top-handles', '50000640'],
  ['https://www.alexandermcqueen.com/en-nl/ca/women/shoes/sandals-and-slides', '50003842'],
  ['https://www.alexandermcqueen.com/en-nl/ca/women/shoes/sneakers', '50003822'],
  ['https://www.alexandermcqueen.com/en-nl/ca/women/shoes/pumps', '50003830'],
  ['https://www.alexandermcqueen.com/en-nl/ca/women/shoes/flat-shoes', '50003817'],
  ['https://www.alexandermcqueen.com/en-nl/ca/women/shoes/boots', '50004191'],
  ['https://www.alexandermcqueen.com/en-nl/ca/women/shoes/boxe-sneaker', '50003822'],
  ['https://www.alexandermcqueen.com/en-nl/ca/women/shoes/ec1-sneaker', '50003822'],
  ['https://www.alexandermcqueen.com/en-nl/ca/women/shoes/oversized-sneaker', '50003822'],
  ['https://www.alexandermcqueen.com/en-nl/ca/women/shoes/tread-slick', '50003822'],
  ['https://www.alexandermcqueen.com/en-nl/ca/women/accessories/sunglasses', '50000554'],
  ['https://www.alexandermcqueen.com/en-nl/ca/women/accessories/scarves', '50004010'],
  ['https://www.alexandermcqueen.com/en-nl/ca/women/accessories/belts', '50000539'],
  ['https://www.alexandermcqueen.com/en-nl/ca/women/jewellery/necklaces-and-pendants', '50004174'],
  ['https://www.alexandermcqueen.com/en-nl/ca/women/jewellery/earrings', '50004164'],
  ['https://www.alexandermcqueen.com/en-nl/ca/women/jewellery/bracelets', '50004194'],
  ['https://www.alexandermcqueen.com/en-nl/ca/women/jewellery/rings', '50004155'],
  ['https://www.alexandermcqueen.com/en-nl/ca/men/ready-to-wear/tailoring', '50000840'],
  ['https://www.alexandermcqueen.com/en-nl/ca/men/ready-to-wear/coats-and-outerwear', '50021640'],
  ['https://www.alexandermcqueen.com/en-nl/ca/men/ready-to-wear/jackets', '50021640'],
  ['https://www.alexandermcqueen.com/en-nl/ca/men/ready-to-wear/knitwear', '50021579'],
  ['https://www.alexandermcqueen.com/en-nl/ca/men/ready-to-wear/t-shirts-and-sweatshirts', '50000830'],
  ['https://www.alexandermcqueen.com/en-nl/ca/men/ready-to-wear/shirts', '50000833'],
  ['https://www.alexandermcqueen.com/en-nl/ca/men/ready-to-wear/trousers', '50000836'],
  ['https://www.alexandermcqueen.com/en-nl/ca/the-sling', '50000652'],
  ['https://www.alexandermcqueen.com/en-nl/ca/men/shoes/sandals-and-slides', '50000789'],
  ['https://www.alexandermcqueen.com/en-nl/ca/men/shoes/sneakers', '50000788'],
  ['https://www.alexandermcqueen.com/en-nl/ca/men/shoes/loafers-and-lace-ups', '50000787'],
  ['https://www.alexandermcqueen.com/en-nl/ca/men/shoes/boots', '50021999'],
  ['https://www.alexandermcqueen.com/en-nl/ca/men/shoes/boxe-sneaker', '50000788'],
  ['https://www.alexandermcqueen.com/en-nl/ca/men/shoes/ec1-sneakers', '50000788'],
  ['https://www.alexandermcqueen.com/en-nl/ca/men/shoes/oversized-sneaker', '50000788'],
  ['https://www.alexandermcqueen.com/en-nl/ca/men/accessories/sunglasses', '50000554'],
  ['https://www.alexandermcqueen.com/en-nl/ca/men/accessories/scarves', '50004010'],
  ['https://www.alexandermcqueen.com/en-nl/ca/men/accessories/wallets-and-cardholders', '50000662'],
  ['https://www.alexandermcqueen.com/en-nl/ca/men/accessories/ties', '50004014'],
  ['https://www.alexandermcqueen.com/en-nl/ca/men/accessories/belts', '50003989'],
  ['https://www.alexandermcqueen.com/en-nl/ca/men/jewellery/necklaces', '50004174'],
  ['https://www.alexandermcqueen.com/en-nl/ca/men/jewellery/bracelets', '50004194'],
  ['https://www.alexandermcqueen.com/en-nl/ca/men/jewellery/rings', '50004155'],
];

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const rows = mappings.map(([siteUrl, code]) => {
  const sourceRow = alexanderByUrl.get(siteUrl);
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

fs.writeFileSync('alexander_mapping_insert.sql', sql, { encoding: 'utf8' });
console.log(`Wrote alexander_mapping_insert.sql (${rows.length} rows)`);
