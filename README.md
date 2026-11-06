# Happy Emotes 🕷️

Un laboratorio de tipografía para abrir el texto por dentro. Nació de una araña Unicode que se dibujaba encima de otros mensajes en un chat.

## Ejecutar

No hay compilación, dependencias de JavaScript, API ni claves. Con Python 3.12 instalado, desde la raíz del repositorio:

```bash
python -m http.server 8000 --directory dist
```

En Windows también puedes usar `py -3.12 -m http.server 8000 --directory dist`. Abre <http://localhost:8000> en Firefox, Chrome, Edge o Safari reciente. Sirve los archivos por HTTP: abrir `index.html` con `file://` no permite cargar correctamente los módulos y el catálogo.

## Experimentar

El selector **Apariencia**, en la cabecera, ofrece **Normal** (el diseño claro original), **Oscuro** y **Sistema**. La elección se recuerda en este navegador; Sistema sigue los cambios de apariencia del sistema operativo mientras la página está abierta. Normal es la opción inicial. Si el navegador bloquea el almacenamiento, el selector sigue funcionando durante la sesión de la página. Restablecer el laboratorio conserva la apariencia elegida.

1. Abre **La araña**. Las dos vistas usan el mismo texto y Noto Sans, incluida en el proyecto.
2. Mueve **Longitud del hilo**: aumenta el número de marcas combinantes mientras los grafemas pueden seguir siendo los mismos.
3. Compara `overflow: visible` en A con `overflow: clip` en B. La tinta se dibuja en el DOM real; no es una telaraña simulada con CSS.
4. Cambia una vista a Arial, Times, Courier o la fuente del sistema. Las marcas pueden dejar de apilarse; es un resultado válido.
5. Activa **Cajas de layout** y **Guía de tinta** para comparar dos mediciones diferentes.
6. Prueba **Acentos** y aplica NFC/NFD. La forma visual puede conservarse aunque cambie el número de puntos de código.
7. Prueba **Familia**: `👨‍👩‍👧‍👦` tiene 7 puntos de código, 11 unidades UTF-16 y 25 bytes UTF-8, agrupados en un grafema con la segmentación actual.
8. Selecciona un grafema para ver sus puntos de código, nombres, categorías e intervalos UTF-16. También puedes inspeccionar el texto completo.

Incluye seis ejemplos, cuatro tipos de hilo, cinco opciones de fuente por vista, control de tamaño y altura de línea, escapes Unicode, copia y restablecimiento. Texto personalizado hasta 512 puntos de código; generador hasta 60 repeticiones. El contenido se inserta como texto con `textContent`, nunca como HTML.

## Qué significa cada medida

| Medida | Origen | Limitación |
| --- | --- | --- |
| Puntos de código | Iteración Unicode del string | No cuenta glifos ni caracteres percibidos |
| Grafemas | `Intl.Segmenter`, granularidad `grapheme` | Depende de la versión Unicode del navegador; se muestra N/D si falta la API |
| Unidades UTF-16 | `string.length` | Un punto de código astral ocupa dos unidades |
| Bytes UTF-8 | `TextEncoder` | Tamaño del texto codificado, no del DOM |
| Caja azul | `getBoundingClientRect()` del bloque del mensaje | Caja de bloque, no contorno de glifos ni caja interna de línea |
| Línea base | Elemento inline de tamaño cero | Marca la primera línea base |
| Guía naranja | `CanvasRenderingContext2D.measureText()` + `actualBoundingBox*` | Estimación sin recorte con Canvas, no medición de píxeles del DOM |

El texto visible de las dos vistas lo dibuja el navegador en elementos DOM. La guía de Canvas puede diferir por composición, sustitución de fuentes y dirección de escritura. Se omite para texto vacío, multilínea, tabuladores y ciertos controles. El panel de pruebas siempre recorta en su propio borde, incluso cuando el mensaje tiene `overflow: visible`.

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
- `dist/theme.js` y `dist/theme.css`: selección de apariencia, preferencia local y paleta oscura.
- `dist/unicode-names.json`: catálogo local parcial.
- `dist/fonts/`: fuente Noto Sans y licencia OFL 1.1.
- `tests/core.test.js`: pruebas de análisis.
- `scripts/generate-unicode-catalog.py`: generación reproducible del catálogo.

Todo lo necesario para servir la aplicación está en `dist/`. Se puede desplegar como sitio estático bajo una ruta raíz o subdirectorio; los recursos usan rutas relativas. El archivo `.openai/hosting.json` vincula la copia alojada y no es necesario para ejecutarla localmente. No hay analítica, peticiones a terceros, almacenamiento de texto ni claves. Solo se guarda la preferencia de apariencia en `localStorage`.

## Referencias

- [CSS Overflow: ink overflow](https://www.w3.org/TR/css-overflow-3/#ink-overflow)
- [Unicode UAX #29: Text Segmentation](https://www.unicode.org/reports/tr29/)
- [MDN: Intl.Segmenter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter)
- [MDN: TextMetrics](https://developer.mozilla.org/en-US/docs/Web/API/TextMetrics)
- [Noto Sans y licencia](https://github.com/notofonts/latin-greek-cyrillic)

Noto Sans se redistribuye bajo SIL Open Font License 1.1. Se ha convertido de TTF a WOFF conservando los glifos y las tablas de composición; su licencia está en `dist/fonts/OFL.txt`.
