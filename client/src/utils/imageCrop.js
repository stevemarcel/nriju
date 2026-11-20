import { centerCrop, makeAspectCrop } from "react-image-crop";

export const makeMaxAspectCrop = (width, height, aspect) => {
  const imageAspect = width / height;
  const seed = imageAspect >= aspect ? { unit: "%", height: 100 } : { unit: "%", width: 100 };

  return centerCrop(makeAspectCrop(seed, aspect, width, height), width, height);
};

export const percentCropToPixels = (crop, width, height) => ({
  unit: "px",
  x: ((crop.x ?? 0) / 100) * width,
  y: ((crop.y ?? 0) / 100) * height,
  width: ((crop.width ?? 0) / 100) * width,
  height: ((crop.height ?? 0) / 100) * height,
});

export const createCroppedImageFile = async (image, crop, originalName = "image") => {
  if (!image || !crop?.width || !crop?.height) {
    throw new Error("Choose a valid crop area before continuing.");
  }

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(crop.width * scaleX));
  canvas.height = Math.max(1, Math.round(crop.height * scaleY));

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not prepare the cropped image.");

  context.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) =>
        result ? resolve(result) : reject(new Error("The cropped image could not be generated.")),
      "image/webp",
      0.92,
    );
  });

  const baseName = originalName.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${baseName}-cropped.webp`, {
    type: "image/webp",
  });
};
