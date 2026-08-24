const URL_ATTR_RE = /(?:src|href)\s*=\s*["'](https?:\/\/[^"']+)["']/gi

const IMAGE_SRC_RE =
  /<img\b([^>]*?)\bsrc\s*=\s*(["'])(https?:\/\/[^"']+)\2([^>]*)>/gi

const FETCH_TIMEOUT_MS = 3000
const BODY_PREVIEW_BYTES = 2048

export function extractResourceUrls(html) {
  const urls = new Set()

  for (const match of html.matchAll(URL_ATTR_RE)) {
    urls.add(match[1])
  }

  return [...urls]
}

async function fetchWithTimeout(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

async function inlineImage(url) {
  const response = await fetchWithTimeout(url)

  if (!response.ok) {
    throw new Error(`No se pudo descargar la imagen: ${url}`)
  }

  const contentType = response.headers.get('content-type') ?? 'image/png'
  const buffer = Buffer.from(await response.arrayBuffer())

  return `data:${contentType};base64,${buffer.toString('base64')}`
}

async function fetchResource(url) {
  try {
    const response = await fetchWithTimeout(url)
    const buffer = await response.arrayBuffer()

    return {
      url,
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get('content-type'),
      bodyPreview: Buffer.from(buffer)
        .subarray(0, BODY_PREVIEW_BYTES)
        .toString('utf-8'),
    }
  } catch (err) {
    return {
      url,
      ok: false,
      error: err instanceof Error ? err.message : 'Error desconocido',
    }
  }
}

async function inlineRemoteImages(html) {
  const matches = [...html.matchAll(IMAGE_SRC_RE)]

  let renderedHtml = html

  for (const match of matches) {
    const [fullTag, beforeSrc, quote, url, afterSrc] = match

    try {
      const source = await inlineImage(url)

      renderedHtml = renderedHtml.replace(
        fullTag,
        `<img${beforeSrc}src=${quote}${source}${quote}${afterSrc}>`,
      )
    } catch {
      // Si una imagen falla, se conserva el HTML original.
    }
  }

  return renderedHtml
}

// SINK #2: SSRF.
// El servidor descarga recursos incluidos en el HTML del email sin
// validar el host. Permite alcanzar internal-api desde la red Docker.
export async function renderEmailToPdfReport(html) {
  const resourceUrls = extractResourceUrls(html)

  const [resources, renderedHtml] = await Promise.all([
    Promise.all(resourceUrls.map(fetchResource)),
    inlineRemoteImages(html),
  ])

  return {
    renderedAt: new Date().toISOString(),
    resources,
    renderedHtml,
  }
}