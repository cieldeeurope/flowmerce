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

const isabelByUrl = new Map();
for (const line of source.split(/\r?\n/)) {
  const cols = [...line.matchAll(/"([^"]*)"/g)].map(match => match[1]);
  if (cols.length < 3 || cols[0] !== 'Isabelmarant') continue;
  const [site, categoryName, siteUrl] = cols;
  isabelByUrl.set(siteUrl, { site, categoryName, siteUrl });
}

const mappings = [
  ['https://isabelmarant.com/en-nl/collections/jackets-woman', '50021360'],
  ['https://isabelmarant.com/en-nl/collections/coats-woman', '50021479'],
  ['https://isabelmarant.com/en-nl/collections/knitwear-woman', '50021299'],
  ['https://isabelmarant.com/en-nl/collections/dresses-woman', '50000807'],
  ['https://isabelmarant.com/en-nl/collections/tops-and-shirts-woman', '50000804'],
  ['https://isabelmarant.com/en-nl/collections/pants-and-shorts-woman', '50000810'],
  ['https://isabelmarant.com/en-nl/collections/skirts-woman', '50000808'],
  ['https://isabelmarant.com/en-nl/collections/tee-shirts-woman', '50000803'],
  ['https://isabelmarant.com/en-nl/collections/wedge-sneakers', '50003822'],
  ['https://isabelmarant.com/en-nl/collections/shoes-sneakers', '50003822'],
  ['https://isabelmarant.com/en-nl/collections/shoes-boots', '50004191'],
  ['https://isabelmarant.com/en-nl/collections/shoes-heels', '50003830'],
  ['https://isabelmarant.com/en-nl/collections/shoes-woman-sandals', '50003842'],
  ['https://isabelmarant.com/en-nl/collections/bags-shoulder', '50000639'],
  ['https://isabelmarant.com/en-nl/collections/bags-crossbody', '50000641'],
  ['https://isabelmarant.com/en-nl/collections/bags-tote', '50000640'],
  ['https://isabelmarant.com/en-nl/collections/bags-fannypacks', '50000645'],
  ['https://isabelmarant.com/en-nl/collections/earring', '50004164'],
  ['https://isabelmarant.com/en-nl/collections/accessories-belts', '50000539'],
  ['https://isabelmarant.com/en-nl/collections/accessories-sunglasses', '50000554'],
  ['https://isabelmarant.com/en-nl/collections/accessories-hats', '50000546'],
  ['https://isabelmarant.com/en-nl/collections/accessories-scarves', '50004010'],
  ['https://isabelmarant.com/en-nl/collections/marant-man-coats-jackets', '50021640'],
  ['https://isabelmarant.com/en-nl/collections/marant-man-pants-shorts', '50000836'],
  ['https://isabelmarant.com/en-nl/collections/marant-man-knitwear', '50021579'],
  ['https://isabelmarant.com/en-nl/collections/marant-man-tee-shirts', '50000830'],
  ['https://isabelmarant.com/en-nl/collections/marant-man-shirts', '50000833'],
];

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const rows = mappings.map(([siteUrl, code]) => {
  const sourceRow = isabelByUrl.get(siteUrl);
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

fs.writeFileSync('isabelmarant_mapping_insert.sql', sql, { encoding: 'utf8' });
console.log(`Wrote isabelmarant_mapping_insert.sql (${rows.length} rows)`);
