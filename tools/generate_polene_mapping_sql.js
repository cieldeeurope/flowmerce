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

const poleneByUrl = new Map();
for (const line of source.split(/\r?\n/)) {
  const cols = [...line.matchAll(/"([^"]*)"/g)].map(match => match[1]);
  if (cols.length < 3 || cols[0] !== 'Polene') continue;
  const [site, categoryName, siteUrl] = cols;
  poleneByUrl.set(siteUrl, { site, categoryName, siteUrl });
}

const mappings = [
  ['https://nl.polene-paris.com/collections/belt-bags', '50000645'],
  ['https://nl.polene-paris.com/collections/category-handbags', '50000640'],
  ['https://nl.polene-paris.com/collections/crossbody', '50000641'],
  ['https://nl.polene-paris.com/collections/shoulder-bags', '50000639'],
  ['https://nl.polene-paris.com/collections/tote-bags', '50000640'],
  ['https://nl.polene-paris.com/collections/category-pouch', '50000643'],
  ['https://nl.polene-paris.com/collections/earrings', '50004164'],
  ['https://nl.polene-paris.com/collections/bracelets', '50004194'],
  ['https://nl.polene-paris.com/collections/rings', '50004155'],
  ['https://nl.polene-paris.com/collections/necklaces', '50004174'],
  ['https://nl.polene-paris.com/collections/wallets', '50003982'],
  ['https://nl.polene-paris.com/collections/card-holder-and-purse', '50000662'],
  ['https://nl.polene-paris.com/collections/pouch', '50000643'],
  ['https://nl.polene-paris.com/collections/belts', '50000539'],
];

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const rows = mappings.map(([siteUrl, code]) => {
  const sourceRow = poleneByUrl.get(siteUrl);
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

fs.writeFileSync('polene_mapping_insert.sql', sql, { encoding: 'utf8' });
console.log(`Wrote polene_mapping_insert.sql (${rows.length} rows)`);
