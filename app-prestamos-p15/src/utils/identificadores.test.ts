import test from "node:test";
import assert from "node:assert/strict";
import { generarIdentificadores } from "./identificadores.ts";

test("continúa la numeración respetando el ancho escrito", () => {
  assert.deepEqual(generarIdentificadores("REM-001", 3), ["REM-001", "REM-002", "REM-003"]);
});

test("un código sin dígitos arranca su propia serie", () => {
  assert.deepEqual(generarIdentificadores("REM", 2), ["REM-001", "REM-002"]);
});

test("no rellena de más cuando el usuario no usó ceros", () => {
  assert.deepEqual(generarIdentificadores("LAT-9", 3), ["LAT-9", "LAT-10", "LAT-11"]);
});

test("sin código base las unidades quedan sin identificador", () => {
  assert.deepEqual(generarIdentificadores("  ", 2), [null, null]);
});

test("cantidad inválida sigue dando una unidad", () => {
  assert.deepEqual(generarIdentificadores("CAM-1", 0), ["CAM-1"]);
});
