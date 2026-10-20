import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/i;
  const ok =
    allowed.test(file.mimetype) && allowed.test(file.originalname.split(".").pop().toLowerCase());
  cb(ok ? null : new Error("Only JPEG, PNG, WebP images are allowed"), ok);
};

export const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("avatar");

export const uploadProductImages = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).array("images", 10);

// Standalone image upload for the product form — uploads the files and returns
// their Cloudinary URLs without creating a product record.
export const uploadProductImageFiles = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).array("images", 10);
