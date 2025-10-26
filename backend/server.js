import express from "express";
import session from "express-session";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const PORT = process.env.PORT;

app.use(express.json());
app.use(cors({ origin: FRONTEND_URL, credentials: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || "dev-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, sameSite: "lax" },
}));

// mount routes AFTER session
import authRoutes from "./routes/auth.js";
import gmailRoutes from "./routes/gmail.js";
import classifyRoutes from "./routes/classify.js";

app.use("/auth", authRoutes);
app.use("/api", gmailRoutes);
app.use("/api", classifyRoutes);



app.listen(PORT, () => {
  console.log(`Backend running at ${process.env.BACKEND_URL || `http://localhost:${PORT}`}`);
});
