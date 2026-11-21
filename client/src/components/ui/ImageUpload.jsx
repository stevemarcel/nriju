import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2, X } from "lucide-react";
import ImageCropDialog from "./ImageCropDialog";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const ImagePreview = ({ image, alt, aspect }) => {
  const [src, setSrc] = useState(() => (typeof image === "string" && image.trim() ? image : null));

  useEffect(() => {
    if (typeof image === "string") {
      setSrc(image.trim() ? image : null);
      return undefined;
    }

    if (!(image instanceof Blob)) {
      setSrc(null);
      return undefined;
    }

    const objectUrl = URL.createObjectURL(image);
    setSrc(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [image]);

  if (!src) {
    return (
      <div
        role="img"
        aria-label={`${alt} preview loading`}
        aria-busy="true"
        style={{ aspectRatio: String(aspect) }}
        className="w-28 animate-pulse rounded-lg border border-border bg-background-soft motion-reduce:animate-none"
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      style={{ aspectRatio: String(aspect) }}
      className="w-28 rounded-lg border border-border object-cover"
    />
  );
};

const ImageUpload = ({
  initialImages = [],
  onChange,
  maxImages = 10,
  disabled = false,
  onUpload,
  imageLabel = "Product image",
  cropAspect = 1,
}) => {
  const [cropQueue, setCropQueue] = useState([]);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const currentFile = cropQueue[0] || null;

  const emit = (next) => onChange?.(next);

  const finishCurrentCrop = () => {
    const hasAnotherCrop = cropQueue.length > 1;
    setCropQueue((current) => current.slice(1));
    if (!hasAnotherCrop) onUpload?.(false);
  };

  const handleFiles = (files) => {
    if (!files.length || disabled) return;
    setError("");

    const remaining = maxImages - initialImages.length;
    if (remaining <= 0) {
      setError(`You can add up to ${maxImages} images.`);
      return;
    }

    const selected = Array.from(files);
    const accepted = selected.filter((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase();
      return (
        ACCEPTED_TYPES.includes(file.type) &&
        ["jpeg", "jpg", "png", "webp"].includes(extension) &&
        file.size <= MAX_FILE_SIZE
      );
    });

    if (accepted.length < selected.length) {
      setError("Only JPG, PNG, or WebP images up to 10 MB are allowed.");
    }
    if (!accepted.length) return;

    const queued = accepted.slice(0, remaining);
    if (accepted.length > remaining) {
      setError(`Only ${remaining} more image${remaining === 1 ? "" : "s"} can be added.`);
    }
    setCropQueue(queued);
    onUpload?.(true);
  };

  const handleCropConfirm = (croppedFile) => {
    emit([...initialImages, croppedFile]);
    finishCurrentCrop();
  };

  const handleRemove = (index) => {
    emit(initialImages.filter((_, imageIndex) => imageIndex !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {initialImages.map((image, index) => (
          <div
            key={
              typeof image === "string"
                ? `${image}-${index}`
                : `${image.name}-${image.lastModified}-${index}`
            }
            className="relative"
          >
            <ImagePreview image={image} alt={`${imageLabel} ${index + 1}`} aspect={cropAspect} />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              disabled={disabled || Boolean(currentFile)}
              className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-on-accent transition-colors hover:bg-destructive-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label={`Remove ${imageLabel.toLowerCase()} ${index + 1}`}
            >
              <Trash2 className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        ))}

        {initialImages.length < maxImages ? (
          <label className="relative flex h-24 w-28 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-text-muted transition-colors hover:border-primary hover:text-primary focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 has-disabled:cursor-not-allowed has-disabled:opacity-60">
            <ImagePlus className="h-6 w-6" aria-hidden="true" />
            <span className="mt-1 text-xs">Add image</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple={maxImages > 1}
              disabled={disabled || Boolean(currentFile)}
              className="sr-only"
              onChange={(event) => {
                handleFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
        ) : null}
      </div>

      <p className="text-xs leading-5 text-text-secondary">
        New images stay on this device and upload only when the form is saved.
      </p>

      {error ? (
        <p role="alert" className="flex items-center gap-1 text-xs text-error">
          <X className="h-3 w-3" aria-hidden="true" /> {error}
        </p>
      ) : null}

      <ImageCropDialog
        file={currentFile}
        aspect={cropAspect}
        title={`Crop ${imageLabel.toLowerCase()}`}
        positionLabel={
          cropQueue.length > 1
            ? `Image ${initialImages.length + 1} of ${initialImages.length + cropQueue.length}`
            : imageLabel
        }
        onCancel={finishCurrentCrop}
        onConfirm={handleCropConfirm}
      />
    </div>
  );
};

export default ImageUpload;
