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

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  describe("compareStrings", () => {
    it("sorts lowercase first, then alphabetically", () => {
      const input = ["CASL", "wght", "MONO", "CRSV", "slnt"];
      const expected = ["slnt", "wght", "CASL", "CRSV", "MONO"];
      const actual = input.toSorted(compareStrings);
      expect(actual).toStrictEqual(expected);
    });
  });

  const getTestFixtures = (): {
    name: string;
    font: FontSpec;
    expected: string;
  }[] => [
    {
      name: "spec sort order",
      font: {
        family: "Recursive",
        specs: {
          slnt: "-15..0",
          CASL: "0..1",
          wght: 520,
          CRSV: "0..1",
          MONO: 1,
        },
      },
      expected: "Recursive:slnt,wght,CASL,CRSV,MONO@-15..0,520,0..1,0..1,1",
    },
    {
      name: "simple with specs",
      font: {
        family: "Roboto",
        specs: {
          wdth: 88.4,
          wght: 369,
        },
      },
      expected: "Roboto:wdth,wght@88.4,369",
    },
    {
      name: "multiple various specs",
      font: {
        family: "Crimson Pro",
        specs: [
          {
            wght: 700,
            ital: 1,
          },
          {
            ital: 0,
            wght: "200..900",
          },
        ],
      },
      expected: "Crimson Pro:ital,wght@0,200..900;1,700",
    },
    {
      name: "multiple duplicate spec",
      font: {
        family: "Crimson Pro",
        specs: [
          { ital: 0, wght: 700 },
          { ital: 1, wght: 700 },
        ],
      },
      expected: "Crimson Pro:ital,wght@0,700;1,700",
    },
  ];

  describe("buildFamilySpec", () => {
    it.each(getTestFixtures())("$name", ({ name: _name, font, expected }) => {
      expect(buildFamilySpec(font)).toStrictEqual(expected);
    });
  });

  describe("buildFontUrl", () => {
    it("handles a single font without any specs", () => {
      const { allExpected, fonts } = getTestFixtures().reduce(
        (all: { allExpected: URLSearchParams; fonts: FontSpec[] }, one) => {
          all.allExpected.append("family", one.expected);
          all.fonts.push(one.font);
          return all;
        },
        { allExpected: new URLSearchParams(), fonts: [] },
      );
      const expected = `https://fonts.googleapis.com/css2?${allExpected.toString()}`;
      const actual = buildFontUrl({ fonts });
      expect(actual).toStrictEqual(expected);
    });
  });

  describe("minifyText", () => {
    it("handles ASCII text with duplicates", () => {
      const input = "hello";
      const expected = "ehlo";
      const actual = minifyText(input);
      expect(actual).toStrictEqual(expected);
    });

    it("Ignores non-ASCII text", () => {
      const input = "Gr\u{fc}ssen";
      const expected = "Gr\u{fc}ssen";
      const actual = minifyText(input);
      expect(actual).toStrictEqual(expected);
    });
  });

  describe("getFontUrls", () => {
    it("splits text fonts from non-text fonts", () => {
      const options: FontOptions = {
        fonts: [
          {
            family: "Source Code Pro",
            specs: [
              {
                ital: 0,
                wght: "200..900",
              },
              {
                ital: 1,
                wght: "200..900",
              },
            ],
          },
          {
            family: "Recursive",
            specs: {
              slnt: "-15..0",
              CASL: "0..1",
              wght: 520,
              CRSV: "0..1",
              MONO: 1,
            },
            text: "the quick brown fox jumps over the lazy dog",
          },
          {
            family: "Roboto",
          },
          {
            family: "Andada Pro",
            specs: {
              wght: "400..840",
            },
          },
        ],
        display: "swap",
      };

      const expected = [
        "https://fonts.googleapis.com/css2?family=Recursive%3Aslnt%2Cwght%2CCASL%2CCRSV%2CMONO%40-15..0%2C520%2C0..1%2C0..1%2C1&display=swap&text=+abcdefghijklmnopqrstuvwxyz",
        "https://fonts.googleapis.com/css2?family=Andada+Pro%3Awght%40400..840&family=Roboto&family=Source+Code+Pro%3Aital%2Cwght%400%2C200..900%3B1%2C200..900&display=swap",
      ];
      const actual = getFontUrls(options);
      expect(actual).toStrictEqual(expected);
    });

    it("accepts a raw Google Font URL", () => {
      const input = "https://example.com";
      const expected = ["https://example.com"];
      const actual = getFontUrls(input);
      expect(actual).toStrictEqual(expected);
    });

    it("accepts multiple raw Google Font URLs", () => {
      const input = ["https://example.com", "https://example.org"];
      const expected = ["https://example.com", "https://example.org"];
      const actual = getFontUrls(input);
      expect(actual).toStrictEqual(expected);
    });
  });
}
