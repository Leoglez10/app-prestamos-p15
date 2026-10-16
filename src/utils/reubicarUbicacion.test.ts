import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { estaDentroDe } from "./tomaFisica.ts";
import { crearServicioReubicacion, type BaseReubicacion, type OperacionUbicacion, type PlanCambioUbicacion } from "./reubicarUbicacion.ts";

test("renombrar actualiza el subárbol con un nombre normalizado y conserva todo lo demás", async () => {
  const f = fixture();
  const before = await f.rows();
  const plan = await f.service.previsualizarCambio("SITE 1 / Almacén", { tipo: "renombrar", nombre: " Bodega   central " });
  assert.equal(f.count(), 0);
  assert.equal(plan.destino, "SITE 1 / Bodega central");
  assert.deepEqual(plan.cambios.map((c) => c.despues), ["SITE 1 / Bodega central", "SITE 1 / Bodega central / Cajón A / Nivel 2"]);
  await f.service.aplicar(plan, { confirmado: true, prueba: false });
  assert.equal(f.count(), 1);
  assert.deepEqual(await f.rows(), before.map((row) => ({ ...row, ubicacion: plan.cambios.find((c) => c.id === row.id)?.despues ?? row.ubicacion })));
  f.sqlite.close();
});

test("eliminar traslada equipos directos y subniveles al destino existente sin eliminar filas", async () => {
  const f = fixture();
  f.sqlite.exec("INSERT INTO inventario (id, nombre_equipo, ubicacion, estado, observaciones) VALUES (6, 'Equipo en destino', 'SITE 2', 'prestado', 'conservar')");
  const before = await f.rows();
  const plan = await f.service.previsualizarCambio("SITE 1 / Almacén", { tipo: "eliminar", destino: "SITE 2" });
  assert.equal(f.count(), 0);
  assert.deepEqual(plan.cambios.map((c) => c.despues), ["SITE 2", "SITE 2 / Cajón A / Nivel 2"]);
  await f.service.aplicar(plan, { confirmado: true, prueba: false });
  assert.equal(f.count(), 1);
  assert.doesNotMatch(f.statements[0], /\bDELETE\b/i);
  assert.deepEqual(await f.rows(), before.map((row) => ({ ...row, ubicacion: plan.cambios.find((c) => c.id === row.id)?.despues ?? row.ubicacion })));
  f.sqlite.close();
});

test("renombrar permite corregir solo mayúsculas y rechaza vacíos, rutas, no-op y hermanos inferidos", async () => {
  const f = fixture();
  f.sqlite.exec("INSERT INTO inventario (id, nombre_equipo, ubicacion, estado) VALUES (6, 'Hermano', 'SITE 1 / Bodega / Hoja', 'baja')");
  const before = await f.rows();
  for (const [nombre, message] of [
    ["", "Escribe el nombre del lugar."],
    ["   ", "Escribe el nombre del lugar."],
    ["Nuevo / Nombre", "Escribe solo un nombre, sin /; agrega cada nivel por separado."],
    [" Almacén ", "El lugar ya tiene ese nombre."],
    ["bodega", "Ya existe una ubicación con ese nombre en el destino. No se pueden combinar."],
  ]) {
    await assert.rejects(f.service.previsualizarCambio("SITE 1 / Almacén", { tipo: "renombrar", nombre }), { message });
    assert.equal(f.count(), 0);
    assert.equal(f.mutations(), 0);
    assert.deepEqual(await f.rows(), before);
  }
  const plan = await f.service.previsualizarCambio("SITE 1 / Almacén", { tipo: "renombrar", nombre: "ALMACÉN" });
  await f.service.aplicar(plan, { confirmado: true, prueba: false });
  assert.equal(f.mutations(), 2);
  assert.deepEqual(await f.rows(), before.map((row) => ({ ...row, ubicacion: plan.cambios.find((c) => c.id === row.id)?.despues ?? row.ubicacion })));
  f.sqlite.close();
});

test("renombrar rechaza un alias sin cambios reales y conserva corrección de mayúsculas con replay protegido", async () => {
  const f = fixture();
  f.sqlite.exec(`UPDATE inventario SET ubicacion = 'P / Shelf' WHERE id = 1;
    UPDATE inventario SET ubicacion = 'P / Shelf / Niño Azul / C1' WHERE id = 2;`);
  const totalChanges = async () => (await f.db.select<Array<{ total: number }>>("SELECT total_changes() AS total"))[0].total;
  const before = await f.rows();
  const initialTotal = await totalChanges();
  await assert.rejects(
    crearServicioReubicacion(f.db).previsualizarCambio("P / shelf", { tipo: "renombrar", nombre: "Shelf" }),
    { message: "El lugar ya tiene ese nombre." }
  );
  assert.equal(f.count(), 0);
  assert.equal(f.mutations(), 0);
  assert.equal(await totalChanges(), initialTotal);
  assert.deepEqual(await f.rows(), before);

  const plan = await crearServicioReubicacion(f.db).previsualizarCambio("P / shelf", { tipo: "renombrar", nombre: "SHELF" });
  assert.deepEqual(plan.cambios.map((change) => [change.antes, change.despues]), [
    ["P / Shelf", "P / SHELF"],
    ["P / Shelf / Niño Azul / C1", "P / SHELF / Niño Azul / C1"],
  ]);
  await crearServicioReubicacion(f.db).aplicar(plan, { confirmado: true, prueba: false });
  const after = await f.rows();
  assert.deepEqual(after, before.map((row) => ({ ...row, ubicacion: plan.cambios.find((change) => change.id === row.id)?.despues ?? row.ubicacion })));
  assert.equal(f.count(), 1);
  assert.equal(f.mutations(), 2);
  assert.equal(await totalChanges(), initialTotal + 2);
  await assert.rejects(
    crearServicioReubicacion(f.db).aplicar(plan, { confirmado: true, prueba: false }),
    { message: STALE }
  );
  assert.equal(f.count(), 2);
  assert.equal(f.mutations(), 2);
  assert.equal(await totalChanges(), initialTotal + 2);
  assert.deepEqual(await f.rows(), after);
  f.sqlite.close();
});

test("eliminar admite un ancestro y equipos ya presentes en ese destino, conservando los sufijos", async () => {
  const f = fixture();
  f.sqlite.exec("INSERT INTO inventario (id, nombre_equipo, ubicacion, estado) VALUES (6, 'Equipo del padre', 'SITE 1', 'disponible')");
  const before = await f.rows();
  const plan = await f.service.previsualizarCambio("SITE 1 / Almacén", { tipo: "eliminar", destino: "SITE 1" });
  assert.deepEqual(plan.cambios.map((c) => c.despues), ["SITE 1", "SITE 1 / Cajón A / Nivel 2"]);
  await f.service.aplicar(plan, { confirmado: true, prueba: false });
  assert.equal(f.mutations(), 2);
  assert.deepEqual(await f.rows(), before.map((row) => ({ ...row, ubicacion: plan.cambios.find((c) => c.id === row.id)?.despues ?? row.ubicacion })));
  f.sqlite.close();
});

test("eliminar rechaza destino vacío/inexistente, ciclos y colisiones de ramas inferidas", async () => {
  const f = fixture();
  f.sqlite.exec("INSERT INTO inventario (id, nombre_equipo, ubicacion, estado) VALUES (6, 'Conflicto', 'SITE 2 / cajón a / Otra hoja', 'disponible')");
  const before = await f.rows();
  for (const [destino, message] of [
    ["", "Elige un destino existente para trasladar los equipos."],
    ["No existe", "Elige un destino existente para trasladar los equipos."],
    ["SITE 1 / ALMACÉN", "El destino no puede ser el lugar ni uno de sus subniveles."],
    ["SITE 1 / Almacén / Cajón A", "El destino no puede ser el lugar ni uno de sus subniveles."],
    ["SITE 2", "Un subnivel ya existe en el destino. Elige otro lugar para evitar combinarlos."],
  ]) {
    await assert.rejects(f.service.previsualizarCambio("SITE 1 / Almacén", { tipo: "eliminar", destino }), { message });
    assert.equal(f.count(), 0);
    assert.equal(f.mutations(), 0);
    assert.deepEqual(await f.rows(), before);
  }
  f.sqlite.close();
});

test("eliminar no permite que un sufijo recree el prefijo eliminado al trasladarlo al ancestro", async () => {
  const f = fixture();
  f.sqlite.exec("INSERT INTO inventario (id, nombre_equipo, ubicacion, estado) VALUES (6, 'Repetido', 'SITE 1 / Almacén / Almacén / Hoja', 'disponible')");
  const before = await f.rows();
  await assert.rejects(f.service.previsualizarCambio("SITE 1 / Almacén", { tipo: "eliminar", destino: "SITE 1" }), { message: "Los subniveles volverían a crear el lugar eliminado. Elige otro destino." });
  assert.equal(f.count(), 0);
  assert.equal(f.mutations(), 0);
  assert.deepEqual(await f.rows(), before);
  f.sqlite.close();
});

for (const operation of [
  { tipo: "renombrar", nombre: "Bodega" },
  { tipo: "eliminar", destino: "SITE 2" },
] satisfies OperacionUbicacion[]) {
  test(`${operation.tipo}: admite raíz inferida y conserva sufijos con su escritura original`, async () => {
    const f = fixture();
    const before = await f.rows();
    const plan = await f.service.previsualizarCambio("SITE 1", operation);
    const prefix = operation.tipo === "renombrar" ? "Bodega" : "SITE 2";
    assert.deepEqual(plan.cambios.map((c) => c.despues), [`${prefix} / Almacén`, `${prefix} / almacén / Cajón A / Nivel 2`]);
    await f.service.aplicar(plan, { confirmado: true, prueba: false });
    const after = await f.rows();
    assert.deepEqual(after, before.map((row) => ({ ...row, ubicacion: plan.cambios.find((c) => c.id === row.id)?.despues ?? row.ubicacion })));
    assert.equal(after.some((row) => estaDentroDe(row.ubicacion as string | null, "SITE 1")), false);
    assert.equal(f.count(), 1);
    assert.equal(f.mutations(), 2);
    assert.doesNotMatch(f.statements[0], /DELETE|BEGIN|COMMIT/);
    f.sqlite.close();
  });

  test(`${operation.tipo}: rechaza origen inválido, cancelación, práctica y operación desconocida sin ejecutar`, async () => {
    const f = fixture();
    const before = await f.rows();
    for (const source of ["", " / ", "No existe"]) {
      await assert.rejects(f.service.previsualizarCambio(source, operation), { message: "Elige una ubicación existente." });
    }
    for (const invalid of [null, undefined, { tipo: "otro" }, { tipo: "renombrar", nombre: 42 }, { tipo: "eliminar", destino: 42 }]) {
      await assert.rejects(f.service.previsualizarCambio("SITE 1", invalid as unknown as OperacionUbicacion), { message: "La operación de ubicación no es válida." });
    }
    const plan = await f.service.previsualizarCambio("SITE 1 / Almacén", operation);
    await assert.rejects(f.service.aplicar(plan, { confirmado: false, prueba: false }), { message: "Confirma el cambio antes de guardar." });
    await assert.rejects(f.service.aplicar(plan, { confirmado: true, prueba: true }), { message: "Modo prueba: no se pueden reorganizar ubicaciones." });
    assert.equal(f.count(), 0);
    assert.equal(f.mutations(), 0);
    assert.deepEqual(await f.rows(), before);
    f.sqlite.close();
  });

  test(`${operation.tipo}: no acepta ediciones de operación, snapshot, destino, nombre o cambios`, async () => {
    const f = fixture();
    const before = await f.rows();
    const edits: Array<(plan: PlanCambioUbicacion) => void> = [
      (plan) => { plan.operacion = plan.operacion.tipo === "renombrar" ? { tipo: "eliminar", destino: "SITE 2" } : { tipo: "renombrar", nombre: "Bodega" }; },
      (plan) => { plan.destino = "Ajeno"; },
      (plan) => { plan.origen = "SITE 10 / Almacén"; },
      (plan) => { plan.padre = "Otro padre"; },
      (plan) => { plan.inventario[0].ubicacion = "Sitio editado"; },
      (plan) => { plan.inventario.pop(); },
      (plan) => { plan.cambios[0].despues = "Sitio editado"; },
      (plan) => { plan.cambios[0].antes = "SITE 1 / Almacén"; },
      (plan) => { if (plan.operacion.tipo === "renombrar") plan.operacion.nombre = "Otro nombre"; else plan.operacion.destino = "SITE 10"; },
    ];
    for (const edit of edits) {
      const plan = await f.service.previsualizarCambio("SITE 1 / Almacén", operation);
      edit(plan);
      await assert.rejects(f.service.aplicar(plan, { confirmado: true, prueba: false }), { message: "La vista previa no es válida. Vuelve a generarla." });
      assert.equal(f.count(), 0);
      assert.equal(f.mutations(), 0);
      assert.deepEqual(await f.rows(), before);
    }
    const plan = await f.service.previsualizarCambio("SITE 1 / Almacén", operation);
    plan.operacion = { tipo: "otro" } as unknown as OperacionUbicacion;
    await assert.rejects(f.service.aplicar(plan, { confirmado: true, prueba: false }), { message: "La operación de ubicación no es válida." });
    assert.equal(f.count(), 0);
    assert.deepEqual(await f.rows(), before);
    f.sqlite.close();
  });

  for (const mutation of [
    "INSERT INTO inventario (id, nombre_equipo, ubicacion) VALUES (6, 'Nuevo', NULL)",
    "DELETE FROM inventario WHERE id = 3",
    "UPDATE inventario SET ubicacion = ' SITE 1 / Almacén ' WHERE id = 1",
  ]) {
    test(`${operation.tipo}: snapshot obsoleto (${mutation.split(" ")[0]}) no muta filas`, async () => {
      const f = fixture();
      const plan = await f.service.previsualizarCambio("SITE 1 / Almacén", operation);
      let expected = await f.rows();
      f.race(async () => { f.sqlite.exec(mutation); expected = await f.rows(); });
      await assert.rejects(f.service.aplicar(plan, { confirmado: true, prueba: false }), { message: STALE });
      assert.equal(f.count(), 1);
      assert.equal(f.mutations(), 0);
      assert.deepEqual(await f.rows(), expected);
      f.sqlite.close();
    });
  }

  test(`${operation.tipo}: replay obsoleto y trigger ABORT no producen cambios adicionales`, async () => {
    const f = fixture();
    const before = await f.rows();
    const plan = await f.service.previsualizarCambio("SITE 1 / Almacén", operation);
    f.sqlite.exec("CREATE TRIGGER stop_change BEFORE UPDATE ON inventario WHEN OLD.id = 2 BEGIN SELECT RAISE(ABORT, 'bloqueado'); END");
    await assert.rejects(f.service.aplicar(plan, { confirmado: true, prueba: false }), { message: "No se guardó la reorganización: bloqueado" });
    assert.equal(f.count(), 1);
    assert.equal(f.mutations(), 0);
    assert.deepEqual(await f.rows(), before);
    f.sqlite.close();

    const replay = fixture();
    const preview = await replay.service.previsualizarCambio("SITE 1 / Almacén", operation);
    // El hook crea un servicio por llamada: el preview sigue siendo verificable.
    await crearServicioReubicacion(replay.db).aplicar(preview, { confirmado: true, prueba: false });
    const after = await replay.rows();
    await assert.rejects(replay.service.aplicar(preview, { confirmado: true, prueba: false }), { message: STALE });
    assert.equal(replay.count(), 2);
    assert.equal(replay.mutations(), 2);
    assert.deepEqual(await replay.rows(), after);
    replay.sqlite.close();
  });
}

const STALE = "El inventario cambió. Vuelve a generar la vista previa.";
const fixture = () => {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`CREATE TABLE inventario (id INTEGER PRIMARY KEY, nombre_equipo TEXT, ubicacion TEXT, estado TEXT, observaciones TEXT, revisado_en TEXT DEFAULT '2026-01-01', revisado_por TEXT DEFAULT 'Admin');
    INSERT INTO inventario (id, nombre_equipo, ubicacion, estado, observaciones) VALUES
    (1, 'PC', ' SITE 1/ Almacén ', 'disponible', 'nota'),
    (2, 'Monitor', 'site 1 / almacén / Cajón A / Nivel 2', 'prestado', 'otra'),
    (3, 'Otro', 'SITE 10 / Almacén', 'baja', NULL),
    (4, 'Destino', 'SITE 2 / Oficina', 'disponible', NULL),
    (5, 'Vacío', NULL, 'disponible', NULL);`);
  let executes = 0;
  let mutations = 0;
  const statements: string[] = [];
  let beforeExecute: () => void | Promise<void> = () => {};
  const db: BaseReubicacion = {
    select: async <T>(sql: string) => sqlite.prepare(sql).all().map((row) => ({ ...row })) as T,
    execute: async (sql, binds) => {
      executes++;
      statements.push(sql);
      await beforeExecute();
      const rowsAffected = Number(sqlite.prepare(sql).run(...binds).changes);
      mutations += rowsAffected;
      return { rowsAffected };
    },
  };
  return {
    sqlite, db, service: crearServicioReubicacion(db),
    rows: () => db.select<Array<Record<string, unknown>>>("SELECT * FROM inventario ORDER BY id"),
    count: () => executes, mutations: () => mutations, statements,
    race: (change: () => void | Promise<void>) => { beforeExecute = change; },
  };
};

test("preview no escribe; confirma origen y descendientes en un UPDATE y conserva sufijos/campos ajenos", async () => {
  const f = fixture();
  const before = await f.rows();
  const plan = await f.service.previsualizar("SITE 1 / Almacén", "SITE 2");
  assert.equal(f.count(), 0);
  assert.equal(plan.destino, "SITE 2 / Almacén");
  assert.deepEqual(plan.cambios.map((c) => [c.id, c.antes, c.despues]), [
    [1, " SITE 1/ Almacén ", "SITE 2 / Almacén"],
    [2, "site 1 / almacén / Cajón A / Nivel 2", "SITE 2 / Almacén / Cajón A / Nivel 2"],
  ]);
  await f.service.aplicar(plan, { confirmado: true, prueba: false });
  assert.equal(f.count(), 1);
  assert.equal((f.statements[0].match(/\bUPDATE\b/g) ?? []).length, 1);
  assert.doesNotMatch(f.statements[0], /\bBEGIN\b|\bCOMMIT\b/);
  assert.match(f.statements[0], /MATERIALIZED/);
  const after = await f.rows();
  assert.deepEqual(after, before.map((row) => ({ ...row, ubicacion: plan.cambios.find((c) => c.id === row.id)?.despues ?? row.ubicacion })));
  f.sqlite.close();
});

test("mueve ancestro inferido y permite Sin padre sin confundir SITE 1 con SITE 10", async () => {
  const f = fixture();
  const inferred = await f.service.previsualizar("SITE 1", "SITE 2");
  assert.equal(inferred.cambios.length, 2);
  assert.equal(inferred.destino, "SITE 2 / SITE 1");
  const root = await f.service.previsualizar("SITE 1 / Almacén", "");
  await f.service.aplicar(root, { confirmado: true, prueba: false });
  assert.equal((await f.rows())[1].ubicacion, "Almacén / Cajón A / Nivel 2");
  assert.equal((await f.rows())[2].ubicacion, "SITE 10 / Almacén");
  f.sqlite.close();
});

test("rechaza inválidos, no-op, ciclos y colisiones inferidas sin ejecutar ni alterar filas", async () => {
  const f = fixture();
  const before = await f.rows();
  for (const [source, parent, message] of [
    [" / ", "SITE 2", "Elige una ubicación existente."],
    ["No existe", "SITE 2", "Elige una ubicación existente."],
    ["SITE 1", "No existe", "Elige un padre existente o Sin padre."],
    ["SITE 1", "SITE 1", "El padre no puede ser la ubicación ni uno de sus subniveles."],
    ["SITE 1", "site 1 / ALMACÉN", "El padre no puede ser la ubicación ni uno de sus subniveles."],
    ["SITE 1", "", "La ubicación ya pertenece a ese padre."],
    ["SITE 1 / Almacén", "SITE 1", "La ubicación ya pertenece a ese padre."],
    ["SITE 1 / Almacén", "SITE 10", "Ya existe una ubicación con ese nombre en el destino. No se pueden combinar."],
  ]) {
    await assert.rejects(f.service.previsualizar(source, parent), { message });
    assert.deepEqual(await f.rows(), before);
    assert.equal(f.count(), 0);
  }
  f.sqlite.close();
});

test("cancelación y modo prueba no ejecutan; rechaza planes alterados", async () => {
  const f = fixture();
  const before = await f.rows();
  const plan = await f.service.previsualizar("SITE 1", "SITE 2");
  for (const options of [{ confirmado: false, prueba: false }, { confirmado: true, prueba: true }]) {
    await assert.rejects(f.service.aplicar(plan, options), { message: options.prueba ? "Modo prueba: no se pueden reorganizar ubicaciones." : "Confirma el cambio antes de guardar." });
  }
  const changed = { ...plan, cambios: plan.cambios.map((c) => ({ ...c, despues: "Ruta ajena" })) };
  await assert.rejects(f.service.aplicar(changed, { confirmado: true, prueba: false }), { message: "La vista previa no es válida. Vuelve a generarla." });
  const duplicate = { ...plan, inventario: [...plan.inventario, plan.inventario[0]] };
  await assert.rejects(f.service.aplicar(duplicate, { confirmado: true, prueba: false }), { message: "El inventario contiene identificadores inválidos o duplicados." });
  assert.equal(f.count(), 0);
  assert.deepEqual(await f.rows(), before);
  f.sqlite.close();
});

for (const [name, mutation] of [
  ["inserción", "INSERT INTO inventario (id, nombre_equipo, ubicacion, estado, observaciones) VALUES (6, 'Nuevo', 'SITE 2 / Almacén', 'disponible', NULL)"],
  ["inserción sin ubicación", "INSERT INTO inventario (id, nombre_equipo, ubicacion, estado, observaciones) VALUES (6, 'Sin lugar', NULL, 'disponible', NULL)"],
  ["borrado", "DELETE FROM inventario WHERE id = 3"],
  ["cambio de ubicación ajena", "UPDATE inventario SET ubicacion = 'Cambio' WHERE id = 3"],
  ["cambio raw del origen", "UPDATE inventario SET ubicacion = 'SITE 1 / Almacén' WHERE id = 1"],
  ["cambio NULL a vacío", "UPDATE inventario SET ubicacion = '' WHERE id = 5"],
] as const) {
  test(`snapshot obsoleto por ${name}: cero cambios incluso entre preview y UPDATE`, async () => {
    const f = fixture();
    const plan = await f.service.previsualizar("SITE 1", "SITE 2");
    let expected = await f.rows();
    f.race(async () => { f.sqlite.exec(mutation); expected = await f.rows(); });
    await assert.rejects(f.service.aplicar(plan, { confirmado: true, prueba: false }), { message: STALE });
    assert.equal(f.count(), 1);
    assert.deepEqual(await f.rows(), expected);
    f.sqlite.close();
  });
}

test("trigger ABORT revierte toda la sentencia; no hay fallback por filas", async () => {
  const f = fixture();
  f.sqlite.exec("CREATE TRIGGER stop_move BEFORE UPDATE ON inventario WHEN OLD.id = 2 BEGIN SELECT RAISE(ABORT, 'movimiento bloqueado'); END");
  const before = await f.rows();
  const plan = await f.service.previsualizar("SITE 1", "SITE 2");
  await assert.rejects(f.service.aplicar(plan, { confirmado: true, prueba: false }), { message: "No se guardó la reorganización: movimiento bloqueado" });
  assert.equal(f.count(), 1);
  assert.deepEqual(await f.rows(), before);
  f.sqlite.close();
});

test("conteo inesperado falla cerrado sin una segunda ejecución", async () => {
  const f = fixture();
  const before = await f.rows();
  let calls = 0;
  const service = crearServicioReubicacion({ ...f.db, execute: async () => { calls++; return { rowsAffected: 1 }; } });
  const plan = await service.previsualizar("SITE 1", "SITE 2");
  await assert.rejects(service.aplicar(plan, { confirmado: true, prueba: false }), { message: "No se pudo verificar el cambio completo. Recarga el inventario antes de continuar." });
  assert.equal(calls, 1);
  assert.deepEqual(await f.rows(), before);
  f.sqlite.close();
});

test("SQL no soportado falla sin fallback ni mutación", async () => {
  const f = fixture();
  const before = await f.rows();
  let calls = 0;
  const service = crearServicioReubicacion({ ...f.db, execute: async () => { calls++; throw new Error('near MATERIALIZED: syntax error'); } });
  const plan = await service.previsualizar("SITE 1", "SITE 2");
  await assert.rejects(service.aplicar(plan, { confirmado: true, prueba: false }), { message: "No se guardó la reorganización: near MATERIALIZED: syntax error" });
  assert.equal(calls, 1);
  assert.deepEqual(await f.rows(), before);
  f.sqlite.close();
});
