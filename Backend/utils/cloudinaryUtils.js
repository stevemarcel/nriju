import cloudinary from "../config/cloudinary.js";

// Cloudinary delivery transformations. The stored public ID remains the source
// asset; these settings only affect the URL sent to clients.
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

/** Upload a buffer and return the Cloudinary result. */
export const uploadBuffer = (buffer, folder) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          resource_type: "image",
          use_filename: true,
          // Avoid two users uploading files called avatar.webp overwriting or
          // colliding with the same Cloudinary public ID.
          unique_filename: true,
        },
        (error, result) => {
          if (error) return reject(error);
          if (!result?.public_id)
            return reject(new Error("Cloudinary did not return an image ID."));

          // Cloudinary public IDs normally omit the extension, but strip one if
          // an existing asset/provider response includes it.
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

/**
 * Download an authenticated user's original Cloudinary asset on the server.
 * The browser receives these bytes from our own API origin, so the canvas can
 * safely export the crop without depending on Cloudinary CORS headers.
 */
export const downloadAvatarFromCloudinary = async (publicId) => {
  if (!publicId) throw new Error("Avatar public ID is missing.");

  // Construct the public delivery URL from the stored public ID. This avoids
  // calling cloudinary.api.resource(), which requires a successful Admin API
  // request even though the avatar is already publicly deliverable.
  const sourceUrl = cloudinary.url(publicId, { secure: true });
  let parsedUrl;
  try {
    parsedUrl = new URL(sourceUrl);
  } catch {
    throw new Error("Could not construct the Cloudinary avatar URL.");
  }

  // The URL is constructed by the Cloudinary SDK, but keep this guard so this
  // server-side fetch can never be redirected to an arbitrary host by bad data.
  if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "res.cloudinary.com") {
    throw new Error("Cloudinary produced an unexpected avatar URL host.");
  }

  const response = await fetch(parsedUrl, {
    signal: AbortSignal.timeout(15000),
    redirect: "error",
  });

  if (!response.ok) {
    throw new Error(`Cloudinary image download failed (${response.status}).`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  if (!contentType.startsWith("image/")) {
    throw new Error("Cloudinary returned a non-image response.");
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw new Error("Cloudinary returned an empty image.");

  return { buffer, contentType };
};

/**
 * Remove an asset. Throw on a real Cloudinary failure so controllers can avoid
 * clearing a user's database reference when deletion has not succeeded.
 */
export const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return { result: "not found" };

  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  });

  if (!["ok", "not found"].includes(result?.result)) {
    throw new Error(
      `Cloudinary returned an unexpected delete result: ${result?.result || "unknown"}`,
    );
  }

  return result;
};
