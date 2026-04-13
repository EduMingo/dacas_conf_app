# PRD - Configurador de Stock Rápido

## Problema original
Micro-app single page para configurar stock rápido con flujo de proyecto + marca + BOM dinámico + resumen + envío por WhatsApp.

## Requerimientos ampliados vigentes
- App adaptativa para móvil y ordenador.
- BOM técnico coherente:
  - 1 bobina = 305 m
  - máximo 100 m por punto
  - 2 jacks por punto
  - 1 faceplate por punto
  - 2 patch cords por punto
  - 1 patchera cada 24 puntos
- Reglas por proyecto:
  - Oficina = Cat 6 / Cat 6A
  - CCTV = ahora puede trabajar con Cat 5e, Cat 6 o Cat 6A según la selección del usuario
  - Data Center = solo Cat 6A
- PDF para visualizar y luego adjuntar manualmente.
- Posibilidad de personalizar el pedido agregando items del stock según la marca seleccionada.
- Visualización del stock por marca con búsqueda y categorías.
- En PDF final deben salir SKU, descripción y cantidad.

## Decisiones de arquitectura
- Frontend React responsive con panel lateral en escritorio y resumen inferior en móvil.
- Backend FastAPI con `/api/configurator`, que entrega catálogo técnico + `inventory_by_brand`.
- El stock se clasifica por marca, categoría y familia técnica desde el Excel local.
- Las sugerencias automáticas del BOM se calculan desde `technical_rule`.
- Los items manuales se agregan desde el stock visible de la marca seleccionada.
- PDF generado con jsPDF en una tabla única ordenada por categoría.
- WhatsApp mantiene ventana de revisión previa con selección/deselección de items.
- Para CCTV, la familia técnica se resuelve en frontend con selector explícito (Cat 5e / Cat 6 / Cat 6A) usando el stock real de la marca elegida.

## User personas
- Vendedor técnico móvil que arma pedidos rápidos.
- Preventa/comercial que necesita ver stock y personalizar el BOM desde ordenador.
- Usuario no técnico que necesita una experiencia clara y guiada.

## Requisitos centrales
- Selector de proyecto y marca.
- Uso del Excel como fuente principal.
- Bobina principal coherente por proyecto/marca.
- Accesorios mostrados como sugerencia cuando se selecciona una bobina.
- Explorar stock de la marca y agregar items manualmente.
- Generar PDF con SKU, descripción y cantidad.
- Enviar por WhatsApp desde una revisión final.

## Implementado
### 2026-04-10
- Se añadió selector de familia para CCTV con opciones Cat 5e, Cat 6 y Cat 6A.
- Ahora CCTV puede mostrar bobina compatible cuando el usuario elige Cat 6 o Cat 6A y existe stock real en la marca seleccionada.
- La disponibilidad de las marcas en CCTV se actualiza dinámicamente según la familia elegida.
- Se mantuvieron el stock manual por marca, las sugerencias automáticas, el PDF con SKU/descripcion/cantidad y la revisión previa por WhatsApp.

## Backlog priorizado
### P0
- Definir criterio comercial para bundles parciales vs completos cuando falten accesorios técnicos.
- Revisar familias faltantes para CCTV y CommScope si se quiere ampliar cobertura real.

### P1
- Mejorar diseño comercial del PDF (logo real, encabezado de presupuesto, observaciones).
- Mostrar alertas cuando la cantidad manual o sugerida supere el stock disponible.
- Permitir ordenar o destacar stock por relevancia comercial.

### P2
- Historial de pedidos generados.
- Configuración editable de reglas técnicas por marca/proyecto.
- Exportaciones adicionales.

## Próximas tareas
- Confirmar si querés dejar Cat 6 como valor inicial fijo para CCTV o si preferís otro default.
- Dar formato comercial final al PDF.
- Ajustar el catálogo si vas a cargar más stock CCTV o CommScope.

### 2026-04-10 - Logos integrados
- Se integró el logo de DACAS en el encabezado principal del configurador.
- Se integraron los logos de Siemon, Panduit y CommScope dentro de los botones de selección de marca.
- Se mantuvo el mismo flujo funcional y se validó visualmente la carga correcta de los logos en la interfaz.

### 2026-04-10 - Logos sin fondo
- Se generaron versiones transparentes del logo de empresa y de las marcas para usarlas dentro de la interfaz.

### 2026-04-10 - PDF y WhatsApp enriquecidos
- Se agregó el logo de la empresa dentro del PDF generado.
- Se unificó el marco y medida visual de los logos de marcas en los botones.
- El mensaje de WhatsApp ahora incluye SKU junto al nombre y cantidad de cada item.

### 2026-04-13 - Configurador de preventa
- Se reemplazó el flujo por un configurador consultivo basado en preguntas cortas: proyecto, tipo de instalación, marca, cantidad de puntos, familia técnica y longitudes de patch cord.
- El BOM ahora se calcula con criterios de preventa (LPC por proyecto, 10% desperdicio, bobinas 305m, jacks con 5% de reserva, paneles de 24 puertos por modularidad y organizadores).
- El sistema cruza el BOM contra stock real, mantiene extras manuales por marca, genera PDF con notas de ingeniería y arma WhatsApp con SKU.

### 2026-04-13 - Wizard guiado + metros
- Se convirtió el flujo en un asistente en la misma página con desbloqueo secuencial real, incluyendo confirmación explícita de la cantidad de puntos antes de avanzar a la marca.
- Se cambió la visualización de patch cords de ft a metros en la interfaz, PDF y mensaje de WhatsApp, manteniendo la lógica interna de compatibilidad.

### 2026-04-13 - Stock desde Google Drive
- Se reemplazó la fuente local por el archivo público de Google Drive como origen principal del stock.
- El backend ahora convierte automáticamente el link público de Drive a exportación XLSX y lo lee en vivo en cada carga del configurador.
- Se validó health check y carga visual del frontend con la nueva fuente remota.
