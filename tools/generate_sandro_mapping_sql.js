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

const sandroByUrl = new Map();
for (const line of source.split(/\r?\n/)) {
  const cols = [...line.matchAll(/"([^"]*)"/g)].map(match => match[1]);
  if (cols.length < 3 || cols[0] !== 'Sandro') continue;
  const [site, categoryName, siteUrl] = cols;
  sandroByUrl.set(siteUrl, { site, categoryName, siteUrl });
}

const mappings = [
  ['https://fr.sandro-paris.com/fr/femme/ceintures/', '50000539'],
  ['https://fr.sandro-paris.com/fr/femme/robes/', '50000807'],
  ['https://fr.sandro-paris.com/fr/femme/ensembles/', '50000816'],
  ['https://fr.sandro-paris.com/fr/femme/blousons-vestes/', '50021360'],
  ['https://fr.sandro-paris.com/fr/femme/pulls-cardigans/', '50021299'],
  ['https://fr.sandro-paris.com/fr/femme/tops-chemises/', '50000804'],
  ['https://fr.sandro-paris.com/fr/femme/tailleurs/', '50000816'],
  ['https://fr.sandro-paris.com/fr/femme/pantalons/', '50000810'],
  ['https://fr.sandro-paris.com/fr/femme/jupes-shorts/', '50000808'],
  ['https://fr.sandro-paris.com/fr/femme/t-shirts/', '50000803'],
  ['https://fr.sandro-paris.com/fr/femme/sacs-a-bandouliere/', '50000641'],
  ['https://fr.sandro-paris.com/fr/femme/sacs-porte-epaule/', '50000639'],
  ['https://fr.sandro-paris.com/fr/femme/sacs-cabas/', '50000640'],
  ['https://fr.sandro-paris.com/fr/femme/baskets/', '50003822'],
  ['https://fr.sandro-paris.com/fr/femme/mocassins-mules/', '50003818'],
  ['https://fr.sandro-paris.com/fr/femme/bottines/', '50004191'],
  ['https://fr.sandro-paris.com/fr/femme/sandales-a-talons/', '50003842'],
  ['https://fr.sandro-paris.com/fr/femme/foulards-echarpes/', '50004010'],
  ['https://fr.sandro-paris.com/fr/femme/casquettes-bobs/', '50000546'],
  ['https://fr.sandro-paris.com/fr/femme/accessoires-cheveux/', '50000563'],
  ['https://fr.sandro-paris.com/fr/femme/lunettes-de-soleil/', '50000554'],
  ['https://fr.sandro-paris.com/fr/homme/trenchs-manteaux/', '50021640'],
  ['https://fr.sandro-paris.com/fr/homme/blousons-vestes/', '50021640'],
  ['https://fr.sandro-paris.com/fr/homme/pulls-cardigans/', '50021579'],
  ['https://fr.sandro-paris.com/fr/homme/chemises/', '50000833'],
  ['https://fr.sandro-paris.com/fr/homme/costumes-smokings/', '50000840'],
  ['https://fr.sandro-paris.com/fr/homme/pantalons-shorts/', '50000836'],
  ['https://fr.sandro-paris.com/fr/homme/t-shirts-polos/', '50000830'],
  ['https://fr.sandro-paris.com/fr/homme/ensembles/', '50000840'],
  ['https://fr.sandro-paris.com/fr/homme/sneakers/', '50000788'],
  ['https://fr.sandro-paris.com/fr/homme/chaussures-villes/', '50000787'],
  ['https://fr.sandro-paris.com/fr/homme/sandales/', '50000789'],
  ['https://fr.sandro-paris.com/fr/homme/sacs-a-bandouliere/', '50000648'],
  ['https://fr.sandro-paris.com/fr/homme/sacs-business/', '50000650'],
  ['https://fr.sandro-paris.com/fr/homme/sacs-a-dos/', '50000651'],
  ['https://fr.sandro-paris.com/fr/homme/grands-sacs/', '50000647'],
  ['https://fr.sandro-paris.com/fr/homme/ceintures/', '50003989'],
  ['https://fr.sandro-paris.com/fr/homme/casquettes-bobs/', '50000546'],
  ['https://fr.sandro-paris.com/fr/homme/lunettes-de-soleil/', '50000554'],
];

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const rows = mappings.map(([siteUrl, code]) => {
  const sourceRow = sandroByUrl.get(siteUrl);
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

fs.writeFileSync('sandro_mapping_insert.sql', sql, { encoding: 'utf8' });
console.log(`Wrote sandro_mapping_insert.sql (${rows.length} rows)`);
