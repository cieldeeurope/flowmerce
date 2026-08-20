const fs = require("fs");
const path = require("path");

function replaceInFiles(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            replaceInFiles(fullPath);
        } else if (file.endsWith(".ts")) {
            let content = fs.readFileSync(fullPath, "utf8");
            content = content.replace(/error\.message/g, "(error as Error).message");
            fs.writeFileSync(fullPath, content, "utf8");
            console.log(`Updated: ${fullPath}`);
        }
    });
}

replaceInFiles("./src");
console.log("✅ 모든 TypeScript 파일에서 message가 변경됨!");
