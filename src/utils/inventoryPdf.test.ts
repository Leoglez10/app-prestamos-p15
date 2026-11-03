import test from "node:test";
import assert from "node:assert/strict";
import { buildInventoryPdfTable } from "./inventoryPdf.ts";

const options = {
  includeIdentifier: true,
  includeCategory: true,
  includeLoanType: true,
  includeResponsible: true,
  includeStock: true,
};
const equipment = (ubicacion: string | null) => ({
  nombre_equipo: "Laptop",
  marca: "Dell",
  modelo: "Latitude",
  identificador: "001",
  id_patrimonial: "00042",
  categoria_nombre: "Cómputo",
  estado: "disponible",
  es_prestable: 1,
  categoria_es_prestable: 1,
  prestamo_activo_profe: null,
  es_granel: 0,
  stock_disponible: 1,
  stock_total: 1,
  ubicacion,
});

// The renderer only reads these fields; no database or Tauri runtime is involved.
const render = (items: ReturnType<typeof equipment>[], config = options, limit?: number) =>
  buildInventoryPdfTable(items as Parameters<typeof buildInventoryPdfTable>[0], config, limit);

const cells = (markup: string, tag: string) =>
  [...markup.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g"))].map((match) => match[1]);

test("inventory PDF includes the assigned location for each equipment", () => {
  const markup = render([equipment("SITE 2 / Anaquel 1"), equipment("Aula 12")]);
  const headers = cells(markup, "th");
  const rows = [...markup.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].slice(1);
  assert.ok(headers.includes("Ubicación"));
  assert.equal(cells(rows[0][1], "td")[headers.indexOf("Ubicación")], "SITE 2 / Anaquel 1");
  assert.equal(cells(rows[1][1], "td")[headers.indexOf("Ubicación")], "Aula 12");
  for (const row of rows) assert.equal(cells(row[1], "td").length, headers.length);
});

test("missing locations use a dash and location text is escaped", () => {
  for (const location of [null, ""]) {
    const markup = render([equipment(location)]);
    assert.equal(cells(markup, "td")[cells(markup, "th").indexOf("Ubicación")], "-");
  }
  const markup = render([equipment('Aula <A> & "B"')]);
  assert.ok(markup.includes("Aula &lt;A&gt; &amp; &quot;B&quot;"));
  assert.ok(!markup.includes("Aula <A>"));
});

test("existing report columns and optional-column behavior remain intact", () => {
  const markup = render([equipment("Aula 12")]);
  assert.deepEqual(cells(markup, "th").filter((value) => value !== "Ubicación"), [
    "Equipo", "Categoría", "Préstamo", "Estado", "Responsable actual", "Stock",
  ]);
  assert.deepEqual(cells(markup, "td").filter((value) => value !== "Aula 12"), [
    'Laptop<br /><span class="muted">Dell · Latitude · 001 · 00042</span>',
    "Cómputo", "Prestable", "disponible", "-", "1",
  ]);
  const minimal = render([equipment("Aula 12")], {
    includeIdentifier: false, includeCategory: false, includeLoanType: false,
    includeResponsible: false, includeStock: false,
  });
  assert.ok(!minimal.includes("Dell"));
  assert.deepEqual(cells(minimal, "th").filter((value) => value !== "Ubicación"), ["Equipo", "Estado"]);
  assert.equal(cells(minimal, "td").length, cells(minimal, "th").length);
});

test("preview limits rows with aligned notice while printing includes every location", () => {
  const items = Array.from({ length: 26 }, (_, i) => equipment(`Aula ${i + 1}`));
  const preview = render(items, options, 25);
  assert.ok(preview.includes("<td>Aula 25</td>"));
  assert.ok(!preview.includes("<td>Aula 26</td>"));
  assert.ok(preview.includes(`colspan="${cells(preview, "th").length}"`));
  assert.ok(preview.includes("mostrando 25 de 26 equipos. El PDF incluye todos."));
  const full = render(items);
  assert.ok(full.includes("<td>Aula 26</td>"));
  assert.ok(!full.includes("Vista previa:"));
});
