import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import { marked } from "marked";
import session from "express-session";

dotenv.config();

const app = express();
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecretkey",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 1 day
  })
);

const availableModels = [
    { id: "openrouter/sonoma-dusk-alpha", name: "Sonoma Dusk Alpha" },
    { id: "nvidia/nemotron-nano-9b-v2:free", name: "NVIDIA: Nemotron Nano 9B V2" },
    { id: "openrouter/sonoma-sky-alpha", name: "Sonoma Sky (Alpha)" },
    { id: "deepseek/deepseek-chat-v3.1:free", name: "DeepSeek: DeepSeek V3.1" },
    { id: "tngtech/deepseek-r1t2-chimera:free", name: "TNG: DeepSeek R1T2 Chimera" },
    { id: "z-ai/glm-4.5-air:free", name: "Z.AI: GLM 4.5 Air" },
    { id: "deepseek/deepseek-r1:free", name: "DeepSeek: R1" },
    { id: "google/gemini-2.0-flash-exp:free", name: "Google: Gemini 2.0 Flash Experimental" },
    { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Meta: Llama 3.3 70B Instruct" },
    { id: "microsoft/mai-ds-r1:free", name: "Microsoft: MAI DS R1" }
];
const validModelIds = new Set(availableModels.map(m => m.id));

function escapeHtml(unsafe) {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

app.get("/", (req, res) => {
  if (!req.session.chatHistory) req.session.chatHistory = [];
  res.render("index", { chatHistory: req.session.chatHistory });
});

app.get("/models", (req, res) => {
    res.json(availableModels);
});

app.post("/ask", async (req, res) => {
    const userMessage = (req.body?.message || "").toString().trim();
    const selectedModel = (req.body?.model || "").toString();

    console.log(`Received request for model: ${selectedModel}`);

    if (!userMessage) return res.status(400).json({ error: "No message provided" });
    if (!validModelIds.has(selectedModel)) return res.status(400).json({ error: "Invalid model selected" });

    if (!req.session.chatHistory) req.session.chatHistory = [];

    const userEntry = {
        role: "user",
        content: escapeHtml(userMessage).replace(/\n/g, "<br>"),
        timestamp: Date.now(),
    };
    req.session.chatHistory.push(userEntry);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // UPDATED: Create an AbortController to manage the axios request
    const controller = new AbortController();

    // UPDATED: Abort the request if the client closes the connection
    req.on("close", () => {
      console.log("Client closed connection. Aborting request.");
      controller.abort();
    });

    let fullReply = "";
    try {
        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: selectedModel,
                messages: req.session.chatHistory.map((m) => ({
                    role: m.role === "ai" ? "assistant" : m.role,
                    content: m.content.replace(/<br>/g, "\n"),
                })),
                stream: true,
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                },
                responseType: "stream",
                // UPDATED: Pass the controller's signal to axios
                signal: controller.signal,
            }
        );

        response.data.on("data", (chunk) => {
            const lines = chunk.toString().split('\n').filter(line => line.trim() !== "");
            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    const data = line.substring(6);
                    if (data === "[DONE]") {
                        res.write("data: [DONE]\n\n");
                        return;
                    }
                    try {
                        const json = JSON.parse(data);
                        const content = json.choices[0]?.delta?.content || "";
                        if (content) {
                            fullReply += content;
                            res.write(`data: ${JSON.stringify({ content })}\n\n`);
                        }
                    } catch (e) { /* Ignore parsing errors */ }
                }
            }
        });

        response.data.on("end", () => {
            if (res.writableEnded) return; // Connection might have been closed
            const aiHtml = marked.parse(fullReply);
            const aiEntry = { role: "ai", content: aiHtml, timestamp: Date.now() };
            req.session.chatHistory.push(aiEntry);
            res.end();
        });

        // This is a failsafe for the 'close' event
        response.data.on('error', (err) => {
            if (axios.isCancel(err)) {
                console.log('Stream destroyed due to client disconnect.');
            } else {
                console.error('Stream error:', err);
            }
        });

    } catch (err) {
        if (axios.isCancel(err)) {
            console.log('Request canceled successfully.');
            // Save the partial reply if the request was canceled
            if (fullReply) {
              const aiHtml = marked.parse(fullReply);
              const aiEntry = { role: "ai", content: aiHtml + "\n\n<em>Generation stopped.</em>", timestamp: Date.now() };
              req.session.chatHistory.push(aiEntry);
            }
        } else {
            console.error("=== OPENROUTER API ERROR ===");
            let errorMsg = "An unexpected error occurred. Please try again.";
            if (err.response) {
                console.error(err.response.status, err.response.data);
                errorMsg = `Error: API returned status ${err.response.status}. Check server logs for details.`;
            } else {
                console.error(err.message);
            }
            if (!res.writableEnded) {
                res.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
                res.write("data: [DONE]\n\n");
                res.end();
            }
        }
    }
});

app.post("/clear", (req, res) => {
  req.session.chatHistory = [];
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

