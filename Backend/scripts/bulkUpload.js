#!/usr/bin/env node
/**
 * Bulk upload local images to Cloudinary and output mapping JSON
 *
 * Usage: node Backend/scripts/bulkUpload.js
 *
 * This reads images from the local resources folder, uploads to Cloudinary,
 * and writes a mapping file you can use to seed your database.
 */

import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import cloudinary from "../config/cloudinary.js";
import { readFileSync, readdirSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGE_ROOT = "C:/Users/justs/STEVE JIGGY/GRAPHICS/03 WORK/Nriju/Resources/WEB/Images";

// Cloudinary transform options for different use cases
const transforms = {
  avatar: {
    width: 200,
    height: 200,
    crop: "fill",
    quality: "auto",
    fetch_format: "webp",
  },
  product: {
    width: 1200,
    height: 1200,
    crop: "limit",
    quality: "auto",
    fetch_format: "webp",
  },
  category: {
    width: 1200,
    height: 630,
    crop: "fill",
    quality: "auto",
    fetch_format: "webp",
  },
};

/**
 * Upload a single file buffer to Cloudinary
 */
async function uploadFile(buffer, publicId, folder, transform) {
  return new Promise((resolve, reject) => {
    const options = {
      folder,
      public_id: publicId,
      resource_type: "image",
      transformation: [transform],
    };

    cloudinary.uploader
      .upload_stream(options, (error, result) => {
        if (error) return reject(error);
        resolve(result);
      })
      .end(buffer);
  });
}

/**
 * Get Cloudinary URL with transformations applied
 */
function getCloudinaryUrl(publicId, transform) {
  return cloudinary.url(publicId, {
    secure: true,
    transformation: [transform],
  });
}

/**
 * Upload all images in a folder
 */
async function uploadFolder(folderName, cloudinaryFolder, transform) {
  const localDir = path.join(IMAGE_ROOT, folderName);
  const results = [];

  try {
    const files = await fs.readdir(localDir);
    const imageFiles = files.filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));

    console.log(`\n📁 Uploading ${folderName}: ${imageFiles.length} images`);

    for (const file of imageFiles) {
      try {
        const filePath = path.join(localDir, file);
        const buffer = readFileSync(filePath);
        const publicId = file.replace(/\.(jpg|jpeg|png|webp)$/i, "");

        const result = await uploadFile(buffer, publicId, cloudinaryFolder, transform);
        const url = getCloudinaryUrl(publicId, transform);

        results.push({
          original: file,
          publicId: result.public_id,
          url: url,
          width: result.width,
          height: result.height,
        });

        console.log(`  ✓ ${file}`);
      } catch (err) {
        console.error(`  ✗ ${file}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`Failed to read ${folderName}: ${err.message}`);
  }

  return results;
}

/**
 * Generate seed data JavaScript from upload results
 */
function generateSeedData(products, categories, users) {
  const lines = [];

  // Products
  lines.push("// Product images - paste these into Backend/seed/products.js");
  lines.push("const productImages = {");
  for (const p of products) {
    const safeName = p.publicId.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    lines.push(`  "${safeName}": "${p.url}",`);
  }
  lines.push("};\n");

  // Categories
  lines.push("// Category images - paste these into Backend/seed/categories.js");
  lines.push("const categoryImages = {");
  for (const c of categories) {
    const safeName = c.publicId.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    lines.push(`  "${safeName}": "${c.url}",`);
  }
  lines.push("};\n");

  // Users
  lines.push("// User avatars - paste these into Backend/seed/users.js");
  lines.push("const userAvatars = {");
  for (const u of users) {
    const safeName = u.publicId.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    lines.push(`  "${safeName}": "${u.url}",`);
  }
  lines.push("};\n");

  return lines.join("\n");
}

async function main() {
  console.log("🚀 Starting bulk image upload to Cloudinary...\n");

  // Upload products (1:1, square)
  const products = await uploadFolder("products/WEBP", "nriju/products", transforms.product);

  // Upload categories (16:9 banner)
  const categories = await uploadFolder("categories/WEBP", "nriju/categories", transforms.category);

  // Upload users (1:1, square for avatars)
  const users = await uploadFolder("users/WEBP", "nriju/avatars", transforms.avatar);

  // Save mapping JSON
  const outputPath = path.join(__dirname, "cloudinary-uploads.json");
  await fs.writeFile(outputPath, JSON.stringify({ products, categories, users }, null, 2));
  console.log(`\n✅ Mapping saved to ${outputPath}`);

  // Generate seed data hints
  const seedHints = generateSeedData(products, categories, users);
  const hintsPath = path.join(__dirname, "seed-hints.js");
  await fs.writeFile(hintsPath, seedHints);
  console.log(`✅ Seed hints saved to ${hintsPath}`);

  console.log(`\n📊 Summary:`);
  console.log(`   Products: ${products.length} uploaded`);
  console.log(`   Categories: ${categories.length} uploaded`);
  console.log(`   Users: ${users.length} uploaded`);
  console.log(`\nNext: Update Backend/seed/*.js with the URLs from seed-hints.js`);
}

main().catch(console.error);
