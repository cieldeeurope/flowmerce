const fs = require('fs');

const codeToName = new Map();
const categoryText = fs.readFileSync('C:/Users/Owner/Desktop/smartsottrecateogry.txt', 'utf8');

for (const line of categoryText.split(/\r?\n/)) {
  const match = line.match(/"(\d+)"\s+"([^"]+)"/);
  if (match) {
    codeToName.set(match[1], match[2]);
  }
}

const rows = [
  ['https://www.valentino.com/en-fr/women/ready-to-wear/dresses', '여성 - Ready To Wear - 드레스', '50000807'],
  ['https://www.valentino.com/en-fr/women/ready-to-wear/gowns', '여성 - Ready To Wear - 가운', '50000807'],
  ['https://www.valentino.com/en-fr/women/ready-to-wear/shirts-and-tops', '여성 - Ready To Wear - 셔츠 & 탑', '50000804'],
  ['https://www.valentino.com/en-fr/women/ready-to-wear/coats-and-outerwear', '여성 - Ready To Wear - 코트 & 아우터', '50021360'],
  ['https://www.valentino.com/en-fr/women/ready-to-wear/jackets-and-blazers', '여성 - Ready To Wear - 재킷 & 블레이저', '50021360'],
  ['https://www.valentino.com/en-fr/women/ready-to-wear/knitwear', '여성 - Ready To Wear - 니트웨어', '50021299'],
  ['https://www.valentino.com/en-fr/women/ready-to-wear/t-shirts-and-sweatshirts', '여성 - Ready To Wear - 티셔츠 & 스웨트셔츠', '50000803'],
  ['https://www.valentino.com/en-fr/women/ready-to-wear/skirts', '여성 - Ready To Wear - 스커트', '50000808'],
  ['https://www.valentino.com/en-fr/women/ready-to-wear/pants-and-shorts', '여성 - Ready To Wear - 팬츠 & 쇼츠', '50000810'],
  ['https://www.valentino.com/en-fr/women/bags/shoulder-bags', '여성 - 가방 - 숄더백', '50000639'],
  ['https://www.valentino.com/en-fr/women/bags/top-handle-bags', '여성 - 가방 - 탑 핸들 백', '50000640'],
  ['https://www.valentino.com/en-fr/women/bags/totes', '여성 - 가방 - 토트백', '50000640'],
  ['https://www.valentino.com/en-fr/women/bags/clutches', '여성 - 가방 - 클러치', '50000642'],
  ['https://www.valentino.com/en-fr/women/shoes/pumps', '여성 - 슈즈 - 펌프스 & 슬링백', '50003830'],
  ['https://www.valentino.com/en-fr/women/shoes/ballerinas', '여성 - 슈즈 - 발레리나', '50003817'],
  ['https://www.valentino.com/en-fr/women/shoes/sandals', '여성 - 슈즈 - 샌들', '50003842'],
  ['https://www.valentino.com/en-fr/women/shoes/slides-and-thongs', '여성 - 슈즈 - 슬라이드 & 통 샌들', '50003842'],
  ['https://www.valentino.com/en-fr/women/shoes/espadrilles-and-wedges', '여성 - 슈즈 - 에스파드류 & 웨지', '50003821'],
  ['https://www.valentino.com/en-fr/women/shoes/sneakers', '여성 - 슈즈 - 스니커즈', '50003822'],
  ['https://www.valentino.com/en-fr/women/shoes/loafers-and-oxfords', '여성 - 슈즈 - 로퍼', '50003818'],
  ['https://www.valentino.com/en-fr/women/shoes/boots', '여성 - 슈즈 - 부츠 & 앵클부츠', '50004191'],
  ['https://www.valentino.com/en-fr/women/accessories/wallets-and-card-holders', '여성 - 액세서리 - 지갑 & 카드홀더', '50000662'],
  ['https://www.valentino.com/en-fr/women/accessories/belts', '여성 - 액세서리 - 벨트', '50000539'],
  ['https://www.valentino.com/en-fr/women/accessories/eyewear', '여성 - 액세서리 - 아이웨어', '50000554'],
  ['https://www.valentino.com/en-fr/men/ready-to-wear/coats-and-blazers', '남성 - Ready to Wear - 코트 & 블레이저', '50021640'],
  ['https://www.valentino.com/en-fr/men/ready-to-wear/suits', '남성 - Ready to Wear - 수트', '50000840'],
  ['https://www.valentino.com/en-fr/men/ready-to-wear/outerwear', '남성 - Ready to Wear - 아우터', '50021640'],
  ['https://www.valentino.com/en-fr/men/ready-to-wear/knitwear', '남성 - Ready to Wear - 니트웨어', '50021579'],
  ['https://www.valentino.com/en-fr/men/ready-to-wear/shirts', '남성 - Ready to Wear - 셔츠', '50000833'],
  ['https://www.valentino.com/en-fr/men/ready-to-wear/t-shirts-and-sweatshirts', '남성 - Ready to Wear - 티셔츠 & 스웨트셔츠', '50000830'],
  ['https://www.valentino.com/en-fr/men/ready-to-wear/pants-and-shorts', '남성 - Ready to Wear - 팬츠 & 쇼츠', '50000836'],
  ['https://www.valentino.com/en-fr/men/bags/shoulder-bags', '남성 - 가방 - 숄더백', '50000646'],
  ['https://www.valentino.com/en-fr/men/bags/backpacks', '남성 - 가방 - 백팩', '50000651'],
  ['https://www.valentino.com/en-fr/men/bags/belt-bags', '남성 - 가방 - 벨트백', '50000652'],
  ['https://www.valentino.com/en-fr/men/bags/totes', '남성 - 가방 - 토트백', '50000647'],
  ['https://www.valentino.com/en-fr/men/bags/clutches-and-pouches', '남성 - 가방 - 클러치 & 파우치', '50000649'],
  ['https://www.valentino.com/en-fr/men/shoes/sneakers', '남성 - 슈즈 - 스니커즈', '50000788'],
  ['https://www.valentino.com/en-fr/men/shoes/sandals', '남성 - 슈즈 - 샌들 & 슬라이드', '50000789'],
  ['https://www.valentino.com/en-fr/men/shoes/loafers-and-driver', '남성 - 슈즈 - 로퍼', '50000787'],
  ['https://www.valentino.com/en-fr/men/shoes/lace-ups', '남성 - 슈즈 - 레이스업', '50000787'],
  ['https://www.valentino.com/en-fr/men/shoes/boots', '남성 - 슈즈 - 부츠', '50021999'],
  ['https://www.valentino.com/en-fr/men/accessories/wallets-and-card-holders', '남성 - 액세서리 - 지갑 & 카드홀더', '50000662'],
  ['https://www.valentino.com/en-fr/men/accessories/belts', '남성 - 액세서리 - 벨트', '50003989'],
  ['https://www.valentino.com/en-fr/men/accessories/ties', '남성 - 액세서리 - 타이', '50004014'],
  ['https://www.valentino.com/en-fr/men/accessories/eyewear', '남성 - 액세서리 - 아이웨어', '50000554'],
];

function escapeSql(value) {
  return String(value).replace(/'/g, "''");
}

const values = rows.map(([siteUrl, categoryName, code]) => {
  const godoMallCategoryName = codeToName.get(code);
  if (!godoMallCategoryName) {
    throw new Error(`Missing smartstore category for code ${code}`);
  }

  return `('Valentino', '${escapeSql(siteUrl)}', '${escapeSql(categoryName)}', '${escapeSql(godoMallCategoryName)}', '${code}', NULL, NULL, 'bcm499', 'smartstore_2')`;
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
)
VALUES
${values.join(',\n')}
ON CONFLICT (site, "siteUrl", "godoMallCategoryCode", "customId", "accountPlatform")
DO UPDATE SET
  "categoryName" = EXCLUDED."categoryName",
  "godoMallCategoryName" = EXCLUDED."godoMallCategoryName",
  designers = EXCLUDED.designers,
  "afterDesigners" = EXCLUDED."afterDesigners";
`;

fs.writeFileSync('valentino_mapping_insert.sql', sql, 'utf8');
console.log(`rows=${rows.length}`);
