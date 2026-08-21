export function TheoryVideoPlayer({ videoId, title }: { videoId: string | null; title: string }) {
  if (!videoId) {
    return (
      <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-border bg-muted/30 px-6 text-center text-sm text-muted-foreground">
        No se pudo cargar este video.
      </div>
    );
  }
  return (
    <div className="aspect-video overflow-hidden rounded-lg bg-black">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
        title={title}
        className="h-full w-full"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
}
