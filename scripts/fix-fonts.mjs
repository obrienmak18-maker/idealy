import { readFileSync, writeFileSync } from "fs";
let c = readFileSync("app/globals.css", "utf8");
const fontImport = '@import url("https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap");\r\n';
if (!c.includes("fonts.googleapis.com")) {
  c = fontImport + c;
  console.log("Font import added");
} else {
  console.log("Already present");
}
c = c.replace('var(--font-geist-sans), ui-sans-serif', '"Inter", ui-sans-serif');
c = c.replace('var(--font-geist-mono), "JetBrains Mono"', '"JetBrains Mono"');
writeFileSync("app/globals.css", c);
console.log("Done — font-family updated to Inter + JetBrains Mono");
