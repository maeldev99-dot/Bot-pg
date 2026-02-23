const express = require("express");
const axios = require("axios");
const OpenAI = require("openai");
const app = express();

app.use(express.json());

// Variables d'environnement
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Vérifier que toutes les variables existent
if (!VERIFY_TOKEN || !PAGE_ACCESS_TOKEN || !OPENAI_API_KEY) {
  console.error("❌ Une ou plusieurs variables d'environnement manquent !");
  process.exit(1);
}

// Instancier OpenAI
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Vérification du webhook
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook vérifié !");
    res.status(200).send(challenge);
  } else {
    console.log("❌ Token incorrect !");
    res.sendStatus(403);
  }
});

// Réception des messages
app.post("/webhook", async (req, res) => {
  const body = req.body;
  if (body.object === "page") {
    body.entry.forEach(async (entry) => {
      const webhook_event = entry.messaging[0];
      const sender_psid = webhook_event.sender.id;

      if (webhook_event.message && webhook_event.message.text) {
        const userMessage = webhook_event.message.text;
        let aiReply = "Désolé, je n'ai pas pu répondre 😅";
        try {
          const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: userMessage }]
          });
          aiReply = response.choices[0].message.content;
        } catch (error) {
          console.error("Erreur OpenAI :", error.response?.data || error.message);
        }
        await axios.post(
          `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
          { recipient: { id: sender_psid }, message: { text: aiReply } }
        );
        console.log("✅ Message envoyé :", aiReply);
      }
    });
    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
});

// Lancer serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Serveur lancé sur le port ${PORT}`));
