// backend/routes/gmail.js
import express from "express";
import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

function getOAuth2ClientFromSession(req) {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
  const redirectUri = `${(process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, "")}/auth/google/callback`;
  const oAuth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, redirectUri);

  if (!req.session?.tokens?.access_token) return null;

  oAuth2Client.setCredentials({
    access_token: req.session.tokens.access_token || req.session.tokens.accessToken || req.session.tokens.accessToken,
    refresh_token: req.session.tokens.refresh_token || req.session.tokens.refreshToken,
  });

  return oAuth2Client;
}

router.get("/emails", async (req, res) => {
  try {
    const oAuth2Client = getOAuth2ClientFromSession(req);
    if (!oAuth2Client) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

    // List messages (max 15)
    const listRes = await gmail.users.messages.list({ userId: "me", maxResults: 15 });
    const messages = listRes.data.messages || [];

    const detailed = await Promise.all(messages.map(async (m) => {
      const msgRes = await gmail.users.messages.get({ userId: "me", id: m.id, format: "full" });
      const msg = msgRes.data;
      const headers = msg.payload?.headers || [];
      const getHeader = (name) => (headers.find(h => h.name.toLowerCase() === name.toLowerCase()) || {}).value || "";
      return {
        id: msg.id,
        threadId: msg.threadId,
        subject: getHeader("Subject"),
        from: getHeader("From"),
        date: getHeader("Date"),
        snippet: msg.snippet,
      };
    }));

    return res.json({ emails: detailed });
  } catch (err) {
    console.error("Error in /api/emails:", err && (err.message || err));
    return res.status(500).json({ error: "Failed to fetch emails" });
  }
});

export default router;
