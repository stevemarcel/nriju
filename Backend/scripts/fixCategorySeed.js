import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

const uploads = JSON.parse(
  await fs.readFile(path.join(__dirname, "cloudinary-uploads.json"), "utf-8"),
);

const categoryNames = [
  "Swallows",
  "Soups & Stews",
  "Seasonings",
  "Oils & Fats",
  "Snacks",
  "Drinks",
  "Proteins",
];
const categoryImageMap = {};
uploads.categories.forEach((c, i) => {
  if (categoryNames[i]) {
    categoryImageMap[categoryNames[i]] = c.url;
  }
});

const categorySeedPath = path.join(PROJECT_ROOT, "seed", "categories.js");
let content = await fs.readFile(categorySeedPath, "utf-8");

// Replace the entire categories array with updated version
const lines = content.split("\n");
let inArray = false;
let arrayStart = -1;
let arrayEnd = -1;
let braceCount = 0;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("export default [")) {
    inArray = true;
    arrayStart = i;
  }
  if (inArray) {
    braceCount += (lines[i].match(/{/g) || []).length;
    braceCount -= (lines[i].match(/}/g) || []).length;
    if (braceCount === 0 && arrayStart !== -1) {
      arrayEnd = i;
      break;
    }
  }
}

if (arrayStart !== -1 && arrayEnd !== -1) {
  const oldArray = lines.slice(arrayStart, arrayEnd + 1).join("\n");

  // Build new array with image fields
  let newEntries = [];
  const catRegex =
    /name: "([^"]+)",\s*slug: "([^"]+)",\s*description:\s*"([^"]+)",\s*isActive: true,\s*sortOrder: (\d+),/g;
  let match;
  while ((match = catRegex.exec(oldArray)) !== null) {
    const name = match[1];
    const slug = match[2];
    const desc = match[3];
    const order = match[4];
    const image = categoryImageMap[name] || "";

    let entry = `  {\n    name: "${name}",\n    slug: "${slug}",\n    description:\n      "${desc}",`;
    if (image) entry += `\n    image: "${image}",`;
    entry += `\n    isActive: true,\n    sortOrder: ${order},\n  },`;
    newEntries.push(entry);
  }

  const newArray = `export default [\n${newEntries.join("\n\n")}\n];`;
  content = content.substring(0, arrayStart) + newArray + content.substring(arrayEnd + 1);

  await fs.writeFile(categorySeedPath, content);
  console.log("✅ Updated Backend/seed/categories.js with Cloudinary URLs");
} else {
  console.log("❌ Could not find categories array");
}
