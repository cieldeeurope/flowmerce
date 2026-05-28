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

const todsByUrl = new Map();
for (const line of source.split(/\r?\n/)) {
  const cols = [...line.matchAll(/"([^"]*)"/g)].map(match => match[1]);
  if (cols.length < 3 || cols[0] !== 'Tods') continue;
  const [site, categoryName, siteUrl] = cols;
  todsByUrl.set(siteUrl, { site, categoryName, siteUrl });
}

const mappings = [
  ['https://www.tods.com/fr-fr/Femme/Chaussures/Mocassins/c/114-Tods/', '50003818'],
  ['https://www.tods.com/fr-fr/Femme/Chaussures/Gommino-et-City-Gommino/c/111-Tods/', '50003818'],
  ['https://www.tods.com/fr-fr/Femme/Chaussures/Baskets/c/118-Tods/', '50003822'],
  ['https://www.tods.com/fr-fr/Femme/Chaussures/Escarpins/c/116-Tods/', '50003830'],
  ['https://www.tods.com/fr-fr/Femme/Chaussures/Sandales-et-Mules/c/176-Tods/', '50003842'],
  ['https://www.tods.com/fr-fr/Femme/Chaussures/Ballerines/c/113-Tods/', '50003817'],
  ['https://www.tods.com/fr-fr/Femme/Chaussures/Bottes-et-Bottines/c/117-Tods/', '50004191'],
  ['https://www.tods.com/fr-fr/Femme/Sacs/Sacs-Cabas/c/123-Tods/', '50000640'],
  ['https://www.tods.com/fr-fr/Femme/Sacs/Sacs-%C3%A0-main/c/121-Tods/', '50000640'],
  ['https://www.tods.com/fr-fr/Femme/Sacs/Sacs-port%C3%A9s-%C3%A9paule-et-Sacs-%C3%A0-bandouli%C3%A8re/c/122-Tods/', '50000639'],
  ['https://www.tods.com/fr-fr/Femme/Sacs/Sacs-Seau/c/154-Tods/', '50000639'],
  ['https://www.tods.com/fr-fr/Femme/Accessoires/Portefeuilles-et-Porte-cartes/c/131-Tods/', '50000662'],
  ['https://www.tods.com/fr-fr/Femme/Accessoires/Lunettes-de-soleil/c/135-Tods/', '50000554'],
  ['https://www.tods.com/fr-fr/Femme/Must-have/Robes/c/168-Tods/', '50000807'],
  ['https://www.tods.com/fr-fr/Femme/Must-have/Pulls/c/166-Tods/', '50021299'],
  ['https://www.tods.com/fr-fr/Femme/Chemises-et-Tops/c/164-Tods/', '50000804'],
  ['https://www.tods.com/fr-fr/Femme/Must-have/Pantalons-et-Jupes/c/163-Tods/', '50000810'],
  ['https://www.tods.com/fr-fr/Femme/Must-have/V%C3%AAtement-de-Dessus/c/151-Tods/', '50021360'],
  ['https://www.tods.com/fr-fr/Homme/Chaussures/Gommino-et-City-Gommino/c/211-Tods/', '50000787'],
  ['https://www.tods.com/fr-fr/Homme/Chaussures/Mocassins/c/213-Tods/', '50000787'],
  ['https://www.tods.com/fr-fr/Homme/Chaussures/Baskets/c/217-Tods/', '50000788'],
  ['https://www.tods.com/fr-fr/Homme/Chaussures/Slip-on/c/208-Tods/', '50000783'],
  ['https://www.tods.com/fr-fr/Homme/Chaussures/Chaussures-%C3%A0-lacets/c/214-Tods/', '50000787'],
  ['https://www.tods.com/fr-fr/Homme/Chaussures/Bottillons/c/215-Tods/', '50021999'],
  ['https://www.tods.com/fr-fr/Homme/Chaussures/Bottines/c/216-Tods/', '50021999'],
  ['https://www.tods.com/fr-fr/Homme/V%C3%AAtement-de-Dessus/c/248-Tods/', '50021640'],
  ['https://www.tods.com/fr-fr/Homme/Pulls/c/268-Tods/', '50021579'],
  ['https://www.tods.com/fr-fr/Homme/Chemises/c/273-Tods/', '50000833'],
  ['https://www.tods.com/fr-fr/Homme/Polo/c/269-Tods/', '50000830'],
  ['https://www.tods.com/fr-fr/Homme/T-Shirt/c/270-Tods/', '50000830'],
  ['https://www.tods.com/fr-fr/Homme/Pantalons/c/285-Tods/', '50000836'],
  ['https://www.tods.com/fr-fr/Homme/Ceintures/c/236-Tods/', '50003989'],
  ['https://www.tods.com/fr-fr/Homme/Ceintures/Ceintures-T-Timeless/c/262-Tods/', '50003989'],
  ['https://www.tods.com/fr-fr/Homme/Ceintures/Ceintures-formelles/c/263-Tods/', '50003988'],
  ['https://www.tods.com/fr-fr/Homme/Ceintures/Ceintures-d%C3%A9contract%C3%A9es/c/266-Tods/', '50003989'],
  ['https://www.tods.com/fr-fr/Homme/Sacs/Sacs-%C3%A0-dos-et-Sacs-%C3%A0-bandouli%C3%A8re/c/222-Tods/', '50000651'],
  ['https://www.tods.com/fr-fr/Homme/Sacs/Sacs/c/223-Tods/', '50000647'],
  ['https://www.tods.com/fr-fr/Homme/Accessoires/Portefeuilles-et-Porte-cartes/c/231-Tods/', '50000662'],
  ['https://www.tods.com/fr-fr/Homme/Accessoires/Bracelets/c/235-Tods/', '50004194'],
  ['https://www.tods.com/fr-fr/Homme/Accessoires/Lunettes-de-soleil/c/238-Tods/', '50000554'],
];

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const rows = mappings.map(([siteUrl, code]) => {
  const sourceRow = todsByUrl.get(siteUrl);
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

fs.writeFileSync('tods_mapping_insert.sql', sql, { encoding: 'utf8' });
console.log(`Wrote tods_mapping_insert.sql (${rows.length} rows)`);
