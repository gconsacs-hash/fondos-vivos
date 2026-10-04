# Fondos Vivos

App local (PWA) para crear fondos de pantalla de teléfono: fondos generados, rostros
dibujados que reaccionan al teléfono, y cualquier imagen tuya convertida en fondo con
movimiento. Todo se procesa en el equipo o en el teléfono: nada se sube a internet y no
necesita claude.ai ni ninguna cuenta.

## Cómo abrirla

- Doble clic en **Iniciar.cmd**. Abre `http://localhost:3400`.
- Desde el teléfono (misma red wifi): la consola muestra una línea
  `desde el teléfono: http://192.168.x.x:3400`. Abre esa dirección en Chrome y, en el menú
  de Chrome, «Añadir a pantalla de inicio» para instalarla como app.

Se puede abrir `index.html` con doble clic, pero **los sensores (inclinación, sacudida) sólo
funcionan servida desde el servidor**, porque el navegador los reserva para orígenes seguros
(`localhost` cuenta como seguro).

## Las cuatro vistas

| Vista | Qué hace |
|---|---|
| **Fondos** | 12 estilos generados (malla, aurora, ondas, topografía, geométrico, montañas, constelación, bauhaus, puntos, brumas, flujo, degradado) × 16 paletas × semilla. «Otra variación» cambia la semilla; «Sorpréndeme» cambia todo. «Guías» dibuja el reloj y los iconos para ver qué tapa el fondo. |
| **Rostros** | 7 rostros (gota, bolita, robot, gato, luna, fantasma, sólo la cara) sobre cualquier fondo. |
| **Imagen viva** | Tu foto o una captura de una serie/anime, con movimiento al inclinar. Si marcas los dos ojos y la boca, además parpadea, sigue tu dedo con la mirada y sonríe. |
| **Galería** | Guarda y recupera recetas (estilo + paleta + semilla + rostro + efecto). Ocupa casi nada: guarda la receta, no la imagen. |

A todo eso se le puede añadir una **capa de efecto en movimiento**: lluvia, nieve, pétalos,
bokeh, luciérnagas, destello, polvo de luz, estrellas o niebla.

## A qué reacciona un rostro

- **Tocar**: sorpresa. **Doble toque**: corazones.
- **Arrastrar el dedo**: la mirada te sigue. En los efectos, las luciérnagas van hacia el dedo
  y cada toque deja una onda.
- **Inclinar el teléfono**: la mirada y el cuerpo se inclinan, y el viento mueve la lluvia,
  la nieve y los pétalos.
- **Sacudir**: mareo (ojos en espiral).
- **La hora**: de noche y sin tocarlo, se duerme.
- **La batería**: bajo 18 % se pone triste; enchufado, se pone eléctrico.
- **El micrófono** (botón «Escuchar voz», permiso aparte): abre la boca con tu voz.

## Cómo ponerlo de fondo en el teléfono

1. **Fondo fijo del escritorio** → botón **Guardar PNG** con la resolución de tu teléfono
   (el A52 es 1080×2400). En Android: mantener pulsado el escritorio → Fondos de pantalla →
   Galería → elegir la imagen. Es la opción que se ve siempre bien y no gasta batería.
2. **Pantalla de bloqueo con movimiento** → botón **Vídeo WebM**. Samsung (One UI) admite
   vídeo en la pantalla de bloqueo. Si tu versión pide MP4, conviértelo con cualquier
   conversor; el WebM sale de la grabadora del propio navegador.
3. **Para compartir o usar de sticker** → botón **GIF animado** (sale a 360 px de ancho para
   que pese poco; el ciclo cierra sin salto).
4. **Como app a pantalla completa** → instalar la PWA y usar el botón ⛶. Ahí es donde el
   fondo está realmente vivo y reacciona; mantiene la pantalla encendida mientras esté abierta.

### Lo que esta app no puede hacer

Android no deja que una página web sea el fondo de pantalla animado del sistema. Para eso
hace falta una app nativa con un `WallpaperService` (un APK, como el de AURA). Si quieres ese
paso, el motor de rostros y efectos de aquí se puede portar a Kotlin: el dibujo es Canvas 2D
y la lógica de ánimo no depende del navegador.

## Imágenes de series y anime

La app abre la imagen que tú le des, desde tu propio teléfono. Una captura de una serie o un
anime tiene derechos de autor: usarla como tu fondo personal es una cosa, publicarla o
venderla es otra. La app no descarga imágenes de internet ni trae ninguna incluida.

## Pruebas

```
node pruebas\pruebas.js
```

35 pruebas: azar reproducible, paletas, que cada estilo y cada rostro dibujen en todas las
combinaciones, que el motor de ánimo responda a cada sensor y no genere valores inválidos,
que el ciclo de cada efecto cierre exacto, y que el codificador GIF (propio, sin librerías)
produzca un archivo que se vuelve a decodificar igual.

## Archivos

```
index.html            interfaz
css/estilos.css       estilos
js/nucleo.js          azar con semilla, color, ruido, descargas
js/paletas.js         16 paletas
js/fondos.js          12 generadores de fondo
js/rostros.js         7 rostros + motor de ánimo
js/efectos.js         9 capas de efecto en movimiento
js/sensores.js        tacto, inclinación, sacudida, batería, micrófono
js/retrato.js         imagen propia: parpadeo, mirada y sonrisa por deformación
js/gif.js             codificador GIF89a (corte por medianas + LZW)
js/exportar.js        PNG, GIF y WebM
js/galeria.js         recetas guardadas
js/app.js             une todo
servidor.js           servidor estático local
pruebas/pruebas.js    pruebas
```
