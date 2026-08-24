import express from "express";

// Simula un servicio interno de infraestructura (p.ej. un endpoint de
// metadata/config) que nunca deberia ser accesible desde fuera de la red
// docker. No se publica ningun puerto al host en docker-compose.yml: solo
// el backend puede alcanzarlo por el nombre de servicio "internal-api".
// No tiene autenticacion porque, en el mundo real, este tipo de servicios
// suele confiar ciegamente en el aislamiento de red ("trusted network") -
// justamente el supuesto que un SSRF rompe.

const app = express();
const PORT = process.env.PORT || 4000;

const SECRETS = {
  flag: "LAB{ssrf_via_html_injection_2026}",
  db_password: "sup3r_s3cret_db_pw!",
  cloud_credentials: {
    accessKeyId: "AKIA_FAKE_INTERNAL_KEY",
    secretAccessKey: "fakeSecretAccessKey1234567890",
  },
};

app.get("/", (_req, res) => {
  res.json({ service: "internal-api", status: "ok" });
});

app.get('/api/email-assets', async (req, res) => {
  const url = String(req.query.url ?? '')

  if (!url) {
    return res.status(400).json({ error: 'Falta el parámetro url' })
  }

  try {
    // Vulnerabilidad intencional: acepta cualquier destino.
    const response = await fetch(url)
    const buffer = Buffer.from(await response.arrayBuffer())

    res.status(response.status)
    res.type(response.headers.get('content-type') ?? 'image/png')
    return res.send(buffer)
  } catch (error) {
    return res.status(502).json({
      error: 'No se pudo cargar el recurso remoto',
    })
  }
})

app.get('/secrets', (req, res) => {
  console.log(`[internal-api] /secrets fetched by ${req.ip}`)

  res.type('image/svg+xml').send(`
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="260">
      <rect width="100%" height="100%" rx="24" fill="#1c1917"/>
      <text x="45" y="85" fill="#fbbf24" font-size="28" font-family="monospace">
        Internal monitoring snapshot
      </text>
      <text x="45" y="165" fill="#ffffff" font-size="24" font-family="monospace">
        FLAG{aHRtbF9zdG9yZWRfdG9fc3NyZg==}
      </text>
    </svg>
  `)
})
app.listen(PORT, () => {
  console.log(`internal-api listening on ${PORT} (not reachable from host)`);
});
