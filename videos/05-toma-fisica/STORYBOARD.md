---
format: 1920x1080
duration: 189s
message: "La toma física permite saber qué hay, dónde está y qué falta de verdad, con evidencia firmada para Patrimonio"
arc: Alcance → Campaña → Ensayo → Área → Escaneo → Incidencias → Cierre del área → Reporte → Principio
audience: La persona administradora del inventario de la Preparatoria 15
mode: autonomous
music: calm
---

## Frame 1 — Portada
- scene: Logo P15 y título "Toma física de inventario"; subtítulo "Video 5 de 6 · Para quien administra"
- duration: 7s
- poster: 4s
- transition_in: cut
- status: outline
- type: hook
- persuasion: Direct address
- beat: orientación
- blueprint: titlecard-reveal
- asset_candidates: public/logo-p15.png
- sfx: soft-riser
- voiceover: "Este video es para quien administra el inventario. Vamos a cuadrar el estante contra la app."
- src: compositions/frames/01-portada.html

narrativeRole: Delimita audiencia y promete el resultado práctico.
keyMessage: Este recorrido convierte el estante real en evidencia dentro de la app.

## Frame 2 — Para qué sirve
- scene: Estante con equipos frente a una tabla de inventario con 120 registros y preguntas sobre presencia y ubicación
- duration: 16s
- poster: 9s
- transition_in: crossfade
- status: outline
- type: pain_point
- persuasion: Question→answer pairing + concretization
- beat: curiosidad y claridad
- blueprint: comparison-split
- asset_candidates:
- sfx: whoosh-soft, tick
- voiceover: "La app dice que la prepa tiene ciento veinte equipos. ¿Siguen ahí? ¿En la misma aula? La toma física es caminar el edificio con la pistola y contestar eso con nombre y fecha."
- src: compositions/frames/02-para-que-sirve.html

narrativeRole: Abre la brecha entre el inventario registrado y la realidad del edificio.
keyMessage: La toma física responde presencia y ubicación con responsable y fecha.

## Frame 3 — Dónde está
- scene: Ruta sintética Inicio → Acceso Admin P15 → segunda pestaña Toma de inventario
- duration: 7s
- poster: 4s
- transition_in: push-slide LEFT
- status: outline
- type: feature_showcase
- persuasion: Signposting
- beat: orientación
- blueprint: cursor-ui-demo
- asset_candidates:
- sfx: click-soft, key-tap
- voiceover: "Entra como administrador con tu código y tu PIN, y abre la segunda pestaña: Toma de inventario."
- src: compositions/frames/03-donde-esta.html

narrativeRole: Ubica el flujo y elimina la ambigüedad de acceso.
keyMessage: La toma física vive en la segunda pestaña del panel Admin.

## Frame 4 — La campaña
- scene: Métricas, panel "La campaña", botón "Iniciar campaña nueva" y confirmación literal; contadores vuelven a cero
- duration: 18s
- poster: 11s
- transition_in: cut
- status: outline
- type: feature_showcase
- persuasion: Before/after + causal chain
- beat: comprensión
- blueprint: cursor-ui-demo
- asset_candidates:
- sfx: click-soft, chime-soft
- voiceover: "Una campaña es un recorrido completo del edificio. Antes de empezar uno nuevo, toca “Iniciar campaña nueva”: el conteo vuelve a cero, pero no se borra nada. Es un solo clic de confirmación, así que léelo antes de aceptar."
- src: compositions/frames/04-campana.html

narrativeRole: Define la unidad de trabajo y corrige el miedo a borrar inventario.
keyMessage: Iniciar campaña reinicia el conteo, no borra datos, y usa una sola confirmación.

## Frame 5 — Ensayar sin miedo
- scene: Toggle "Modo prueba · no guarda nada" y lista de capacidades que quedan desactivadas
- duration: 10s
- poster: 6s
- transition_in: crossfade
- status: outline
- type: benefit_highlight
- persuasion: Contrast
- beat: confianza con límite
- blueprint: panel-edit-live-sync
- asset_candidates:
- sfx: click-soft, scanner-success-high
- voiceover: "Si es tu primera vez, prende el modo prueba: escanea y suena igual, pero no marca nada. Para todo lo demás, apágalo."
- src: compositions/frames/05-modo-prueba.html

narrativeRole: Permite practicar sin confundir el ensayo con el flujo completo.
keyMessage: El modo prueba solo ensaya el escaneo; no liga, no da de alta ni decide faltantes.

## Frame 6 — Elegir el área
- scene: Chips "Donde estuviste", elección de Aula 12 y contraste con tres variantes escritas; la barra lateral desaparece
- duration: 16s
- poster: 9s
- transition_in: push-slide LEFT
- status: outline
- type: feature_showcase
- persuasion: Comparison of options + counterexample
- beat: previsión
- blueprint: fixed-anchor-cycle
- asset_candidates:
- sfx: click-soft, warning-soft
- voiceover: "El área se elige una sola vez, no equipo por equipo. Usa los botones de donde ya estuviste: escribirla a mano termina en “Aula doce”, “aula doce” y “Aula12”, tres aulas distintas para la app."
- src: compositions/frames/06-elegir-area.html

narrativeRole: Evita duplicar ubicaciones por diferencias de escritura.
keyMessage: Elegir un área reciente mantiene una sola ubicación coherente para todo el recorrido.

## Frame 7 — El disparo
- scene: Pistola sobre etiqueta, código entra solo, tono agudo de 880 Hz, destello verde y tarjeta "Anotado en Aula 12"
- duration: 13s
- poster: 7s
- transition_in: cut
- status: outline
- type: feature_showcase
- persuasion: Demonstration + causal chain
- beat: confianza operativa
- blueprint: camera-journey
- asset_candidates:
- sfx: scanner-success-high, whoosh-soft, pop-soft
- voiceover: "Ahora es apuntar y disparar. Cada escaneo deja escrito qué equipo es, quién lo vio, cuándo, y en qué aula estaba. Sin teclear y sin cambiar de pantalla."
- src: compositions/frames/07-disparo.html

narrativeRole: Demuestra la acción repetitiva central y su evidencia automática.
keyMessage: Un disparo registra equipo, responsable, momento y área sin usar el teclado.

## Frame 8 — Se movió
- scene: Tarjeta naranja "Se movió: Proyector Epson" con Aula 8 → Aula 12
- duration: 10s
- poster: 6s
- transition_in: crossfade
- status: outline
- type: social_proof
- persuasion: Before/after
- beat: resolución
- blueprint: comparison-split
- asset_candidates:
- sfx: scanner-success-high, whoosh-soft
- voiceover: "Y si estaba registrado en otra aula, te lo dice: se movió, de dónde, a dónde. Se corrige con solo escanearlo aquí."
- src: compositions/frames/08-se-movio.html

narrativeRole: Convierte una discrepancia de ubicación en una corrección verificable.
keyMessage: Escanear en el área correcta actualiza la ubicación y conserva el origen del movimiento.

## Frame 9 — Repetido y deshacer
- scene: Segundo disparo produce tono grave y tarjeta "Repetido"; un escaneo equivocado se deshace antes de que desaparezca la tarjeta
- duration: 14s
- poster: 8s
- transition_in: cut
- status: outline
- type: feature_showcase
- persuasion: Demonstration + contrast
- beat: control
- blueprint: cursor-ui-demo
- asset_candidates:
- sfx: scanner-warning-low, click-soft, tick
- voiceover: "Si disparas dos veces sobre lo mismo, avisa y no pasa nada. Y si le atinaste a la etiqueta equivocada, “Deshacer” lo regresa como estaba; apúrate, la tarjeta dura dos segundos."
- src: compositions/frames/09-repetido-deshacer.html

narrativeRole: Enseña dos recuperaciones distintas sin prometer un deshacer permanente.
keyMessage: Repetir no escribe otra vez; un escaneo equivocado se revierte dentro de una ventana breve.

## Frame 10 — La pistola disparando al vacío
- scene: El campo pierde foco; franja literal de advertencia y botón "Recuperarlo"
- duration: 14s
- poster: 8s
- transition_in: blur-crossfade
- status: outline
- type: pain_point
- persuasion: Stakes + demonstration
- beat: alerta y resolución
- blueprint: cursor-ui-demo
- asset_candidates:
- sfx: scanner-warning-low, warning-soft, click-soft
- voiceover: "Ojo con esto: si el cursor se sale del campo, la pistola dispara y no se guarda nada. La app te avisa. Si ves esa franja, toca “Recuperarlo” antes de seguir."
- src: compositions/frames/10-foco-perdido.html

narrativeRole: Hace visible el único fallo silencioso capaz de invalidar un recorrido completo.
keyMessage: La franja de foco perdido exige recuperar el campo antes de volver a escanear.

## Frame 11 — Ligar un equipo existente
- scene: Panel "Nadie reclama este código", buscador de candidatos y botón "Es este"
- duration: 9s
- poster: 5s
- transition_in: push-slide LEFT
- status: outline
- type: feature_showcase
- persuasion: Question→answer pairing
- beat: diagnóstico
- blueprint: panel-edit-live-sync
- asset_candidates:
- sfx: scanner-warning-low, key-tap, click-soft
- voiceover: "A veces la etiqueta no corresponde a nada. Si el equipo ya existe pero sin etiqueta, búscalo y liga las dos cosas."
- src: compositions/frames/11-ligar-equipo.html

narrativeRole: Resuelve una etiqueta huérfana sin duplicar un equipo que ya existe.
keyMessage: Primero hay que buscar y ligar el registro existente.

## Frame 12 — Dar de alta en el momento
- scene: Opción "No es ninguno", alta corta "¿Qué es?" + "Categoría" y avisos "Entra como solo inventario" / "Editarlo completo"
- duration: 8s
- poster: 5s
- transition_in: push-slide LEFT
- status: outline
- type: feature_showcase
- persuasion: Progressive disclosure
- beat: resolución
- blueprint: panel-edit-live-sync
- asset_candidates:
- sfx: click-soft, key-tap, chime-soft
- voiceover: "Y si nunca se dio de alta, lo das de alta ahí mismo, sin soltar la pistola."
- src: compositions/frames/12-alta-al-vuelo.html

narrativeRole: Enseña la segunda salida del mismo código desconocido.
keyMessage: Solo si no existe, se crea como equipo nuevo y entra como solo inventario.

## Frame 13 — Cuándo terminar el área
- scene: Columna "Deberían estar aquí" baja de 5 a 0; un equipo sin etiqueta se marca con "Sí está"
- duration: 12s
- poster: 7s
- transition_in: crossfade
- status: outline
- type: benefit_highlight
- persuasion: Demonstration + distillation
- beat: certeza
- blueprint: dataviz-countup
- asset_candidates:
- sfx: tick, chime-soft
- voiceover: "La columna de la derecha es lo que debería estar en esta aula. Cuando se vacía, terminaste. Sin esa lista, uno dispara hasta que se cansa."
- src: compositions/frames/13-terminar-area.html

narrativeRole: Sustituye el cansancio subjetivo por un criterio de terminación observable.
keyMessage: El área termina cuando la lista de pendientes queda vacía.

## Frame 14 — Lo que no apareció
- scene: Cierre de Aula 12, dos faltantes y decisión "No localizada"; comparación S / N / vacío firmada
- duration: 19s
- poster: 11s
- transition_in: cut
- status: outline
- type: branding
- persuasion: Comparison of three states + causal chain
- beat: responsabilidad
- blueprint: comparison-split
- asset_candidates:
- sfx: click-soft, chime-soft
- voiceover: "Antes de irte, la app te pregunta por lo que no apareció. Decídelo aquí, parado en el aula. “No localizada” es una afirmación con tu nombre y la fecha: la buscaste y no estaba. Dejarlo pendiente dice otra cosa: que nadie llegó todavía."
- src: compositions/frames/14-no-aparecio.html

narrativeRole: Explica el significado administrativo de decidir o dejar pendiente.
keyMessage: No localizada es una búsqueda firmada; vacío significa que nadie llegó todavía.

## Frame 15 — El reporte
- scene: "Exportar reporte", carpeta reportes se abre sola y CSV en Excel con Localizado S / N / vacío
- duration: 12s
- poster: 7s
- transition_in: push-slide UP
- status: outline
- type: cta
- persuasion: Demonstration + payoff
- beat: satisfacción
- blueprint: camera-journey
- asset_candidates:
- sfx: click-soft, folder-open, chime-soft
- voiceover: "Al terminar, exporta el reporte. Se guarda solo, la carpeta se abre sola, y el archivo se abre en Excel con las mismas columnas que usa Patrimonio."
- src: compositions/frames/15-reporte.html

narrativeRole: Entrega el artefacto que convierte el recorrido en trabajo útil para Patrimonio.
keyMessage: El reporte se guarda, abre su carpeta y conserva las columnas esperadas por Patrimonio.

## Frame 16 — Cierre
- scene: Logo P15 y principio "Saber qué hay, dónde está, y qué falta de verdad"; pie "¿Hiciste la toma en otra computadora? Video 6."
- duration: 4s
- poster: 2.5s
- transition_in: crossfade
- status: outline
- type: branding
- persuasion: Distillation + callback
- beat: resolución
- blueprint: logo-assemble-lockup
- asset_candidates: public/logo-p15.png
- sfx: soft-outro
- voiceover:
- src: compositions/frames/16-cierre.html

narrativeRole: Resume el propósito y enlaza el siguiente tutorial.
keyMessage: La toma física distingue existencia, ubicación y ausencia real.
