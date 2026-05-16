import type { HtmlTagDescriptor, Plugin } from "vite";

type Arrayable<T> = T | T[];

/**
 * Options for specifying Google Fonts
 */
interface FontOptions {
  /**
   * An object or list of objects containing font definitions
   */
  fonts: Arrayable<FontSpec>;

  /**
   * The display parameter that decides how the browser should behave if the
   * font isn't ready yet.
   *
   * @see https://developers.google.com/fonts/docs/css2#use_font-display
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@font-face/font-display
   */
  display?: "auto" | "block" | "swap" | "fallback" | "optional";

  /**
   * Globally specify the characters the font will use (reduces file size)
   *
   * @see https://developers.google.com/fonts/docs/css2#optimizing_your_font_requests
   */
  text?: string;

  /**
   * For Material Symbols, list the individual icon names (to reduce file size)
   *
   * @example
   * ```js
   * ["home", "check_circle"]
   * ```
   *
   * @see https://developers.google.com/fonts/docs/material_symbols#optimize_the_icon_font
   */
  icon_names?: string[];
}

/**
 * A single font definition for a family
 */
interface FontSpec {
  /**
   * The name of the font family
   */
  family: string;

  /**
   * An object or array of objects containing font specs
   *
   * @example
   * ```js
   * {
   *   opsz: "9..40",
   *   wght: "10..1000",
   *   MORF: "0..45",
   * }
   * // becomes "opsz,wght,MORF@9..40,10..1000,0..45"
   * ```
   *
   * A common case for passing multiple specs is when specifying italics:
   * @example
   * ```js
   * [0, 1].map((ital) => ({
   *   ital,
   *   wght: "10..1000",
   *   // ...
   * }));
   *
   * // becomes "ital,wght@0,10..1000;1,10..1000"
   * ```
   */
  specs?: Arrayable<Record<string, string | number>>;

  /**
   * The text this font will use (reduces file size)
   *
   * @see https://developers.google.com/fonts/docs/css2#optimizing_your_font_requests
   */
  text?: string;
}

function getFontUrls(options: string | string[] | FontOptions): string[] {
  let fontHrefs: string[];
  if (typeof options === "string") {
    fontHrefs = [options];
  } else if (Array.isArray(options)) {
    fontHrefs = options;
  } else {
    // Build separate URLs for fonts with text specs,
    // and group the rest of them together.
    const fontsWithoutText: Omit<FontSpec, "text">[] = [];
    fontHrefs = [];
    for (const fontSpec of wrap(options.fonts).sort((a, b) =>
      compareStrings(a.family, b.family),
    )) {
      if (fontSpec.text != null) {
        const newUrl = buildFontUrl({
          ...options,
          fonts: fontSpec,
          text: fontSpec.text,
        });
        if (newUrl != null) {
          fontHrefs.push(newUrl);
        }
      } else {
        fontsWithoutText.push(fontSpec);
      }
    }
    const newUrl = buildFontUrl({ ...options, fonts: fontsWithoutText });
    if (newUrl != null) {
      fontHrefs.push(newUrl);
    }
  }
  return fontHrefs;
}

/**
 * Add Google Fonts to index.html
 *
 * Pass in the raw URL for the font, an
 * object with font definitions, or an array
 * of font definitions.
 *
 * @see https://fonts.google.com/
 * @see https://developers.google.com/fonts/docs/css2
 */
export function vitePluginGoogleFonts(
  options: Arrayable<string | FontOptions>,
): Plugin {
  const fontHrefs = wrap(options).flatMap(getFontUrls);

  return {
    name: "vite-plugin-google-fonts",
    transformIndexHtml() {
      return [
        {
          tag: "link",
          attrs: {
            rel: "preconnect",
            href: "https://fonts.googleapis.com",
          },
          injectTo: "head",
        },

        {
          tag: "link",
          attrs: {
            rel: "preconnect",
            href: "https://fonts.gstatic.com",
            crossorigin: true,
          },
          injectTo: "head",
        },

        ...fontHrefs.map(
          (href) =>
            ({
              tag: "link",
              attrs: {
                rel: "stylesheet",
                href,
              },
              injectTo: "head",
            }) satisfies HtmlTagDescriptor,
        ),
      ];
    },
  };
}

/**
 * Wrap the value in an array if it isn't already
 */
function wrap<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

/**
 * Compare strings, sorting lowercase first, then alphabetically
 */
function compareStrings(a: string, b: string) {
  const isLower = (value: string): boolean => value === value.toLowerCase();
  return (
    +isLower(b) - +isLower(a) || a.localeCompare(b, "en-US", { numeric: true })
  );
}

/**
 * Shrink a string of text to its unique characters, but
 * only if it's entirely ASCII
 */
const minifyText = (text: string) =>
  /^\p{ASCII}+$/u.test(text)
    ? [...new Set(text.split(""))].sort().join("")
    : text;

/**
 * Create a font URL from the options given
 */
function buildFontUrl(options: FontOptions): string | null {
  const { fonts, ...opts } = options;
  // TODO: Figure out why some fonts come in empty here
  if (Array.isArray(fonts) && fonts.length === 0) {
    return null;
  }

  const url = new URL("https://fonts.googleapis.com/css2");
  const params = new URLSearchParams(
    wrap(fonts)
      .map((font): [string, string] => ["family", buildFamilySpec(font)])
      .concat(
        Object.entries(opts).map(([k, v]) =>
          k === "text" ? [k, minifyText(v.toString())] : [k, v.toString()],
        ),
      ),
  );

  url.search = params.toString();
  return url.toString();
}

/**
 * Build the "family" part of the Google Font URL parameter value
 */
function buildFamilySpec(font: FontSpec): string {
  const family = font.family;
  if (font.specs == null) {
    return family;
  }

  const keys = new Set<string>();
  const values: string[] = [];
  for (const axes of wrap(font.specs)) {
    const value: string[] = [];
    for (const [k, v] of Object.entries(axes).toSorted((a, b) =>
      compareStrings(a[0], b[0]),
    )) {
      keys.add(k);
      value.push(v.toString());
    }
    values.push(value.join(","));
  }
  values.sort(compareStrings);

  return `${family}:${[...keys].join(",")}@${values.join(";")}`;
}
