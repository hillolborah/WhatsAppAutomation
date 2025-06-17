#  WhatsApp Conversational LoRA Trainer — v1.0

This project automates WhatsApp message responses using an Ollama language model running locally as a backend and integrates [Baileys](https://github.com/WhiskeySockets/Baileys) — a WhatsApp Web API client library.

---

##  Features (v1)

- 🤖 Message auto-response via locally hosted Ollama model.
- 📄 Session-wise message logging to `.jsonl` files.
- 🔧 Configurable bot behavior via `.env` flags.
- 🔌 Pluggable Ollama model via REST API integration.
- 📝 Log rotation (planned)
- 📊 Dataset preprocessing for LoRA fine-tuning (planned)

---

## 🛠 Installation

###  Clone and Install Dependencies

```
git clone https://github.com/hillolborah/WhatsAppAutomation.git
cd WhatsAppAutomation
npm install
```

## ⚙️ Ollama Setup

Ensure [Ollama](https://ollama.com/download) is installed and running locally.

### 📄 Check Ollama service:

```
systemctl status ollama
```

## List installed models
```
ollama list
```


##Run an Ollama model
```
ollama run phi4
```


## 📲 WhatsApp Bot Setup

### 1️⃣ Configure Environment

Navigate to the project root and set your environment flags:

```
cd WhatsAppAutomation
nano .env
```
### 2️⃣ Start the Bot
```
node whatsapp-bot/src/index.js
```




