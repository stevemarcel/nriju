import cloudinary from "../config/cloudinary.js";

// Transform options for consistent delivery
const avatarTransform = {
  width: 200,
  height: 200,
  crop: "fill",
  quality: "auto",
  fetch_format: "auto",
};

const productTransform = {
  width: 1200,
  height: 1200,
  crop: "limit",
  quality: "auto",
  fetch_format: "auto",
};

/**
 * Upload a buffer to Cloudinary and return { url, publicId }
 * folder prefix ensures organized cloud structure.
 */
export const uploadBuffer = (buffer, folder) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder, resource_type: "image", use_filename: true, unique_filename: false },
        (error, result) => {
          if (error) return reject(error);
          // Strip extension if present to avoid 404s
          const publicIdWithoutExt = result.public_id.replace(/\.[^/.]+$/, "");
          resolve({ ...result, public_id: publicIdWithoutExt });
        },
      )
      .end(buffer);
  });

export const uploadAvatarToCloudinary = async (buffer) => {
  const result = await uploadBuffer(buffer, "nriju/avatars");
  return {
    url: cloudinary.url(result.public_id, avatarTransform),
    publicId: result.public_id,
  };
};

export const uploadProductToCloudinary = async (buffer, publicId) => {
  const result = await uploadBuffer(buffer, "nriju/products");
  return {
    url: cloudinary.url(result.public_id, productTransform),
    publicId: result.public_id,
  };
};

export const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch (err) {
    console.error(`Cloudinary delete failed for ${publicId}:`, err.message);
  }
};
