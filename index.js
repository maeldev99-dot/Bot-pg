// index.js
const express = require("express");
const axios = require("axios");
const app = express();

app.use(express.json());

// Variables d'environnement
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const HF_API_KEY = process.env.HF_API_KEY;

// Vérification simple des variables
if (!VERIFY_TOKEN || !PAGE_ACCESS_TOKEN || !HF_API_KEY) {
  console.error("❌ Une ou plusieurs variables d'environnement manquent !");
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

// Recevoir les messages Messenger
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
          // Nouvelle API Hugging Face Router
          const response = await axios.post(
            "https://router.huggingface.co/api/chat",
            {
              model: "facebook/blenderbot-400M-distill",
              inputs: userMessage
            },
            {
              headers: { Authorization: `Bearer ${HF_API_KEY}` }
            }
          );

          // Récupérer la réponse du bot
          if (response.data && response.data.generated_text) {
            reply = response.data.generated_text;
          } else if (response.data && response.data[0]?.generated_text) {
            // Parfois la réponse est dans un tableau
            reply = response.data[0].generated_text;
          } else {
            reply = "Je n'ai pas compris 😅";
          }
        } catch (error) {
          console.error("Erreur Hugging Face :", error.response?.data || error.message);
          reply = "Erreur IA 😅";
        }

        // Envoyer la réponse au user via Messenger
        try {
          await axios.post(
            `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
            { recipient: { id: sender }, message: { text: reply } }
          );
          console.log("✅ Message envoyé :", reply);
        } catch (err) {
          console.error("Erreur envoi Messenger :", err.response?.data || err.message);
        }
      }
    }
    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
});

// Lancer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Serveur lancé sur le port ${PORT}`));
