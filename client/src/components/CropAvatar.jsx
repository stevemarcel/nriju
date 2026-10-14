import { useState, useRef, useCallback } from "react";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { X, Check, User } from "lucide-react";

const AVATAR_SIZE = 200; // 1:1 square, matches Cloudinary transform

export default function CropAvatar({ onCropped, initialSrc, name }) {
  const [src, setSrc] = useState(initialSrc || null);
  const [crop, setCrop] = useState({ unit: "%", width: 90, height: 90, x: 5, y: 5 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [processing, setProcessing] = useState(false);
  const imgRef = useRef(null);

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSrc(ev.target.result);
      setCrop({ unit: "%", width: 90, height: 90, x: 5, y: 5 });
      setCompletedCrop(null);
    };
    reader.readAsDataURL(file);
  }

  const handleCropComplete = useCallback(() => {
    if (!completedCrop || !imgRef.current) return;
    setProcessing(true);

    const canvas = document.createElement("canvas");
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext("2d");

    ctx.drawImage(
      imgRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height,
    );

    // Convert to WebP blob (0.85 quality) and pass to parent
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setProcessing(false);
          return;
        }
        // Create a File with .webp extension for proper upload
        const file = new File([blob], "avatar.webp", { type: "image/webp" });
        onCropped(file);
        setProcessing(false);
      },
      "image/webp",
      0.85,
    );
  }, [completedCrop, onCropped]);

  function handleReset() {
    setSrc(null);
    setCompletedCrop(null);
  }

  if (!src) {
    return (
      <div className="flex flex-col items-center gap-3">
        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors">
          <User className="w-4 h-4" />
          Upload Avatar
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={handleFileSelect}
          />
        </label>
        <p className="text-xs text-text-muted text-center">
          JPG, PNG, or WebP. Will be cropped to 1:1 square.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <ReactCrop
          crop={crop}
          onChange={(c) => setCrop(c)}
          onComplete={(c) => setCompletedCrop(c)}
          aspect={1}
          circularCrop
          className="max-w-full"
        >
          <img
            ref={imgRef}
            src={src}
            alt="Crop preview"
            className="max-w-[320px] max-h-[320px] rounded-lg"
          />
        </ReactCrop>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleCropComplete}
          disabled={processing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Check className="w-4 h-4" />
          {processing ? "Processing..." : "Apply & Upload"}
        </button>
        <button
          onClick={handleReset}
          disabled={processing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-background-soft text-text-muted text-sm font-bold rounded-lg hover:bg-background-soft/70 disabled:opacity-50 transition-colors"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
      <p className="text-xs text-text-muted text-center">
        Drag to reposition. Resize handles to crop.
      </p>
    </div>
  );
}
