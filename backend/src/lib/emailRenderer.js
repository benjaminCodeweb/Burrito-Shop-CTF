const URL_ATTR_RE = /(?:src|href)\s*=\s*["'](https?:\/\/[^"']+)["']/gi;
const FETCH_TIMEOUT_MS = 3000;
const BODY_PREVIEW_BYTES = 2048;

export function extractResourceUrls(html) {
  const urls = new Set();
  for (const match of html.matchAll(URL_ATTR_RE)) {
    urls.add(match[1]);
  }
  return [...urls];
}

async function fetchResource(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const buffer = await response.arrayBuffer();
    const bodyPreview = Buffer.from(buffer)
      .subarray(0, BODY_PREVIEW_BYTES)
      .toString("utf-8");
    return {
      url,
      ok: true,
      status: response.status,
      contentType: response.headers.get("content-type"),
      bodyPreview,
    };
  } catch (err) {
    return { url, ok: false, error: err.message };
  } finally {
    clearTimeout(timeout);
  }
}

// *** SINK #2: SSRF ***
// Simula una herramienta interna ("exportar email a PDF para archivo") que
// un operador de soporte usaria sobre el HTML de un pedido. Para "renderizar"
// las imagenes embebidas, el SERVIDOR va y busca (fetch) cada URL que
// encuentra en el HTML - sin validar que el destino sea externo/publico.
// Como el HTML viene del nickname del usuario sin sanitizar, un atacante
// puede poner una URL apuntando a un servicio interno (p.ej.
// http://internal-api:4000/secrets) que el navegador jamas podria alcanzar,
// pero que el backend si puede alcanzar por estar en la misma red docker.
export async function renderEmailToPdfReport(html) {
  const resourceUrls = extractResourceUrls(html);
  const resources = await Promise.all(resourceUrls.map(fetchResource));
  return { renderedAt: new Date().toISOString(), resources };
}
