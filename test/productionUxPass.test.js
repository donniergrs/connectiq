import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public legacy routes redirect to the AI Advisor", async () => {
  const app = await read("src/App.jsx");
  assert.match(app, /path="\/availability" element=\{<Navigate to="\/advisor" replace \/>\}/);
  assert.match(app, /path="\/contact" element=\{<Navigate to="\/advisor" replace \/>\}/);
  assert.match(app, /path="\/internet" element=\{<Navigate to="\/advisor" replace \/>\}/);
});

test("homepage customer calls to action open the AI Advisor", async () => {
  const home = await read("src/pages/Home.jsx");
  assert.equal((home.match(/to="\/advisor"/g) || []).length, 3);
  assert.doesNotMatch(home, /to="\/contact"|to="\/availability"/);
});

test("public navigation exposes the AI Advisor directly", async () => {
  const layout = await read("src/layouts/PublicLayout.jsx");
  assert.match(layout, /<Link to="\/advisor">Check Availability<\/Link>/);
  assert.match(layout, /<Link to="\/advisor">AI Advisor<\/Link>/);
});
