#!/usr/bin/env node
/**
 * Script to add Cloudinary URLs to seed files
 * Run: node Backend/scripts/addImagesToSeed.js
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

// Map product filenames to names (from seed)
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

const productImages = uploads.products.map((p) => p.url);

// Category mapping
const categoryImages = {
  Swallows: uploads.categories[6]?.url,
  "Soups & Stews": uploads.categories[5]?.url,
  Seasonings: uploads.categories[3]?.url,
  "Oils & Fats": uploads.categories[1]?.url,
  Snacks: uploads.categories[4]?.url,
  Drinks: uploads.categories[0]?.url,
  Proteins: uploads.categories[2]?.url,
};

// User mapping (will be used when we enable user avatars)
const userAvatars = {
  "Nriju Super Admin": uploads.users[4]?.url,
  "Store Manager": uploads.users[3]?.url,
  "New Horizon": uploads.users[0]?.url,
  "Steve Svile": uploads.users[2]?.url,
  "Shark Colours": uploads.users[1]?.url,
};

console.log("Product images count:", productImages.length);
console.log("Category images:", Object.keys(categoryImages).length);
console.log("User avatars:", Object.keys(userAvatars).length);

// Write mapping for manual seed update
await fs.writeFile(
  path.join(__dirname, "seed-image-mapping.json"),
  JSON.stringify({ productImages, categoryImages, userAvatars }, null, 2),
);

console.log("\n✅ Mapping saved to Backend/scripts/seed-image-mapping.json");
console.log("\n⚠️  Manual step: You need to manually add these URLs to your seed files.");
console.log("   The mapping file shows you exactly which URLs go where.");
