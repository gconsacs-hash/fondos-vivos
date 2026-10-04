/* publicar.js - sube esta carpeta a GitHub Pages sin necesitar git instalado.
   Usa la sesión de GitHub CLI (gh auth login) para sacar el token.

   Uso:  node publicar.js  [mensaje del commit]
*/
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const DUENO = 'gconsacs-hash';
const REPO = 'fondos-vivos';
const RAMA = 'main';
const RAIZ = __dirname;

const IGNORAR = [/^\.git$/, /^\.playwright-mcp$/, /^node_modules$/, /\.log$/, /^pruebas$/i];
const SOLO_RAIZ_IGNORAR = [];

function token() {
  try {
    return execSync('gh auth token', { encoding: 'utf8' }).trim();
  } catch (e) {
    throw new Error('No hay sesión de GitHub. Ejecuta primero:  gh auth login');
  }
}

function api(metodo, ruta, cuerpo, tk) {
  return new Promise((resolver, rechazar) => {
    const datos = cuerpo ? JSON.stringify(cuerpo) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path: ruta,
      method: metodo,
      headers: Object.assign({
        'Authorization': 'Bearer ' + tk,
        'User-Agent': 'fondos-vivos-publicar',
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }, datos ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(datos) } : {})
    }, (res) => {
      let txt = '';
      res.on('data', (d) => { txt += d; });
      res.on('end', () => {
        let json = null;
        try { json = txt ? JSON.parse(txt) : null; } catch (e) { json = { crudo: txt }; }
        resolver({ estado: res.statusCode, datos: json });
      });
    });
    req.on('error', rechazar);
    if (datos) req.write(datos);
    req.end();
  });
}

function archivos(dir, prefijo) {
  const salida = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    if (IGNORAR.some((r) => r.test(e.name))) return;
    if (!prefijo && SOLO_RAIZ_IGNORAR.some((r) => r.test(e.name))) return;
    const rel = prefijo ? prefijo + '/' + e.name : e.name;
    if (e.isDirectory()) salida.push.apply(salida, archivos(path.join(dir, e.name), rel));
    else salida.push(rel);
  });
  return salida;
}

async function principal() {
  const tk = token();
  const mensaje = process.argv.slice(2).join(' ') || 'Actualiza Fondos Vivos';

  /* 1. el repositorio existe? */
  let r = await api('GET', `/repos/${DUENO}/${REPO}`, null, tk);
  if (r.estado === 404) {
    console.log('Creando el repositorio…');
    r = await api('POST', '/user/repos', {
      name: REPO,
      description: 'Fondos de pantalla generados, rostros que reaccionan al teléfono e imágenes vivas.',
      homepage: `https://${DUENO}.github.io/${REPO}/`,
      private: false,
      has_issues: false,
      has_wiki: false
    }, tk);
    if (r.estado >= 300) throw new Error('No se pudo crear el repositorio: ' + JSON.stringify(r.datos));
  } else if (r.estado >= 300) {
    throw new Error('Error consultando el repositorio: ' + JSON.stringify(r.datos));
  }

  /* 1b. un repositorio recién creado está vacío y la API de blobs lo rechaza:
         se siembra con el README por la API de contenidos, que sí lo acepta. */
  /* un repositorio vacío responde 409, no 404: vale cualquier respuesta que no sea 200 */
  const hayRama = await api('GET', `/repos/${DUENO}/${REPO}/git/ref/heads/${RAMA}`, null, tk);
  if (hayRama.estado !== 200) {
    console.log('Primer commit (semilla)…');
    const semilla = fs.readFileSync(path.join(RAIZ, 'README.md')).toString('base64');
    const s = await api('PUT', `/repos/${DUENO}/${REPO}/contents/README.md`, {
      message: 'Primer commit', content: semilla, branch: RAMA
    }, tk);
    if (s.estado >= 300) throw new Error('No se pudo iniciar la rama: ' + JSON.stringify(s.datos));
  }

  /* 2. subir cada archivo como blob */
  const lista = archivos(RAIZ, '');
  console.log(lista.length + ' archivos');
  const arbol = [];
  for (const rel of lista) {
    const contenido = fs.readFileSync(path.join(RAIZ, rel)).toString('base64');
    const b = await api('POST', `/repos/${DUENO}/${REPO}/git/blobs`, { content: contenido, encoding: 'base64' }, tk);
    if (b.estado >= 300) throw new Error('Falló ' + rel + ': ' + JSON.stringify(b.datos));
    arbol.push({ path: rel, mode: '100644', type: 'blob', sha: b.datos.sha });
    process.stdout.write('.');
  }
  process.stdout.write('\n');

  /* 3. árbol, commit y rama */
  const t = await api('POST', `/repos/${DUENO}/${REPO}/git/trees`, { tree: arbol }, tk);
  if (t.estado >= 300) throw new Error('Árbol: ' + JSON.stringify(t.datos));

  const ref = await api('GET', `/repos/${DUENO}/${REPO}/git/ref/heads/${RAMA}`, null, tk);
  const padres = ref.estado === 200 ? [ref.datos.object.sha] : [];

  const c = await api('POST', `/repos/${DUENO}/${REPO}/git/commits`,
    { message: mensaje, tree: t.datos.sha, parents: padres }, tk);
  if (c.estado >= 300) throw new Error('Commit: ' + JSON.stringify(c.datos));

  const actualizar = padres.length
    ? await api('PATCH', `/repos/${DUENO}/${REPO}/git/refs/heads/${RAMA}`, { sha: c.datos.sha }, tk)
    : await api('POST', `/repos/${DUENO}/${REPO}/git/refs`, { ref: `refs/heads/${RAMA}`, sha: c.datos.sha }, tk);
  if (actualizar.estado >= 300) throw new Error('Rama: ' + JSON.stringify(actualizar.datos));

  /* 4. activar Pages (si ya está, devuelve 409 y da igual) */
  const p = await api('POST', `/repos/${DUENO}/${REPO}/pages`,
    { source: { branch: RAMA, path: '/' } }, tk);
  if (p.estado >= 300 && p.estado !== 409) {
    console.log('Aviso al activar Pages: ' + JSON.stringify(p.datos));
  }

  console.log('\nListo: https://' + DUENO + '.github.io/' + REPO + '/');
  console.log('(la primera publicación tarda uno o dos minutos en estar visible)');
}

principal().catch((e) => {
  console.error('\n' + e.message);
  process.exit(1);
});
