export const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || "lab-dev-secret-do-not-use-in-prod",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  internalApiUrl: process.env.INTERNAL_API_URL || "http://internal-api:4000",
  // Interruptor didactico: en false, el nickname se interpola sin escapar
  // en el HTML del email (la vulnerabilidad). En true, se aplica escapeHtml
  // para mostrar el fix.
  escapeNickname: process.env.ESCAPE_NICKNAME === "true",
};
