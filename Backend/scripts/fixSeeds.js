#!/usr/bin/env node
/**
 * Fix seed files by adding Cloudinary image URLs
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

const uploads = JSON.parse(
  await fs.readFile(path.join(__dirname, "cloudinary-uploads.json"), "utf-8"),
);

// Product name to URL mapping
const productNames = [
  "Fufu/Akpu - Fresh",
  "Amala - Fresh",
  "Semo - Fresh",
  "Pounded Yam - Fresh",
  "Eba - Fresh",
  "Fufu Powder - Packaged",
  "Amala Lafun - Packaged",
  "Pounded Yam Powder - Packaged",
  "Semolina - Packaged",
  "Garri - Packaged",
  "Obe Ata - Fresh",
  "Gbegiri - Fresh",
  "Egusi Soup - Fresh",
  "Egusi Soup Mix",
  "Ogbono Soup - Fresh",
  "Banga Soup - Fresh",
  "Bitter Leaf Soup - Fresh",
  "Okra Soup - Fresh",
  "Ewedu Soup - Fresh",
  "Edikang Ikong - Fresh",
  "Obe Ata Soup Mix",
  "Ground Crayfish",
  "Locust Beans (Iru)",
  "Yaji Suya Spice",
  "Ground Pepper (Ose)",
  "Bouillon Cubes (Knorr) - Pack (50 x 8g)",
  "Thyme Leaves",
  "Curry Powder",
  "Salt (Iodized)",
  "Palm Oil (Red)",
  "Kings Groundnut Oil",
  "Coconut Oil",
  "Shea Butter",
  "Chin Chin",
  "Puff Puff - Fresh",
  "Akara - Fresh",
  "Meat Pie - Fresh",
  "Spring Rolls - Fresh",
  "Plantain Chips",
  "Kuli Kuli",
  "Kilishi",
  "Moi Moi - Fresh",
  "Boli & Groundnut - Fresh",
  "Zobo Drink",
  "Kunu Drink",
  "Tiger Nut Drink",
  "Fresh Juice - Orange",
  "Fresh Juice - Special Blend (Orange, Pineapple)",
  "Stockfish (Dried)",
  "Kika (Dried Fish)",
  "Dried Beef",
  "Dried Goat Meat",
  "Frozen Tilapia",
  "Frozen Catfish",
  "Frozen Mackerel",
  "Frozen Beef",
  "Frozen Goat Meat",
  "Frozen Chicken",
  "Grilled Fish - Fresh",
  "Suya (Beef) - Fresh",
  "Peppered Meat - Fresh",
  "Peppered Chicken - Fresh",
];

const categoryNames = [
  "Swallows",
  "Soups & Stews",
  "Seasonings",
  "Oils & Fats",
  "Snacks",
  "Drinks",
  "Proteins",
];

const productImageMap = {};
uploads.products.forEach((p, i) => {
  if (productNames[i]) productImageMap[productNames[i]] = p.url;
});

const categoryImageMap = {};
uploads.categories.forEach((c, i) => {
  if (categoryNames[i]) categoryImageMap[categoryNames[i]] = c.url;
});

console.log(
  "Mapping:",
  Object.keys(productImageMap).length,
  "products,",
  Object.keys(categoryImageMap).length,
  "categories",
);

// Fix categories.js - rebuild the entire file properly
const categorySeedPath = path.join(PROJECT_ROOT, "seed", "categories.js");
let catContent = await fs.readFile(categorySeedPath, "utf-8");

// Extract category data from existing file
const catMatches = catContent.matchAll(
  /\{\s*name:\s*"([^"]+)",\s*slug:\s*"([^"]+)",\s*description:\s*"?([^"]+)"?,\s*isActive:\s*(true|false),\s*sortOrder:\s*(\d+),?\s*\}/gs,
);
const categories = [];
for (const match of catMatches) {
  categories.push({
    name: match[1],
    slug: match[2],
    description: match[3],
    isActive: match[4] === "true",
    sortOrder: parseInt(match[5]),
    image: categoryImageMap[match[1]] || "",
  });
}

// Write new categories file
let newCatContent = "// 7 categories — NR-11\nexport default [\n";
for (const cat of categories) {
  newCatContent += `  {\n`;
  newCatContent += `    name: "${cat.name}",\n`;
  newCatContent += `    slug: "${cat.slug}",\n`;
  newCatContent += `    description:\n`;
  newCatContent += `      "${cat.description}",`;
  if (cat.image) newCatContent += `\n    image: "${cat.image}",`;
  newCatContent += `\n    isActive: ${cat.isActive},\n`;
  newCatContent += `    sortOrder: ${cat.sortOrder},\n`;
  newCatContent += `  },\n`;
}
newCatContent += "];\n";

await fs.writeFile(categorySeedPath, newCatContent);
console.log("✅ Categories updated");

// Fix products.js - add images after stock field
const productSeedPath = path.join(PROJECT_ROOT, "seed", "products.js");
let prodContent = await fs.readFile(productSeedPath, "utf-8");

// Split by product entries and add images
const prodRegex = /(\{\s*name:\s*"([^"]+)",)([\s\S]*?)(?=\{\s*name:|$)/g;
prodContent = prodContent.replace(prodRegex, (match, prefix, name, body) => {
  const url = productImageMap[name];
  if (!url) return match;
  // Insert images array after stock field
  const stockMatch = body.match(/(stock: \d+,)/);
  if (stockMatch) {
    const beforeStock = body.substring(0, stockMatch.index + stockMatch[0].length);
    const afterStock = body.substring(stockMatch.index + stockMatch[0].length);
    return prefix + beforeStock + `\n    images: ["${url}"],` + afterStock;
  }
  return match;
});

await fs.writeFile(productSeedPath, prodContent);
console.log("✅ Products updated");

// Verify
const verifyCats = await fs.readFile(categorySeedPath, "utf-8");
const verifyProds = await fs.readFile(productSeedPath, "utf-8");
console.log(`   Categories with images: ${(verifyCats.match(/image:/g) || []).length}`);
console.log(`   Products with images: ${(verifyProds.match(/images:/g) || []).length}`);
console.log("\n🎉 Ready to seed!");
