import type { Reference } from "../data/types";
import { externalize } from "../lib/links";

export default function References({ references }: { references: Reference[] }) {
  return (
    <section id="references" className="py-12">
      <h2 className="text-h2 font-display mb-4">References</h2>
      <ol className="space-y-2 text-sm text-muted">
        {references.map((r) => (
          <li key={r.id} id={r.id} dangerouslySetInnerHTML={{ __html: externalize(r.html) }} />
        ))}
      </ol>
    </section>
  );
}
