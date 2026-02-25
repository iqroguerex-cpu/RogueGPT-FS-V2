# 🧠 RogueGPT-FlagShip-V2

A lightweight, full-stack AI chat application built with **Express.js**, **EJS**, and **CSS**, featuring **session-based chat history**, **Markdown rendering**, and **real-time streaming** of AI responses via **OpenRouter API**.

---

## 🚀 Live Demo  **(Note: Wait about 10 Minutes for The Site To Render.)**
**[![Live Site](https://img.shields.io/badge/🌐_Live_Demo-Visit_Now-blue?style=for-the-badge)](https://roguegpt-fs-v2.onrender.com)**

---

## 🚀 Features

- 🗣️ **AI Chat with Streaming** — Real-time response streaming from multiple AI models  
- 🧩 **Model Selector** — Choose from top OpenRouter models (Gemini, DeepSeek, LLaMA, etc.)  
- 💬 **Persistent Chat History** — Stored per session using `express-session`  
- 🪶 **Markdown Rendering** — Responses formatted with `marked` for rich output  
- 🧹 **Clear Chat** — One-click option to reset the session  
- ⚡ **Lightweight Architecture** — EJS templating + Express backend + simple CSS UI  

---

## 🏗️ Tech Stack

| Component | Description |
|------------|-------------|
| **Backend** | Node.js + Express |
| **Frontend** | EJS Templates + CSS |
| **AI API** | [OpenRouter](https://openrouter.ai/) |
| **Session Handling** | express-session |
| **Markdown Parsing** | marked |
| **Environment Variables** | dotenv |

---

## 🧩 Supported Models

| Model ID | Name |
|-----------|------|
| `nvidia/nemotron-nano-9b-v2:free` | NVIDIA: Nemotron Nano 9B V2 |
| `meituan/longcat-flash-chat:free` | Meituan: LongCat Flash Chat |
| `alibaba/tongyi-deepresearch-30b-a3b:free` | Tongyi DeepResearch 30B A3B |
| `deepseek/deepseek-chat-v3.1:free` | DeepSeek: DeepSeek V3.1 |
| `tngtech/deepseek-r1t2-chimera:free` | TNG: DeepSeek R1T2 Chimera |
| `z-ai/glm-4.5-air:free` | Z.AI: GLM 4.5 Air |
| `deepseek/deepseek-r1:free` | DeepSeek: R1 |
| `google/gemini-2.0-flash-exp:free` | Google: Gemini 2.0 Flash Experimental |
| `meta-llama/llama-3.3-70b-instruct:free` | Meta: Llama 3.3 70B Instruct |
| `qwen/qwen3-coder:free` | Qwen: Qwen3 Coder 480B A35B |

---

## 🎨 Frontend (EJS + CSS)

- EJS renders chat messages dynamically from session data.  
- Simple CSS provides a clean, modern interface.  
- Supports Markdown and HTML-safe rendering.  

---

## 👨‍💻 Author

**Chinmay V Chatradamath.**  

---

## 📜 License

This project is licensed under the **MIT License** — feel free to use and modify.

---

## 🌟 Support

If you like **RogueGPT-V1**, please consider **starring ⭐ this repository** — it helps more people discover it!

---

> 🧠 **“Build smart. Build fast. Build with AI.”** ✨

