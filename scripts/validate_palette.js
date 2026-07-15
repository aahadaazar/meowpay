#!/usr/bin/env node

const APPROVED = {
  categorical: "#a87f00,#009d81,#d16100,#009a9a,#e24a3c",
  sequentialLight: "#00bcbc,#009a9a,#007879,#005959",
  sequentialDark: "#00caca,#00abab,#008989,#006969",
  divergingLight: "#009a9a,#e24a3c",
  divergingDark: "#00abab,#f45b4b",
};

const CVD_MATRICES = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

function parseArgs(argv) {
  const args = { _: [] };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];

      if (!next || next.startsWith("--")) {
        args[key] = true;
      } else {
        args[key] = next;
        i += 1;
      }
    } else {
      args._.push(arg);
    }
  }

  return args;
}

function parseHex(hex) {
  const normalized = hex.trim().replace(/^#/, "");

  if (!/^[0-9a-f]{6}$/i.test(normalized)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  return {
    hex: `#${normalized.toLowerCase()}`,
    r: parseInt(normalized.slice(0, 2), 16) / 255,
    g: parseInt(normalized.slice(2, 4), 16) / 255,
    b: parseInt(normalized.slice(4, 6), 16) / 255,
  };
}

function parsePalette(input) {
  return input.split(",").map(parseHex);
}

function srgbToLinear(channel) {
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(color) {
  const r = srgbToLinear(color.r);
  const g = srgbToLinear(color.g);
  const b = srgbToLinear(color.b);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a, b) {
  const lighter = Math.max(relativeLuminance(a), relativeLuminance(b));
  const darker = Math.min(relativeLuminance(a), relativeLuminance(b));

  return (lighter + 0.05) / (darker + 0.05);
}

function toOklab(color) {
  const r = srgbToLinear(color.r);
  const g = srgbToLinear(color.g);
  const b = srgbToLinear(color.b);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

function toOklch(color) {
  const lab = toOklab(color);
  const hue = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;

  return {
    ...lab,
    C: Math.sqrt(lab.a ** 2 + lab.b ** 2),
    h: hue < 0 ? hue + 360 : hue,
  };
}

function deltaE(a, b) {
  const first = toOklab(a);
  const second = toOklab(b);

  return (
    Math.sqrt(
      (first.L - second.L) ** 2 +
        (first.a - second.a) ** 2 +
        (first.b - second.b) ** 2,
    ) * 100
  );
}

function applyMatrix(color, matrix) {
  const linear = [
    srgbToLinear(color.r),
    srgbToLinear(color.g),
    srgbToLinear(color.b),
  ];
  const [r, g, b] = matrix.map((row) =>
    clamp(row[0] * linear[0] + row[1] * linear[1] + row[2] * linear[2], 0, 1),
  );

  return { hex: color.hex, r: linearToSrgb(r), g: linearToSrgb(g), b: linearToSrgb(b) };
}

function linearToSrgb(channel) {
  return channel <= 0.0031308
    ? channel * 12.92
    : 1.055 * channel ** (1 / 2.4) - 0.055;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function adjacentPairs(colors) {
  return colors.slice(1).map((color, index) => [colors[index], color]);
}

function worstAdjacentNormal(colors) {
  return adjacentPairs(colors).reduce(
    (worst, pair) => {
      const value = deltaE(pair[0], pair[1]);
      return value < worst.value ? { pair, value } : worst;
    },
    { pair: null, value: Number.POSITIVE_INFINITY },
  );
}

function worstAdjacentCvd(colors) {
  return adjacentPairs(colors).reduce(
    (worst, pair) => {
      for (const [mode, matrix] of Object.entries(CVD_MATRICES)) {
        const value = deltaE(applyMatrix(pair[0], matrix), applyMatrix(pair[1], matrix));

        if (value < worst.value) {
          worst = { pair, mode, value };
        }
      }

      return worst;
    },
    { pair: null, mode: "", value: Number.POSITIVE_INFINITY },
  );
}

function pass(label, ok, detail) {
  const state = ok ? "PASS" : "FAIL";
  console.log(`  [${state}] ${label.padEnd(22)} ${detail}`);
  return ok;
}

function formatPair(pair) {
  return `${pair[0].hex}<->${pair[1].hex}`;
}

function validateCategorical(input, mode, surfaceHex) {
  const colors = parsePalette(input);
  const surface = parseHex(surfaceHex);
  const lightnessBand = mode === "dark" ? [0.48, 0.67] : [0.43, 0.77];
  const oklch = colors.map(toOklch);
  const contrasts = colors.map((color) => contrastRatio(color, surface));
  const worstCvd = worstAdjacentCvd(colors);
  const worstNormal = worstAdjacentNormal(colors);

  console.log(`Palette (${mode}, surface ${surface.hex}, categorical): ${colors.length} slots`);

  const checks = [
    pass(
      "Lightness band",
      oklch.every((color) => color.L >= lightnessBand[0] && color.L <= lightnessBand[1]),
      `all ${colors.length} inside L ${lightnessBand[0]}-${lightnessBand[1]}`,
    ),
    pass(
      "Chroma floor",
      oklch.every((color) => color.C >= 0.1),
      `min C ${Math.min(...oklch.map((color) => color.C)).toFixed(3)}`,
    ),
    pass(
      "CVD separation",
      worstCvd.value >= 10,
      `worst adjacent ${formatPair(worstCvd.pair)} deltaE ${worstCvd.value.toFixed(1)} (${worstCvd.mode})`,
    ),
    pass(
      "Normal-vision floor",
      worstNormal.value >= 15,
      `worst adjacent ${formatPair(worstNormal.pair)} deltaE ${worstNormal.value.toFixed(1)}`,
    ),
    pass(
      "Contrast vs surface",
      contrasts.every((ratio) => ratio >= 3),
      `min ${Math.min(...contrasts).toFixed(2)}:1`,
    ),
  ];

  return report(checks);
}

function validateOrdinal(input, mode, surfaceHex) {
  const colors = parsePalette(input);
  const surface = parseHex(surfaceHex);
  const oklch = colors.map(toOklch);
  const lightnessDeltas = adjacentPairs(oklch).map(([first, second]) =>
    Math.abs(first.L - second.L),
  );
  const hues = oklch.map((color) => color.h);
  const hueSpread = Math.max(...hues) - Math.min(...hues);
  const contrasts = colors.map((color) => contrastRatio(color, surface));

  console.log(`Palette (${mode}, surface ${surface.hex}, ordinal): ${colors.length} steps`);

  const increasing = adjacentPairs(oklch).every(([first, second]) => second.L > first.L);
  const decreasing = adjacentPairs(oklch).every(([first, second]) => second.L < first.L);
  const checks = [
    pass("Monotone lightness", increasing || decreasing, increasing ? "increasing" : "decreasing"),
    pass(
      "Lightness gaps",
      lightnessDeltas.every((gap) => gap >= 0.06),
      `min deltaL ${Math.min(...lightnessDeltas).toFixed(3)}`,
    ),
    pass("Hue spread", hueSpread <= 5, `${hueSpread.toFixed(1)}deg`),
    pass(
      "Contrast vs surface",
      contrasts.every((ratio) => ratio >= 2.2),
      `min ${Math.min(...contrasts).toFixed(2)}:1`,
    ),
  ];

  return report(checks);
}

function validateDiverging(input, mode, surfaceHex) {
  const colors = parsePalette(input);
  const surface = parseHex(surfaceHex);
  const cvd = worstAdjacentCvd(colors);
  const normal = worstAdjacentNormal(colors);
  const contrasts = colors.map((color) => contrastRatio(color, surface));

  console.log(`Palette (${mode}, surface ${surface.hex}, diverging): ${colors.length} poles`);

  const checks = [
    pass(
      "CVD separation",
      cvd.value >= 10,
      `poles ${formatPair(cvd.pair)} deltaE ${cvd.value.toFixed(1)} (${cvd.mode})`,
    ),
    pass(
      "Normal-vision floor",
      normal.value >= 15,
      `poles ${formatPair(normal.pair)} deltaE ${normal.value.toFixed(1)}`,
    ),
    pass(
      "Contrast vs surface",
      contrasts.every((ratio) => ratio >= 3),
      `min ${Math.min(...contrasts).toFixed(2)}:1`,
    ),
  ];

  return report(checks);
}

function report(checks) {
  const ok = checks.every(Boolean);
  console.log(ok ? "  -> ALL CHECKS PASS" : "  -> CHECKS FAILED");
  console.log("");
  return ok;
}

function runCheckSuite() {
  return [
    validateCategorical(APPROVED.categorical, "light", "#fffaf0"),
    validateCategorical(APPROVED.categorical, "dark", "#1a2a2a"),
    validateOrdinal(APPROVED.sequentialLight, "light", "#fffaf0"),
    validateOrdinal(APPROVED.sequentialDark, "dark", "#1a2a2a"),
    validateDiverging(APPROVED.divergingLight, "light", "#fffaf0"),
    validateDiverging(APPROVED.divergingDark, "dark", "#1a2a2a"),
  ].every(Boolean);
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.check) {
    process.exit(runCheckSuite() ? 0 : 1);
  }

  const palette = args._[0];

  if (!palette || !args.mode || !args.surface) {
    console.error(
      'Usage: node scripts/validate_palette.js "#a87f00,#009d81" --mode light --surface "#fffaf0" [--ordinal|--diverging]',
    );
    console.error("       node scripts/validate_palette.js --check");
    process.exit(2);
  }

  const ok = args.ordinal
    ? validateOrdinal(palette, args.mode, args.surface)
    : args.diverging
      ? validateDiverging(palette, args.mode, args.surface)
      : validateCategorical(palette, args.mode, args.surface);

  process.exit(ok ? 0 : 1);
}

main();
