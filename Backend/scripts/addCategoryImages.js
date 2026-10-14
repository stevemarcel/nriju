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

// Simple string replacement approach
for (const [name, url] of Object.entries(categoryImageMap)) {
  // Find each category block and add image after sortOrder
  const pattern = `(name: "${name}",\n\s*slug: "[^"]+",\n\s*description:\s*"[^"]+",\n\s*isActive: true,\n\s*sortOrder: \d+,)`;
  const regex = new RegExp(pattern, "s");
  const replacement = `$1\n    image: "${url}",`;
  content = content.replace(regex, replacement);
}

await fs.writeFile(categorySeedPath, content);
console.log("✅ Updated Backend/seed/categories.js");

// Verify
const verify = await fs.readFile(categorySeedPath, "utf-8");
const hasImages = (verify.match(/image:/g) || []).length;
console.log(`   Found ${hasImages} image fields added`);
