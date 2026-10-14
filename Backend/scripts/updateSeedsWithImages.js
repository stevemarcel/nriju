#!/usr/bin/env node
/**
 * Script to add Cloudinary image URLs to seed files
 * Run: node Backend/scripts/updateSeedsWithImages.js
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

// Read upload results
const uploads = JSON.parse(
  await fs.readFile(path.join(__dirname, "cloudinary-uploads.json"), "utf-8"),
);

// Product name to image URL mapping (preserving seed order)
const productImageMap = {};
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

uploads.products.forEach((p, i) => {
  if (productNames[i]) {
    productImageMap[productNames[i]] = p.url;
  }
});

// Category image map
const categoryImageMap = {};
const categoryNames = [
  "Swallows",
  "Soups & Stews",
  "Seasonings",
  "Oils & Fats",
  "Snacks",
  "Drinks",
  "Proteins",
];
uploads.categories.forEach((c, i) => {
  if (categoryNames[i]) {
    categoryImageMap[categoryNames[i]] = c.url;
  }
});

console.log("Image mapping created:");
console.log(`  Products: ${Object.keys(productImageMap).length}`);
console.log(`  Categories: ${Object.keys(categoryImageMap).length}`);

// Update product seed - insert images after stock field
const productSeedPath = path.join(PROJECT_ROOT, "seed", "products.js");
let productSeed = await fs.readFile(productSeedPath, "utf-8");

for (const [name, url] of Object.entries(productImageMap)) {
  // Find the product entry and add images after stock
  const regex = new RegExp(
    `(name: "${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}",\\n\\s*description:[\\s\\S]*?stock: \\d+,)(\\n\\s*category:)`,
    "s",
  );
  const replacement = `$1\n    images: ["${url}"],$2`;
  productSeed = productSeed.replace(regex, replacement);
}

await fs.writeFile(productSeedPath, productSeed);
console.log("\n✅ Updated Backend/seed/products.js with Cloudinary URLs");

// Update category seed - insert image after sortOrder
const categorySeedPath = path.join(PROJECT_ROOT, "seed", "categories.js");
let categorySeed = await fs.readFile(categorySeedPath, "utf-8");

for (const [name, url] of Object.entries(categoryImageMap)) {
  const regex = new RegExp(
    `(name: "${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}",\\n\\s*slug: "[^"]*",\\n\\s*description:\\n\\s*"[^"]*",\\n\\s*isActive: true,\\n\\s*sortOrder: \\d+,)(\\n\\s*}]`,
    "s",
  );
  const replacement = `$1\n    image: "${url}",$2`;
  categorySeed = categorySeed.replace(regex, replacement);
}

await fs.writeFile(categorySeedPath, categorySeed);
console.log("✅ Updated Backend/seed/categories.js with Cloudinary URLs");

console.log("\n🎉 Seed files updated! Run `npm run seed` to populate the database.");
