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

const hermesByUrl = new Map();
for (const line of source.split(/\r?\n/)) {
  const cols = [...line.matchAll(/"([^"]*)"/g)].map(match => match[1]);
  if (cols.length < 3 || cols[0] !== 'Hermes') continue;
  const [site, categoryName, siteUrl] = cols;
  hermesByUrl.set(siteUrl, { site, categoryName, siteUrl });
}

const mappings = [
  ['https://www.hermes.com/fr/fr/category/femme/pret-a-porter/manteaux-et-vestes/', '50021360'],
  ['https://www.hermes.com/fr/fr/category/femme/pret-a-porter/hauts-et-chemises/', '50000804'],
  ['https://www.hermes.com/fr/fr/category/femme/pret-a-porter/pantalons-jupes-et-shorts/', '50000810'],
  ['https://www.hermes.com/fr/fr/category/femme/pret-a-porter/mailles-et-twillaines/', '50021299'],
  ['https://www.hermes.com/fr/fr/category/femme/chaussures/sandales/', '50003842'],
  ['https://www.hermes.com/fr/fr/category/femme/chaussures/sneakers/', '50003822'],
  ['https://www.hermes.com/fr/fr/category/femme/chaussures/mules/', '50003847'],
  ['https://www.hermes.com/fr/fr/category/femme/chaussures/espadrilles/', '50003821'],
  ['https://www.hermes.com/fr/fr/category/femme/chaussures/mocassins-et-derbies/', '50003818'],
  ['https://www.hermes.com/fr/fr/category/femme/chaussures/bottes-et-bottines/', '50004191'],
  ['https://www.hermes.com/fr/fr/category/femme/carres-chales-et-echarpes/carres-et-accessoires-de-soie/', '50004010'],
  ['https://www.hermes.com/fr/fr/category/femme/carres-chales-et-echarpes/chales-et-echarpes-en-cachemire/', '50000567'],
  ['https://www.hermes.com/fr/fr/category/femme/carres-chales-et-echarpes/twillys-et-autres-petits-formats/', '50004011'],
  ['https://www.hermes.com/fr/fr/category/femme/accessoires-bijoux/bracelets/', '50004194'],
  ['https://www.hermes.com/fr/fr/category/femme/accessoires-bijoux/colliers-et-pendentifs/', '50004174'],
  ['https://www.hermes.com/fr/fr/category/femme/accessoires-bijoux/boucles-d-oreilles/', '50004164'],
  ['https://www.hermes.com/fr/fr/category/femme/accessoires-bijoux/bagues/', '50004155'],
  ['https://www.hermes.com/fr/fr/category/homme/pret-a-porter/manteaux-et-vestes/', '50021640'],
  ['https://www.hermes.com/fr/fr/category/homme/pret-a-porter/chemises/', '50000833'],
  ['https://www.hermes.com/fr/fr/category/homme/pret-a-porter/pantalons-et-shorts/', '50000836'],
  ['https://www.hermes.com/fr/fr/category/homme/pret-a-porter/t-shirts-et-polos/', '50000830'],
  ['https://www.hermes.com/fr/fr/category/homme/chaussures/sneakers/', '50000788'],
  ['https://www.hermes.com/fr/fr/category/homme/chaussures/sandales/', '50000789'],
  ['https://www.hermes.com/fr/fr/category/homme/chaussures/espadrilles-et-mules/', '50000783'],
  ['https://www.hermes.com/fr/fr/category/homme/chaussures/mocassins-et-derbies/', '50000787'],
  ['https://www.hermes.com/fr/fr/category/homme/chaussures/bottines/', '50021999'],
  ['https://www.hermes.com/fr/fr/category/homme/cravates-echarpes-et-carres/echarpes-et-carres/', '50004010'],
  ['https://www.hermes.com/fr/fr/category/maroquinerie/petite-maroquinerie/portefeuilles/', '50003982'],
  ['https://www.hermes.com/fr/fr/category/maroquinerie/petite-maroquinerie/porte-cartes/', '50000662'],
  ['https://www.hermes.com/fr/fr/category/maroquinerie/petite-maroquinerie/trousses-et-etuis/', '50000643'],
  ['https://www.hermes.com/fr/fr/category/bijouterie/bijoux-en-or/bagues/', '50004155'],
  ['https://www.hermes.com/fr/fr/category/bijouterie/bijoux-en-or/bracelets/', '50004194'],
  ['https://www.hermes.com/fr/fr/category/bijouterie/bijoux-en-or/colliers-et-pendentifs/', '50004174'],
  ['https://www.hermes.com/fr/fr/category/bijouterie/bijoux-en-or/bijoux-doreilles/', '50004164'],
  ['https://www.hermes.com/fr/fr/category/bijouterie/bijoux-en-argent/bagues/', '50004155'],
  ['https://www.hermes.com/fr/fr/category/bijouterie/bijoux-en-argent/bracelets/', '50004194'],
  ['https://www.hermes.com/fr/fr/category/bijouterie/bijoux-en-argent/colliers-et-pendentifs/', '50004174'],
  ['https://www.hermes.com/fr/fr/category/bijouterie/bijoux-en-argent/bijoux-doreilles/', '50004164'],
];

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const rows = mappings.map(([siteUrl, code]) => {
  const sourceRow = hermesByUrl.get(siteUrl);
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

fs.writeFileSync('hermes_mapping_insert.sql', sql, { encoding: 'utf8' });
console.log(`Wrote hermes_mapping_insert.sql (${rows.length} rows)`);
