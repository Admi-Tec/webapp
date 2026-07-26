// Renders a JSON-LD <script> tag. `<` is escaped so dynamic content (exercise
// statements, university names) can never break out of the script context.
export function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
