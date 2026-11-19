// Fails when any Playwright spec calls waitForTimeout (R26.4). Run: npm run check:no-wait-for-timeout
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../e2e/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const offenders = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(ts|js|mjs)$/.test(name) && /\bwaitForTimeout\s*\(/.test(readFileSync(path, "utf8"))) offenders.push(path);
  }
})(root);

if (offenders.length) {
  console.error(`waitForTimeout is not allowed in E2E tests:\n${offenders.join("\n")}`);
  process.exit(1);
}
console.log("OK: no waitForTimeout in e2e/");
