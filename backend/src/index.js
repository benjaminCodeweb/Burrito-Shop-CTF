import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config.js";
import { seedAdmin } from "./store.js";
import { authRouter } from "./routes/auth.routes.js";
import { menuRouter } from "./routes/menu.routes.js";
import { ordersRouter } from "./routes/orders.routes.js";
import { emailsRouter } from "./routes/emails.routes.js";
import { adminRouter } from "./routes/admin.routes.js";

const app = express();

app.use(cors({ origin:true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/api", authRouter);
app.use("/api", menuRouter);
app.use("/api", ordersRouter);
app.use("/api", emailsRouter);
app.use("/api", adminRouter);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

seedAdmin();

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

app.listen(config.port, () => {
  console.log(`backend listening on ${config.port}`);
  console.log(`ESCAPE_NICKNAME=${config.escapeNickname}`);
});
