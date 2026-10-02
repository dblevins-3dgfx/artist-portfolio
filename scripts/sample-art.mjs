function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function grain(rand, width, height, count, fill, opacity) {
  let marks = "";
  for (let i = 0; i < count; i += 1) {
    const x = (rand() * width).toFixed(1);
    const y = (rand() * height).toFixed(1);
    const r = (0.4 + rand() * 1.5).toFixed(2);
    marks += `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" opacity="${opacity}"/>`;
  }
  return marks;
}

function canvas(width, height, background, body, seed) {
  const rand = mulberry32(seed);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <radialGradient id="v" cx="50%" cy="42%" r="72%">
      <stop offset="58%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#1a140f" stop-opacity="0.2"/>
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="${background}"/>
  ${body}
  <rect width="${width}" height="${height}" fill="url(#v)"/>
  ${grain(rand, width, height, 700, "#1a140f", 0.045)}
  ${grain(rand, width, height, 360, "#fffaf2", 0.04)}
</svg>`;
}

const rect = (x, y, w, h, fill, extra = "") =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;

const ellipse = (cx, cy, rx, ry, fill, extra = "") =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;

export const samples = [
  {
    slug: "harbor-late",
    title: "Harbor, late",
    year: 2025,
    medium: "Oil",
    surface: "linen",
    widthIn: 20,
    heightIn: 14,
    statement: "Bands of harbor gray, the sun still a pale square behind the haze.",
    featured: true,
    originalStatus: "in-studio",
    printsAvailable: true,
    sample: true,
    svg: canvas(
      2000,
      1400,
      "#d5dcde",
      `
      ${rect(0, 0, 2000, 760, "#d5dcde")}
      ${rect(0, 680, 2000, 200, "#e6d5c3")}
      ${rect(0, 860, 2000, 280, "#c5cfca")}
      ${rect(0, 1100, 2000, 300, "#aeb8b4")}
      ${rect(0, 852, 2000, 8, "#5c554c")}
      ${rect(1240, 470, 150, 150, "#f3e6d4")}
      ${rect(70, 980, 54, 280, "#7d8783")}
      ${rect(1680, 930, 180, 220, "#8c9692")}
      <polygon points="430,1094 760,1072 820,1124 470,1140" fill="#2c3336"/>
      ${rect(560, 1008, 7, 78, "#2c3336")}
      `,
      11,
    ),
  },
  {
    slug: "pitcher-and-lemon",
    title: "Pitcher and lemon",
    year: 2025,
    medium: "Oil",
    surface: "linen",
    widthIn: 16,
    heightIn: 20,
    statement: "A red pitcher on a bare table, one lemon, and the corner of the room.",
    featured: false,
    originalStatus: "in-studio",
    printsAvailable: true,
    sample: true,
    svg: canvas(
      1500,
      1900,
      "#e6d3c5",
      `
      ${rect(0, 0, 1500, 1900, "#e6d3c5")}
      ${rect(0, 0, 210, 1900, "#dcc6b4")}
      ${rect(0, 1260, 1500, 640, "#c6a07c")}
      ${rect(0, 1260, 1500, 18, "#a98462")}
      ${ellipse(760, 1320, 300, 28, "#000", 'opacity="0.08"')}
      ${ellipse(730, 1040, 200, 270, "#8c312c")}
      ${rect(650, 690, 170, 200, "#8c312c")}
      ${ellipse(735, 690, 150, 34, "#9b4338")}
      ${ellipse(735, 688, 108, 20, "#6d2723")}
      <path d="M910,820 C1060,830 1070,1120 900,1160" stroke="#8c312c" stroke-width="34" fill="none" stroke-linecap="round"/>
      ${ellipse(640, 1000, 36, 120, "#fff", 'opacity="0.16"')}
      ${ellipse(1120, 1210, 78, 70, "#e0ad3c")}
      ${ellipse(1098, 1188, 22, 16, "#f4d48a", 'opacity="0.8"')}
      `,
      22,
    ),
  },
  {
    slug: "garden-after-dark",
    title: "Garden after dark",
    year: 2024,
    medium: "Acrylic",
    surface: "panel",
    widthIn: 16,
    heightIn: 20,
    statement: "Leaves packed into a dark field, with a few pale blooms catching the light.",
    featured: true,
    originalStatus: "sold",
    printsAvailable: true,
    sample: true,
    svg: canvas(
      1500,
      1900,
      "#1c2621",
      `
      ${rect(0, 1500, 1500, 400, "#141c18")}
      ${ellipse(280, 700, 220, 90, "#24362c", 'transform="rotate(-28 280 700)"')}
      ${ellipse(520, 860, 260, 100, "#314838", 'transform="rotate(18 520 860)"')}
      ${ellipse(860, 740, 240, 86, "#1a2c22", 'transform="rotate(-12 860 740)"')}
      ${ellipse(1180, 980, 230, 80, "#3d5a46", 'transform="rotate(24 1180 980)"')}
      ${ellipse(400, 1180, 280, 90, "#2a4032", 'transform="rotate(-8 400 1180)"')}
      ${ellipse(980, 1240, 300, 100, "#24382e", 'transform="rotate(14 980 1240)"')}
      ${ellipse(700, 560, 180, 70, "#4e6b54", 'transform="rotate(-20 700 560)"')}
      ${ellipse(240, 1280, 160, 60, "#15241c", 'transform="rotate(30 240 1280)"')}
      ${ellipse(1280, 620, 150, 54, "#2f4a38", 'transform="rotate(-36 1280 620)"')}
      ${ellipse(620, 1040, 86, 86, "#e7d7c4")}
      ${ellipse(620, 1040, 28, 28, "#8d6a58")}
      ${ellipse(900, 1120, 70, 70, "#f0e2d0")}
      ${ellipse(900, 1120, 22, 22, "#6e5348")}
      ${ellipse(430, 900, 54, 54, "#d9c4ae")}
      ${ellipse(1080, 860, 48, 48, "#efe4d6")}
      ${ellipse(760, 1320, 40, 40, "#e4d2be")}
      ${ellipse(200, 280, 90, 90, "#d9d3c6", 'opacity="0.35"')}
      `,
      33,
    ),
  },
  {
    slug: "field-in-ochre",
    title: "Field in ochre",
    year: 2024,
    medium: "Oil",
    surface: "linen",
    widthIn: 24,
    heightIn: 14,
    statement: "Three bands of field under a low sky, and a few dark posts on the horizon.",
    featured: false,
    originalStatus: "not-for-sale",
    printsAvailable: true,
    sample: true,
    svg: canvas(
      2000,
      1120,
      "#e7d6b4",
      `
      ${rect(0, 0, 2000, 340, "#e7d6b4")}
      ${rect(0, 340, 2000, 300, "#d4ae72")}
      ${rect(0, 640, 2000, 480, "#c17d3c")}
      ${rect(180, 250, 28, 160, "#5c4632")}
      ${rect(420, 210, 22, 200, "#4a3828")}
      ${rect(860, 230, 18, 170, "#5a4330")}
      ${rect(1280, 190, 26, 220, "#3f3124")}
      ${rect(1560, 240, 16, 150, "#5c4634")}
      <polygon points="700,760 980,700 1180,820 760,860" fill="#e0b56a" opacity="0.85"/>
      ${rect(0, 980, 2000, 28, "#8a5a30", 'opacity="0.35"')}
      `,
      44,
    ),
  },
  {
    slug: "the-blue-room",
    title: "The blue room",
    year: 2025,
    medium: "Acrylic",
    surface: "linen",
    widthIn: 15,
    heightIn: 20,
    statement: "A window, a chair, and a patch of floor light in a blue room.",
    featured: true,
    originalStatus: "in-studio",
    printsAvailable: true,
    sample: true,
    svg: canvas(
      1500,
      1960,
      "#b7c5ce",
      `
      ${rect(0, 0, 1500, 1960, "#b7c5ce")}
      ${rect(0, 1420, 1500, 540, "#8d8680")}
      ${rect(0, 1404, 1500, 16, "#6e675f")}
      ${rect(160, 150, 680, 860, "#d7e4e8")}
      ${rect(160, 150, 680, 240, "#eef4f5")}
      ${rect(484, 150, 16, 860, "#8d979c")}
      ${rect(160, 560, 680, 16, "#8d979c")}
      <polygon points="220,1420 900,1420 1080,1760 120,1760" fill="#d9d4ca" opacity="0.9"/>
      ${rect(1088, 1080, 22, 250, "#343c44")}
      ${rect(1088, 1060, 150, 20, "#343c44")}
      ${rect(1088, 1310, 230, 22, "#343c44")}
      ${rect(1288, 1332, 20, 90, "#343c44")}
      ${rect(1090, 1332, 20, 90, "#343c44")}
      ${rect(1120, 1580, 240, 90, "#c4894e")}
      ${rect(1240, 260, 130, 96, "none", 'stroke="#5c564e" stroke-width="10"')}
      `,
      55,
    ),
  },
  {
    slug: "fig-branch",
    title: "Fig branch",
    year: 2023,
    medium: "Ink",
    surface: "paper",
    widthIn: 18,
    heightIn: 18,
    statement: "A cut branch, a few leaves, and two figs on warm paper.",
    featured: false,
    originalStatus: "sold",
    printsAvailable: true,
    sample: true,
    svg: canvas(
      1700,
      1700,
      "#efe6d4",
      `
      <path d="M180,1280 C420,1100 640,980 980,760 C1180,620 1320,420 1500,220" stroke="#3a332c" stroke-width="28" fill="none" stroke-linecap="round"/>
      ${ellipse(520, 1040, 150, 62, "#3e5344", 'transform="rotate(-40 520 1040)"')}
      ${ellipse(760, 860, 140, 58, "#2c4034", 'transform="rotate(-24 760 860)"')}
      ${ellipse(1040, 620, 160, 64, "#5d734c", 'transform="rotate(-48 1040 620)"')}
      ${ellipse(1280, 400, 130, 52, "#314438", 'transform="rotate(-30 1280 400)"')}
      ${ellipse(860, 1040, 120, 48, "#24362c", 'transform="rotate(20 860 1040)"')}
      ${ellipse(1180, 780, 110, 46, "#6a7d55", 'transform="rotate(16 1180 780)"')}
      ${ellipse(640, 900, 70, 90, "#6a3a4e", 'transform="rotate(-18 640 900)"')}
      ${ellipse(1120, 540, 64, 84, "#7a4458", 'transform="rotate(12 1120 540)"')}
      `,
      66,
    ),
  },
  {
    slug: "window-in-winter",
    title: "Window in winter",
    year: 2024,
    medium: "Oil",
    surface: "panel",
    widthIn: 15,
    heightIn: 20,
    statement: "A cold window and one warm cup on the sill.",
    featured: false,
    originalStatus: "in-studio",
    printsAvailable: true,
    sample: true,
    svg: canvas(
      1400,
      1900,
      "#d7dbde",
      `
      ${rect(0, 0, 1400, 1900, "#d7dbde")}
      ${rect(0, 1460, 1400, 440, "#c3bdb4")}
      ${rect(180, 160, 1040, 1040, "#c5d5de")}
      ${rect(220, 210, 960, 280, "#e7eef1")}
      ${rect(680, 160, 18, 1040, "#8e99a1")}
      ${rect(180, 640, 1040, 18, "#8e99a1")}
      ${rect(140, 1180, 1120, 36, "#ebe4da")}
      ${rect(860, 1040, 100, 130, "#b8612f")}
      ${ellipse(910, 1040, 50, 16, "#e0b07a")}
      ${ellipse(910, 1040, 34, 10, "#8d4a24")}
      ${rect(0, 220, 120, 900, "#e8e2d8", 'opacity="0.9"')}
      `,
      77,
    ),
  },
  {
    slug: "market-flowers",
    title: "Flowers from the market",
    year: 2025,
    medium: "Watercolor",
    surface: "paper",
    widthIn: 16,
    heightIn: 20,
    statement: "A bunch reduced to discs of brick, ochre, cream, and sage in a gray vase.",
    featured: false,
    originalStatus: "in-studio",
    printsAvailable: false,
    sample: true,
    svg: canvas(
      1500,
      1900,
      "#f1e4d4",
      `
      ${rect(0, 0, 1500, 1900, "#f1e4d4")}
      ${rect(0, 1320, 1500, 580, "#cbb59a")}
      ${rect(0, 1320, 1500, 16, "#b39a7c")}
      ${ellipse(480, 1080, 70, 150, "#3f5c49", 'transform="rotate(-20 480 1080)"')}
      ${ellipse(1040, 1040, 64, 140, "#314838", 'transform="rotate(24 1040 1040)"')}
      <polygon points="640,1120 860,1120 910,1460 590,1460" fill="#5e6b72"/>
      ${ellipse(750, 860, 130, 130, "#f3e6d2")}
      ${ellipse(600, 980, 110, 110, "#c45c4a")}
      ${ellipse(920, 1000, 120, 120, "#7ea188")}
      ${ellipse(760, 1040, 100, 100, "#e0ae55")}
      ${ellipse(560, 860, 72, 72, "#8e342e")}
      ${ellipse(980, 840, 64, 64, "#efe2cc")}
      ${ellipse(700, 760, 58, 58, "#d07a45")}
      ${ellipse(860, 760, 50, 50, "#3f5c49")}
      `,
      88,
    ),
  },
];
