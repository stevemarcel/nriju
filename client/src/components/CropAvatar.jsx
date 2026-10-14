import { useEffect, useRef, useState } from "react";
import ReactCrop, { centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  AlertTriangle,
  Check,
  ImagePlus,
  LoaderCircle,
  Pencil,
  Trash2,
  Upload,
  X,
} from "lucide-react";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.readAsDataURL(blob);
  });
}

function fileToDataUrl(file) {
  return blobToDataUrl(file);
}

function makeCenteredSquareCrop(width, height) {
  return centerCrop(makeAspectCrop({ unit: "%", width: 90 }, 1, width, height), width, height);
}

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "U"
  );
}

const CropAvatar = ({
  initialSrc,
  name,
  onLoadSource,
  onCropped,
  onDeleted,
  isSaving = false,
  isDeleting = false,
  error = "",
  onClearError,
}) => {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [src, setSrc] = useState(null);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [loadingSource, setLoadingSource] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [localError, setLocalError] = useState("");
  const [displayImageFailed, setDisplayImageFailed] = useState(false);
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);
  const sourceRequestRef = useRef(0);

  const busy = processing || isSaving || isDeleting;
  const visibleError = error || localError;

  useEffect(() => {
    setDisplayImageFailed(false);
  }, [initialSrc]);

  useEffect(() => {
    if (!editOpen && !deleteOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key !== "Escape" || busy) return;
      if (editOpen) closeEditor();
      if (deleteOpen) setDeleteOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // closeEditor is intentionally a local state reset used only while the modal is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editOpen, deleteOpen, busy]);

  function clearMessages() {
    setLocalError("");
    onClearError?.();
  }

  function closeEditor() {
    if (busy) return;
    // Ignore any source-image request that is still in flight.
    sourceRequestRef.current += 1;
    setEditOpen(false);
    setSrc(null);
    setCrop(undefined);
    setCompletedCrop(null);
    setImageLoaded(false);
    setLoadingSource(false);
    setProcessing(false);
    clearMessages();
  }

  async function handleOpenEditor() {
    const requestId = ++sourceRequestRef.current;
    clearMessages();
    setEditOpen(true);
    setSrc(null);
    setCrop(undefined);
    setCompletedCrop(null);
    setImageLoaded(false);

    // Fetch the original saved image through the authenticated backend. This makes
    // it same-origin data before it is drawn to canvas, avoiding canvas CORS taint.
    if (!initialSrc) return;

    setLoadingSource(true);
    try {
      if (typeof onLoadSource !== "function") {
        throw new Error("Image editing is not configured. Please try again later.");
      }
      const blob = await onLoadSource();
      if (requestId !== sourceRequestRef.current) return;
      if (!(blob instanceof Blob) || !blob.type.startsWith("image/")) {
        throw new Error("The server did not return a valid image.");
      }
      setSrc(await blobToDataUrl(blob));
    } catch (err) {
      if (requestId === sourceRequestRef.current) {
        setLocalError(err?.message || "Could not load your current picture for editing.");
      }
    } finally {
      if (requestId === sourceRequestRef.current) setLoadingSource(false);
    }
  }

  async function handleFileSelect(event) {
    const file = event.currentTarget.files?.[0];
    // Reset the field so selecting the same file twice still triggers onChange.
    event.currentTarget.value = "";
    if (!file) return;

    clearMessages();
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setLocalError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setLocalError("The image must be 5 MB or smaller.");
      return;
    }

    try {
      setImageLoaded(false);
      setCrop(undefined);
      setCompletedCrop(null);
      setSrc(await fileToDataUrl(file));
    } catch (err) {
      setLocalError(err?.message || "Could not open that image.");
    }
  }

  async function handleSaveCrop() {
    const image = imgRef.current;
    if (!image || !imageLoaded || !completedCrop?.width || !completedCrop?.height) {
      setLocalError("Adjust the crop area before saving.");
      return;
    }

    clearMessages();
    setProcessing(true);

    try {
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(completedCrop.width * scaleX));
      canvas.height = Math.max(1, Math.round(completedCrop.height * scaleY));

      const context = canvas.getContext("2d");
      if (!context) throw new Error("Your browser could not prepare the cropped image.");

      context.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      const blob = await new Promise((resolve, reject) => {
        try {
          canvas.toBlob(
            (result) =>
              result
                ? resolve(result)
                : reject(new Error("The cropped image could not be generated.")),
            "image/webp",
            0.92,
          );
        } catch (err) {
          reject(err);
        }
      });

      const file = new File([blob], `avatar-${Date.now()}.webp`, {
        type: blob.type || "image/webp",
      });
      const success = await onCropped(file);

      // The parent returns false if the API request failed, leaving the user's
      // crop in place so they can retry or cancel without losing their work.
      if (success !== false) {
        setEditOpen(false);
        setSrc(null);
        setCrop(undefined);
        setCompletedCrop(null);
        setImageLoaded(false);
      } else {
        setLocalError("Your picture was not saved. Review the error and try again.");
      }
    } catch (err) {
      setLocalError(err?.message || "Could not crop this image. Try another image.");
    } finally {
      setProcessing(false);
    }
  }

  async function handleConfirmDelete() {
    clearMessages();
    try {
      const success = await onDeleted();
      if (success !== false) setDeleteOpen(false);
      else setLocalError("The picture was not deleted. Please try again.");
    } catch (err) {
      setLocalError(err?.message || "Could not delete the picture. Please try again.");
    }
  }

  function handleImageLoad(event) {
    const image = event.currentTarget;
    setCrop(makeCenteredSquareCrop(image.width, image.height));
    setCompletedCrop(null);
    setImageLoaded(true);
  }

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        <div className="h-32 w-32 overflow-hidden rounded-full border-2 border-primary/20 bg-primary/10 shadow-sm">
          {initialSrc && !displayImageFailed ? (
            <img
              src={initialSrc}
              alt={`${name || "User"}'s profile`}
              className="h-full w-full object-cover"
              onError={() => setDisplayImageFailed(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-heading text-3xl font-bold text-primary">
              {getInitials(name)}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleOpenEditor}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => {
              clearMessages();
              setDeleteOpen(true);
            }}
            disabled={!initialSrc || busy}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-surface px-5 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
        <p className="text-center text-xs text-text-muted">JPG, PNG, or WebP · Maximum 5 MB</p>
      </div>

      {editOpen && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center overflow-y-auto bg-black/60 p-4"
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-avatar-title"
            className="my-auto w-full max-w-xl rounded-2xl bg-surface p-5 shadow-2xl sm:p-7"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="edit-avatar-title" className="font-heading text-xl font-bold text-text">
                  Edit profile photo
                </h2>
                <p className="mt-1 text-sm text-text-muted">
                  Drag the image and adjust the handles to frame your photo.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                disabled={busy}
                aria-label="Close photo editor"
                className="rounded-lg p-2 text-text-muted transition-colors hover:bg-background-soft disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex min-h-62.5 flex-col items-center justify-center rounded-xl border border-border-soft bg-background-soft p-4">
              {loadingSource ? (
                <div className="flex flex-col items-center gap-3 py-12 text-sm text-text-muted">
                  <LoaderCircle className="h-6 w-6 animate-spin text-primary" />
                  Loading your current photo…
                </div>
              ) : src ? (
                <div className="flex max-w-full items-center justify-center">
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(pixelCrop) => setCompletedCrop(pixelCrop)}
                    aspect={1}
                    circularCrop
                    className="max-w-full"
                  >
                    <img
                      ref={imgRef}
                      src={src}
                      alt="Profile photo crop preview"
                      onLoad={handleImageLoad}
                      className="max-h-80 max-w-full object-contain"
                    />
                  </ReactCrop>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <ImagePlus className="h-8 w-8" />
                  </div>
                  <p className="font-medium text-text">Choose a photo to get started</p>
                  <p className="text-sm text-text-muted">
                    You can crop and preview it before saving.
                  </p>
                </div>
              )}
            </div>

            {visibleError && (
              <div
                className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"
                role="alert"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{visibleError}</span>
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:justify-end">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy || loadingSource}
                className="inline-flex items-center gap-2 rounded-lg border border-border-soft bg-surface px-4 py-2.5 text-sm font-semibold text-text transition-colors hover:bg-background-soft disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                Change
              </button>
              <button
                type="button"
                onClick={closeEditor}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg border border-border-soft bg-surface px-4 py-2.5 text-sm font-semibold text-text transition-colors hover:bg-background-soft disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCrop}
                disabled={busy || loadingSource || !src || !imageLoaded || !completedCrop?.width}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {processing || isSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </section>
        </div>
      )}

      {deleteOpen && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4"
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-avatar-title"
            className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl"
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <Trash2 className="h-6 w-6" />
            </div>
            <h2
              id="delete-avatar-title"
              className="text-center font-heading text-xl font-bold text-text"
            >
              Delete profile photo?
            </h2>
            <p className="mt-2 text-center text-sm leading-6 text-text-muted">
              Your profile will show your initials instead. This removes the saved photo from your
              account and attempts to delete the image from Cloudinary.
            </p>

            {visibleError && (
              <div
                className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"
                role="alert"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{visibleError}</span>
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => {
                  if (!busy) setDeleteOpen(false);
                }}
                disabled={busy}
                className="rounded-lg border border-border-soft bg-surface px-5 py-2.5 text-sm font-semibold text-text transition-colors hover:bg-background-soft disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {isDeleting ? "Deleting…" : "Yes, delete photo"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
};

export default CropAvatar;
