// Makes the scrambled code the Call Now buttons use, so the real number never goes in the repo or the site.
//   node scripts/encode-phone.mjs "(319) 555-0123"
// Paste the printed code into site.config.mjs as `callCode`, then rebuild.
// CALL_KEY must match the one in static/js/main.js.
const CALL_KEY = "dcp-tel-26";

const input = process.argv[2];
if (!input) {
  console.error('Usage: node scripts/encode-phone.mjs "(319) 555-0123"');
  process.exit(1);
}
let digits = input.replace(/[^\d]/g, "");
if (digits.length === 10) digits = "1" + digits;
if (digits.length !== 11 || !digits.startsWith("1")) {
  console.error("Expected a 10-digit US number.");
  process.exit(1);
}
const number = "+" + digits;
const code = Buffer.from([...number].map((ch, i) => ch.charCodeAt(0) ^ CALL_KEY.charCodeAt(i % CALL_KEY.length)))
  .toString("base64").split("").reverse().join("");
console.log(code);
