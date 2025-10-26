// backend/routes/auth.js
import express from "express";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// Helper: create an OAuth2 client configured with our credentials
function createOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${(process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, "")}/auth/google/callback`;
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// 1) Start OAuth: redirect user to Google consent screen
router.get("/google", (req, res) => {
  const oauth2Client = createOAuth2Client();

  // Scopes we want (readonly Gmail + basic profile/email info)
  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ];

  // Generate an auth URL (access_type=offline requests refresh token)
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent", // forces consent screen to return refresh_token (useful in dev)
  });

  // Redirect the browser to Google
  res.redirect(authUrl);
});

// 2) OAuth callback: Google calls this with ?code=...
router.get("/google/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send("Missing code parameter");
  }

  try {
    const oauth2Client = createOAuth2Client();

    // Exchange code for tokens (server-to-server)
    const { tokens } = await oauth2Client.getToken(code);
    // tokens contains: access_token, expires_in, refresh_token (maybe), scope, token_type, id_token

    // Save tokens in session (for demo). You can store profile info too.
    // Ensure you have express-session configured in server.js so req.session exists.
    req.session.tokens = tokens;

    // Optionally fetch basic profile (name/email) using the id_token or userinfo
    // Here we fetch userinfo using googleapis OAuth2 endpoint:
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ auth: oauth2Client, version: "v2" });
    const userinfoRes = await oauth2.userinfo.get();
    const profile = userinfoRes.data; // contains email, name, picture, etc.

    req.session.user = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      picture: profile.picture,
    };

    // Redirect back to frontend page where the app will call /api/emails
    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
    return res.redirect(`${frontendUrl}/emails`);
  } catch (err) {
    console.error("Error exchanging code for tokens:", err);
    return res.status(500).send("Authentication failed");
  }
});

// Optional: logout route
router.get("/logout", (req, res) => {
  // Destroy the session on logout
  req.session.destroy(() => {
    res.clearCookie("connect.sid"); // express-session default cookie name
    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
    res.redirect(frontendUrl || "/");
  });
});

export default router;
