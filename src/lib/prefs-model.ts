// Pure rules for the appearance preferences ("Personalizar"). No browser APIs here.

export type ThemeId = "amanteigado" | "nevoa" | "lavanda" | "noite";
export type CardSize = "pequeno" | "medio" | "grande";
export type CardStyle = "vidro" | "papel";
export type EditorFont = "literata" | "fraunces" | "manrope" | "caveat";
export type LineSpacing = "compacto" | "confortavel" | "arejado";
export type PaperPattern = "pautado" | "quadriculado" | "liso";
export type PageWidth = "estreita" | "media" | "larga";

export interface Prefs {
  theme: ThemeId;
  cardSize: CardSize;
  cardStyle: CardStyle;
  editorFont: EditorFont;
  fontSize: number;
  lineSpacing: LineSpacing;
  paper: PaperPattern;
  pageWidth: PageWidth;
  reduceMotion: boolean;
}

interface Option<T extends string> {
  id: T;
  label: string;
  hint?: string;
}

export const THEMES: (Option<ThemeId> & { dark: boolean })[] = [
  { id: "amanteigado", label: "Amanteigado", hint: "Papel creme", dark: false },
  { id: "nevoa", label: "Rosa névoa", hint: "Papel rosado", dark: false },
  { id: "lavanda", label: "Lavanda", hint: "Papel lilás", dark: false },
  { id: "noite", label: "Noite azul", hint: "Escuro", dark: true },
];

export const CARD_SIZES: Option<CardSize>[] = [
  { id: "pequeno", label: "Pequeno" },
  { id: "medio", label: "Médio" },
  { id: "grande", label: "Grande" },
];

export const CARD_STYLES: Option<CardStyle>[] = [
  { id: "vidro", label: "Vidro", hint: "Transparente com desfoque" },
  { id: "papel", label: "Papel", hint: "Sólido e simples" },
];

export const EDITOR_FONTS: (Option<EditorFont> & { stack: string; scale: number })[] = [
  { id: "literata", label: "Literata", hint: "Serifada clássica", stack: '"Literata", Georgia, serif', scale: 1 },
  { id: "fraunces", label: "Fraunces", hint: "Elegante", stack: '"Fraunces", Georgia, serif', scale: 1 },
  { id: "manrope", label: "Manrope", hint: "Sem serifa", stack: '"Manrope", system-ui, sans-serif', scale: 1 },
  { id: "caveat", label: "Caveat", hint: "Manuscrita", stack: '"Caveat", "Segoe Print", cursive', scale: 1.3 },
];

export const LINE_SPACINGS: (Option<LineSpacing> & { leading: number })[] = [
  { id: "compacto", label: "Compacto", leading: 1.55 },
  { id: "confortavel", label: "Confortável", leading: 1.85 },
  { id: "arejado", label: "Arejado", leading: 2.15 },
];

export const PAPERS: Option<PaperPattern>[] = [
  { id: "pautado", label: "Pautado" },
  { id: "quadriculado", label: "Quadriculado" },
  { id: "liso", label: "Liso" },
];

export const PAGE_WIDTHS: (Option<PageWidth> & { px: number })[] = [
  { id: "estreita", label: "Estreita", px: 640 },
  { id: "media", label: "Média", px: 780 },
  { id: "larga", label: "Larga", px: 960 },
];

export const FONT_SIZE_MIN = 15;
export const FONT_SIZE_MAX = 24;

export const DEFAULT_PREFS: Prefs = {
  theme: "amanteigado",
  cardSize: "medio",
  cardStyle: "vidro",
  editorFont: "literata",
  fontSize: 18,
  lineSpacing: "confortavel",
  paper: "pautado",
  pageWidth: "media",
  reduceMotion: false,
};

function pick<T extends string>(options: Option<T>[], value: unknown, fallback: T): T {
  return options.some((o) => o.id === value) ? (value as T) : fallback;
}

/** Turns anything read from storage into valid preferences; unknown values fall back to the default. */
export function sanitizePrefs(raw: unknown): Prefs {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const d = DEFAULT_PREFS;
  const size = typeof r["fontSize"] === "number" && Number.isFinite(r["fontSize"]) ? r["fontSize"] : d.fontSize;
  return {
    theme: pick(THEMES, r["theme"], d.theme),
    cardSize: pick(CARD_SIZES, r["cardSize"], d.cardSize),
    cardStyle: pick(CARD_STYLES, r["cardStyle"], d.cardStyle),
    editorFont: pick(EDITOR_FONTS, r["editorFont"], d.editorFont),
    fontSize: Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(size))),
    lineSpacing: pick(LINE_SPACINGS, r["lineSpacing"], d.lineSpacing),
    paper: pick(PAPERS, r["paper"], d.paper),
    pageWidth: pick(PAGE_WIDTHS, r["pageWidth"], d.pageWidth),
    reduceMotion: r["reduceMotion"] === true,
  };
}

export interface RootStyle {
  dark: boolean;
  attrs: Record<string, string>;
  vars: Record<string, string>;
}

/** What to put on <html>: a dark flag, data-* attributes and CSS variables. */
export function prefsToRootStyle(p: Prefs): RootStyle {
  const font = EDITOR_FONTS.find((f) => f.id === p.editorFont) ?? EDITOR_FONTS[0]!;
  const leading = (LINE_SPACINGS.find((l) => l.id === p.lineSpacing) ?? LINE_SPACINGS[1]!).leading;
  const width = (PAGE_WIDTHS.find((w) => w.id === p.pageWidth) ?? PAGE_WIDTHS[1]!).px;
  const size = Math.round(p.fontSize * font.scale);
  return {
    dark: THEMES.find((t) => t.id === p.theme)?.dark ?? false,
    attrs: {
      "data-theme": p.theme,
      "data-card-size": p.cardSize,
      "data-card-style": p.cardStyle,
      "data-paper": p.paper,
      "data-motion": p.reduceMotion ? "reduzido" : "normal",
    },
    vars: {
      "--editor-font": font.stack,
      "--editor-size": `${size}px`,
      // whole pixels so the ruled lines stay under the text on long pages
      "--editor-line": `${Math.round(size * leading)}px`,
      "--page-width": `${width}px`,
    },
  };
}
