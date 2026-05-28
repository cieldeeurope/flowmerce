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

const ferragamoByUrl = new Map();
for (const line of source.split(/\r?\n/)) {
  const cols = [...line.matchAll(/"([^"]*)"/g)].map(match => match[1]);
  if (cols.length < 3 || cols[0] !== 'Ferragamo') continue;
  const [site, categoryName, siteUrl] = cols;
  ferragamoByUrl.set(siteUrl, { site, categoryName, siteUrl });
}

const mappings = [
  ['https://www.ferragamo.com/shop/eu/en/women/shoes/pumps-24', '50003830'],
  ['https://www.ferragamo.com/shop/eu/en/women/shoes/eu-slingbacks', '50003830'],
  ['https://www.ferragamo.com/shop/eu/en/women/shoes/mules-slippers-oe', '50003847'],
  ['https://www.ferragamo.com/shop/eu/en/women/shoes/mocassins', '50003818'],
  ['https://www.ferragamo.com/shop/eu/en/women/shoes/ballerinas-flats', '50003817'],
  ['https://www.ferragamo.com/shop/eu/en/women/shoes/oe-sandals-espadrilles', '50003842'],
  ['https://www.ferragamo.com/shop/eu/en/women/shoes/sneakers', '50003822'],
  ['https://www.ferragamo.com/shop/eu/en/women/shoes/boots', '50004191'],
  ['https://www.ferragamo.com/shop/eu/en/women/handbags/top-handles', '50000640'],
  ['https://www.ferragamo.com/shop/eu/en/women/handbags/shoulder-hobo-bags', '50000639'],
  ['https://www.ferragamo.com/shop/eu/en/women/handbags/messenger-bags', '50000641'],
  ['https://www.ferragamo.com/shop/eu/en/women/handbags/tote-bags', '50000640'],
  ['https://www.ferragamo.com/shop/eu/en/women/handbags/clutches-pochettes', '50000642'],
  ['https://www.ferragamo.com/shop/eu/en/women/rtw-women-oe/dresses-women-oe', '50000807'],
  ['https://www.ferragamo.com/shop/eu/en/women/rtw-women-oe/knitwear-woman-oe', '50021299'],
  ['https://www.ferragamo.com/shop/eu/en/women/rtw-women-oe/tshirts-and-sweatshirts-women', '50000803'],
  ['https://www.ferragamo.com/shop/eu/en/women/rtw-women-oe/topsshirts-women-oe', '50000804'],
  ['https://www.ferragamo.com/shop/eu/en/women/rtw-women-oe/skirts-women-oe', '50000808'],
  ['https://www.ferragamo.com/shop/eu/en/women/rtw-women-oe/pants-women-oe', '50000810'],
  ['https://www.ferragamo.com/shop/eu/en/women/rtw-women-oe/jacketandblazers-women-oe', '50021360'],
  ['https://www.ferragamo.com/shop/eu/en/women/rtw-women-oe/outerwear-women-oe', '50021360'],
  ['https://www.ferragamo.com/shop/eu/en/women/wallets-small-leathers-goods/belts', '50000539'],
  ['https://www.ferragamo.com/shop/eu/en/women/wallets-small-leathers-goods/wallets-coin-purses', '50003982'],
  ['https://www.ferragamo.com/shop/eu/en/women/wallets-small-leathers-goods/card-key-holders', '50000662'],
  ['https://www.ferragamo.com/shop/eu/en/women/accessories/foulards', '50004010'],
  ['https://www.ferragamo.com/shop/eu/en/women/accessories/stoles-w', '50000567'],
  ['https://www.ferragamo.com/shop/eu/en/women/accessories/hairaccessories', '50000563'],
  ['https://www.ferragamo.com/shop/eu/en/women/eyewear/sunglasses-women-eu-en', '50000554'],
  ['https://www.ferragamo.com/shop/eu/en/women/eyewear/optical-glasses-eu-en', '50000556'],
  ['https://www.ferragamo.com/shop/eu/en/men/man-shoes/drivers-men', '50000787'],
  ['https://www.ferragamo.com/shop/eu/en/men/man-shoes/mocassins-loafers', '50000787'],
  ['https://www.ferragamo.com/shop/eu/en/men/man-shoes/sandals', '50000789'],
  ['https://www.ferragamo.com/shop/eu/en/men/man-shoes/sneakers-', '50000788'],
  ['https://www.ferragamo.com/shop/eu/en/men/man-shoes/lace-ups', '50000787'],
  ['https://www.ferragamo.com/shop/eu/en/men/man-shoes/monk-strap-oe', '50000787'],
  ['https://www.ferragamo.com/shop/eu/en/men/man-shoes/boots-booties', '50021999'],
  ['https://www.ferragamo.com/shop/eu/en/men/man-bags-luggage/messenger-and-shoulder-strap-bags', '50000648'],
  ['https://www.ferragamo.com/shop/eu/en/men/man-bags-luggage/business-bags', '50000650'],
  ['https://www.ferragamo.com/shop/eu/en/men/man-bags-luggage/shoppers-oe', '50000647'],
  ['https://www.ferragamo.com/shop/eu/en/men/man-bags-luggage/weekend-bags', '50000651'],
  ['https://www.ferragamo.com/shop/eu/en/men/man-bags-luggage/portfolios-clutches-oe', '50000649'],
  ['https://www.ferragamo.com/shop/eu/en/men/rtw-men-oe/shirts-men-oe', '50000833'],
  ['https://www.ferragamo.com/shop/eu/en/men/rtw-men-oe/polo-tshirts-men-oe', '50000830'],
  ['https://www.ferragamo.com/shop/eu/en/men/rtw-men-oe/knitwear-men-oe', '50021579'],
  ['https://www.ferragamo.com/shop/eu/en/men/rtw-men-oe/pantsandshorts-men-oe', '50000836'],
  ['https://www.ferragamo.com/shop/eu/en/men/rtw-men-oe/blazers-men-oe', '50000840'],
  ['https://www.ferragamo.com/shop/eu/en/men/rtw-men-oe/jackets-men', '50021640'],
  ['https://www.ferragamo.com/shop/eu/en/men/rtw-men-oe/outerwear-men-oe', '50021640'],
  ['https://www.ferragamo.com/shop/eu/en/men/man-wallets-small-leather-goods/man-belts', '50003989'],
  ['https://www.ferragamo.com/shop/eu/en/men/man-wallets-small-leather-goods/wallet-coin-purses', '50003985'],
  ['https://www.ferragamo.com/shop/eu/en/men/man-wallets-small-leather-goods/card-case-key-holders', '50000662'],
  ['https://www.ferragamo.com/shop/eu/en/men/man-wallets-small-leather-goods/dopp-kit-other-accessories', '50000649'],
  ['https://www.ferragamo.com/shop/eu/en/men/man-silk-accessories/ties-man-oe', '50004014'],
  ['https://www.ferragamo.com/shop/eu/en/men/man-silk-accessories/scarves-oe', '50004010'],
  ['https://www.ferragamo.com/shop/eu/en/men/jewellery-watches-oe/cufflinks-oe', '50000564'],
  ['https://www.ferragamo.com/shop/eu/en/men/man-eyewear/sunglasses-men-eu-en', '50000554'],
  ['https://www.ferragamo.com/shop/eu/en/men/man-eyewear/optical-men-eu-en', '50000556'],
];

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const rows = mappings.map(([siteUrl, code]) => {
  const sourceRow = ferragamoByUrl.get(siteUrl);
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

fs.writeFileSync('ferragamo_mapping_insert.sql', sql, { encoding: 'utf8' });
console.log(`Wrote ferragamo_mapping_insert.sql (${rows.length} rows)`);
