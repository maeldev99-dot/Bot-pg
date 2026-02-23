// index.js
const express = require("express");
const axios = require("axios");
const app = express();

// Middleware pour lire le JSON
app.use(express.json());

// 🔐 Variables d'environnement (à configurer sur Railway)
const VERIFY_TOKEN = process.env.VERIFY_TOKEN; // Exemple: monsecret123
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN; // Ton token page

// ----------------------------
// 1️⃣ Vérification du webhook
// ----------------------------
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("Webhook verification request :", req.query);

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook vérifié !");
    res.status(200).send(challenge);
  } else {
    console.log("❌ Webhook non vérifié. Token incorrect !");
    res.sendStatus(403);
  }
});

// ----------------------------
// 2️⃣ Réception des messages
// ----------------------------
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.object === "page") {
    body.entry.forEach(async (entry) => {
      const webhook_event = entry.messaging[0];
      const sender_psid = webhook_event.sender.id;

      console.log("Message reçu :", webhook_event);

      // Si le message existe
      if (webhook_event.message && webhook_event.message.text) {
        await sendMessage(sender_psid, `Tu as dit : ${webhook_event.message.text}`);
      }

      // Si un bouton ou postback est cliqué
      if (webhook_event.postback) {
        await sendMessage(sender_psid, `Postback reçu : ${webhook_event.postback.payload}`);
      }
    });

    // Répondre immédiatement à Facebook
    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
});

// ----------------------------
// 3️⃣ Fonction pour envoyer un message
// ----------------------------
async function sendMessage(psid, text) {
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        recipient: { id: psid },
        message: { text: text },
      }
    );
    console.log("✅ Message envoyé :", text);
  } catch (error) {
    console.error("❌ Erreur en envoyant le message :", error.response?.data || error.message);
  }
}

// ----------------------------
// 4️⃣ Lancer le serveur
// ----------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});
