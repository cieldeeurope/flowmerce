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

const pradaByUrl = new Map();
for (const line of source.split(/\r?\n/)) {
  const cols = [...line.matchAll(/"([^"]*)"/g)].map(match => match[1]);
  if (cols.length < 3 || cols[0] !== 'Prada') continue;
  const [site, categoryName, siteUrl] = cols;
  pradaByUrl.set(siteUrl, { site, categoryName, siteUrl });
}

const mappings = [
  ['https://www.prada.com/de/en/womens/bags/shoulder-bags/c/10066EU', '50000639'],
  ['https://www.prada.com/de/en/womens/bags/top-handles/c/10067EU', '50000640'],
  ['https://www.prada.com/de/en/womens/bags/totes/c/10068EU', '50000640'],
  ['https://www.prada.com/de/en/womens/bags/backpacks/c/10063EU', '50000644'],
  ['https://www.prada.com/de/en/womens/ready-to-wear/dresses/c/10050EU', '50000807'],
  ['https://www.prada.com/de/en/womens/ready-to-wear/shirts-and-tops/c/10058EU', '50000804'],
  ['https://www.prada.com/de/en/womens/ready-to-wear/t-shirts-and-sweatshirts/c/10061EU', '50000803'],
  ['https://www.prada.com/de/en/womens/ready-to-wear/skirts/c/10059EU', '50000808'],
  ['https://www.prada.com/de/en/womens/ready-to-wear/knitwear/c/10054EU', '50021299'],
  ['https://www.prada.com/de/en/womens/ready-to-wear/outerwear/c/10056EU', '50021360'],
  ['https://www.prada.com/de/en/womens/ready-to-wear/trousers-and-shorts/c/10060EU', '50000810'],
  ['https://www.prada.com/de/en/womens/ready-to-wear/jackets-and-coats/c/10052EU', '50021360'],
  ['https://www.prada.com/de/en/womens/shoes/sandals-and-mules/c/10720EU', '50003842'],
  ['https://www.prada.com/de/en/womens/shoes/pumps-and-ballerinas/c/10075EU', '50003830'],
  ['https://www.prada.com/de/en/womens/shoes/loafers-and-lace-ups/c/10074EU', '50003818'],
  ['https://www.prada.com/de/en/womens/shoes/ankle-boots-and-boots/c/10071EU', '50004191'],
  ['https://www.prada.com/de/en/womens/shoes/sneakers/c/10078EU', '50003822'],
  ['https://www.prada.com/de/en/womens/small-leather-goods/card-holders/c/10343EU', '50000662'],
  ['https://www.prada.com/de/en/womens/small-leather-goods/small-wallets/c/10341EU', '50003982'],
  ['https://www.prada.com/de/en/womens/small-leather-goods/large-wallets/c/10342EU', '50003984'],
  ['https://www.prada.com/de/en/womens/accessories/sunglasses/c/10086EU', '50000554'],
  ['https://www.prada.com/de/en/womens/accessories/pouches/c/10705EU', '50000643'],
  ['https://www.prada.com/de/en/womens/accessories/silks-and-scarves/c/10085EU', '50004010'],
  ['https://www.prada.com/de/en/womens/accessories/belts/c/10080EU', '50000539'],
  ['https://www.prada.com/de/en/womens/accessories/headbands-and-hair-accessories/c/10083EU', '50000560'],
  ['https://www.prada.com/de/en/mens/ready-to-wear/shirts/c/10138EU', '50000833'],
  ['https://www.prada.com/de/en/mens/ready-to-wear/outerwear/c/10136EU', '50021640'],
  ['https://www.prada.com/de/en/mens/ready-to-wear/jackets-and-coats/c/10132EU', '50021640'],
  ['https://www.prada.com/de/en/mens/ready-to-wear/knitwear/c/10134EU', '50021579'],
  ['https://www.prada.com/de/en/mens/ready-to-wear/trousers-and-bermudas/c/10141EU', '50000836'],
  ['https://www.prada.com/de/en/mens/ready-to-wear/suits/c/10139EU', '50000840'],
  ['https://www.prada.com/de/en/mens/ready-to-wear/t-shirts-and-polo-shirts/c/10142EU', '50000830'],
  ['https://www.prada.com/de/en/mens/shoes/loafers/c/10153EU', '50000787'],
  ['https://www.prada.com/de/en/mens/shoes/sneakers/c/10155EU', '50000788'],
  ['https://www.prada.com/de/en/mens/shoes/sandals/c/10154EU', '50000789'],
  ['https://www.prada.com/de/en/mens/shoes/lace-ups/c/10152EU', '50000787'],
  ['https://www.prada.com/de/en/mens/shoes/boots/c/10150EU', '50021999'],
  ['https://www.prada.com/de/en/mens/shoes/americas-cup/c/10297EU', '50000788'],
  ['https://www.prada.com/de/en/mens/small-leather-goods/card-holders/c/10349EU', '50000662'],
  ['https://www.prada.com/de/en/mens/small-leather-goods/small-wallets/c/10347EU', '50003985'],
  ['https://www.prada.com/de/en/mens/small-leather-goods/large-wallets/c/10348EU', '50003987'],
  ['https://www.prada.com/de/en/mens/travel/pouches/c/10177EU', '50000649'],
  ['https://www.prada.com/de/en/mens/accessories/sunglasses/c/10163EU', '50000554'],
  ['https://www.prada.com/de/en/mens/accessories/belts/c/10157EU', '50003989'],
  ['https://www.prada.com/de/en/mens/accessories/silks-and-scarves/c/10162EU', '50004010'],
  ['https://www.prada.com/de/en/mens/accessories/ties-and-bow-ties/c/10164EU', '50004014'],
];

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const rows = mappings.map(([siteUrl, code]) => {
  const sourceRow = pradaByUrl.get(siteUrl);
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

fs.writeFileSync('prada_mapping_insert.sql', sql, { encoding: 'utf8' });
console.log(`Wrote prada_mapping_insert.sql (${rows.length} rows)`);
