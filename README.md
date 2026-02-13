# Celiac Disease AI Chatbot

An AI-powered chatbot specialized exclusively in Celiac Disease, using Perplexity AI for accurate, up-to-date information.

## Features

- 🤖 **Perplexity AI Integration** - Real-time, web-grounded responses
- 🎯 **Celiac Disease Focus** - Specialized exclusively in Celiac Disease topics
- 🌍 **Language & Region Switching** - English/French and region-aware sourcing
- 🔎 **URL Analysis** - Paste a URL and the chatbot will analyze page content
- ✅ **Trusted Sources Prioritization** - Uses trusted sources first with fallback only when needed
- 🧾 **Clickable Citations** - Superscript citations open source URLs and highlight in the sources panel
- 📋 **Tables & Lists** - Markdown tables and lists render with proper formatting
- 💬 **Modern Chat UI** - Clean message bubbles with improved readability
- 🔄 **Conversation History** - Maintains context across messages (cleared when switching language/region)
- ⌨️ **Keyboard Shortcuts** - Enter to send, Shift+Enter for newline
- 🧹 **Clear Conversation** - Reset chat history with one click

## Prerequisites

- Node.js 18+ (for native fetch support)
- Perplexity API key ([Get one here](https://www.perplexity.ai/settings/api))

## Setup

1. **Install Dependencies**

```bash
cd PROJECT_DIRECTORY/ai-chatbot
npm install
```

2. **Configure API Key**

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your Perplexity API key:

```
PERPLEXITY_API_KEY=your_perplexity_api_key_here
PORT=3000
```

3. **Start the Server**

```bash
npm start
```

The server will start on `http://localhost:3000`

4. **Open in Browser**

Navigate to `http://localhost:3000` in your web browser.

## Usage

- Type your questions about Celiac Disease in the input field
- Press **Enter** to send, or **Shift+Enter** for a new line
- Paste a URL to have the chatbot analyze the page content
- Click citation numbers to open sources in a new tab
- Switch language/region from the header (this resets conversation context)
- Click the **↺** button to clear the conversation

## Example Questions

- "What are the symptoms of celiac disease?"
- "What foods should I avoid on a gluten-free diet?"
- "How is celiac disease diagnosed?"
- "What is the difference between celiac disease and gluten sensitivity?"

## Project Structure

```
ai-chatbot/
├── server.js           # Express backend server
├── package.json        # Node.js dependencies
├── .env.example        # Environment variables template
├── .env                # Your API key (create this)
├── index.html          # Frontend HTML
├── assets/
│   ├── styles.css      # UI styles
│   └── app.js          # Frontend JavaScript
├── config/
│   └── trusted_sources.json  # Trusted source registry
└── README.md           # This file
```

## API Configuration

The chatbot uses Perplexity's `sonar` model by default. The system prompt is configured to:

- Only answer questions about Celiac Disease
- Redirect unrelated questions back to Celiac Disease topics
- Provide medical accuracy while recommending professional consultation
- Cover symptoms, diagnosis, treatment, diet, and resources
- Require careful product analysis for hidden gluten sources
- Encourage clear formatting (lists and tables)
## Trusted Sources

The chatbot prioritizes sources listed in [config/trusted_sources.json](config/trusted_sources.json). If fewer than 3 trusted sources are available in the Perplexity citations for a response, the chatbot supplements with the highest-scoring non-trusted sources.

To update priority, edit the `trusted_level` values in the JSON file.

## URL Analysis

If a user includes one or more URLs in a question, the server fetches page content and injects it into the prompt. This helps the model analyze ingredients, labeling, or medical content directly from the page.

Notes:
- Up to 3 URLs per message are processed
- A short text extraction is used to avoid overly large prompts

## Troubleshooting

**Error: "Perplexity API key not configured"**
- Make sure you've created a `.env` file with your API key
- Check that the key is correctly set: `PERPLEXITY_API_KEY=your_key_here`
- Restart the server after adding the API key

**Error: "Bad Request" or API errors**
- **Check server console**: The server logs detailed error information. Look for messages like "Perplexity API Error Response"
- **Verify API key**: Make sure your Perplexity API key is valid and has credits
- **Check model name**: The default model is `sonar`. You can try other models in `.env`:
  ```
  PERPLEXITY_MODEL=sonar-pro
  ```
  Other options: `sonar`, `sonar-pro`, `sonar-reasoning`, `sonar-reasoning-pro`
- **Try without system messages**: If system messages cause issues, add to `.env`:
  ```
  USE_SYSTEM_MESSAGE=false
  ```
- **Verify model availability**: Check [Perplexity API documentation](https://docs.perplexity.ai/) for current available models
- **Check error details**: The error message in the chat will show the specific API error. Common issues:
  - Invalid model name → Try a different model in `.env`
  - System messages not supported → Set `USE_SYSTEM_MESSAGE=false`
  - Invalid API key → Verify your key at https://www.perplexity.ai/settings/api

**Error: "Could not connect to server"**
- Ensure the server is running: `npm start`
- Check that you're accessing `http://localhost:3000`
- Verify the port number matches your `.env` file
**Citations are showing as raw [brackets]**
- This should be converted to clickable citation numbers. If not, refresh the page and check the browser console for JS errors.

**Lists show dashes instead of bullet points**
- Lists are converted to HTML bullet points in the frontend. Ensure you are running the latest assets and hard refresh the browser.

**CORS Errors**
- The server is configured to allow CORS from the same origin
- Make sure you're accessing via `http://localhost:3000`, not `file://`

**Getting detailed error information:**
1. Check the server console (where you ran `npm start`) for detailed error logs
2. Check the browser console (F12 → Console tab) for frontend errors
3. The error message in the chat UI will show the specific API error message

## Medical Disclaimer

This chatbot provides general information about Celiac Disease. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult with a qualified healthcare provider for medical concerns.

## License

MIT
