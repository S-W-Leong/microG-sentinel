// Build MicroG-Sentinel-slides.pptx. Layout mirrors deck.html: 1920x1080 px = 13.333x7.5 in (144 px/in, 2 px/pt).
const path = require('node:path');
const fs = require('node:fs');
const pptxgen = require('pptxgenjs');

const dir = __dirname;
const out = process.argv[2] || path.join(dir, 'MicroG-Sentinel-slides.pptx');
const notes = fs.readFileSync(path.join(dir, 'speaker-notes.md'), 'utf8');
const noteFor = (n) => {
  const m = notes.match(new RegExp('\\*\\*' + n + ' ·[^*]*\\*\\*\\n([\\s\\S]*?)(?=\\n\\*\\*|$)'));
  return m ? m[1].trim() : '';
};

const BG = '111315', PANEL = '1A1D20', LINE = '2C3136', TEXT = 'F2EFE9', MUTED = 'A3A8AD', ACCENT = 'FF5A2B';
const FONT = 'Arial', MONO = 'Courier New';
const i = (px) => px / 144; // px → inches
const pt = (px) => px / 2; // px → points

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.title = 'MicroG Sentinel';
pres.author = 'Team (SW)²';
pres.theme = { headFontFace: FONT, bodyFontFace: FONT };

pres.defineSlideMaster({
  title: 'CONTENT',
  background: { color: BG },
  slideNumber: { x: i(1720), y: i(1010), w: i(80), h: i(40), color: MUTED, fontFace: FONT, fontSize: pt(20), align: 'right' },
});

const T = (slide, text, x, y, w, h, o = {}) =>
  slide.addText(text, {
    x: i(x), y: i(y), w: i(w), h: i(h), margin: 0, isTextBox: true, valign: 'top',
    fontFace: FONT, color: TEXT, fontSize: pt(30), ...o,
  });
const kicker = (s, text) => T(s, text, 120, 96, 1500, 40, { fontSize: pt(26), color: MUTED });
const title = (s, text, w = 1680, h = 80) => T(s, text, 120, 150, w, h, { fontSize: pt(58), bold: true });
const panel = (s, x, y, w, h) =>
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: i(x), y: i(y), w: i(w), h: i(h), fill: { color: PANEL }, line: { color: PANEL }, rectRadius: 0.12 });
const shot = (s, file, x, y, w, h, alt) =>
  s.addImage({ path: path.join(dir, 'crops', file), x: i(x), y: i(y), w: i(w), h: i(h), altText: alt });
const frame = (s, x, y, w, h) =>
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: i(x), y: i(y), w: i(w), h: i(h), fill: { type: 'none' }, line: { color: LINE, width: 1 }, rectRadius: 0.1 });
const foot = (s, text) => T(s, text, 120, 1010, 1500, 36, { fontSize: pt(20), color: MUTED });

// 1 · Title
{
  const s = pres.addSlide({ masterName: 'CONTENT' });
  T(s, 'NASA Space Apps 2026 · Kuala Lumpur', 120, 300, 820, 44, { fontSize: pt(26), color: MUTED });
  T(s, 'MicroG Sentinel', 120, 360, 900, 130, { fontSize: pt(100), bold: true });
  T(s, 'Your body changes in space.\nSee what changed for you.', 120, 520, 820, 120, { fontSize: pt(40) });
  T(s, 'Crew health check-ins for long missions\nTeam (SW)² · Siang Woo & Shi Wei', 120, 700, 820, 90, { fontSize: pt(26), color: MUTED, lineSpacingMultiple: 1.3 });
  // hero crop is 1.214:1
  shot(s, 'hero.png', 1060, 170, 740, 740 / 1.214, 'Body map with region cards and 3D astronaut');
  frame(s, 1060, 170, 740, 740 / 1.214);
  s.addNotes(noteFor(1));
}

// 2 · Problem
{
  const s = pres.addSlide({ masterName: 'CONTENT' });
  kicker(s, 'The problem');
  title(s, 'Between doctor calls, the crew is on its own');
  const stats = [
    ['Weekly', 'private medical conference with the flight surgeon on the ISS'],
    ['17', 'NASA human spaceflight health risks, each with its own signs'],
    ['20 min', 'one-way signal delay from Mars, so help is never instant'],
  ];
  stats.forEach(([big, text], n) => {
    const x = 120 + n * 576;
    T(s, big, x, 340, 540, 150, { fontSize: pt(128), bold: true });
    T(s, text, x, 510, 470, 100, { fontSize: pt(30), color: MUTED });
  });
  T(s, 'Astronauts need a quick way to notice change in their own body, and to know when it cannot wait.', 120, 700, 1500, 110, { fontSize: pt(38) });
  foot(s, 'Sources: NASA Human Research Program · 5 Hazards and Risks of Human Spaceflight');
  s.addNotes(noteFor(2));
}

// 3 · Hazards → tabs
{
  const s = pres.addSlide({ masterName: 'CONTENT' });
  kicker(s, "NASA's 5 hazards → our tabs");
  title(s, '8 personal risks, one body map');
  const rows = [
    ['Altered gravity', ['Cardio', 'Bone', 'Balance', 'SANS (eyes)']],
    ['Isolation & confinement', ['Sleep', 'Mood']],
    ['Hostile, closed environment', ['Immune', 'Microbiome', 'Food']],
    ['Radiation', ['Dose card · context only']],
    ['Distance from Earth', ['Every red flag → flight surgeon']],
  ];
  rows.forEach(([name, chips], n) => {
    const y = 280 + n * 125;
    panel(s, 120, y, 1680, 103);
    T(s, name, 156, y + 30, 540, 44, { fontSize: pt(34), bold: true });
    T(s, '→', 716, y + 30, 40, 44, { fontSize: pt(34), color: MUTED });
    let x = 776;
    chips.forEach((c) => {
      const w = c.length * 15 + 56;
      const dashed = name === 'Radiation';
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: i(x), y: i(y + 26), w: i(w), h: i(52), fill: { type: 'none' },
        line: { color: LINE, width: 1, dashType: dashed ? 'dash' : 'solid' }, rectRadius: 0.18,
      });
      T(s, c, x, y + 26, w, 52, { fontSize: pt(28), align: 'center', valign: 'middle', color: dashed ? MUTED : TEXT });
      x += w + 14;
    });
  });
  foot(s, 'Left out on purpose: risks that are not personal readings (e.g. decompression sickness, landing injury)');
  s.addNotes(noteFor(3));
}

// 4 · How it works
{
  const s = pres.addSlide({ masterName: 'CONTENT' });
  kicker(s, 'How it works');
  title(s, 'Tap, check in, connect, escalate');
  const steps = [
    ['01', 'Body map', 'Tap the region that feels different'],
    ['02', 'Risk tab', 'Its own quick input and the right chart'],
    ['03', 'Astronaut vector', 'Traits, baselines and exposures link the tabs'],
    ['04', 'Flight surgeon', 'Red flag: contact now. Unclear: next conference'],
  ];
  steps.forEach(([n, h, p], k) => {
    const x = 120 + k * 427;
    panel(s, x, 280, 399, 240);
    T(s, n, x + 32, 312, 300, 34, { fontSize: pt(24), color: MUTED, fontFace: MONO });
    T(s, h, x + 32, 356, 350, 48, { fontSize: pt(34), bold: true });
    T(s, p, x + 32, 414, 340, 90, { fontSize: pt(26), color: MUTED });
  });
  // crops are 2.054:1
  shot(s, 'bodymap.png', 120, 556, 826, 826 / 2.054, 'Body map');
  frame(s, 120, 556, 826, 826 / 2.054);
  shot(s, 'profile.png', 974, 556, 826, 826 / 2.054, 'Crew profile connections');
  frame(s, 974, 556, 826, 826 / 2.054);
  foot(s, 'Offline · no backend · simulated crew always labelled');
  s.addNotes(noteFor(4));
}

// 5 · Core story
{
  const s = pres.addSlide({ masterName: 'CONTENT' });
  kicker(s, 'One story, two tabs');
  title(s, 'Shrimp at breakfast, hives by eleven', 860, 150);
  const lines = [
    ['60%', [{ text: 'photo matches 3 of 5 hives signs' }]],
    ['+10', [{ text: 'known shellfish allergy ' }, { text: '(vector)', options: { color: MUTED } }]],
    ['+10', [{ text: 'shellfish eaten 3 h ago ' }, { text: '(Food tab)', options: { color: MUTED } }]],
  ];
  lines.forEach(([v, runs], n) => {
    const y = 340 + n * 78;
    T(s, v, 120, y, 160, 60, { fontSize: pt(46), bold: true });
    T(s, runs, 290, y + 10, 690, 50, { fontSize: pt(30) });
  });
  s.addShape(pres.shapes.LINE, { x: i(120), y: i(586), w: i(860), h: 0, line: { color: LINE, width: 1 } });
  T(s, '80%', 120, 606, 260, 100, { fontSize: pt(88), bold: true, color: ACCENT });
  T(s, 'hives pattern, every reason shown', 340, 646, 640, 50, { fontSize: pt(30) });
  T(
    s,
    [
      { text: 'A pattern match, never a diagnosis. Any "yes" to breathing, throat, swelling or fainting hides the score and says ' },
      { text: 'Contact the flight surgeon now', options: { color: ACCENT } },
      { text: '.' },
    ],
    120, 760, 860, 130, { fontSize: pt(26), color: MUTED },
  );
  // immune 1.763:1, urgent 1.874:1
  shot(s, 'immune.png', 1044, 96, 756, 756 / 1.763, 'Immune tab: 80% hives pattern with reasons');
  frame(s, 1044, 96, 756, 756 / 1.763);
  shot(s, 'urgent.png', 1044, 560, 756, 756 / 1.874, 'Contact the flight surgeon now');
  frame(s, 1044, 560, 756, 756 / 1.874);
  s.addNotes(noteFor(5));
}

// 6 · Real NASA data
{
  const s = pres.addSlide({ masterName: 'CONTENT' });
  kicker(s, 'Real NASA data, kept separate');
  title(s, 'Four tabs replay a NASA study', 1000);
  const rows = [
    ['Cardio', 'MR080G bed-rest cycle tests', 'NASA LSDA'],
    ['Sleep', 'BRSMAct wrist actigraphy, UTMB Campaign 1', 'NASA LSDA'],
    ['Immune', 'OSD-575 Inspiration4 cytokine panel', 'NASA OSDR'],
    ['Bone', 'MR035G DXA hip and spine scans', 'NASA LSDA'],
  ];
  rows.forEach(([tab, src, repo], n) => {
    const y = 270 + n * 100;
    panel(s, 120, y, 1000, 82);
    T(s, tab, 150, y + 20, 170, 44, { fontSize: pt(30), bold: true });
    T(s, [{ text: src + ' ' }, { text: '· ' + repo, options: { color: MUTED } }], 344, y + 24, 760, 40, { fontSize: pt(25) });
  });
  T(
    s,
    'Replays are read-only and never mix with crew data.\nScreening cut-offs (UAS7, PSQI, PHQ-9, MUST) come from Earth populations.\nCrew data in the demo is simulated and labelled.',
    120, 690, 1000, 140, { fontSize: pt(25), color: MUTED, lineSpacingMultiple: 1.3 },
  );
  // sleep 0.842:1
  shot(s, 'sleep.png', 1180, 96, 620, 620 / 0.842, 'Sleep tab NASA replay');
  frame(s, 1180, 96, 620, 620 / 0.842);
  s.addNotes(noteFor(6));
}

// 7 · Next
{
  const s = pres.addSlide({ masterName: 'CONTENT' });
  kicker(s, "What's next");
  title(s, 'From prototype to crew tool');
  const cards = [
    ['Onboard assistant', 'An offline model that reads the astronaut vector and drafts questions for the next medical conference'],
    ['Sensor feeds', 'Wearable sleep and heart data in place of manual entry, using the same signal contract'],
    ['Validate with flight surgeons', 'Replace Earth-population cut-offs and demo weights with crew-specific evidence'],
    ['Built for delay', 'Queue reports for Moon and Mars links where a live call is minutes away'],
  ];
  cards.forEach(([h, p], k) => {
    const x = 120 + (k % 2) * 854, y = 280 + Math.floor(k / 2) * 238;
    panel(s, x, y, 826, 210);
    T(s, h, x + 40, y + 36, 750, 48, { fontSize: pt(36), bold: true });
    T(s, p, x + 40, y + 98, 750, 90, { fontSize: pt(27), color: MUTED });
  });
  T(s, '(SW)² · Siang Woo & Shi Wei', 120, 930, 700, 50, { fontSize: pt(34) });
  T(s, 'Prototype, not for clinical use. AI-assisted research, data curation, code and writing (Claude, OpenAI Codex, DeepSeek), disclosed per Space Apps rules.', 900, 920, 900, 70, { fontSize: pt(22), color: MUTED, align: 'right' });
  s.addNotes(noteFor(7));
}

pres.writeFile({ fileName: out }).then((f) => console.log('wrote', f));
