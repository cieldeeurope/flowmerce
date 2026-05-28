const fs = require('fs');
const path = require('path');

const INPUT_PATH = 'C:\\Users\\Owner\\Desktop\\마진.txt';
const OUTPUT_PATH = path.join(process.cwd(), 'margin_smartstore_2_discount5_insert.sql');
const OUTPUT_PART_1_PATH = path.join(process.cwd(), 'margin_smartstore_2_discount5_insert_part1.sql');
const OUTPUT_PART_2_PATH = path.join(process.cwd(), 'margin_smartstore_2_discount5_insert_part2.sql');

const TARGET_ACCOUNT_PLATFORM = 'smartstore_2';
const TARGET_DISCOUNT_RATE = 5;

function quoteSql(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function parseQuoted(value) {
  const trimmed = String(value || '').trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

const source = fs.readFileSync(INPUT_PATH, 'utf8').replace(/^\uFEFF/, '');

const rows = source
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line, index) => {
    const parts = line.split('\t');

    if (parts.length !== 10) {
      throw new Error(`Line ${index + 1} has ${parts.length} columns: ${line}`);
    }

    const [
      ,
      minAmount,
      maxAmount,
      minMargin,
      marginValue,
      site,
      customId,
      ,
      exchangeRate,
    ] = parts;

    return {
      minAmount: Number(minAmount),
      maxAmount: Number(maxAmount),
      minMargin: Number(minMargin),
      marginValue: Number(marginValue),
      site: parseQuoted(site),
      customId: parseQuoted(customId),
      accountPlatform: TARGET_ACCOUNT_PLATFORM,
      exchangeRate: Number(exchangeRate),
      discountRate: TARGET_DISCOUNT_RATE,
    };
  });

const sitesByCustomId = new Map();

for (const row of rows) {
  if (!sitesByCustomId.has(row.customId)) {
    sitesByCustomId.set(row.customId, new Set());
  }
  sitesByCustomId.get(row.customId).add(row.site);
}

const deleteConditions = [...sitesByCustomId.entries()]
  .map(([customId, sites]) => {
    const siteList = [...sites].sort().map(quoteSql).join(', ');
    return `("customId" = ${quoteSql(customId)} AND "accountPlatform" = ${quoteSql(TARGET_ACCOUNT_PLATFORM)} AND site IN (${siteList}))`;
  })
  .join('\n   OR ');

const values = rows
  .map((row) => {
    return `(${row.minAmount}, ${row.maxAmount}, ${row.minMargin}, ${row.marginValue}, ${quoteSql(row.site)}, ${quoteSql(row.customId)}, ${quoteSql(row.accountPlatform)}, ${row.exchangeRate}, ${row.discountRate})`;
  })
  .join(',\n');

function buildInsertSql(targetRows) {
  const targetValues = targetRows
    .map((row) => {
      return `(${row.minAmount}, ${row.maxAmount}, ${row.minMargin}, ${row.marginValue}, ${quoteSql(row.site)}, ${quoteSql(row.customId)}, ${quoteSql(row.accountPlatform)}, ${row.exchangeRate}, ${row.discountRate})`;
    })
    .join(',\n');

  return `INSERT INTO margin (
  "minAmount",
  "maxAmount",
  "minMargin",
  "marginValue",
  site,
  "customId",
  "accountPlatform",
  "exchangeRate",
  "discountRate"
) VALUES
${targetValues};
`;
}

const sql = `BEGIN;

DELETE FROM margin
WHERE ${deleteConditions};

INSERT INTO margin (
  "minAmount",
  "maxAmount",
  "minMargin",
  "marginValue",
  site,
  "customId",
  "accountPlatform",
  "exchangeRate",
  "discountRate"
) VALUES
${values};

COMMIT;
`;

fs.writeFileSync(OUTPUT_PATH, sql, { encoding: 'utf8' });

const splitAt = Math.ceil(rows.length / 2);
const part1Rows = rows.slice(0, splitAt);
const part2Rows = rows.slice(splitAt);

const part1Sql = `BEGIN;

DELETE FROM margin
WHERE ${deleteConditions};

${buildInsertSql(part1Rows)}

COMMIT;
`;

const part2Sql = `BEGIN;

${buildInsertSql(part2Rows)}

COMMIT;
`;

fs.writeFileSync(OUTPUT_PART_1_PATH, part1Sql, { encoding: 'utf8' });
fs.writeFileSync(OUTPUT_PART_2_PATH, part2Sql, { encoding: 'utf8' });

console.log(JSON.stringify({
  outputPath: OUTPUT_PATH,
  outputPart1Path: OUTPUT_PART_1_PATH,
  outputPart2Path: OUTPUT_PART_2_PATH,
  rowCount: rows.length,
  part1RowCount: part1Rows.length,
  part2RowCount: part2Rows.length,
  customIds: [...sitesByCustomId.keys()],
  siteCount: new Set(rows.map((row) => row.site)).size,
}, null, 2));
