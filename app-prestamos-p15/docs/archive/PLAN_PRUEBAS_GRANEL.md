# Plan de Pruebas Manuales - Gestión de Equipos por Granel (Bulk)

## Resumen de Cambios Implementados

### 1. **Base de Datos (Migraciones)**
- ✅ Nuevas columnas: `es_granel` (INTEGER, default 0) y `stock_total` (INTEGER, default 1)
- ✅ Lógica de disponibilidad: Cálculo dinámico `stock_disponible = stock_total - COUNT(préstamos activos)`
- ✅ Migración: Equipos previos siguen siendo únicos (es_granel = 0)

### 2. **Panel de Administración (Admin.tsx)**
- ✅ Switch/Checkbox: "¿Es equipo por cantidad (granel)?"
- ✅ Condicionado: Si es granel → Se oculta "Identificador" y se muestra "Cantidad Total"
- ✅ Tabla: Muestra "X / Y disponibles" para granel, "Estado" para únicos
- ✅ Acciones: Solo "Devolver" y "Marcar Perdido" para equipos únicos (no para granel)

### 3. **Kiosko de Préstamos (Kiosk.tsx)**
- ✅ Mostrar contador "Disponibles: X" para equipos a granel
- ✅ Si stock = 0 → Mostrar "❌ Agotado" y deshabilitar botón
- ✅ Carrito permite múltiples unidades del mismo cable (ej: [2, 2, 2])
- ✅ Validación: No permite solicitar más que stock disponible

### 4. **Lógica de Devolución**
- ✅ Para equipos ÚNICOS: Estado → 'disponible'
- ✅ Para equipos GRANEL: Estado permanece 'disponible' (no cambia)

---

## Plan de Verificación: Paso a Paso

### **FASE 1: Inicialización y Migración**

#### Test 1.1: Verificar Migraciones
1. Inicia la app (npm run tauri dev)
2. Abre la DevTools / Consola (F12)
3. Verifica que NO hay errores de "ALTER TABLE" fallidos
4. **Esperado:** Salida limpia, sin errores


#### Test 1.2: Verificar Datos Existentes
1. Ve a Admin > Tabla de Inventario
2. **Esperado:** Los equipos existentes muestran:
   - "S/N" en la línea pequeña (no "Granel")
   - Estado: "disponible" o "prestado"
   - Sin números de stock visibles

---

### **FASE 2: Crear Equipo a Granel en Admin**

#### Test 2.1: Registrar Extensión USB de 5m
1. Ve a **Admin Panel > Formulario lateral**
2. Rellena:
   - **Categoría:** (elige cualquiera, o crea "Cables/Adaptadores")
   - **Nombre:** "Extensión USB 5m"
   - ✅ Marca el checkbox: "¿Es equipo por cantidad (granel)?"
3. Verifica que:
   - El campo "Identificador / QR" **desaparece**
   - Aparece el campo "Cantidad Total" = 10
4. Click **"Registrar"**
5. **Esperado:** En la tabla aparece la fila con:
   - Nombre: "Extensión USB 5m"
   - Subtítulo: "Granel" (en gris)
   - Estado: **"10 / 10 disponibles"** (azul)
   - No aparecen botones "Devolver" ni "Marcar Perdido"

#### Test 2.2: Editar y Cambiar Cantidad
1. Click en **"Editar"** del equipo que creaste
2. Verifica que:
   - El checkbox "es_granel" está ✅ marcado
   - El campo "Cantidad Total" muestra: 10
3. Cambiar a: 15
4. Click **"Actualizar"**
5. **Esperado:** La tabla ahora muestra "15 / 15 disponibles"

---

### **FASE 3: Préstamo en Kiosko (Múltiples Cables)**

#### Test 3.1: Profesor Pide 3 Extensiones
1. Ve a **Kiosk**
2. Ingresa código de profesor: **"2958101"** (Edgar Ivan)
3. Click **"Confirmar Login"**
4. Selecciona categoría donde está la Extensión USB
5. Verifica que la tarjeta del cable muestra:
   - Nombre: "Extensión USB 5m"
   - Badge: **"Disponibles: 15"** (azul)
   - Botón: Habilitado
6. Presiona el botón del cable **3 veces** (tres clicks)
7. Verifica el carrito: **"Llevar (3)"**
8. Click **"Confirmar y Llevar (3)"**
9. **Esperado:**
   - Mensajito de éxito: "✨ ¡Préstamo registrado exitosamente! (3 equipos)"
   - En "Mis Préstamos Activos" aparecen **3 filas** (una por cada cable)
   - Cada fila muestra: "Extensión USB 5m" + fecha

#### Test 3.2: Verificar Stock en Admin
1. Ve a **Admin > Tabla**
2. Busca la Extensión USB
3. **Esperado:** Ahora muestra **"12 / 15 disponibles"** (se restaron los 3 préstamos activos)
4. El badge es azul (no agotado)

---

### **FASE 4: Devolución Parcial**

#### Test 4.1: Devolver 1 Cable en Kiosk
1. Vuelve a **Kiosk**
2. En "Mis Préstamos Activos", busca la Extensión USB
3. Haz click en **"Devolver"** en la primera fila de los 3 cables
4. Aparece popup: "¿En qué condición entregas el equipo?"
5. Escribe: **"Excelente"**
6. Click OK en el siguiente popup (notas opcionales)
7. **Esperado:**
   - La fila desaparece de "Mis Préstamos"
   - Quedan 2 filas del cable activas
   - Mensaje: "✅ ¡Devolución exitosa!"

#### Test 4.2: Verificar Stock Actualizado
1. Ve a **Admin > Tabla**
2. Busca la Extensión USB
3. **Esperado:** Ahora muestra **"13 / 15 disponibles"** (15 total - 2 préstamos activos)

#### Test 4.3: Devolver 2 Cables Restantes
1. Vuelve a **Kiosk**
2. Devuelve los 2 cables restantes (uno por uno)
3. Después de cada devolución, verifica que desaparecen de "Mis Préstamos"
4. **Esperado:**
   - Finalmente: 0 préstamos activos del cable
   - Admin muestra: **"15 / 15 disponibles"** (stock restaurado)

---

### **FASE 5: Agotamiento de Stock**

#### Test 5.1: Agotar el Cable
1. Profesor A pide **15 extensiones** (todas las disponibles)
   - Presiona el botón del cable 15 veces
2. Click **"Confirmar y Llevar (15)"**
3. **Esperado:**
   - Préstamo registrado
   - Admin muestra: **"0 / 15 disponibles"**
   - Kiosk muestra el badge: **"❌ Agotado"** (rojo)
   - El botón está **deshabilitado**

#### Test 5.2: Profesor No Puede Pedir Más
1. Intenta presionar el botón del cable agotado
   - **Esperado:** Botón está deshabilitado (no responde)

#### Test 5.3: Devolución Permite Nuevo Préstamo
1. Profesor A devuelve 5 cables
2. Espera a que se actualice
3. Vuelve a Kiosk
4. **Esperado:**
   - Badge: **"Disponibles: 5"** (azul)
   - Botón: Habilitado
   - Puede volver a solicitar

---

### **FASE 6: Validaciones de Negocio**

#### Test 6.1: Stock Insuficiente
1. Profesor intenta pedir 10 cables pero solo hay 5 disponibles
2. Intenta presionar 10 veces el botón
3. Si intenta confirmar con más de lo disponible (si aplicara)
   - **Esperado:** Mensaje de error: "Stock insuficiente para equipo ID X. Solicitados: 10, Disponibles: 5"

#### Test 6.2: Equipo Único No Puede Ser Prestado Dos Veces
1. Intenta crear un equipo ÚNICO (sin marcar "granel") ej: "Laptop Dell"
2. Profesor A lo pide
3. Profesor B intenta pedirlo
   - **Esperado:** En Kiosk muestra "prestado" (gris), botón deshabilitado
   - Admin muestra: "A: NombreProfesor" (a quién lo tiene)

---

### **FASE 7: Panel de Reportes (Verificación Adicional)**

#### Test 7.1: Verificar Historial de Préstamos
1. Ve a **Admin > Reportes**
2. Busca registros del cable por:
   - Profesor
   - Equipo: "Extensión USB"
   - Estado: 'activo' o 'devuelto'
3. **Esperado:**
   - Si hay 5 préstamos activos del cable (5 filas)
   - Cada fila representa una unidad individual
   - Cada fila tiene su propia fecha de salida/retorno

---

## Checklist Final

- [ ] **Migración:** Las columnas `es_granel` y `stock_total` existen sin errores
- [ ] **Admin - Crear:** Se puede marcar equipo como "granel"
- [ ] **Admin - Editar:** Se puede cambiar la cantidad total
- [ ] **Admin - Tabla:** Muestra "X / Y disponibles" correctamente
- [ ] **Kiosk - Catálogo:** Muestra "Disponibles: X" para granel
- [ ] **Kiosk - Agotado:** Muestra "❌ Agotado" cuando stock = 0
- [ ] **Kiosk - Carrito:** Permite agregar el mismo cable múltiples veces
- [ ] **Kiosk - Validación:** No permite solicitar más que stock disponible
- [ ] **Devolución:** Cada cable es un registro individual (posibilidad de devolución parcial)
- [ ] **Stock Dinámico:** Se actualiza correctamente al devolver
- [ ] **Admin - Reportes:** Muestra múltiples filas para el mismo cable/profesor

---

## Notas Importantes

1. **Equipos Únicos vs. Granel:**
   - Únicos: `es_granel = 0`, estado físico importante, 1 registro en BD = 1 objeto
   - Granel: `es_granel = 1`, stock dinámico, 5 registros en BD = 5 objetos del mismo tipo

2. **Cálculo de Stock:**
   ```
   Stock Disponible = stock_total - COUNT(prestamos con estado_prestamo = 'activo')
   ```

3. **Devolución Parcial:**
   - Cada cable es un registro separado → puedes devolver 1, 2, o 5 a la vez
   - Ideal para casos donde varios profesores tienen el mismo cable

4. **No hay "Forzar Devolución" General para Granel:**
   - Los botones "Devolver" / "Marcar Perdido" solo aparecen en Admin para equipos únicos
   - Para granel, la gestión de pérdidas se hace a nivel de registro individual en Reportes

---

## Si Algo Falla...

- Revisa la consola (F12) para errores SQL
- Verifica que `prestamos.estado_prestamo` está en la BD (migración ejecutada)
- Limpia el cache del navegador (Ctrl+Shift+Del)
- Si todo falla, resetea: elimina `prestamos.db` y reinicia

**¡Pruebas completadas cuando todos los checkboxes estén marcados!** ✅
