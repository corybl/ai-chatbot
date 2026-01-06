# Celiac Disease AI Chatbot

An AI-powered chatbot specialized exclusively in Celiac Disease, using Perplexity AI for accurate, up-to-date information.

## Features

- 🤖 **Perplexity AI Integration** - Real-time, web-grounded responses
- 🎯 **Celiac Disease Focus** - Specialized exclusively in Celiac Disease topics
- 💬 **Modern Chat UI** - Beautiful dark theme with message bubbles
- 🔄 **Conversation History** - Maintains context across messages
- ⌨️ **Keyboard Shortcuts** - Enter to send, Shift+Enter for newline
- 🧹 **Clear Conversation** - Reset chat history with one click

## Prerequisites

- Node.js 18+ (for native fetch support)
- Perplexity API key ([Get one here](https://www.perplexity.ai/settings/api))

## Setup

1. **Install Dependencies**

```bash
cd /home/corybl/Downloads/ai-chatbot
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
- The chatbot will provide accurate, up-to-date information
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
└── README.md           # This file
```

## API Configuration

The chatbot uses Perplexity's `sonar` model by default (most current and reliable). The system prompt is configured to:

- Only answer questions about Celiac Disease
- Redirect unrelated questions back to Celiac Disease topics
- Provide medical accuracy while recommending professional consultation
- Cover symptoms, diagnosis, treatment, diet, and resources

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
