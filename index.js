const express = require("express");
const axios = require("axios");
const OpenAI = require("openai"); // Correct pour OpenAI v4
const app = express();

app.use(express.json());

// ----------------------------
// Variables d'environnement
// ----------------------------
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Instancier OpenAI
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
});

// ----------------------------
// Vérification du webhook
// ----------------------------
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

// ----------------------------
// Réception des messages
// ----------------------------
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.object === "page") {
    body.entry.forEach(async (entry) => {
      const webhook_event = entry.messaging[0];
      const sender_psid = webhook_event.sender.id;

      console.log("Message reçu :", webhook_event);

      if (webhook_event.message && webhook_event.message.text) {
        const userMessage = webhook_event.message.text;
        const aiReply = await getAIReply(userMessage);
        await sendMessage(sender_psid, aiReply);
      }

      if (webhook_event.postback) {
        await sendMessage(sender_psid, `Postback reçu : ${webhook_event.postback.payload}`);
      }
    });

    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
});

// ----------------------------
// Fonction IA ChatGPT v4
// ----------------------------
async function getAIReply(message) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: message }]
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error("Erreur OpenAI :", error.response?.data || error.message);
    return "Désolé, je n'ai pas pu répondre 😅";
  }
}

// ----------------------------
// Envoyer message Messenger
// ----------------------------
async function sendMessage(psid, text) {
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        recipient: { id: psid },
        message: { text }
      }
    );
    console.log("✅ Message envoyé :", text);
  } catch (error) {
    console.error("❌ Erreur en envoyant le message :", error.response?.data || error.message);
  }
}

// ----------------------------
// Lancer serveur
// ----------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Serveur lancé sur le port ${PORT}`));
