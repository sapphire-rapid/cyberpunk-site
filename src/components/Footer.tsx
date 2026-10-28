import type { Content } from "../data/types";

export default function Footer({ content }: { content: Content }) {
  return (
    <footer className="py-12 border-t border-line text-sm text-muted">
      <div className="space-y-2">
        <p>
          Content from Wikipedia, "Cyberpunk" (revision {content.meta.revisionId}), retrieved {content.meta.retrievedAt}. Licensed under{" "}
          <a href={content.meta.license.url} target="_blank" rel="noopener noreferrer">{content.meta.license.name}</a>. Text was reformatted but not reworded.
        </p>
        <p>
          <a href={content.meta.sourceUrl} target="_blank" rel="noopener noreferrer">Source article</a> ·{" "}
          <a href={content.meta.sourceUrl + "?action=history"} target="_blank" rel="noopener noreferrer">Article history (authors)</a>
        </p>
        <p>This site is not affiliated with or endorsed by Wikipedia or the Wikimedia Foundation.</p>
        <div className="mt-4">
          <div className="text-mono-label text-muted mb-1">Image credits</div>
          <ul className="space-y-1">
            {content.images.map((im, i) => (
              <li key={i}>
                <a href={im.commonsUrl} target="_blank" rel="noopener noreferrer">{im.alt || im.local}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
