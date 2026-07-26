import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";

interface MarkdownMathProps {
  text: string;
  className?: string;
  inline?: boolean;
  clampLines?: number;
}

// Tailwind's JIT scanner needs each class literal to appear somewhere in the
// source; a computed `line-clamp-${n}` string wouldn't be picked up.
const CLAMP_CLASSES: Record<number, string> = {
  1: "line-clamp-1",
  2: "line-clamp-2",
  3: "line-clamp-3",
  4: "line-clamp-4",
};

function MarkdownMath({ text, className, inline = false, clampLines }: MarkdownMathProps) {
  const Wrapper = inline ? "span" : "div";
  const clampClass = !inline && clampLines ? CLAMP_CLASSES[clampLines] : undefined;
  return (
    <Wrapper
      className={cn(
        // Horizontal scroll for wide display equations (matrices, systems)
        // is handled by the dedicated `.katex-display` rule in styles.css,
        // scoped to just that KaTeX node. This wrapper must stay fully
        // overflow-visible: per the CSS overflow spec, setting overflow-x
        // to anything but "visible" forces the used value of overflow-y to
        // "auto" too — even if overflow-y is explicitly declared "visible" —
        // turning the statement/alternative into its own mini scroll area
        // (a stray scrollbar) and silently clipping tall KaTeX constructs
        // (stacked fractions, exponents) whose glyphs paint slightly
        // outside their flow-computed box. Leaving overflow unset here is
        // the actual fix, not a stronger overflow-y override.
        // Clamped previews are the one deliberate exception: overflow-hidden
        // truncates the 3-line card preview, and must live on this same
        // node because nesting a scroll box inside a -webkit-line-clamp
        // ancestor breaks the clamp in Safari.
        inline
          ? "inline-block max-w-full align-bottom"
          : clampClass
            ? `${clampClass} overflow-hidden`
            : "max-w-full",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ node, ...props }) =>
            inline ? (
              <span {...props} />
            ) : (
              <p className="leading-relaxed [&:not(:first-child)]:mt-3" {...props} />
            ),
        }}
      >
        {text}
      </ReactMarkdown>
    </Wrapper>
  );
}

export function MathText({
  text,
  className,
  clampLines,
}: {
  text: string;
  className?: string;
  clampLines?: number;
}) {
  return <MarkdownMath text={text} className={className} clampLines={clampLines} />;
}

export function ChoiceText({ text }: { text: string }) {
  return <MarkdownMath text={text} inline />;
}
