const express = require("express");
const axios = require("axios");
const app = express();

app.use(express.json());

// Variables d'environnement
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const HF_API_KEY = process.env.HF_API_KEY;

// Vérification simple
if (!VERIFY_TOKEN || !PAGE_ACCESS_TOKEN || !HF_API_KEY) {
  console.error("❌ Variables manquantes !");
  process.exit(1);
}

// Webhook verification
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook vérifié !");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Recevoir les messages
app.post("/webhook", async (req, res) => {
  const body = req.body;
  if (body.object === "page") {
    for (const entry of body.entry) {
      const event = entry.messaging[0];
      const sender = event.sender.id;
      if (event.message && event.message.text) {
        const userMessage = event.message.text;
        let reply = "Je réfléchis... 🤔";

        try {
          const response = await axios.post(
            "https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill",
            { inputs: userMessage },
            { headers: { Authorization: `Bearer ${HF_API_KEY}` } }
          );
          reply = response.data.generated_text || "Je n'ai pas compris 😅";
        } catch (error) {
          console.error("Erreur HF:", error.response?.data || error.message);
          reply = "Erreur IA 😅";
        }

        await axios.post(
          `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
          { recipient: { id: sender }, message: { text: reply } }
        );
        console.log("✅ Message envoyé :", reply);
      }
    }
    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
});

// Lancer le serveur sur le port Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Serveur lancé sur le port ${PORT}`));
