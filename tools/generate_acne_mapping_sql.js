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

const acneRows = [];
for (const line of source.split(/\r?\n/)) {
  const cols = [...line.matchAll(/"([^"]*)"/g)].map(match => match[1]);
  if (cols.length < 3 || cols[0] !== 'Acne') continue;
  const [site, categoryName, siteUrl] = cols;
  acneRows.push({ site, categoryName, siteUrl });
}

const mappings = [
  ['남성 - SHOES & ACCESSORIES - Belts', 'https://www.acnestudios.com/nl/en/man/belts/', '50003989'],
  ['여성 - CLOTHING - Outerwear', 'https://www.acnestudios.com/nl/en/woman/outerwear/', '50021360'],
  ['여성 - CLOTHING - Trousers', 'https://www.acnestudios.com/nl/en/woman/trousers/', '50000810'],
  ['여성 - CLOTHING - T-shirts', 'https://www.acnestudios.com/nl/en/woman/t-shirts/', '50000803'],
  ['여성 - CLOTHING - Knitwear', 'https://www.acnestudios.com/nl/en/woman/knitwear/', '50021299'],
  ['여성 - CLOTHING - Suit Jackets', 'https://www.acnestudios.com/nl/en/woman/suit-jackets/', '50021360'],
  ['여성 - CLOTHING - Dresses', 'https://www.acnestudios.com/nl/en/woman/dresses/', '50000807'],
  ['여성 - CLOTHING - Shirts & Blouses', 'https://www.acnestudios.com/nl/en/woman/shirts-and-blouses/', '50000804'],
  ['여성 - CLOTHING - Skirts', 'https://www.acnestudios.com/nl/en/woman/skirts/', '50000808'],
  ['여성 - CLOTHING - Shorts', 'https://www.acnestudios.com/nl/en/woman/shorts/', '50000810'],
  ['여성 - SHOES & ACCESSORIES - Scarves', 'https://www.acnestudios.com/nl/en/scarves/', '50004010'],
  ['여성 - SHOES & ACCESSORIES - Hats', 'https://www.acnestudios.com/nl/en/woman/hats/', '50000546'],
  ['여성 - SHOES & ACCESSORIES - Eyewear', 'https://www.acnestudios.com/nl/en/woman/eyewear/', '50000554'],
  ['여성 - SHOES & ACCESSORIES - Belts', 'https://www.acnestudios.com/nl/en/woman/belts/', '50000539'],
  ['남성 - CLOTHING - Outerwear', 'https://www.acnestudios.com/nl/en/man/outerwear/', '50021640'],
  ['남성 - CLOTHING - Trousers', 'https://www.acnestudios.com/nl/en/man/trousers/', '50000836'],
  ['남성 - CLOTHING - Knitwear', 'https://www.acnestudios.com/nl/en/man/knitwear/', '50021579'],
  ['남성 - CLOTHING - T-shirts', 'https://www.acnestudios.com/nl/en/man/t-shirts/', '50000830'],
  ['남성 - CLOTHING - Shirts', 'https://www.acnestudios.com/nl/en/man/shirts/', '50000833'],
  ['남성 - CLOTHING - Suit Jackets', 'https://www.acnestudios.com/nl/en/man/suit-jackets/', '50021640'],
  ['남성 - CLOTHING - Shorts', 'https://www.acnestudios.com/nl/en/man/shorts/', '50000836'],
  ['남성 - SHOES & ACCESSORIES - Scarves', 'https://www.acnestudios.com/nl/en/scarves/', '50004010'],
  ['남성 - SHOES & ACCESSORIES - Hats', 'https://www.acnestudios.com/nl/en/man/hats/', '50000546'],
  ['남성 - SHOES & ACCESSORIES - Eyewear', 'https://www.acnestudios.com/nl/en/man/eyewear/', '50000554'],
  ['가방 - TYPES - Top Handle Bags', 'https://www.acnestudios.com/nl/en/bags/top-handle-bags/', '50000640'],
  ['가방 - TYPES - Shoulder Bags', 'https://www.acnestudios.com/nl/en/bags/shoulder-bags/', '50000639'],
  ['가방 - TYPES - Backpacks', 'https://www.acnestudios.com/nl/en/bags/backpack/', '50000644'],
  ['가방 - TYPES - Crossbody Bags', 'https://www.acnestudios.com/nl/en/bags/crossbody/', '50000641'],
  ['가방 - TYPES - Totes', 'https://www.acnestudios.com/nl/en/bags/totes/', '50000640'],
];

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const rows = mappings.map(([categoryName, siteUrl, code]) => {
  const sourceRow = acneRows.find(row => row.categoryName === categoryName && row.siteUrl === siteUrl);
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

fs.writeFileSync('acne_mapping_insert.sql', sql, { encoding: 'utf8' });
console.log(`Wrote acne_mapping_insert.sql (${rows.length} rows)`);
