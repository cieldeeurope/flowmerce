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

const jilsanderByUrl = new Map();
for (const line of source.split(/\r?\n/)) {
  const cols = [...line.matchAll(/"([^"]*)"/g)].map(match => match[1]);
  if (cols.length < 3 || cols[0] !== 'Jilsander') continue;
  const [site, categoryName, siteUrl] = cols;
  jilsanderByUrl.set(siteUrl, { site, categoryName, siteUrl });
}

const mappings = [
  ['https://www.jilsander.com/en-nl/women/ready-to-wear/dresses', '50000807'],
  ['https://www.jilsander.com/en-nl/women/ready-to-wear/shirts', '50000804'],
  ['https://www.jilsander.com/en-nl/women/ready-to-wear/skirts', '50000808'],
  ['https://www.jilsander.com/en-nl/women/ready-to-wear/tops-and-t-shirts', '50000803'],
  ['https://www.jilsander.com/en-nl/women/ready-to-wear/trousers', '50000810'],
  ['https://www.jilsander.com/en-nl/women/ready-to-wear/coats-and-jackets', '50021360'],
  ['https://www.jilsander.com/en-nl/women/ready-to-wear/knitwear-and-sweatshirts', '50021299'],
  ['https://www.jilsander.com/en-nl/women/ready-to-wear/tailoring-and-suits', '50000816'],
  ['https://www.jilsander.com/en-nl/women/accessories/sunglasses', '50000554'],
  ['https://www.jilsander.com/on/demandware.store/Sites-JilSanderEU3-Site/en_NL/Search-ShowAjax?cgid=jilsander-woman-other-bags&prefn1=ecomProductGroup&prefv1=Crossbodies&categoryref=true', '50000641'],
  ['https://www.jilsander.com/on/demandware.store/Sites-JilSanderEU3-Site/en_NL/Search-ShowAjax?cgid=jilsander-woman-other-bags&prefn1=ecomProductGroup&prefv1=Shoulder%20bags&categoryref=true', '50000639'],
  ['https://www.jilsander.com/on/demandware.store/Sites-JilSanderEU3-Site/en_NL/Search-ShowAjax?cgid=jilsander-woman-other-bags&prefn1=ecomProductGroup&prefv1=Totes&categoryref=true', '50000640'],
  ['https://www.jilsander.com/on/demandware.store/Sites-JilSanderEU3-Site/en_NL/Search-ShowAjax?cgid=jilsander-woman-other-shoes&prefn1=ecomProductGroup&prefv1=Boots&categoryref=true', '50004191'],
  ['https://www.jilsander.com/on/demandware.store/Sites-JilSanderEU3-Site/en_NL/Search-ShowAjax?cgid=jilsander-woman-other-shoes&prefn1=ecomProductGroup&prefv1=Flats&categoryref=true', '50003817'],
  ['https://www.jilsander.com/on/demandware.store/Sites-JilSanderEU3-Site/en_NL/Search-ShowAjax?cgid=jilsander-woman-other-shoes&prefn1=ecomProductGroup&prefv1=Heels&categoryref=true', '50003830'],
  ['https://www.jilsander.com/on/demandware.store/Sites-JilSanderEU3-Site/en_NL/Search-ShowAjax?cgid=jilsander-woman-other-shoes&prefn1=ecomProductGroup&prefv1=Loafers&categoryref=true', '50003818'],
  ['https://www.jilsander.com/on/demandware.store/Sites-JilSanderEU3-Site/en_NL/Search-ShowAjax?cgid=jilsander-woman-other-shoes&prefn1=ecomProductGroup&prefv1=Sandals&categoryref=true', '50003842'],
  ['https://www.jilsander.com/on/demandware.store/Sites-JilSanderEU3-Site/en_NL/Search-ShowAjax?cgid=jilsander-woman-other-shoes&prefn1=ecomProductGroup&prefv1=Sneakers&categoryref=true', '50003822'],
  ['https://www.jilsander.com/on/demandware.store/Sites-JilSanderEU3-Site/en_NL/Search-ShowAjax?cgid=jilsander-woman-other-smallleathergoods&prefn1=ecomProductGroup&prefv1=Belts&categoryref=true', '50000539'],
  ['https://www.jilsander.com/on/demandware.store/Sites-JilSanderEU3-Site/en_NL/Search-ShowAjax?cgid=jilsander-woman-other-smallleathergoods&prefn1=ecomProductGroup&prefv1=Wallets%20and%20card%20holders&categoryref=true', '50000662'],
  ['https://www.jilsander.com/on/demandware.store/Sites-JilSanderEU3-Site/en_NL/Search-ShowAjax?cgid=jilsander-woman-other-jewellery&prefn1=ecomProductGroup&prefv1=Bracelets&categoryref=true', '50004194'],
  ['https://www.jilsander.com/on/demandware.store/Sites-JilSanderEU3-Site/en_NL/Search-ShowAjax?cgid=jilsander-woman-other-jewellery&prefn1=ecomProductGroup&prefv1=Earrings&categoryref=true', '50004164'],
  ['https://www.jilsander.com/on/demandware.store/Sites-JilSanderEU3-Site/en_NL/Search-ShowAjax?cgid=jilsander-woman-other-jewellery&prefn1=ecomProductGroup&prefv1=Necklaces&categoryref=true', '50004174'],
  ['https://www.jilsander.com/on/demandware.store/Sites-JilSanderEU3-Site/en_NL/Search-ShowAjax?cgid=jilsander-woman-other-jewellery&prefn1=ecomProductGroup&prefv1=Pins&categoryref=true', '50004028'],
  ['https://www.jilsander.com/on/demandware.store/Sites-JilSanderEU3-Site/en_NL/Search-ShowAjax?cgid=jilsander-woman-other-jewellery&prefn1=ecomProductGroup&prefv1=Rings&categoryref=true', '50004155'],
  ['https://www.jilsander.com/on/demandware.store/Sites-JilSanderEU3-Site/en_NL/Search-ShowAjax?cgid=jilsander-woman-other-accessories&prefn1=ecomProductGroup&prefv1=Belts&categoryref=true', '50000539'],
  ['https://www.jilsander.com/on/demandware.store/Sites-JilSanderEU3-Site/en_NL/Search-ShowAjax?cgid=jilsander-woman-other-accessories&prefn1=ecomProductGroup&prefv1=Hats&categoryref=true', '50000546'],
  ['https://www.jilsander.com/on/demandware.store/Sites-JilSanderEU3-Site/en_NL/Search-ShowAjax?cgid=jilsander-woman-other-accessories&prefn1=ecomProductGroup&prefv1=Scarves&categoryref=true', '50004010'],
  ['https://www.jilsander.com/en-nl/men/ready-to-wear/tops-and-t-shirts', '50000830'],
  ['https://www.jilsander.com/en-nl/men/ready-to-wear/shirts', '50000833'],
  ['https://www.jilsander.com/en-nl/men/ready-to-wear/trousers', '50000836'],
  ['https://www.jilsander.com/en-nl/men/ready-to-wear/coats-and-jackets', '50021640'],
  ['https://www.jilsander.com/en-nl/men/ready-to-wear/knitwear-and-sweatshirts', '50021579'],
  ['https://www.jilsander.com/en-nl/men/ready-to-wear/tailoring-and-suits', '50000840'],
  ['https://www.jilsander.com/en-nl/men/accessories/sunglasses', '50000554'],
  ['https://www.jilsander.com/on/demandware.store/Sites-JilSanderEU3-Site/en_NL/Search-ShowAjax?cgid=jilsander-man-other-bags&prefn1=ecomProductGroup&prefv1=Backpacks&categoryref=true', '50000651'],
  ['https://www.jilsander.com/on/demandware.store/Sites-JilSanderEU3-Site/en_NL/Search-ShowAjax?cgid=jilsander-man-other-bags&prefn1=ecomProductGroup&prefv1=Briefcases&categoryref=true', '50000650'],
  ['https://www.jilsander.com/on/demandware.store/Sites-JilSanderEU3-Site/en_NL/Search-ShowAjax?cgid=jilsander-man-other-bags&prefn1=ecomProductGroup&prefv1=Crossbodies&categoryref=true', '50000648'],
  ['https://www.jilsander.com/on/demandware.store/Sites-JilSanderEU3-Site/en_NL/Search-ShowAjax?cgid=jilsander-man-other-bags&prefn1=ecomProductGroup&prefv1=Shoulder%20bags&categoryref=true', '50000646'],
  ['https://www.jilsander.com/on/demandware.store/Sites-JilSanderEU3-Site/en_NL/Search-ShowAjax?cgid=jilsander-man-other-bags&prefn1=ecomProductGroup&prefv1=Totes&categoryref=true', '50000647'],
  ['https://www.jilsander.com/on/demandware.store/Sites-JilSanderEU3-Site/en_NL/Search-ShowAjax?cgid=jilsander-man-other-shoes&prefn1=ecomProductGroup&prefv1=Lace-ups&categoryref=true', '50000787'],
  ['https://www.jilsander.com/on/demandware.store/Sites-JilSanderEU3-Site/en_NL/Search-ShowAjax?cgid=jilsander-man-other-shoes&prefn1=ecomProductGroup&prefv1=Loafers&categoryref=true', '50000787'],
  ['https://www.jilsander.com/on/demandware.store/Sites-JilSanderEU3-Site/en_NL/Search-ShowAjax?cgid=jilsander-man-other-shoes&prefn1=ecomProductGroup&prefv1=Sneakers&categoryref=true', '50000788'],
  ['https://www.jilsander.com/on/demandware.store/Sites-JilSanderEU3-Site/en_NL/Search-ShowAjax?cgid=jilsander-man-other-smallleathergoods&prefn1=ecomProductGroup&prefv1=Belts&categoryref=true', '50003989'],
  ['https://www.jilsander.com/on/demandware.store/Sites-JilSanderEU3-Site/en_NL/Search-ShowAjax?cgid=jilsander-man-other-smallleathergoods&prefn1=ecomProductGroup&prefv1=Wallets%20and%20card%20holders&categoryref=true', '50000662'],
  ['https://www.jilsander.com/on/demandware.store/Sites-JilSanderEU3-Site/en_NL/Search-ShowAjax?cgid=jilsander-man-other-accessories&prefn1=ecomProductGroup&prefv1=Belts&categoryref=true', '50003989'],
  ['https://www.jilsander.com/on/demandware.store/Sites-JilSanderEU3-Site/en_NL/Search-ShowAjax?cgid=jilsander-man-other-accessories&prefn1=ecomProductGroup&prefv1=Hats&categoryref=true', '50000546'],
  ['https://www.jilsander.com/on/demandware.store/Sites-JilSanderEU3-Site/en_NL/Search-ShowAjax?cgid=jilsander-man-other-accessories&prefn1=ecomProductGroup&prefv1=Scarves&categoryref=true', '50004010'],
  ['https://www.jilsander.com/on/demandware.store/Sites-JilSanderEU3-Site/en_NL/Search-ShowAjax?cgid=jilsander-man-other-jewellery&prefn1=ecomProductGroup&prefv1=Bracelets&categoryref=true', '50004194'],
  ['https://www.jilsander.com/on/demandware.store/Sites-JilSanderEU3-Site/en_NL/Search-ShowAjax?cgid=jilsander-man-other-jewellery&prefn1=ecomProductGroup&prefv1=Rings&categoryref=true', '50004155'],
];

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const rows = mappings.map(([siteUrl, code]) => {
  const sourceRow = jilsanderByUrl.get(siteUrl);
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

fs.writeFileSync('jilsander_mapping_insert.sql', sql, { encoding: 'utf8' });
console.log(`Wrote jilsander_mapping_insert.sql (${rows.length} rows)`);
