import { useEffect, useRef, useState } from "react";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Check, LoaderCircle, X } from "lucide-react";
import usePageScrollLock from "../../hooks/usePageScrollLock";
import {
  createCroppedImageFile,
  makeMaxAspectCrop,
  percentCropToPixels,
} from "../../utils/imageCrop";

const ImageCropDialog = ({ file, aspect, title, positionLabel, onCancel, onConfirm }) => {
  const [src, setSrc] = useState(null);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const imageRef = useRef(null);

  usePageScrollLock(Boolean(file));

  useEffect(() => {
    if (!file) return undefined;

    let active = true;
    const reader = new FileReader();

    setSrc(null);
    setCrop(undefined);
    setCompletedCrop(null);
    setProcessing(false);
    setError("");

    reader.addEventListener("load", () => {
      if (!active) return;
      if (typeof reader.result === "string") {
        setSrc(reader.result);
      } else {
        setError("Could not load this image for cropping.");
      }
    });
    reader.addEventListener("error", () => {
      if (active) setError("Could not load this image for cropping.");
    });
    reader.readAsDataURL(file);

    return () => {
      active = false;
      if (reader.readyState === FileReader.LOADING) reader.abort();
    };
  }, [file]);

  if (!file) return null;

  const handleImageLoad = (event) => {
    const image = event.currentTarget;
    const initialCrop = makeMaxAspectCrop(image.width, image.height, aspect);
    setCrop(initialCrop);
    setCompletedCrop(percentCropToPixels(initialCrop, image.width, image.height));
  };

  const handleApply = async () => {
    if (!imageRef.current || !completedCrop?.width) {
      setError("Adjust the crop area before continuing.");
      return;
    }

    setProcessing(true);
    setError("");
    try {
      const croppedFile = await createCroppedImageFile(imageRef.current, completedCrop, file.name);
      await onConfirm(croppedFile);
    } catch (requestError) {
      setError(requestError?.message || "Could not crop this image.");
      setProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center overflow-y-auto overscroll-contain bg-text/70 p-4"
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-crop-title"
        className="my-auto w-full max-w-2xl rounded-card border border-border bg-surface p-5 shadow-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {positionLabel}
            </p>
            <h2 id="image-crop-title" className="mt-1 font-heading text-xl font-bold">
              {title}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              The crop starts zoomed out to preserve the largest possible image area.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            aria-label="Close image cropper"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-button text-text-secondary transition-colors hover:bg-background-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 flex min-h-72 items-center justify-center overflow-hidden rounded-card border border-border bg-background-soft p-4">
          {src ? (
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(pixelCrop) => setCompletedCrop(pixelCrop)}
              aspect={aspect}
              keepSelection
              className="max-w-full"
            >
              <img
                ref={imageRef}
                src={src}
                alt="Crop preview"
                onLoad={handleImageLoad}
                className="max-h-112 max-w-full object-contain"
              />
            </ReactCrop>
          ) : (
            <LoaderCircle className="h-7 w-7 animate-spin text-primary" />
          )}
        </div>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-button border border-error-border bg-error-soft px-4 py-3 text-sm text-error"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="min-h-11 rounded-button border border-border bg-surface px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-background-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={processing || !completedCrop?.width}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-button bg-primary px-5 py-2.5 text-sm font-semibold text-on-accent transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50"
          >
            {processing ? (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="h-4 w-4" aria-hidden="true" />
            )}
            {processing ? "Preparing..." : "Use crop"}
          </button>
        </div>
      </section>
    </div>
  );
};

export default ImageCropDialog;
