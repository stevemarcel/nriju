import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Resolve paths relative to this script's directory (project root)
const __filename = fileURLToPath(import.meta.url);
const ROOT = path.dirname(__filename);
const dirs = [
  path.join(ROOT, "client/src/components"),
  path.join(ROOT, "client/src/pages"),
];
let converted = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".jsx") || entry.name.endsWith(".js")) convertFile(full);
  }
}

function convertFile(file) {
  let src = fs.readFileSync(file, "utf8");
  const original = src;

  // export default function Name(params) {  ->  const Name = (params) => {
  const re = /export default function (\w+)\s*\(([^)]*)\)\s*\{/g;
  const matches = [...src.matchAll(re)];
  if (matches.length === 0) return;

  for (const m of matches) {
    src = src.replace(
      `export default function ${m[1]}(${m[2]}) {`,
      `const ${m[1]} = (${m[2]}) => {`
    );
  }

  const exports = matches.map((m) => m[1]);
  const exportBlock = `\n};\n\nexport { ${exports.join(", ")} };\n`;
  src = src.replace(/\n\}\s*$/, exportBlock);

  if (src !== original) {
    fs.writeFileSync(file, src);
    converted++;
    console.log("  " + path.relative(ROOT, file));
  }
}

for (const dir of dirs) walk(dir);
console.log(`\nConverted ${converted} files`);