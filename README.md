# Happy Emotes 🕷️

Un laboratorio de tipografía para abrir el texto por dentro. Nació de una araña Unicode que se dibujaba encima de otros mensajes en un chat.

## Ejecutar

No hay compilación, dependencias de JavaScript, API ni claves. Con Python 3.12 instalado, desde la raíz del repositorio:

```bash
python -m http.server 8000 --directory dist
```

En Windows también puedes usar `py -3.12 -m http.server 8000 --directory dist`. Abre <http://localhost:8000> en Firefox, Chrome, Edge o Safari reciente. Sirve los archivos por HTTP: abrir `index.html` con `file://` no permite cargar correctamente los módulos y el catálogo.

## Experimentar

Las cinco mejoras están implementadas: **1. Selección conectada**, **2. Crecimiento animado**, **3. Cuaderno de descubrimientos**, **4. Enlaces compartibles** y **5. Constructor de criaturas**. La cabecera las identifica y el enlace **Cuaderno** abre los experimentos guardados.

El selector **Apariencia**, en la cabecera, ofrece **Normal** (el diseño claro original), **Oscuro** y **Sistema**. La elección se recuerda en este navegador; Sistema sigue los cambios de apariencia del sistema operativo mientras la página está abierta. Normal es la opción inicial. Si el navegador bloquea el almacenamiento, el selector sigue funcionando durante la sesión de la página. Restablecer el laboratorio conserva la apariencia elegida.

1. Abre **La araña**. Las dos vistas usan el mismo texto y Noto Sans, incluida en el proyecto.
2. Mueve **Longitud del hilo**: aumenta el número de marcas combinantes mientras los grafemas pueden seguir siendo los mismos.
3. Compara `overflow: visible` en A con `overflow: clip` en B. La tinta se dibuja en el DOM real; no es una telaraña simulada con CSS.
4. Cambia una vista a Arial, Times, Courier o la fuente del sistema. Las marcas pueden dejar de apilarse; es un resultado válido.
5. Activa **Cajas de layout** y **Guía de tinta** para comparar dos mediciones diferentes.
6. Prueba **Acentos** y aplica NFC/NFD. La forma visual puede conservarse aunque cambie el número de puntos de código.
7. Prueba **Familia**: `👨‍👩‍👧‍👦` tiene 7 puntos de código, 11 unidades UTF-16 y 25 bytes UTF-8, agrupados en un grafema con la segmentación actual.
8. Selecciona una ficha de grafema: se ilumina en **las dos vistas** y el inspector muestra sus puntos de código, nombres, categorías e intervalos UTF-16. También puedes pulsar el texto de A/B o usar los botones **anterior/siguiente**. En las fichas, las flechas y las teclas Inicio/Fin permiten recorrer el texto con el teclado.
9. Cambia a **Puntos de código** para ver el texto completo. Pulsa un carácter de la tabla para localizar su grafema: todas las filas que lo componen quedan marcadas en verde.

Incluye seis ejemplos, cuatro tipos de hilo, cinco opciones de fuente por vista, control de tamaño y altura de línea, escapes Unicode, copia y restablecimiento. Texto personalizado hasta 512 puntos de código; generador hasta 60 repeticiones. El contenido se inserta como texto con `textContent`, nunca como HTML.

### La araña, paso a paso

Con **La araña** seleccionada, el reproductor aparece junto a las vistas A/B:

- **Reproducir / Pausar** incorpora un punto de código por paso, desde la longitud actual hasta 60. Al terminar, **Repetir** comienza de nuevo desde cero.
- **Desde cero** deja la araña sin incorporaciones y en pausa. **+1 marca** pausa y añade exactamente una; con U+FC5E el control indica **+1 ligadura**.
- **Ritmo** ofrece 1, 2 o 4 incorporaciones por segundo. No hay reproducción automática al abrir la página ni bucle al alcanzar el límite.
- El texto, los contadores, el inspector, las dos vistas y sus guías se actualizan juntos. Se conserva el grafema seleccionado mientras siga existiendo.
- Editar el texto, cambiar de espécimen, mover la longitud, cambiar el tipo de hilo, normalizar, seleccionar un grafema o entrar con el foco en el inspector pausa la animación. Cambiar de pestaña también la pausa; hay que pulsar Reproducir para continuar. Las fuentes, la altura de línea y el recorte se pueden modificar durante la reproducción.

Para observar el desbordamiento desde su origen: pulsa **Desde cero**, elige **Lento** y pulsa **Reproducir**. Con las marcas combinantes aumentan los puntos de código mientras el hilo sigue dentro de un solo grafema; U+FC5E es una ligadura y puede producir otra segmentación. La tinta depende de la fuente, no de una animación de altura simulada.

## Cuaderno de descubrimientos

Usa **Guardar este experimento en el cuaderno** debajo de A/B o el enlace **Cuaderno** de la cabecera. Ponle un nombre y pulsa **Guardar experimento**. Cada entrada conserva:

- El texto Unicode exacto, el espécimen y los ajustes del generador de la araña.
- Las fuentes y el `overflow` de A/B, tamaño de fuente, altura de línea y las guías activadas.
- El grafema seleccionado, el modo del inspector, los escapes y el ritmo del reproductor.

**Abrir** restaura esos ajustes y deja el reproductor en pausa. La apariencia Normal/Oscuro/Sistema es una preferencia general y se conserva al abrir experimentos. **Renombrar** cambia solo el nombre. **Eliminar** ofrece **Deshacer eliminación** para la última entrada eliminada durante esta sesión. Restablecer el laboratorio conserva el cuaderno.

Las entradas se guardan en este navegador, bajo el origen del sitio. No se sincronizan automáticamente entre equipos. **Exportar JSON** descarga el cuaderno completo; **Importar JSON** añade entradas sin sobrescribir las existentes. Las copias exactas se omiten, y las versiones diferentes con el mismo identificador reciben uno nuevo. Se validan todos los datos antes de escribir: si algo falla, no se importa parcialmente. Límites: 100 experimentos, nombres de 80 caracteres, texto de 512 puntos de código por experimento y archivos de hasta 1 MiB. El formato incluye `format: "happy-emotes-notebook"` y `version: 1`.

Si el navegador bloquea el almacenamiento, se indica **Guardado temporal** y se permite exportar la colección antes de cerrar la pestaña. Un error de espacio no se presenta como un guardado correcto. Los datos dañados se conservan y se ofrece descargar una copia original. Los nombres y textos siempre se muestran con `textContent`.

## Compartir un experimento

Pulsa **Compartir experimento**, debajo de las vistas A/B, y después **Copiar enlace**. También puedes seleccionar y copiar el campo manualmente o abrir **Probar enlace** en otra pestaña.

El enlace guarda una copia del texto y de todos los ajustes que conserva el cuaderno, incluida la selección del inspector y el ritmo. Al abrirlo, el laboratorio recupera esa configuración en pausa; se puede seguir editando o guardarla en el cuaderno. Las fuentes efectivas, el motor del navegador y su versión de Unicode pueden cambiar el renderizado y la segmentación. La apariencia Normal/Oscuro/Sistema sigue siendo una preferencia del visitante.

Es una instantánea: si cambias los ajustes, vuelve a pulsar Compartir experimento para crear otro enlace. Abrir un enlace no añade entradas automáticamente al cuaderno. El texto y los ajustes se incluyen en el propio enlace, por lo que cualquiera que lo reciba puede recuperarlos.

El formato versionado es `#experiment=v1.<JSON en UTF-8 y base64url>`. El fragmento no se envía en la petición HTTP al servidor; no se usa un servicio de acortamiento. Admite el límite habitual de 512 puntos de código, también con emojis, marcas y saltos de línea. Los enlaces se validan completamente antes de aplicar sus ajustes. Si están incompletos, dañados o usan una versión incompatible, aparece un aviso y se conserva el estado actual del laboratorio. Navegar a otros apartados usa los anclajes habituales; el enlace generado permanece en su campo hasta que lo cierres o generes otro.

## Constructor de criaturas Unicode

Abre **Constructor de criaturas** desde la cabecera. Elige una base y pulsa **Empezar con esta base**. Las piezas de la paleta y **Añadir base** se insertan al final del espécimen. **Quitar último punto** retira el último punto de código, incluido un emoji completo si ocupa dos unidades UTF-16.

La paleta reúne marcas de arriba, de abajo, superpuestas y envolventes, unidores, selectores de presentación y tonos de piel. Al pasar el puntero, enfocar o pulsar una pieza, se muestra su nombre Unicode y categoría. Para construir 👩‍💻, empieza con 👩, añade ZWJ, elige 💻 y pulsa **Añadir base**. La fuente y el navegador determinan el dibujo. La criatura se puede guardar en el cuaderno y compartir por enlace como cualquier espécimen.

## Qué significa cada medida

| Medida | Origen | Limitación |
| --- | --- | --- |
| Puntos de código | Iteración Unicode del string | No cuenta glifos ni caracteres percibidos |
| Grafemas | `Intl.Segmenter`, granularidad `grapheme` | Depende de la versión Unicode del navegador; se muestra N/D si falta la API |
| Unidades UTF-16 | `string.length` | Un punto de código astral ocupa dos unidades |
| Bytes UTF-8 | `TextEncoder` | Tamaño del texto codificado, no del DOM |
| Caja azul | `getBoundingClientRect()` del bloque del mensaje | Caja de bloque, no contorno de glifos ni caja interna de línea |
| Línea base | Elemento inline de tamaño cero | Marca la primera línea base |
| Selección verde | `Range.getClientRects()` con los intervalos UTF-16 de cada grafema | Posición tipográfica, no contorno de tinta; respeta el recorte de cada vista |
| Guía naranja | `CanvasRenderingContext2D.measureText()` + `actualBoundingBox*` | Estimación sin recorte con Canvas, no medición de píxeles del DOM |

El texto visible de las dos vistas lo dibuja el navegador en elementos DOM. La guía de Canvas puede diferir por composición, sustitución de fuentes y dirección de escritura. Se omite para texto vacío, multilínea, tabuladores y ciertos controles. El panel de pruebas siempre recorta en su propio borde, incluso cuando el mensaje tiene `overflow: visible`.

La selección conserva cada muestra en un único nodo de texto para no alterar la composición de la fuente. Si existe CSS Custom Highlight API, también colorea el rango nativamente; en navegadores sin ella siguen funcionando los recuadros. Espacios y saltos de línea se pueden recorrer desde las fichas o las flechas; los rangos sin ancho reciben un marcador fino. Si un grafema queda completamente fuera del panel, se indica «Grafema fuera de vista». Las ligaduras pueden compartir geometría: para seleccionar sin ambigüedad usa las fichas del inspector. Sin `Intl.Segmenter` se conserva el inspector de puntos de código y se desactiva la selección de grafemas.

Las fuentes del sistema varían entre equipos. Noto Sans se sirve localmente para hacer el primer experimento más reproducible, pero no elimina todas las diferencias de motor o sistema. El resto de escrituras y emojis pueden usar fuentes de sustitución. No se identifica automáticamente la fuente efectiva de cada glifo.

El catálogo de 1.592 nombres es **parcial**, generado con `unicodedata` de Python 3.12 (Unicode 15.0.0). Incluye los ejemplos y bloques comunes; un carácter fuera del catálogo sigue teniendo código, renderizado y categoría general del navegador. Su nombre se marca explícitamente como no incluido. La clasificación del catálogo y la segmentación del navegador pueden proceder de versiones Unicode distintas.

`U+034B` es `COMBINING HOMOTHETIC ABOVE`, categoría Mn, clase combinante 230. `U+FC5E`, incluido para comparar la araña original, es `ARABIC LIGATURE SHADDA WITH DAMMATAN ISOLATED FORM`, categoría Lo: **no** es una marca Mn. Ninguna categoría garantiza por sí sola un avance o una altura concretos. NFC no es un filtro de marcas repetidas.

## Desarrollo y comprobaciones

Node 20 o superior, sin `npm install`:

```bash
npm test
npm run check
```

Las pruebas comprueban acentos, emojis ZWJ, indicadores regionales, tonos de piel, índices UTF-16, límites sin cortar pares sustitutos, ausencia de Segmenter, cadenas vacías, marcas sin base y metadatos Unicode.
Las pruebas de enlaces comprueban la reproducción exacta de Unicode y de los ajustes, rutas relativas al sitio, límites, versiones y rechazo de enlaces incompletos o inválidos.
Las pruebas del cuaderno comprueban la exportación/importación sin alterar Unicode, validación, mezcla de duplicados, capacidad, persistencia, datos dañados y errores de almacenamiento.
Las pruebas del reproductor usan un reloj controlado para verificar pausas, reanudación, pasos manuales, cambio de velocidad, cancelación de callbacks, límite de 60, repetición y crecimiento de los puntos de código sin dividir el grafema combinante.

Para regenerar el catálogo:

```bash
python scripts/generate-unicode-catalog.py
```

El script registra la versión real de `unicodedata`; regenerarlo con otra versión de Python puede cambiar sus datos.

## Estructura

- `dist/index.html`: interfaz y explicación de las mediciones.
- `dist/styles.css`: diseño adaptable y escenarios de desbordamiento.
- `dist/core.js`: análisis Unicode puro, reutilizable y probado.
- `dist/app.js`: controles, inspector y mediciones DOM/Canvas.
- `dist/selection.js` y `dist/selection.css`: selección conectada con rangos DOM, resaltado nativo y recuadros que respetan el recorte.
- `dist/playback.js` y `dist/playback.css`: reproducción del crecimiento y controles; `tests/playback.test.js` comprueba su temporización.
- `dist/notebook.js`, `dist/notebook-ui.js` y `dist/notebook.css`: formato JSON validado, persistencia y cuaderno; `tests/notebook.test.js` comprueba la integridad de los datos.
- `dist/share.js`, `dist/share-ui.js` y `dist/share.css`: enlaces reproducibles con el estado completo y copia manual; `tests/share.test.js` comprueba sus formatos y validación.
- `dist/theme.js` y `dist/theme.css`: selección de apariencia, preferencia local y paleta oscura.
- `dist/unicode-names.json`: catálogo local parcial.
- `dist/fonts/`: fuente Noto Sans y licencia OFL 1.1.
- `tests/core.test.js`: pruebas de análisis.
- `scripts/generate-unicode-catalog.py`: generación reproducible del catálogo.

Todo lo necesario para servir la aplicación está en `dist/`. Se puede desplegar como sitio estático bajo una ruta raíz o subdirectorio; los recursos usan rutas relativas. El archivo `.openai/hosting.json` vincula la copia alojada y no es necesario para ejecutarla localmente. No hay analítica, peticiones a terceros ni claves. La preferencia de apariencia y los experimentos que guardas en el cuaderno se almacenan localmente en este navegador; el texto no se envía a servidores de análisis.

## Referencias

- [CSS Overflow: ink overflow](https://www.w3.org/TR/css-overflow-3/#ink-overflow)
- [Unicode UAX #29: Text Segmentation](https://www.unicode.org/reports/tr29/)
- [MDN: Intl.Segmenter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter)
- [MDN: TextMetrics](https://developer.mozilla.org/en-US/docs/Web/API/TextMetrics)
- [MDN: CSS Custom Highlight API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API)
- [MDN: Range.getClientRects](https://developer.mozilla.org/en-US/docs/Web/API/Range/getClientRects)
- [Noto Sans y licencia](https://github.com/notofonts/latin-greek-cyrillic)

Noto Sans se redistribuye bajo SIL Open Font License 1.1. Se ha convertido de TTF a WOFF conservando los glifos y las tablas de composición; su licencia está en `dist/fonts/OFL.txt`.
