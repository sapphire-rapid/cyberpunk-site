export interface ContentMeta {
  title: string;
  shortDescription?: string;
  sourceUrl: string;
  revisionId: number;
  retrievedAt: string;
  license: { name: string; url: string };
}

export interface InfoboxRow {
  label: string;
  valueHtml: string;
}

export interface Subsection {
  id: string;
  title: string;
  html: string;
}

export interface Section {
  id: string;
  title: string;
  html: string;
  subsections: Subsection[];
}

export interface Reference {
  id: string;
  html: string;
}

export interface ImageManifest {
  local: string;
  alt: string;
  commonsUrl: string;
}

export interface InfoboxImage {
  local: string;
  alt: string;
  caption: string;
}

export interface Content {
  meta: ContentMeta;
  lead: string;
  infobox: { title: string; image: InfoboxImage | null; rows: InfoboxRow[] };
  sections: Section[];
  references: Reference[];
  images: ImageManifest[];
}