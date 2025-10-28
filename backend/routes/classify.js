// backend/routes/classify.js
import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
dotenv.config();

const router = express.Router();


// Simple fallback classifier (keyword-based)
function fallbackClassify(text) {
  const t = (text || "").toLowerCase();

  if (
    /\b(invoice|meeting|project|urgent|important|asap|deadline|task|follow up)\b/.test(
      t
    )
  ) {
    return "Important";
  }
  if (/\b(sale|discount|offer|coupon|deal|buy now|purchase)\b/.test(t)) {
    return "Promotions";
  }
  if (
    /\b(friend|facebook|instagram|twitter|linkedin|social|posted|like|family)\b/.test(
      t
    )
  ) {
    return "Social";
  }
  if (
    /\b(newsletter|subscribe|unsubscribe|campaign|marketing|promo|advert)\b/.test(
      t
    )
  ) {
    return "Marketing";
  }
  if (
    /\b(spam|unsubscribe me|unwanted|lottery|prize|win money|free money)\b/.test(
      t
    )
  ) {
    return "Spam";
  }
  return "General";
}

// function buildClassificationPrompt(emails) {
//   const header = `You are an email classifier. Classify each email into ONE of these categories exactly:
// Important, Promotions, Social, Marketing, Spam, General.
// Return only valid JSON (no explanations), mapping email id to category. Example:
// {"<id1>":"Important","<id2>":"Promotions"}

// Now classify the following emails. Use the subject and snippet primarily.

// Emails:\n`;

// const items = emails
//     .map((e) => {
//       const subj = (e.subject || "").replace(/\n/g, " ");
//       const snip = (e.snippet || "").replace(/\n/g, " ");
//       return `-- id: ${e.id}\nsubject: ${subj}\nsnippet: ${snip}\n`;
//     })
//     .join("\n");

//   return header + items + "\nReturn the JSON mapping only.";
// }

function buildClassificationPrompt(emails) {
  const header = `
  You are a strict JSON generator.
  Your ONLY task is to classify each email into one of these categories exactly:
  "Important", "Promotions", "Social", "Marketing", "Spam", "General"].

  Rules:
    1. Output MUST be valid JSON — not markdown, not code blocks.
    2. Output MUST NOT include explanations, commentary, or backticks.
    3. Output MUST contain a single JSON object.
    4. Keys = the email "id" field.
    5. Values = one of the six allowed categories.
    6. Do not wrap the JSON in quotes.

  Example output (this is the only format you should produce):

  {
    "123": "Promotions",
    "456": "Important"
  }

  Now classify the following emails:

`;

  const emailList = emails
    .map((e) => {
      const subj = (e.subject || "").replace(/\n/g, " ");
      const snip = (e.snippet || "").replace(/\n/g, " ");
      return `id: ${e.id}\nsubject: ${subj}\nsnippet: ${snip}\n`;
    })
    .join("\n");

  const footer = `Return only the JSON object, nothing else.`;

  return header + emailList + footer;
}



/**
 * Call Gemini via the SDK using the provided API key and prompt.
 * Returns the model's text output (string).
 */
async function callGeminiWithSdk(apiKey, prompt) {
  // create SDK client with the user's API key
  const ai = new GoogleGenAI({ apiKey });

  
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    contents: prompt,
  });

  
  //const text = response?.response?.text || response?.text || "";
  const text = response?.text || "";
  return String(text);
}

// POST /api/classify//
// Expects: { emails: [ { id, subject, snippet, from, ... } ], apiKey?: string }
// For this step we IGNORE apiKey and use fallback rules


router.post("/classify", async (req, res) => {
  try {
    // require logged-in user
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    //const { emails } = req.body || {};
    const { emails, apiKey } = req.body || {};
    //console.log(apiKey);
    if (!Array.isArray(emails)) {
      return res.status(400).json({ error: "Missing or invalid emails array" });
    }

    if (apiKey) {
      try {
        const prompt = buildClassificationPrompt(emails); 
        const modelText = await callGeminiWithSdk(apiKey, prompt);

        console.log(modelText);

        // Attempt to parse JSON from model output
        let parsed = null;
        try {
          parsed = JSON.parse(modelText.trim());
        } catch (parseErr) {
          // If model returns extra text, try to extract last JSON object
          const jsonMatch = modelText.match(/\{[\s\S]*\}$/);
          if (jsonMatch) {
            try {
              parsed = JSON.parse(jsonMatch[0]);
            } catch (e) {
              parsed = null;
            }
          }
        }

        if (parsed && typeof parsed === "object") {
          const allowed = [
            "Important",
            "Promotions",
            "Social",
            "Marketing",
            "Spam",
            "General",
          ];
          const classifications = {};
          for (const id of Object.keys(parsed)) {
            const raw = String(parsed[id] || "").trim();
            const matched =
              allowed.find((a) => a.toLowerCase() === raw.toLowerCase()) ||
              raw ||
              "General";
            classifications[id] = matched;
          }
          return res.json({ classifications });
        } else {
          console.warn(
            "Gemini returned text but JSON parse failed; falling back to local classifier."
          );
          // fall through to fallback below
        }
      } catch (err) {
        console.warn("Gemini SDK call failed:", err && (err.message || err));
        // fall through to local fallback
      }
    }

    const classifications = {};
    for (const e of emails) {
      const text = `${e.subject || ""}\n${e.snippet || ""}\n${e.from || ""}`;
      classifications[e.id] = fallbackClassify(text);
    }

    return res.json({ classifications });
  } catch (err) {
    console.error("Error in /api/classify:", err && (err.message || err));
    return res
      .status(500)
      .json({ error: "Server error during classification" });
  }
});

export default router;
