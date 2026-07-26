import { useEffect, useRef, useState } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  uploadExerciseImage,
  deleteExerciseImage,
  validateImageFile,
  getExerciseImageUrl,
} from "@/lib/storage";

interface Props {
  value: string | null;
  onChange: (path: string | null) => void;
  onUploadingChange?: (uploading: boolean) => void;
  label?: string;
  uploadFn?: (file: File) => Promise<string>;
  deleteFn?: (path: string) => Promise<void>;
}

export function ImageUpload({
  value,
  onChange,
  onUploadingChange,
  label,
  uploadFn = uploadExerciseImage,
  deleteFn = deleteExerciseImage,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  useEffect(() => {
    let alive = true;
    if (!value) {
      setPreview(null);
      return;
    }
    getExerciseImageUrl(value).then((url) => {
      if (alive) setPreview(url);
    });
    return () => {
      alive = false;
    };
  }, [value]);

  async function handleFile(file: File) {
    setError(null);
    const v = validateImageFile(file);
    if (v) {
      setError(v);
      return;
    }
    setUploading(true);
    setProgress(15);
    // optimistic preview
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    const tick = setInterval(() => setProgress((p) => (p < 85 ? p + 10 : p)), 200);
    try {
      const oldPath = value;
      const path = await uploadFn(file);
      setProgress(100);
      onChange(path);
      if (oldPath) {
        deleteFn(oldPath).catch(() => {});
      }
    } catch (e: any) {
      setError(e?.message ?? "Error subiendo imagen");
      setPreview(null);
    } finally {
      clearInterval(tick);
      setUploading(false);
      setTimeout(() => setProgress(0), 600);
    }
  }

  async function handleRemove() {
    if (!value) {
      setPreview(null);
      return;
    }
    const oldPath = value;
    onChange(null);
    setPreview(null);
    deleteFn(oldPath).catch(() => {});
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium">{label}</p>}
      {preview ? (
        <div className="relative rounded-lg border border-border bg-card p-3">
          <img
            src={preview}
            alt="Vista previa"
            className="mx-auto max-h-56 rounded-md object-contain"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Upload className="mr-1 h-3 w-3" />
              )}
              Reemplazar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={uploading}
              onClick={handleRemove}
            >
              <X className="mr-1 h-3 w-3" /> Quitar
            </Button>
          </div>
          {uploading && (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-sm transition ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border bg-card hover:border-primary/40"
          }`}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          )}
          <span className="font-medium">
            {uploading ? `Subiendo… ${progress}%` : "Arrastra una imagen o haz clic"}
          </span>
          <span className="text-xs text-muted-foreground">JPG, PNG, WebP, SVG · máx 5MB</span>
        </button>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
