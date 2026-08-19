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

app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/api", authRouter);
app.use("/api", menuRouter);
app.use("/api", ordersRouter);
app.use("/api", emailsRouter);
app.use("/api", adminRouter);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

seedAdmin();

app.listen(config.port, () => {
  console.log(`backend listening on ${config.port}`);
  console.log(`ESCAPE_NICKNAME=${config.escapeNickname}`);
});
