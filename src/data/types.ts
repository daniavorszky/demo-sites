export type Img = { src: string; alt?: string; width?: number; height?: number };
export type Link = { label: string; href: string };

export type Section =
  | { type: "hero"; _source?: string; title: string; subtitle?: string; text?: string; image?: Img; cta?: Link; ctaSecondary?: Link }
  | { type: "services"; _source?: string; title?: string; intro?: string; items: { title: string; text?: string; image?: Img; href?: string }[] }
  | { type: "about"; _source?: string; title: string; paragraphs: string[]; image?: Img; cta?: Link }
  | { type: "list"; _source?: string; title?: string; image?: Img; paragraphs?: string[]; listTitle?: string; items: string[]; outro?: string; cta?: Link }
  | { type: "longText"; _source?: string; title?: string; paragraphs: string[] }
  | { type: "team"; _source?: string; title?: string; intro?: string; members: { name: string; role?: string; text?: string; image?: Img }[] }
  | { type: "testimonials"; _source?: string; title?: string; items: { quote: string; author?: string; role?: string }[] }
  | { type: "gallery"; _source?: string; title?: string; images: Img[] }
  | { type: "partners"; _source?: string; title?: string; logos: Img[] }
  | { type: "faq"; _source?: string; title?: string; items: { q: string; a: string }[] }
  | { type: "cta"; _source?: string; title: string; text?: string; button?: Link }
  | { type: "contact"; _source?: string; title?: string; text?: string; phone?: string; email?: string; address?: string; addresses?: { label?: string; address: string }[]; hours?: string[]; mapEmbed?: string };

export type Home = {
  site: {
    name: string; tagline?: string; logo?: string; language?: string;
    phone?: string; email?: string; address?: string; social?: Record<string, string>;
    skin?: "calm" | "bold" | "warm" | "editorial";
    layout?: { hero?: "split" | "cover" | "centered"; services?: "columns" | "cards" | "rows" };
  };
  nav: Link[];
  sections: Section[];
  source: { url: string; extractedAt: string; notes?: string[] };
  demo?: { agency?: string; note?: string; company?: string; contact?: string };
};
