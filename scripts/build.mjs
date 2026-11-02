// Builds the static site into public/ from site.config.mjs.
//   node scripts/build.mjs
// Page structure, heading order and schema follow the same pattern on every page:
// one H1 in the hero, H2 per section, H3 for items inside a section.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import site from "../site.config.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STATIC = path.join(ROOT, "static");
const OUT = path.join(ROOT, "public");
const TODAY = new Date().toISOString().slice(0, 10);
const B = site.business;

// ---------- helpers ----------
const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const strip = (s = "") => String(s).replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&ndash;/g, "–").replace(/&mdash;/g, "—").replace(/&amp;/g, "&").replace(/&rsquo;/g, "’").replace(/&ldquo;|&rdquo;/g, '"').replace(/\s+/g, " ").trim();
const abs = (p) => site.origin + p;
const money = (n) => "$" + Number(n).toLocaleString("en-US");

function hashFile(rel) {
  return crypto.createHash("sha1").update(fs.readFileSync(path.join(STATIC, rel))).digest("hex").slice(0, 8);
}

function imageSize(file) {
  const b = fs.readFileSync(file);
  if (b.toString("ascii", 1, 4) === "PNG") return [b.readUInt32BE(16), b.readUInt32BE(20)];
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
    const chunk = b.toString("ascii", 12, 16);
    if (chunk === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
    if (chunk === "VP8L") { const n = b.readUInt32LE(21); return [(n & 0x3fff) + 1, ((n >> 14) & 0x3fff) + 1]; }
    if (chunk === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  }
  throw new Error("Unknown image format: " + file);
}

const IMG = {};
for (const [key, v] of Object.entries(site.images)) {
  const [w, h] = imageSize(path.join(STATIC, "images", v.file));
  IMG[key] = { ...v, w, h, src: "/images/" + v.file };
}
function img(key, { eager = false, cls = "", alt } = {}) {
  const i = IMG[key];
  if (!i) throw new Error("Missing image key: " + key);
  return `<img src="${i.src}" alt="${esc(alt ?? i.alt)}" width="${i.w}" height="${i.h}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async"${cls ? ` class="${cls}"` : ""}>`;
}

// Inline SVG icons (stroke style, 24px grid)
const ICONS = {
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  star: '<path fill="currentColor" stroke="none" d="M12 2.5l2.94 5.96 6.56.95-4.75 4.63 1.12 6.54L12 17.5l-5.87 3.08 1.12-6.54L2.5 9.41l6.56-.95z"/>',
  play: '<path fill="currentColor" stroke="none" d="M8 5.5v13l11-6.5z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  droplet: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  camera: '<path d="m16 13 5.22 3.48a.5.5 0 0 0 .78-.42V7.87a.5.5 0 0 0-.75-.43L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
  waves: '<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',
  pipe: '<path d="M2 7h9a5 5 0 0 1 5 5v9"/><path d="M2 13h5a3 3 0 0 1 3 3v5"/><path d="M2 5v10"/><path d="M8 21h10"/>',
  sink: '<path d="M3 13h18v2a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z"/><path d="M12 13V6a2.5 2.5 0 0 1 5 0"/><path d="M9 8h3"/>',
  drain: '<circle cx="12" cy="12" r="9"/><path d="M8 9h8M7 12h10M8 15h8"/>',
  siren: '<path d="M7 18v-6a5 5 0 1 1 10 0v6"/><path d="M5 21a1 1 0 0 1-1-1v-1a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1z"/><path d="M21 12h1M2 12h1M12 2v1M4.93 4.93l.7.7M19.07 4.93l-.7.7"/>',
  dollar: '<path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  leaf: '<path d="M12 22v-8"/><path d="M12 14c-3.5 0-6.5-2.5-6.5-7 3.5 0 6.5 2.5 6.5 7z"/><path d="M12 12c0-4.5 3-7.5 7.5-7.5 0 4.5-3 7.5-7.5 7.5z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  route: '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
  bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
};
const icon = (name, cls = "ico-svg") =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
const arrowBtn = (href, label, cls = "btn btn--primary") => `<a href="${href}" class="${cls}">${label} ${icon("arrow")}</a>`;

// ---------- URLs ----------
const PRICING = "/" + site.pricing.slug;
const SERVICES = site.services;
const pathFor = (slug) => (slug === "index" ? "/" : "/" + slug);

// ---------- schema ----------
const businessLd = {
  "@context": "https://schema.org",
  "@type": "Plumber",
  "@id": abs("/#business"),
  name: B.name,
  description: site.schemaDescription,
  url: abs("/"),
  logo: abs("/favicon-512.png"),
  image: [abs("/og-image.jpg"), abs(IMG[site.schemaImage].src)],
  areaServed: site.areas.map((a) => ({ "@type": "City", name: `${a}, ${site.state}` })),
  openingHoursSpecification: [{ "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], opens: "00:00", closes: "23:59" }],
  priceRange: `${money(site.pricing.start)}+`,
  currenciesAccepted: "USD",
  knowsAbout: SERVICES.map((s) => s.name),
};
const crumbsLd = (items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, p], i) => ({ "@type": "ListItem", position: i + 1, name, item: abs(p) })),
});
const serviceLd = (s) => ({
  "@context": "https://schema.org",
  "@type": "Service",
  name: `${s.name} in ${site.city}, ${site.state}`,
  serviceType: s.name,
  description: strip(s.metaDescription),
  url: abs("/" + s.slug),
  provider: { "@id": abs("/#business") },
  areaServed: { "@type": "City", name: `${site.city}, ${site.state}` },
});
const faqLd = (faqs) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({ "@type": "Question", name: strip(f.q), acceptedAnswer: { "@type": "Answer", text: strip(f.a) } })),
});

// ---------- layout ----------
const CSS_V = hashFile("css/styles.css");
const JS_V = hashFile("js/main.js");

function nav(active) {
  const li = (href, label) => `<li${active === href ? ' class="current"' : ""}><a href="${href}">${label}</a></li>`;
  const svcActive = active === "/services" || SERVICES.some((s) => active === "/" + s.slug);
  return `<ul class="nav" id="site-nav">
        ${li("/", "Home")}
        ${li("/about", "About")}
        <li class="has-drop${svcActive ? " current" : ""}">
          <a href="/services">Services</a><button class="drop-toggle" aria-label="Show services" aria-expanded="false">${icon("down")}</button>
          <div class="dropdown">
            ${SERVICES.map((s) => `<a href="/${s.slug}">${icon(s.icon)}${s.name}</a>`).join("\n            ")}
          </div>
        </li>
        ${li("/gallery", "Gallery")}
        ${li(PRICING, "Pricing")}
        ${li("/contact", "Contact")}
      </ul>`;
}

const brandMark = (light = false) =>
  `<a href="/" class="brand${light ? " brand--light" : ""}" aria-label="${esc(strip(B.name))} home">
        <span class="brand-mark">${icon("droplet")}</span>
        <span class="brand-name">${B.short}<small>${B.cityLine}</small></span>
      </a>`;

function header(active) {
  return `<div class="topbar">
    <div class="container">
      <div class="topbar-info">
        <span>${icon("clock")}${site.topbar}</span>
        <span class="hide-sm">${icon("moon")}No after-hours fees until 8 p.m., weekends included</span>
      </div>
      <span class="topbar-rating">${icon("clipboard")}Free, upfront estimates</span>
    </div>
  </div>

  <header class="site-header">
    <div class="container">
      ${brandMark()}
      ${nav(active)}
      <div class="header-cta">
        ${arrowBtn("/contact", "Free Estimate", "btn btn--primary btn--sm")}
        <button class="nav-toggle" aria-label="Open menu" aria-controls="site-nav" aria-expanded="false">${icon("menu")}</button>
      </div>
    </div>
  </header>`;
}

function footer() {
  return `<footer class="site-footer">
    <div class="container">
      <div class="f-grid">
        <div>
          ${brandMark(true)}
          <p>${site.footerBlurb}</p>
        </div>
        <div>
          <h4>Quick Links</h4>
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/about">About Us</a></li>
            <li><a href="/services">Services</a></li>
            <li><a href="/gallery">Gallery</a></li>
            <li><a href="${PRICING}">${site.city} Drain Cleaning Pricing</a></li>
            <li><a href="/contact">Contact Us</a></li>
          </ul>
        </div>
        <div>
          <h4>Our Services</h4>
          <ul>
            ${SERVICES.map((s) => `<li><a href="/${s.slug}">${s.name}</a></li>`).join("\n            ")}
          </ul>
        </div>
        <div>
          <h4>Get In Touch</h4>
          <ul class="f-contact">
            <li>${icon("mail")}<a href="/contact">Request a free estimate online</a></li>
            <li>${icon("clock")}<span>Open 24 hours, 7 days a week</span></li>
            <li>${icon("route")}<span>${site.footerArea}</span></li>
            <li>${icon("globe")}<span>Also serving <a href="${site.sister.url}">${site.sister.label}</a></span></li>
          </ul>
        </div>
      </div>
      <div class="f-bottom">
        <span>&copy; <span data-year>${TODAY.slice(0, 4)}</span> ${B.name}. All Rights Reserved.</span>
        <span>${site.footerBottom}</span>
      </div>
    </div>
  </footer>`;
}

const lightbox = `<div class="lightbox" id="lightbox" aria-hidden="true" role="dialog" aria-label="Image preview">
    <button class="lightbox-close" id="lightboxClose" aria-label="Close image">${icon("close")}</button>
    <button class="lightbox-nav lightbox-prev" id="lightboxPrev" aria-label="Previous image">${icon("left")}</button>
    <figure><img src="" alt="" id="lightboxImg"><figcaption id="lightboxCap"></figcaption></figure>
    <button class="lightbox-nav lightbox-next" id="lightboxNext" aria-label="Next image">${icon("right")}</button>
  </div>`;

function layout({ path: p, title, description, body, schema = [], noindex = false, preload, ogType = "website" }) {
  const canonical = abs(p);
  const ld = [businessLd, ...schema].map((o) => `<script type="application/ld+json">\n${JSON.stringify(o, null, 2)}\n</script>`).join("\n  ");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script>document.documentElement.className += " js";</script>
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="${noindex ? "noindex, follow" : "index, follow, max-image-preview:large"}">
  <link rel="canonical" href="${canonical}">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
  <link rel="icon" type="image/png" sizes="192x192" href="/favicon.png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <meta name="theme-color" content="#0b2545">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:type" content="${ogType}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="${esc(site.siteName)}">
  <meta property="og:locale" content="en_US">
  <meta property="og:image" content="${abs("/og-image.jpg")}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${esc(`Drain cleaning in ${site.city}, ${site.state} by ${strip(B.name)}`)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${abs("/og-image.jpg")}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/styles.css?v=${CSS_V}">${preload ? `\n  <link rel="preload" as="image" href="${preload}" fetchpriority="high">` : ""}
  ${ld}
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>
  ${header(p === "/" ? "/" : p)}

  <main id="main">
${body}
  </main>

  ${footer()}

  ${lightbox}

  <script src="/js/main.js?v=${JS_V}" defer></script>
</body>
</html>
`;
}

// ---------- shared blocks ----------
const sectionHead = ({ eyebrow, h2, p }, center = true) =>
  `<div class="section-head${center ? " center" : ""} reveal">
        ${eyebrow ? `<span class="eyebrow">${eyebrow}</span>` : ""}
        <h2>${h2}</h2>
        ${p ? `<p>${p}</p>` : ""}
      </div>`;

const pageHero = (h1, crumbs, lead) => `  <section class="page-hero">
    <div class="container">
      <h1>${h1}</h1>
      ${lead ? `<p class="page-lead">${lead}</p>` : ""}
      <nav class="crumbs" aria-label="Breadcrumb">${crumbs
        .map(([label, href], i) => (i < crumbs.length - 1 ? `<a href="${href}">${label}</a>${icon("right")}` : `<span aria-current="page">${label}</span>`))
        .join("")}</nav>
    </div>
  </section>`;

const ctaStrip = ({ h2, p, btn = "Get My Free Estimate" }, padTop = false) => `  <section class="section"${padTop ? ' style="padding-top:0"' : ""}>
    <div class="container"><div class="cta-strip reveal"><div><h2>${h2}</h2><p>${p}</p></div>${arrowBtn("/contact", btn, "btn btn--light")}</div></div>
  </section>`;

const ticks = (items, ic = "check") => `<ul class="ticks">
          ${items.map((t) => `<li>${icon(ic)}<span>${t}</span></li>`).join("\n          ")}
        </ul>`;

const steps = (list, numbered = true) => `<div class="steps">
        ${list
          .map((s, i) => `<div class="step reveal"><div class="num">${numbered ? String(i + 1).padStart(2, "0") : icon(s.icon)}</div><h3>${s.h3}</h3><p>${s.p}</p></div>`)
          .join("\n        ")}
      </div>`;

function form(subject, { head, compact = false, idPrefix = "f" } = {}) {
  const id = (n) => `${idPrefix}-${n}`;
  const options = ["General Drain Cleaning", ...SERVICES.map((s) => s.name), "Emergency / Backed-Up Drain", "Not Sure Yet"];
  return `<form class="contact-form${compact ? " hero-form" : ""} reveal" action="https://api.web3forms.com/submit" method="POST" data-web3form>
        ${head ? `<div class="form-head"><h2>${head.h2}</h2><p>${head.p}</p></div>` : ""}
        <input type="hidden" name="access_key" value="${site.web3formsKey}">
        <input type="hidden" name="subject" value="${esc(subject)}">
        <input type="hidden" name="from_name" value="${esc(site.siteName)} Website">
        <input type="hidden" name="website" value="${site.domain}">
        <input type="hidden" name="redirect" value="${abs("/thank-you")}">
        <input type="checkbox" name="botcheck" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
        <div class="row">
          <div class="field"><label for="${id("name")}">Full Name</label><input id="${id("name")}" type="text" name="name" autocomplete="name" placeholder="Jane Smith" required></div>
          <div class="field"><label for="${id("email")}">Email</label><input id="${id("email")}" type="email" name="email" autocomplete="email" placeholder="you@email.com" required></div>
        </div>
        <div class="row">
          <div class="field"><label for="${id("phone")}">Phone <small>(optional)</small></label><input id="${id("phone")}" type="tel" name="phone" autocomplete="tel" placeholder="Best number to reach you"></div>
          <div class="field"><label for="${id("town")}">Town</label>
            <select id="${id("town")}" name="town">
              ${site.areas.map((a) => `<option${a === site.city ? " selected" : ""}>${a}</option>`).join("")}<option>Other</option>
            </select>
          </div>
        </div>
        <div class="field"><label for="${id("service")}">Service Needed</label>
          <select id="${id("service")}" name="service">
            ${options.map((o) => `<option>${esc(o)}</option>`).join("\n            ")}
          </select>
        </div>
        <div class="field"><label for="${id("message")}">What's going on?</label><textarea id="${id("message")}" name="message" placeholder="${esc(site.formPlaceholder)}" required></textarea></div>
        <button type="submit" class="btn btn--primary btn--block">Get My Free Estimate ${icon("arrow")}</button>
        <p class="form-note">${icon("shield")}Free, upfront estimate. No obligation.</p>
        <p class="form-status" role="status" aria-live="polite"></p>
      </form>`;
}

function galleryGrid(keys) {
  return `<div class="gallery reveal">
        ${keys
          .map((k, i) => {
            const it = IMG[k];
            const wide = it.w > it.h && (i === 0 || i % 5 === 4);
            return `<a href="${it.src}" class="g-item${wide ? " wide" : ""}" data-lightbox="gallery" data-caption="${esc(it.caption || it.alt)}">${img(k)}<span class="g-cap">${it.caption || it.alt}</span></a>`;
          })
          .join("\n        ")}
      </div>`;
}

function beforeAfter(ba) {
  return `<div class="ba-grid reveal">
        <figure class="ba-card"><span class="tag">${ba.before.tag || "Before"}</span>${img(ba.before.img)}<figcaption>${ba.before.cap}</figcaption></figure>
        <figure class="ba-card after"><span class="tag">${ba.after.tag || "After"}</span>${img(ba.after.img)}<figcaption>${ba.after.cap}</figcaption></figure>
      </div>`;
}

function serviceCards(list, { withImg = true, link = "Learn More" } = {}) {
  return `<div class="cards${list.length === 3 || list.length === 6 ? " cards--3" : ""}">
        ${list
          .map(
            (s) => `<article class="s-card reveal">
          ${withImg && s.img ? `<div class="s-img">${img(s.img, { alt: s.cardAlt })}</div>` : ""}
          <div class="s-body"><span class="s-ico">${icon(s.icon)}</span>
            <h3>${s.name}</h3>
            <p>${s.short}</p>
            ${s.slug ? `<a href="/${s.slug}" class="s-link">${link} ${icon("arrow")}</a>` : `<a href="/contact" class="s-link">Request Service ${icon("arrow")}</a>`}
          </div>
        </article>`
          )
          .join("\n        ")}
      </div>`;
}

function videoEmbed(v) {
  return `<div class="yt reveal" data-yt="${v.id}" data-title="${esc(v.title)}">
          <button type="button" class="yt-btn" aria-label="Play video: ${esc(v.title)}">
            ${img("videoThumb", { alt: v.title })}
            <span class="yt-play">${icon("play")}</span>
          </button>
          <noscript><a href="https://www.youtube.com/watch?v=${v.id}">Watch &ldquo;${esc(v.title)}&rdquo; on YouTube</a></noscript>
        </div>`;
}

// ---------- pages ----------
const pages = [];

// Home
{
  const h = site.home;
  const featured = h.featuredServices.map((slug) => SERVICES.find((s) => s.slug === slug));
  const body = `  <section class="hero">
    <div class="hero-bg">${img("hero", { eager: true, alt: h.heroAlt })}</div>
    <div class="container">
      <div class="hero-copy reveal">
        <span class="eyebrow eyebrow--light">${h.eyebrow}</span>
        <h1>${h.h1}</h1>
        <p class="lead">${h.lead}</p>
        <div class="hero-cta">
          ${arrowBtn("/contact", "Get My Free Estimate")}
          <a href="${PRICING}" class="btn btn--ghost-light">See ${site.city} Prices</a>
        </div>
        <div class="hero-trust">
          <span class="ico">${icon("award")}</span>
          <div><strong>${h.trust.strong}</strong><span>${h.trust.span}</span></div>
        </div>
        <div class="hero-stats">
          ${h.stats.map(([n, l]) => `<div><div class="num">${n}</div><div class="lbl">${l}</div></div>`).join("\n          ")}
        </div>
      </div>
      ${form(`New drain cleaning request — ${site.domain} (Homepage)`, { head: h.formHead, compact: true, idPrefix: "hero" })}
    </div>
  </section>

  <section class="section" id="about">
    <div class="container about-grid">
      <div class="about-media reveal">
        ${img(h.about.img)}
        <div class="exp-badge"><b>${B.years}</b><span>Years Serving<br>Eastern Iowa</span></div>
      </div>
      <div class="about-body reveal">
        <span class="eyebrow">${h.about.eyebrow}</span>
        <h2>${h.about.h2}</h2>
        ${h.about.paras.map((t) => `<p>${t}</p>`).join("\n        ")}
        <ul class="about-points">
          ${h.about.points.map((t) => `<li>${icon("check")}${t}</li>`).join("\n          ")}
        </ul>
        ${arrowBtn("/about", "More About Us")}
      </div>
    </div>
  </section>

  <section class="section section--alt" id="services">
    <div class="container">
      ${sectionHead(h.servicesHead)}
      ${serviceCards(featured, { link: "Get Started" })}
      <div class="center-btn reveal">${arrowBtn("/services", "View All Services", "btn btn--ghost")}</div>
    </div>
  </section>

  <section class="section">
    <div class="container why-grid">
      <div class="reveal">
        <span class="eyebrow">Why Choose Us</span>
        <h2 class="h2-lg">${h.why.h2}</h2>
        <div class="why-list">
          ${h.why.items.map((w) => `<div class="why-item"><span class="ico">${icon(w.icon)}</span><div><h3>${w.h3}</h3><p>${w.p}</p></div></div>`).join("\n          ")}
        </div>
      </div>
      <div class="why-media reveal">
        ${img(h.why.img)}
        <div class="stat-float"><b>${h.why.float.b}</b><span>${h.why.float.span}</span></div>
      </div>
    </div>
  </section>

  <section class="section section--alt">
    <div class="container">
      ${sectionHead(h.process)}
      ${steps(h.process.steps)}
      <div class="price-strip reveal">
        <div class="ps-item"><span>Drain cleaning from</span><b>${money(site.pricing.start)}</b></div>
        <div class="ps-item"><span>Basic drain snaking</span><b>about ${money(site.pricing.snake)}</b></div>
        <div class="ps-item"><span>After-hours fees before 8 p.m.</span><b>$0</b></div>
        <a href="${PRICING}" class="btn btn--primary">See ${site.city} Pricing ${icon("arrow")}</a>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      ${sectionHead(h.galleryHead)}
      ${galleryGrid(h.gallery)}
      <div class="center-btn reveal">${arrowBtn("/gallery", "View Full Gallery", "btn btn--ghost")}</div>
    </div>
  </section>

  <section class="section section--alt">
    <div class="container">
      ${sectionHead(h.ba)}
      ${beforeAfter(h.ba)}
    </div>
  </section>

${ctaStrip(h.cta)}`;
  pages.push({
    file: "index.html",
    html: layout({
      path: "/",
      title: h.title,
      description: h.description,
      body,
      preload: IMG.hero.src,
      schema: [{ "@context": "https://schema.org", "@type": "WebSite", "@id": abs("/#website"), url: abs("/"), name: site.siteName, publisher: { "@id": abs("/#business") }, inLanguage: "en-US" }],
    }),
  });
}

// About
{
  const a = site.about;
  const body = `${pageHero(a.h1, [["Home", "/"], ["About", "/about"]])}

  <section class="section">
    <div class="container split">
      <div class="prose reveal">
        <span class="eyebrow">${a.eyebrow}</span>
        <h2>${a.h2}</h2>
        ${a.paras.map((t) => `<p>${t}</p>`).join("\n        ")}
        ${ticks(a.points)}
        ${arrowBtn("/contact", "Get A Free Estimate")}
      </div>
      <div class="reveal media-stack">${img(a.img)}<div class="exp-badge exp-badge--inline"><b>${B.years}</b><span>Years in<br>the Trade</span></div></div>
    </div>
  </section>

  <section class="section section--alt">
    <div class="container">
      ${sectionHead(a.values)}
      ${steps(a.values.items, false)}
    </div>
  </section>

  <section class="section">
    <div class="container">
      ${sectionHead(a.process)}
      ${steps(a.process.steps)}
    </div>
  </section>

${ctaStrip(a.cta, true)}`;
  pages.push({ file: "about.html", html: layout({ path: "/about", title: a.title, description: a.description, body, schema: [crumbsLd([["Home", "/"], ["About", "/about"]])] }) });
}

// Services hub
{
  const s = site.servicesPage;
  const all = [...SERVICES, s.extra];
  const body = `${pageHero(s.h1, [["Home", "/"], ["Services", "/services"]])}

  <section class="section">
    <div class="container">
      ${sectionHead(s.head)}
      ${serviceCards(all)}
    </div>
  </section>

  <section class="section section--alt">
    <div class="container">
      ${sectionHead(s.process)}
      ${steps(s.process.steps)}
    </div>
  </section>

${ctaStrip(s.cta)}`;
  pages.push({
    file: "services.html",
    html: layout({
      path: "/services",
      title: s.title,
      description: s.description,
      body,
      schema: [
        crumbsLd([["Home", "/"], ["Services", "/services"]]),
        {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `Drain cleaning services in ${site.city}, ${site.state}`,
          itemListElement: SERVICES.map((x, i) => ({ "@type": "ListItem", position: i + 1, name: x.name, url: abs("/" + x.slug) })),
        },
      ],
    }),
  });
}

// Service pages
for (const s of SERVICES) {
  const related = SERVICES.filter((x) => x.slug !== s.slug).slice(0, 4);
  const body = `${pageHero(`${s.name} in ${site.city}`, [["Home", "/"], ["Services", "/services"], [s.name, "/" + s.slug]])}

  <section class="section">
    <div class="container split split--top">
      <div class="prose reveal">
        <span class="eyebrow">${s.name}</span>
        <h2>${s.h2}</h2>
        ${s.paras.map((t) => `<p>${t}</p>`).join("\n        ")}
        <h3>What We Offer</h3>
        ${ticks(s.offer)}
        <h3>${s.signsTitle}</h3>
        ${ticks(s.signs, "plus")}
        ${arrowBtn("/contact", s.btn)}
      </div>
      <div class="reveal sticky-media">${img(s.img)}
        <div class="side-card">
          <h3 class="side-title">${s.priceTitle}</h3>
          <p>${s.priceNote}</p>
          <a href="${PRICING}" class="s-link">See ${site.city} drain cleaning prices ${icon("arrow")}</a>
        </div>
      </div>
    </div>
  </section>

  <section class="section section--alt">
    <div class="container">
      ${sectionHead({ eyebrow: "Explore More", h2: "Related Drain Services" })}
      ${serviceCards(related.map((r) => ({ ...r, short: r.related })), { withImg: false })}
    </div>
  </section>

${ctaStrip(s.cta)}`;
  pages.push({
    file: `${s.slug}.html`,
    html: layout({
      path: "/" + s.slug,
      title: s.title,
      description: s.metaDescription,
      body,
      schema: [serviceLd(s), crumbsLd([["Home", "/"], ["Services", "/services"], [s.name, "/" + s.slug]])],
    }),
  });
}

// Gallery
{
  const g = site.gallery;
  const body = `${pageHero(g.h1, [["Home", "/"], ["Gallery", "/gallery"]])}

  <section class="section">
    <div class="container">
      ${sectionHead(g.head)}
      ${galleryGrid(g.items)}
    </div>
  </section>

  <section class="section section--alt">
    <div class="container">
      ${sectionHead(g.ba)}
      ${beforeAfter(g.ba)}
      ${g.ba2 ? beforeAfter(g.ba2) : ""}
    </div>
  </section>

${ctaStrip(g.cta)}`;
  pages.push({ file: "gallery.html", html: layout({ path: "/gallery", title: g.title, description: g.description, body, schema: [crumbsLd([["Home", "/"], ["Gallery", "/gallery"]])] }) });
}

// Pricing comparison
{
  const P = site.pricing;
  const pg = site.pricingPage;
  const v = site.video;
  const crumbs = [["Home", "/"], [pg.crumb, PRICING]];
  const body = `${pageHero(pg.h1, crumbs)}

  <section class="tldr-bar">
    <div class="container">
      <p class="tldr"><b>TLDR:</b> ${pg.tldr} <a href="#video">Watch the breakdown ${icon("down")}</a></p>
    </div>
  </section>

  <section class="section">
    <div class="container split">
      <div class="prose reveal">
        <span class="eyebrow">${pg.intro.eyebrow}</span>
        <h2>${pg.intro.h2}</h2>
        ${pg.intro.paras.map((t) => `<p>${t}</p>`).join("\n        ")}
        ${ticks(pg.intro.points)}
        ${arrowBtn("/contact", "Get My Free Estimate")}
      </div>
      <div class="reveal">${img(pg.intro.img)}</div>
    </div>
  </section>

  <section class="section section--navy" id="video">
    <div class="container video-grid">
      <div class="reveal">
        <span class="eyebrow eyebrow--light">Watch The Video</span>
        <h2>${pg.video.h2}</h2>
        ${pg.video.paras.map((t) => `<p>${t}</p>`).join("\n        ")}
        <ul class="video-facts">
          <li><b>${money(P.start)}</b><span>Drain cleaning starts at</span></li>
          <li><b>${money(P.snake)}</b><span>Basic drain snaking</span></li>
        </ul>
      </div>
      ${videoEmbed(v)}
    </div>
  </section>

  <section class="section section--alt" id="pricing">
    <div class="container">
      ${sectionHead(pg.tiersHead)}
      <div class="price-grid">
        ${P.tiers
          .map(
            (t) => `<article class="p-card${t.featured ? " featured" : ""} reveal">
          ${t.featured ? '<span class="p-flag">Most Common</span>' : ""}
          <h3>${t.name}</h3>
          <p class="p-lead">${t.lead}</p>
          <div class="p-price">${t.price}</div>
          <span class="p-note">${t.note}</span>
          <ul>
            ${t.items.map((i) => `<li>${icon("check")}<span>${i}</span></li>`).join("\n            ")}
          </ul>
          ${arrowBtn("/contact", "Quote This Job", t.featured ? "btn btn--primary" : "btn btn--ghost")}
        </article>`
          )
          .join("\n        ")}
      </div>
      <p class="compare-foot">${pg.tiersFoot}</p>
    </div>
  </section>

  <section class="section" id="comparison">
    <div class="container">
      ${sectionHead(pg.compareHead)}
      <div class="compare-wrap reveal">
        <table class="compare-table">
          <thead><tr><th>Drain Job</th><th>Published ${site.compareCity} Average</th><th>${B.short}</th></tr></thead>
          <tbody>
            ${P.compare
              .map(
                (r) => `<tr>
              <td data-label="Drain Job"><b>${r.job}</b>${r.sub ? `<small>${r.sub}</small>` : ""}</td>
              <td data-label="Published ${site.compareCity} Average">${r.avg}</td>
              <td data-label="${B.short}"><b>${r.ours}</b>${r.oursSub ? `<small>${r.oursSub}</small>` : ""}</td>
            </tr>`
              )
              .join("\n            ")}
          </tbody>
        </table>
      </div>
      <p class="compare-foot">${pg.compareFoot}</p>
    </div>
  </section>

  <section class="section section--alt">
    <div class="container split">
      <div class="prose reveal">
        <span class="eyebrow">Nights &amp; Weekends</span>
        <h2>${pg.afterHours.h2}</h2>
        ${pg.afterHours.paras.map((t) => `<p>${t}</p>`).join("\n        ")}
        <div class="compare-wrap compare-wrap--tight">
          <table class="compare-table">
            <thead><tr><th>When You Call</th><th>After-Hours Fee</th></tr></thead>
            <tbody>
              ${P.afterHours.map(([w, f]) => `<tr><td data-label="When You Call"><b>${w}</b></td><td data-label="After-Hours Fee">${f}</td></tr>`).join("\n              ")}
            </tbody>
          </table>
        </div>
      </div>
      <div class="reveal">${img(pg.afterHours.img)}</div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      ${sectionHead(pg.factors)}
      ${steps(pg.factors.items, false)}
    </div>
  </section>

  <section class="section section--alt">
    <div class="container split">
      <div class="reveal">${img(pg.addOns.img)}</div>
      <div class="prose reveal">
        <span class="eyebrow">Add-Ons</span>
        <h2>${pg.addOns.h2}</h2>
        <p>${pg.addOns.p}</p>
        ${ticks(pg.addOns.items, "plus")}
        <p>${pg.addOns.after}</p>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      ${sectionHead(pg.savings)}
      ${steps(pg.savings.items)}
    </div>
  </section>

  <section class="section section--alt">
    <div class="container">
      ${sectionHead({ eyebrow: "FAQ", h2: pg.faqH2 })}
      <div class="faq">
        ${pg.faqs.map((f, i) => `<details class="reveal"${i === 0 ? " open" : ""}><summary>${f.q}</summary><p>${f.a}</p></details>`).join("\n        ")}
      </div>
    </div>
  </section>

${ctaStrip(pg.cta)}`;

  const videoLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: v.title,
    description: v.description,
    thumbnailUrl: [abs(IMG.videoThumb.src), `https://i.ytimg.com/vi/${v.id}/maxresdefault.jpg`],
    embedUrl: `https://www.youtube.com/embed/${v.id}`,
    url: `https://www.youtube.com/watch?v=${v.id}`,
    ...(v.uploadDate ? { uploadDate: v.uploadDate } : {}),
    ...(v.duration ? { duration: v.duration } : {}),
    publisher: { "@type": "Organization", name: v.channel, url: v.channelUrl },
  };
  const offerLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `Drain Cleaning in ${site.city}, ${site.state}`,
    serviceType: "Drain Cleaning",
    provider: { "@id": abs("/#business") },
    areaServed: { "@type": "City", name: `${site.city}, ${site.state}` },
    offers: [
      { "@type": "Offer", name: "Drain cleaning", priceCurrency: "USD", priceSpecification: { "@type": "PriceSpecification", minPrice: P.start, priceCurrency: "USD" } },
      { "@type": "Offer", name: "Basic drain snaking", price: P.snake, priceCurrency: "USD" },
    ],
  };
  pages.push({
    file: `${P.slug}.html`,
    html: layout({ path: PRICING, title: pg.title, description: pg.description, body, schema: [faqLd(pg.faqs), videoLd, offerLd, crumbsLd(crumbs)] }),
  });
}

// Contact
{
  const c = site.contact;
  const body = `${pageHero(c.h1, [["Home", "/"], ["Contact", "/contact"]])}

  <section class="section">
    <div class="container contact-grid">
      <div class="prose reveal">
        <span class="eyebrow">Free Estimates</span>
        <h2>${c.h2}</h2>
        ${c.paras.map((t) => `<p>${t}</p>`).join("\n        ")}
        <ul class="info-list">
          <li>${icon("clock")}<div><b>Hours</b><span>Open 24 hours, 7 days a week</span></div></li>
          <li>${icon("moon")}<div><b>After-hours fees</b><span>None until 8 p.m., weekends included</span></div></li>
          <li>${icon("clipboard")}<div><b>Estimates</b><span>Free and upfront, before any work starts</span></div></li>
          <li>${icon("route")}<div><b>Service area</b><span>${site.areas.join(", ")}</span></div></li>
          <li>${icon("heart")}<div><b>Community discounts</b><span>Teachers, seniors, military &amp; law enforcement</span></div></li>
        </ul>
      </div>
      ${form(`New drain cleaning request — ${site.domain} (Contact page)`, { idPrefix: "contact", head: { h2: "Request Your Free Estimate", p: c.formP } })}
    </div>
  </section>`;
  pages.push({ file: "contact.html", html: layout({ path: "/contact", title: c.title, description: c.description, body, schema: [crumbsLd([["Home", "/"], ["Contact", "/contact"]])] }) });
}

// Thank you (form redirect target when JavaScript is off)
pages.push({
  file: "thank-you.html",
  noindex: true,
  html: layout({
    path: "/thank-you",
    title: `Thank You | ${B.name}`,
    description: "Your request was sent. We'll be in touch shortly.",
    noindex: true,
    body: `${pageHero("Thanks, Your Request Was Sent", [["Home", "/"], ["Thank You", "/thank-you"]])}
  <section class="section"><div class="container narrow center-text">
    <p class="lead-dark">We got your message and will reach out shortly with next steps and an upfront price. If water is backing up right now, avoid running sinks, showers, the dishwasher and the washer until the line is cleared.</p>
    <div class="center-btn">${arrowBtn("/", "Back To Home", "btn btn--ghost")} ${arrowBtn(PRICING, "See Pricing")}</div>
  </div></section>`,
  }),
});

// 404
pages.push({
  file: "404.html",
  noindex: true,
  html: layout({
    path: "/404",
    title: `Page Not Found | ${B.name}`,
    description: "That page doesn't exist.",
    noindex: true,
    body: `${pageHero("Page Not Found", [["Home", "/"], ["404", "/404"]])}
  <section class="section"><div class="container narrow center-text">
    <p class="lead-dark">That page isn't here. Try one of these instead:</p>
    <div class="center-btn">${arrowBtn("/services", "Our Services", "btn btn--ghost")} ${arrowBtn(PRICING, "Pricing", "btn btn--ghost")} ${arrowBtn("/contact", "Free Estimate")}</div>
  </div></section>`,
  }),
});

// ---------- write ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(STATIC, OUT, { recursive: true });
for (const p of pages) fs.writeFileSync(path.join(OUT, p.file), p.html);

const indexable = pages.filter((p) => !p.noindex);
const locFor = (file) => (file === "index.html" ? abs("/") : abs("/" + file.replace(/\.html$/, "")));
fs.writeFileSync(
  path.join(OUT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable.map((p) => `  <url><loc>${locFor(p.file)}</loc><lastmod>${TODAY}</lastmod></url>`).join("\n")}
</urlset>
`
);
fs.writeFileSync(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${abs("/sitemap.xml")}\n`);
fs.writeFileSync(
  path.join(OUT, "_headers"),
  `/images/*\n  Cache-Control: public, max-age=2592000\n/css/*\n  Cache-Control: public, max-age=31536000, immutable\n/js/*\n  Cache-Control: public, max-age=31536000, immutable\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n`
);
console.log(`Built ${pages.length} pages for ${site.domain} into public/`);
