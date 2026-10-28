import type { InfoboxRow, InfoboxImage } from "../data/types";
import { externalize } from "../lib/links";

export default function DataCard({ title, image, rows }: { title: string; image: InfoboxImage | null; rows: InfoboxRow[] }) {
  return (
    <aside className="notched brackets bg-panel border border-line p-4 sticky top-4">
      <div className="text-mono-label text-alarm mb-2">FILE // {title.toUpperCase()}</div>
      {image && (
        <figure className="mb-4">
          <img src={image.local} alt={image.alt} className="w-full h-auto" />
          {image.caption && <figcaption className="text-mono-label text-muted mt-1">{image.caption}</figcaption>}
        </figure>
      )}
      <dl className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[auto_1fr] gap-2">
            <dt className="text-mono-label text-muted">{r.label}</dt>
            <dd className="text-sm" dangerouslySetInnerHTML={{ __html: externalize(r.valueHtml.replace(/^<td[^>]*>/, "").replace(/<\/td>$/, "").trim()) }} />
          </div>
        ))}
      </dl>
    </aside>
  );
}
