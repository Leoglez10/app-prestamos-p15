# Relevo de toma física entre dos computadoras

La máquina principal sigue prestando mientras una segunda computadora camina el
edificio con la pistola. Al final los dos trabajos se juntan sin que ninguno
pierda nada.

---

## ⚠️ Pendiente de configuración (NO está hecho todavía)

- [ ] **En Drive for Desktop, espejar también la carpeta `reportes/`.**

  Hoy solo está espejada `backups/`. El reporte de la toma física **no se guarda
  ahí**: `guardar_reporte_inventario` (`src-tauri/src/lib.rs`) lo escribe en
  `app_data_root/reportes/`, que es una carpeta **hermana**, no una subcarpeta.
  Sin este paso el archivo nunca llega a la otra máquina.

  Hay que agregar las dos carpetas **por separado** en Drive:

  ```
  <app_data_root>/backups     ← ya está
  <app_data_root>/reportes    ← falta
  ```

  **Nunca espejar la carpeta padre.** Ahí vive la base viva `prestamos.db` con
  sus archivos `-wal` y `-shm`. Drive sube archivos enteros sin saber si SQLite
  está a la mitad de una transacción, y eso corrompe la base.

> Este pendiente se marca como hecho **solo** cuando la persona que configura
> Drive lo confirme. No darlo por hecho.

---

## Las dos piezas, y por qué no son intercambiables

| | Qué es | Qué hace al entrar | Cuándo se usa |
|---|---|---|---|
| **Respaldo `.db`** | La base completa | **Reemplaza todo** | Una sola vez, al montar la segunda computadora |
| **Reporte `.csv`** | El resultado del recorrido | **Fusiona** | Cada vez que la segunda computadora termina |

El respaldo **no sirve para devolver el trabajo**. `restore_from_bytes`
(`src-tauri/src/lib.rs`) sobrescribe la base entera: mandar el `.db` de la
segunda máquina de vuelta borraría todos los préstamos que la principal
registró mientras tanto. Para volver, solo el CSV.

---

## El flujo

### Día 0 — montar la segunda computadora

1. Instalar la app.
2. Abrir la carpeta de Drive y restaurar el respaldo más nuevo.
3. Listo: esa máquina tiene el inventario completo.

El reemplazo total no molesta acá porque la segunda máquina está vacía. No hay
nada que perder.

### Durante la campaña

- La segunda computadora recorre el edificio y escribe en su propia base.
- La principal presta normal.
- **Ninguna de las dos restaura nada.** Si a mitad de campaña alguien restaura un
  respaldo fresco en la segunda máquina, se pierde todo lo que escaneó.

### Al terminar (o al final de cada día)

1. En la segunda computadora: **Exportar reporte**. Cae en `reportes/`.
2. Drive lo sincroniza (ver el pendiente de arriba).
3. En la principal: pestaña **Toma de inventario** → **Traer la toma física de
   otra computadora** → elegir el CSV.
4. Se ve la vista previa. Nada se escribe hasta confirmar.

---

## Qué escribe la fusión, exactamente

Solo cinco columnas de `inventario`:

- `revisado_en`, `revisado_por`
- `no_localizado_en`, `no_localizado_por`
- `ubicacion`

Los préstamos no comparten ninguna. **Por eso las dos máquinas pueden trabajar
al mismo tiempo sin pisarse.**

### Las reglas

Gana el dato más nuevo **equipo por equipo**, no archivo por archivo. Esa es toda
la diferencia con restaurar un respaldo.

| En el reporte | Qué pasa |
|---|---|
| `Localizado = S` más nuevo que lo guardado | Marca revisado, actualiza ubicación, borra el "no apareció" |
| `Localizado = N` más nuevo que lo guardado | Marca no localizado |
| Timestamp igual o más viejo que lo guardado | No se toca nada |
| `Localizado` vacío | No se toca nada: nadie llegó todavía a ese equipo |
| Un equipo que la principal vio *después* | Gana la principal: el equipo está ahí |

Consecuencias que importan:

- **Importar el mismo archivo dos veces no cambia nada.** Es idempotente.
- **Un reporte viejo no puede pisar un recorrido más reciente.**
- Se hace un respaldo automático antes de escribir, y todo va en una sola
  transacción: no existe la fusión a medias.

---

## Lo que NO hace

- **No crea equipos.** Los que la segunda máquina dio de alta al vuelo salen
  listados aparte, para darlos de alta a mano. El reporte no trae la categoría, y
  elegirla automáticamente sería adivinar.
- **No machea filas sin etiqueta de Patrimonio.** El granel no tiene con qué
  identificarse; se cuentan y se ignoran.
- **No permite que las dos computadoras presten a la vez.** Eso necesita un
  servidor de verdad, y hoy no hace falta.

---

## Dónde vive el código

| Pieza | Archivo |
|---|---|
| Reglas de fusión (puras, con tests) | `src/utils/reporteTomaFisica.ts` |
| Tests | `src/utils/reporteTomaFisica.test.ts` |
| Escritura en la base | `aplicarFusionReporte` en `src/hooks/useInventory.ts` |
| Pantalla | `src/components/ImportarReportePanel.tsx` |
| Exportación del reporte | `construirReporteCsv` en `src/utils/tomaFisica.ts` |

El test **"lo que exporta una máquina es exactamente lo que la otra puede
fusionar"** cubre el contrato completo de ida y vuelta. Si ese test cae, el
relevo está roto.
