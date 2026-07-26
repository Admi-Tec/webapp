type University = {
  id: string;
  short_name: string;
  name: string;
  logoUrl?: string | null;
};

export function UniversityMarquee({ universities }: { universities: University[] }) {
  if (universities.length === 0) return null;

  const track = [...universities, ...universities];

  return (
    <div
      className="marquee-track relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
      role="list"
      aria-label="Universidades cubiertas"
    >
      <div className="animate-marquee flex w-max items-center gap-10 py-1">
        {track.map((u, i) => (
          <div
            key={`${u.id}-${i}`}
            role="listitem"
            aria-hidden={i >= universities.length}
            className="flex shrink-0 items-center gap-2.5"
          >
            {u.logoUrl && (
              <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded bg-white">
                <img
                  src={u.logoUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-contain"
                />
              </span>
            )}
            <span className="font-display text-lg font-semibold tracking-tight text-foreground/90">
              {u.short_name}
            </span>
            <span className="hidden text-sm text-muted-foreground sm:inline">{u.name}</span>
            <span aria-hidden className="ml-6 h-1 w-1 rounded-full bg-border" />
          </div>
        ))}
      </div>
    </div>
  );
}
