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

const hernoByUrl = new Map();
for (const line of source.split(/\r?\n/)) {
  const cols = [...line.matchAll(/"([^"]*)"/g)].map(match => match[1]);
  if (cols.length < 3 || cols[0] !== 'Herno') continue;
  const [site, categoryName, siteUrl] = cols;
  hernoByUrl.set(siteUrl, { site, categoryName, siteUrl });
}

const mappings = [
  ['https://www.herno.com/ko/%EC%97%AC%EC%84%B1/%EC%95%84%EC%9A%B0%ED%84%B0%EC%9B%A8%EC%96%B4/%EC%BD%94%ED%8A%B8-and-%ED%8A%B8%EB%A0%8C%EC%B9%98-%EC%BD%94%ED%8A%B8%C2%A0/', '50021419'],
  ['https://www.herno.com/ko/%EC%97%AC%EC%84%B1/%EC%95%84%EC%9A%B0%ED%84%B0%EC%9B%A8%EC%96%B4/%EC%9B%A8%EC%9D%B4%EC%8A%A4%ED%8A%B8-%EC%BD%94%ED%8A%B8%C2%A0/', '50021441'],
  ['https://www.herno.com/ko/%EC%97%AC%EC%84%B1/%EC%95%84%EC%9A%B0%ED%84%B0%EC%9B%A8%EC%96%B4/%ED%8C%8C%EC%B9%B4-and-%EC%9E%AC%ED%82%B7%C2%A0/', '50021360'],
  ['https://www.herno.com/ko/%EC%97%AC%EC%84%B1/%EC%95%84%EC%9A%B0%ED%84%B0%EC%9B%A8%EC%96%B4/%EB%B4%84%EB%B2%84-%EC%9E%AC%ED%82%B7%C2%A0/', '50000814'],
  ['https://www.herno.com/ko/%EC%97%AC%EC%84%B1/%EC%95%84%EC%9A%B0%ED%84%B0%EC%9B%A8%EC%96%B4/%EB%B8%94%EB%A0%88%EC%9D%B4%EC%A0%80/', '50021360'],
  ['https://www.herno.com/ko/%EC%97%AC%EC%84%B1/%EC%95%84%EC%9A%B0%ED%84%B0%EC%9B%A8%EC%96%B4/%EC%85%94%EC%B8%A0%C2%A0/', '50000804'],
  ['https://www.herno.com/ko/%EC%97%AC%EC%84%B1/%EC%95%84%EC%9A%B0%ED%84%B0%EC%9B%A8%EC%96%B4/%EB%A0%88%EC%9D%B8%EC%BD%94%ED%8A%B8/', '50021499'],
  ['https://www.herno.com/ko/%EC%97%AC%EC%84%B1/%EB%8B%A4%EC%9A%B4-%EC%9E%AC%ED%82%B7/%EC%87%BC%ED%8A%B8-%EB%8B%A4%EC%9A%B4-%EC%9E%AC%ED%82%B7/', '50021321'],
  ['https://www.herno.com/ko/%EC%97%AC%EC%84%B1/%EB%8B%A4%EC%9A%B4-%EC%9E%AC%ED%82%B7/%EB%A1%B1-%EB%8B%A4%EC%9A%B4-%EC%9E%AC%ED%82%B7/', '50021321'],
  ['https://www.herno.com/ko/%EC%97%AC%EC%84%B1/%EB%8B%A4%EC%9A%B4-%EC%9E%AC%ED%82%B7/ultralight-%EB%8B%A4%EC%9A%B4-%EC%9E%AC%ED%82%B7/', '50021321'],
  ['https://www.herno.com/ko/%EC%97%AC%EC%84%B1/%EC%9D%98%EB%A5%98/%EB%8B%88%ED%8A%B8%EC%9B%A8%EC%96%B4/', '50021299'],
  ['https://www.herno.com/ko/%EC%97%AC%EC%84%B1/%EC%9D%98%EB%A5%98/%EB%B4%84%EB%B2%84-%EC%9E%AC%ED%82%B7%C2%A0/', '50000814'],
  ['https://www.herno.com/ko/%EC%97%AC%EC%84%B1/%EC%9D%98%EB%A5%98/%EC%8A%A4%EC%9B%A8%ED%84%B0-and-%EC%B9%B4%EB%94%94%EA%B1%B4%C2%A0/', '50021299'],
  ['https://www.herno.com/ko/%EC%97%AC%EC%84%B1/%EC%9D%98%EB%A5%98/%EC%85%94%EC%B8%A0%C2%A0/', '50000804'],
  ['https://www.herno.com/ko/%EC%97%AC%EC%84%B1/%EC%9D%98%EB%A5%98/%ED%8B%B0%EC%85%94%EC%B8%A0-and-%ED%83%91/', '50000803'],
  ['https://www.herno.com/ko/%EC%97%AC%EC%84%B1/%EC%9D%98%EB%A5%98/%ED%8A%B8%EB%9D%BC%EC%9A%B0%EC%A0%80/', '50000810'],
  ['https://www.herno.com/ko/%EC%97%AC%EC%84%B1/%EC%95%A1%EC%84%B8%EC%84%9C%EB%A6%AC/%EB%AA%A8%EC%9E%90%C2%A0/', '50000546'],
  ['https://www.herno.com/ko/%EC%97%AC%EC%84%B1/%EC%95%A1%EC%84%B8%EC%84%9C%EB%A6%AC/%EC%8A%A4%EC%B9%B4%ED%94%84/', '50004010'],
  ['https://www.herno.com/ko/%EB%82%A8%EC%84%B1/%EC%95%84%EC%9A%B0%ED%84%B0%EC%9B%A8%EC%96%B4/%EB%B8%94%EB%A0%88%EC%9D%B4%EC%A0%80/', '50021640'],
  ['https://www.herno.com/ko/%EB%82%A8%EC%84%B1/%EC%95%84%EC%9A%B0%ED%84%B0%EC%9B%A8%EC%96%B4/%EC%BD%94%ED%8A%B8-and-%ED%8A%B8%EB%A0%8C%EC%B9%98-%EC%BD%94%ED%8A%B8%C2%A0/', '50021699'],
  ['https://www.herno.com/ko/%EB%82%A8%EC%84%B1/%EC%95%84%EC%9A%B0%ED%84%B0%EC%9B%A8%EC%96%B4/%ED%8C%8C%EC%B9%B4-and-%EC%9E%AC%ED%82%B7%C2%A0/', '50021640'],
  ['https://www.herno.com/ko/%EB%82%A8%EC%84%B1/%EC%95%84%EC%9A%B0%ED%84%B0%EC%9B%A8%EC%96%B4/%EB%B4%84%EB%B2%84-%EC%9E%AC%ED%82%B7%C2%A0/', '50000837'],
  ['https://www.herno.com/ko/%EB%82%A8%EC%84%B1/%EC%95%84%EC%9A%B0%ED%84%B0%EC%9B%A8%EC%96%B4/%EC%9B%A8%EC%9D%B4%EC%8A%A4%ED%8A%B8-%EC%BD%94%ED%8A%B8%C2%A0/', '50021759'],
  ['https://www.herno.com/ko/%EB%82%A8%EC%84%B1/%EC%95%84%EC%9A%B0%ED%84%B0%EC%9B%A8%EC%96%B4/%EB%A0%88%EC%9D%B8%EC%BD%94%ED%8A%B8/', '50021601'],
  ['https://www.herno.com/ko/%EB%82%A8%EC%84%B1/%EC%95%84%EC%9A%B0%ED%84%B0%EC%9B%A8%EC%96%B4/%EC%85%94%EC%B8%A0%C2%A0/', '50000833'],
  ['https://www.herno.com/ko/%EB%82%A8%EC%84%B1/%EC%95%84%EC%9A%B0%ED%84%B0%EC%9B%A8%EC%96%B4/%ED%95%84%EB%93%9C-%EC%9E%AC%ED%82%B7/', '50021640'],
  ['https://www.herno.com/ko/%EB%82%A8%EC%84%B1/%EB%8B%A4%EC%9A%B4-%EC%9E%AC%ED%82%B7/%EC%87%BC%ED%8A%B8-%EB%8B%A4%EC%9A%B4-%EC%9E%AC%ED%82%B7/', '50021739'],
  ['https://www.herno.com/ko/%EB%82%A8%EC%84%B1/%EB%8B%A4%EC%9A%B4-%EC%9E%AC%ED%82%B7/%EB%A1%B1-%EB%8B%A4%EC%9A%B4-%EC%9E%AC%ED%82%B7/', '50021739'],
  ['https://www.herno.com/ko/%EB%82%A8%EC%84%B1/%EB%8B%A4%EC%9A%B4-%EC%9E%AC%ED%82%B7/ultralight-%EB%8B%A4%EC%9A%B4-%EC%9E%AC%ED%82%B7/', '50021739'],
  ['https://www.herno.com/ko/%EB%82%A8%EC%84%B1/%EC%9D%98%EB%A5%98/%EB%8B%88%ED%8A%B8%EC%9B%A8%EC%96%B4/', '50021579'],
  ['https://www.herno.com/ko/%EB%82%A8%EC%84%B1/%EC%9D%98%EB%A5%98/%EB%B4%84%EB%B2%84-%EC%9E%AC%ED%82%B7%C2%A0/', '50000837'],
  ['https://www.herno.com/ko/%EB%82%A8%EC%84%B1/%EC%9D%98%EB%A5%98/%EC%8A%A4%EC%9B%A8%ED%84%B0-and-%EC%B9%B4%EB%94%94%EA%B1%B4%C2%A0/', '50021579'],
  ['https://www.herno.com/ko/%EB%82%A8%EC%84%B1/%EC%9D%98%EB%A5%98/%EC%85%94%EC%B8%A0/', '50000833'],
  ['https://www.herno.com/ko/%EB%82%A8%EC%84%B1/%EC%9D%98%EB%A5%98/%ED%8B%B0%EC%85%94%EC%B8%A0-and-%ED%8F%B4%EB%A1%9C-%EC%85%94%EC%B8%A0%C2%A0/', '50000830'],
  ['https://www.herno.com/ko/%EB%82%A8%EC%84%B1/%EC%9D%98%EB%A5%98/%ED%8A%B8%EB%9D%BC%EC%9A%B0%EC%A0%80/', '50000836'],
  ['https://www.herno.com/ko/%EB%82%A8%EC%84%B1/%EC%95%A1%EC%84%B8%EC%84%9C%EB%A6%AC/%EB%AA%A8%EC%9E%90%C2%A0/', '50000546'],
  ['https://www.herno.com/ko/%EB%82%A8%EC%84%B1/%EC%95%A1%EC%84%B8%EC%84%9C%EB%A6%AC/%EC%8A%A4%EC%B9%B4%ED%94%84/', '50004010'],
];

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const rows = mappings.map(([siteUrl, code]) => {
  const sourceRow = hernoByUrl.get(siteUrl);
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

fs.writeFileSync('herno_mapping_insert.sql', sql, { encoding: 'utf8' });
console.log(`Wrote herno_mapping_insert.sql (${rows.length} rows)`);
