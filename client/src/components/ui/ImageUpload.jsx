import { useRef, useState } from "react";
import { ImagePlus, Trash2, X } from "lucide-react";
import api from "../../services/api";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const ImageUpload = ({
  initialImages = [],
  onChange,
  maxImages = 10,
  disabled = false,
  onUpload,
  uploadEndpoint = "/products/images",
  imageLabel = "Product image",
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const emit = (next) => {
    onChange?.(next);
  };

  const handleFiles = async (files) => {
    if (!files.length || disabled) return;
    setError("");

    const remaining = maxImages - initialImages.length;
    if (remaining <= 0) {
      setError(`You can upload up to ${maxImages} images.`);
      return;
    }

    const accepted = Array.from(files).filter((file) => {
      const okType = ACCEPTED_TYPES.includes(file.type);
      const ext = file.name.split(".").pop().toLowerCase();
      const okExt = ["jpeg", "jpg", "png", "webp"].includes(ext);
      return okType && okExt && file.size <= MAX_FILE_SIZE;
    });

    if (accepted.length < files.length) {
      setError("Only JPG, PNG, or WebP images up to 10 MB are allowed.");
    }
    if (!accepted.length) return;

    const toUpload = accepted.slice(0, remaining);
    setUploading(true);
    setProgress(0);
    onUpload?.(true);

    try {
      const formData = new FormData();
      toUpload.forEach((file) => formData.append("images", file));

      const res = await api.post(uploadEndpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) return;
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
        },
      });

      const uploaded = res?.data?.data?.images ?? [];
      emit([...initialImages, ...uploaded]);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not upload images.");
    } finally {
      setUploading(false);
      setProgress(0);
      onUpload?.(false);
    }
  };

  const handleRemove = (index) => {
    emit(initialImages.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {initialImages.map((url, index) => (
          <div key={url + index} className="relative">
            <img
              src={url}
              alt={`${imageLabel} ${index + 1}`}
              className="h-24 w-24 rounded-lg object-cover border border-border"
            />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              disabled={disabled || uploading}
              className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-on-accent transition-colors hover:bg-destructive-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label={`Remove ${imageLabel.toLowerCase()} ${index + 1}`}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}

        {initialImages.length < maxImages && (
          <label className="relative flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-text-muted transition-colors hover:border-primary hover:text-primary focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
            {uploading ? (
              <>
                <svg className="h-10 w-10 -rotate-90" viewBox="0 0 40 40">
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="opacity-20"
                  />
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${2 * Math.PI * 16}`}
                    strokeDashoffset={`${2 * Math.PI * 16 * (1 - progress / 100)}`}
                    className="transition-[stroke-dashoffset] duration-300"
                  />
                </svg>
                <span className="mt-1 text-xs font-medium">{progress}%</span>
              </>
            ) : (
              <>
                <ImagePlus className="h-6 w-6" />
                <span className="mt-1 text-xs">Add image</span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple={maxImages > 1}
              disabled={disabled || uploading}
              className="sr-only"
              onChange={(event) => {
                handleFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
        )}
      </div>

      {error && (
        <p role="alert" className="flex items-center gap-1 text-xs text-error">
          <X className="h-3 w-3" /> {error}
        </p>
      )}
    </div>
  );
};

export default ImageUpload;
