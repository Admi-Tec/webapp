import { useState } from "react";
import { ZoomIn } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ampliar imagen"
        className="press group relative mt-4 block w-full overflow-hidden rounded-lg border border-border bg-background"
      >
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="mx-auto max-h-80 w-full object-contain transition group-hover:opacity-90 sm:max-h-96"
        />
        <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur transition group-hover:bg-background">
          <ZoomIn className="h-3.5 w-3.5" /> Ampliar
        </span>
      </button>
      <DialogContent className="max-w-[95vw] border-none bg-transparent p-0 shadow-none sm:max-w-3xl">
        <DialogTitle className="sr-only">Imagen del ejercicio</DialogTitle>
        <img
          src={src}
          alt={alt}
          className="mx-auto max-h-[85vh] w-auto max-w-full rounded-lg object-contain"
        />
      </DialogContent>
    </Dialog>
  );
}
