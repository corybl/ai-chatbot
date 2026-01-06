const chatEl = document.getElementById('chat');
const formEl = document.getElementById('composer-form');
const inputEl = document.getElementById('message-input');
const clearBtn = document.getElementById('clear-btn');
const composerEl = document.querySelector('.composer');
const sourcesMenuEl = document.getElementById('sources-menu');
const sourcesContentEl = document.getElementById('sources-content');
const languageSelectEl = document.getElementById('language-select');
const regionSelectEl = document.getElementById('region-select');

// Language translations
const translations = {
  en: {
    'title': 'Celiac Disease Assistant',
    'sources-title': 'Sources',
    'suggestions-title': 'Suggested Questions',
    'input-placeholder': 'Ask about Celiac Disease...',
    'send-button': 'Send',
    'empty-hint': 'Ask me anything about Celiac Disease! Try: <b>"What are the symptoms of celiac disease?"</b>',
    'no-sources': 'No sources available for this response.',
    'source': 'Source',
    'sending': 'Sending...',
    'clear': 'Clear conversation'
  },
  fr: {
    'title': 'Assistant Maladie Cœliaque',
    'sources-title': 'Sources',
    'suggestions-title': 'Questions Suggérées',
    'input-placeholder': 'Posez une question sur la maladie cœliaque...',
    'send-button': 'Envoyer',
    'empty-hint': 'Posez-moi n\'importe quelle question sur la maladie cœliaque! Essayez: <b>"Quels sont les symptômes de la maladie cœliaque?"</b>',
    'no-sources': 'Aucune source disponible pour cette réponse.',
    'source': 'Source',
    'sending': 'Envoi...',
    'clear': 'Effacer la conversation'
  }
};

// Current language (default to English)
let currentLanguage = localStorage.getItem('preferred-language') || 'en';

// Current region (default to Canada)
let currentRegion = localStorage.getItem('preferred-region') || 'canada';

// Translation function
function t(key) {
  return translations[currentLanguage][key] || translations.en[key] || key;
}

// Update UI translations
function updateTranslations() {
  // Update elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (el.tagName === 'BUTTON' || el.tagName === 'INPUT') {
      el.textContent = t(key);
    } else {
      el.textContent = t(key);
    }
  });
  
  // Update placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });
  
  // Update titles
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    el.title = t(key);
    el.setAttribute('aria-label', t(key));
  });
  
  // Update HTML lang attribute
  document.documentElement.lang = currentLanguage;
  
  // Update empty hint if it exists
  const emptyHint = chatEl.querySelector('.empty-hint');
  if (emptyHint) {
    emptyHint.innerHTML = t('empty-hint');
  }
}

function createMessageElement({ role, text, isTyping = false, isFormatted = false }) {
  const wrapper = document.createElement('div');
  wrapper.className = `message message--${role}`;

  // Create content container for avatar and bubble
  const contentContainer = document.createElement('div');
  contentContainer.className = 'message__content';

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = role === 'user' ? 'U' : 'AI';

  const bubble = document.createElement('div');
  bubble.className = 'bubble';

  if (isTyping) {
    const typing = document.createElement('div');
    typing.className = 'typing';
    typing.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    bubble.appendChild(typing);
  } else if (isFormatted) {
    bubble.innerHTML = text;
  } else {
    bubble.textContent = text;
  }

  // Add avatar and bubble to content container
  // Order is handled by CSS (user: bubble then avatar, bot: avatar then bubble)
  contentContainer.appendChild(avatar);
  contentContainer.appendChild(bubble);
  
  // Add content container to wrapper (suggestions will be added as siblings)
  wrapper.appendChild(contentContainer);
  return wrapper;
}

function scrollToBottom() {
  chatEl.scrollTo({ top: chatEl.scrollHeight, behavior: 'smooth' });
}

function updateComposerPosition() {
  const hasMessages = chatEl.children.length > 0 && !chatEl.querySelector('.empty-hint');
  const hasBotResponse = Array.from(chatEl.children).some(child => 
    child.classList.contains('message--bot')
  );
  
  if (!hasMessages) {
    // No messages - center it
    composerEl.classList.remove('composer--bottom', 'has-messages');
    composerEl.classList.add('composer--centered');
  } else if (hasMessages && !hasBotResponse) {
    // User message but no bot response yet - floating bottom
    composerEl.classList.remove('composer--centered', 'has-messages');
    composerEl.classList.add('composer--bottom');
  } else {
    // Has messages and bot response - sticky footer
    composerEl.classList.remove('composer--centered');
    composerEl.classList.add('composer--bottom', 'has-messages');
  }
}

function addEmptyHintIfNeeded() {
  if (chatEl.children.length === 0) {
    const hint = document.createElement('div');
    hint.className = 'empty-hint';
    hint.innerHTML = t('empty-hint');
    chatEl.appendChild(hint);
    updateComposerPosition();
  }
}

function removeEmptyHint() {
  const hint = chatEl.querySelector('.empty-hint');
  if (hint) hint.remove();
}

function addMessage(role, text, isFormatted = false) {
  removeEmptyHint();
  const node = createMessageElement({ role, text, isFormatted });
  chatEl.appendChild(node);
  updateComposerPosition();
  requestAnimationFrame(scrollToBottom);
  return node;
}

function addTyping() {
  removeEmptyHint();
  const node = createMessageElement({ role: 'bot', text: '', isTyping: true });
  chatEl.appendChild(node);
  updateComposerPosition();
  requestAnimationFrame(scrollToBottom);
  return node;
}

function replaceTyping(node, finalText, citations = []) {
  const bubble = node.querySelector('.bubble');
  bubble.innerHTML = '';
  
  // Format text with markdown-like formatting
  const formattedText = formatText(finalText);
  
  // Process text to add citation numbers
  const processedText = addCitationNumbers(formattedText, citations);
  bubble.innerHTML = processedText;
  
  // Add hover event listeners to citation numbers
  setupCitationHovers(bubble, citations, node);
}

// Format text with markdown-like formatting (bold, underline, lists, etc.)
function formatText(text) {
  if (!text) return '';
  
  let formatted = text;
  
  // Split by double newlines to preserve paragraphs
  const paragraphs = formatted.split(/\n\n+/);
  
  const processedParagraphs = paragraphs.map(para => {
    let processed = para.trim();
    if (!processed) return '';
    
    // Headers first (before other formatting)
    if (/^###\s+/.test(processed)) {
      processed = processed.replace(/^###\s+(.+)$/, '<h3>$1</h3>');
    } else if (/^##\s+/.test(processed)) {
      processed = processed.replace(/^##\s+(.+)$/, '<h2>$1</h2>');
    } else if (/^#\s+/.test(processed)) {
      processed = processed.replace(/^#\s+(.+)$/, '<h1>$1</h1>');
    }
    // Check if it's a list item
    else if (/^[\-\*]\s+/.test(processed)) {
      // Extract the list item content and apply inline formatting
      const listContent = processed.replace(/^[\-\*]\s+/, '');
      const formattedContent = applyInlineFormatting(listContent);
      processed = '<li>' + formattedContent + '</li>';
    } else if (/^\d+\.\s+/.test(processed)) {
      // Extract the list item content and apply inline formatting
      const listContent = processed.replace(/^\d+\.\s+/, '');
      const formattedContent = applyInlineFormatting(listContent);
      processed = '<li>' + formattedContent + '</li>';
    }
    // Regular paragraph - apply inline formatting
    else {
      processed = applyInlineFormatting(processed);
    }
    
    return processed;
  }).filter(p => p);
  
  // Group consecutive list items
  let result = [];
  let currentList = [];
  
  for (let i = 0; i < processedParagraphs.length; i++) {
    const para = processedParagraphs[i];
    
    if (para.startsWith('<li>')) {
      currentList.push(para);
    } else {
      if (currentList.length > 0) {
        result.push('<ul>' + currentList.join('') + '</ul>');
        currentList = [];
      }
      result.push(para);
    }
  }
  
  if (currentList.length > 0) {
    result.push('<ul>' + currentList.join('') + '</ul>');
  }
  
  // Join with double line breaks, then convert single newlines to <br>
  formatted = result.join('<br><br>');
  formatted = formatted.replace(/\n/g, '<br>');
  
  return formatted;
}

// Apply inline formatting (bold, italic, underline) to text
function applyInlineFormatting(text) {
  let processed = text;
  
  // Bold: **text** (greedy match to handle multiple bold sections)
  processed = processed.replace(/\*\*([^*]+(?:\*(?!\*)[^*]*)*)\*\*/g, '<strong>$1</strong>');
  // Bold: __text__
  processed = processed.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  
  // Underline: ++text++ (before italic to avoid conflicts)
  processed = processed.replace(/\+\+([^+]+)\+\+/g, '<u>$1</u>');
  
  // Italic: *text* (only if not part of **text** or ++text++)
  // Use negative lookbehind/lookahead to avoid conflicts
  processed = processed.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  processed = processed.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>');
  
  return processed;
}

function addCitationNumbers(text, citations) {
  if (!citations || citations.length === 0) {
    return text; // Text is already formatted with HTML, don't add extra <br> tags
  }
  
  // First, remove any existing citation markers from the text
  let cleanedText = text.replace(/\[\d+\]/g, '');
  
  // Split text into paragraphs (by double newlines or single newlines that create breaks)
  const paragraphs = cleanedText.split(/\n\n+/).filter(p => p.trim().length > 0);
  
  // Process each paragraph to add citation numbers at the end
  const processedParagraphs = paragraphs.map((paragraph, paraIndex) => {
    const trimmedPara = paragraph.trim();
    
    // Assign citations to paragraphs - distribute them evenly
    // Each paragraph gets at least one citation, cycling through available sources
    const citationsPerPara = Math.ceil(citations.length / paragraphs.length);
    const startIndex = paraIndex * citationsPerPara;
    const endIndex = Math.min(startIndex + citationsPerPara, citations.length);
    
    // Get citations for this paragraph
    const paraCitations = [];
    for (let i = startIndex; i < endIndex && i < citations.length; i++) {
      paraCitations.push(i);
    }
    
    // If no citations assigned, use modulo to ensure every paragraph has at least one
    if (paraCitations.length === 0 && citations.length > 0) {
      paraCitations.push(paraIndex % citations.length);
    }
    
    // Remove duplicates and sort
    const uniqueCitations = [...new Set(paraCitations)].sort((a, b) => a - b);
    
    // Add citation numbers at the end of the paragraph
    const citationNumbers = uniqueCitations.map(citationIndex => {
      const citationNum = citationIndex + 1;
      return `<sup class="citation-number" data-citation="${citationIndex}">${citationNum}</sup>`;
    }).join(' ');
    
    return trimmedPara + (citationNumbers ? ` ${citationNumbers}` : '');
  });
  
  return processedParagraphs.join('<br><br>');
}

function setupCitationHovers(bubbleElement, citations, messageNode = null) {
  const citationNumbers = bubbleElement.querySelectorAll('.citation-number');
  
  citationNumbers.forEach(citationEl => {
    const citationIndex = parseInt(citationEl.getAttribute('data-citation'));
    
    citationEl.addEventListener('mouseenter', () => {
      highlightSource(citationIndex, messageNode);
    });
    
    citationEl.addEventListener('mouseleave', () => {
      unhighlightAllSources();
    });
  });
}

// Store citation mappings for each message to map local citation indices to global source indices
const citationMappings = new Map();

function highlightSource(index, messageNode = null) {
  const sourceItems = sourcesContentEl.querySelectorAll('.source-item');
  
  // If we have a message node, try to find the mapping for this specific message
  if (messageNode) {
    const messageId = messageNode.getAttribute('data-message-id');
    if (messageId && citationMappings.has(messageId)) {
      const mapping = citationMappings.get(messageId);
      if (mapping[index] !== undefined) {
        // Use the mapped global index
        index = mapping[index];
      }
    }
  }
  
  sourceItems.forEach((item) => {
    const itemIndex = parseInt(item.getAttribute('data-source-index'));
    if (itemIndex === index) {
      item.classList.add('source-item--highlighted');
      // Scroll into view if needed
      item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      item.classList.remove('source-item--highlighted');
    }
  });
}

function unhighlightAllSources() {
  const sourceItems = sourcesContentEl.querySelectorAll('.source-item');
  sourceItems.forEach(item => {
    item.classList.remove('source-item--highlighted');
  });
}

// Conversation history to maintain context
let conversationHistory = [];

// Call Perplexity API via backend
async function getPerplexityResponse(userText) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: userText,
        conversationHistory: conversationHistory,
        language: currentLanguage,
        region: currentRegion
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API Error Details:', errorData);
      
      // Extract error message - try multiple possible locations
      let errorMsg = errorData.error;
      if (typeof errorMsg === 'object') {
        errorMsg = errorMsg.message || errorMsg.error || JSON.stringify(errorMsg);
      }
      if (!errorMsg) {
        errorMsg = errorData.message || errorData.details || `HTTP error! status: ${response.status}`;
      }
      
      // If details is a string, try to parse it for more info
      if (errorData.details && typeof errorData.details === 'string') {
        try {
          const parsed = JSON.parse(errorData.details);
          if (parsed.error?.message) {
            errorMsg = parsed.error.message;
          } else if (parsed.message) {
            errorMsg = parsed.message;
          }
        } catch (e) {
          // Keep original errorMsg if parsing fails
        }
      }
      
      throw new Error(errorMsg || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Update conversation history
    conversationHistory.push(
      { role: 'user', content: userText },
      { role: 'assistant', content: data.reply }
    );
    
    // Keep conversation history manageable (last 10 messages)
    if (conversationHistory.length > 20) {
      conversationHistory = conversationHistory.slice(-20);
    }
    
    // Return reply and citations
    return {
      reply: data.reply,
      citations: data.citations || [],
      citationMarkers: data.citationMarkers || null
    };
  } catch (error) {
    console.error('Error fetching response:', error);
    
    // User-friendly error messages
    if (error.message.includes('API key')) {
      return 'Error: Perplexity API key not configured. Please check the server configuration.';
    }
    if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
      return 'Error: Could not connect to server. Make sure the server is running on http://localhost:3000';
    }
    
    // Show more detailed error if available
    let errorMsg = error.message;
    try {
      // Try to parse error message for JSON details
      if (error.message.includes('{')) {
        const match = error.message.match(/\{.*\}/);
        if (match) {
          const errorObj = JSON.parse(match[0]);
          errorMsg = errorObj.error || errorObj.message || errorMsg;
        }
      }
    } catch (e) {
      // Keep original error message if parsing fails
    }
    
    return `Error: ${errorMsg}. Please check the server console for more details.`;
  }
}

async function simulateAiTyping(typingNode, fullText, citations = []) {
  // Simulate thinking delay
  await new Promise(r => setTimeout(r, 400 + Math.random() * 400));
  
  const bubble = typingNode.querySelector('.bubble');
  bubble.innerHTML = '';
  
  // Format the text first (bold, underline, lists, etc.)
  const formattedText = formatText(fullText);
  
  // Then add citation numbers
  const processedTextWithCitations = addCitationNumbers(formattedText, citations);
  
  // Extract plain text for character counting
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = processedTextWithCitations;
  const plainText = tempDiv.textContent || tempDiv.innerText || '';
  const totalChars = plainText.length;
  
  // Type character by character with HTML structure
  let currentChars = 0;
  const typingSpeed = 3; // characters per frame
  const typingDuration = (totalChars / typingSpeed) * 12 + 200;
  
  return new Promise((resolve) => {
    const typeInterval = setInterval(() => {
      currentChars += typingSpeed;
      
      if (currentChars >= totalChars) {
        clearInterval(typeInterval);
        bubble.innerHTML = processedTextWithCitations;
        setupCitationHovers(bubble, citations, typingNode);
        resolve(); // Resolve when typing is complete
      } else {
        // Show partial content - simplified progressive display
        const ratio = currentChars / totalChars;
        const partialLength = Math.floor(processedTextWithCitations.length * ratio);
        bubble.innerHTML = processedTextWithCitations.substring(0, partialLength);
      }
    }, 12);
    
    // Ensure full content is shown after animation completes
    setTimeout(() => {
      clearInterval(typeInterval);
      bubble.innerHTML = processedTextWithCitations;
      setupCitationHovers(bubble, citations, typingNode);
      resolve(); // Resolve when typing is complete
    }, typingDuration);
  });
}

formEl.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;

  // Disable form while processing
  const sendBtn = document.getElementById('send-btn');
  const originalBtnText = sendBtn.textContent;
  sendBtn.disabled = true;
  sendBtn.textContent = t('sending');
  inputEl.disabled = true;

  addMessage('user', text);
  const userQuery = text; // Store the query for suggestions
  inputEl.value = '';
  autoResize(); // Reset textarea height

  const typing = addTyping();
  
  // Show sources menu immediately while AI is typing (don't clear existing sources)
  // Only show empty state if this is the first question
  if (sourcesContentEl.children.length === 0) {
    showSources([]);
  }
  
  try {
    const response = await getPerplexityResponse(userQuery);
    const reply = response.reply || response; // Handle both formats
    const citations = response.citations || [];
    const citationMarkers = response.citationMarkers || null;
    
    // Show sources menu as soon as we get the response (while typing)
    // Append new sources instead of replacing
    showSources(citations, true, typing);
    
    // Simulate typing animation with citations
    await simulateAiTyping(typing, reply, citations);
    
    // Show inline suggestions after typing completes
    showInlineSuggestions(userQuery, reply, typing);
  } catch (error) {
    replaceTyping(typing, `Error: ${error.message}`, []);
    showSources([]);
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = originalBtnText;
    inputEl.disabled = false;
    inputEl.focus();
    scrollToBottom();
  }
});

// Autosize textarea
function autoResize() {
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 160) + 'px';
}
inputEl.addEventListener('input', autoResize);
queueMicrotask(autoResize);

// Enter to send, Shift+Enter new line
inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    formEl.requestSubmit();
  }
});

// Clear chat
clearBtn.addEventListener('click', () => {
  chatEl.innerHTML = '';
  conversationHistory = []; // Reset conversation history
  hideSuggestions(); // Hide suggestions when clearing
  hideSources(); // Hide sources when clearing
  allSources = []; // Reset sources tracking
  sourceCounter = 0; // Reset source counter
  sourcesContentEl.innerHTML = ''; // Clear sources content
  citationMappings.clear(); // Clear citation mappings
  updateComposerPosition();
  addEmptyHintIfNeeded();
  inputEl.focus();
});

// Suggestions functionality
function generateSuggestions(userQuery, aiResponse) {
  // Generate contextual suggestions based on the conversation and language
  const suggestions = [];
  const queryLower = userQuery.toLowerCase();
  
  // General suggestions based on language
  const generalSuggestions = {
    en: [
      "What are the main symptoms of celiac disease?",
      "How is celiac disease diagnosed?",
      "What foods should I avoid with celiac disease?",
      "What is a gluten-free diet?",
      "Can celiac disease be cured?",
      "What are the long-term complications of celiac disease?",
      "How do I read food labels for gluten?",
      "What are safe grains for celiac disease?",
      "What is the difference between celiac disease and gluten sensitivity?",
      "How do I manage celiac disease in restaurants?"
    ],
    fr: [
      "Quels sont les principaux symptômes de la maladie cœliaque?",
      "Comment diagnostique-t-on la maladie cœliaque?",
      "Quels aliments dois-je éviter avec la maladie cœliaque?",
      "Qu'est-ce qu'un régime sans gluten?",
      "La maladie cœliaque peut-elle être guérie?",
      "Quelles sont les complications à long terme de la maladie cœliaque?",
      "Comment lire les étiquettes alimentaires pour le gluten?",
      "Quelles sont les céréales sûres pour la maladie cœliaque?",
      "Quelle est la différence entre la maladie cœliaque et la sensibilité au gluten?",
      "Comment gérer la maladie cœliaque dans les restaurants?"
    ]
  };
  
  const generalSuggestionsList = generalSuggestions[currentLanguage] || generalSuggestions.en;
  
  // Context-specific suggestions based on user query and language
  const contextSuggestions = {
    en: {
      symptom: [
        "How long do symptoms take to appear?",
        "What are the digestive symptoms?",
        "Are there non-digestive symptoms?"
      ],
      diagnos: [
        "What tests are used to diagnose celiac disease?",
        "Do I need to be eating gluten before testing?",
        "What is a biopsy for celiac disease?"
      ],
      diet: [
        "What foods are naturally gluten-free?",
        "How do I avoid cross-contamination?",
        "What about oats and celiac disease?",
        "Can I eat out safely with celiac disease?"
      ],
      treatment: [
        "What medications help with celiac disease?",
        "How long does it take to heal?",
        "What supplements might I need?",
        "How do I know if I'm healing?"
      ],
      child: [
        "How is celiac disease different in children?",
        "What are symptoms in children?",
        "How do I help my child with celiac disease?"
      ]
    },
    fr: {
      symptom: [
        "Combien de temps faut-il pour que les symptômes apparaissent?",
        "Quels sont les symptômes digestifs?",
        "Y a-t-il des symptômes non digestifs?"
      ],
      diagnos: [
        "Quels tests sont utilisés pour diagnostiquer la maladie cœliaque?",
        "Dois-je manger du gluten avant les tests?",
        "Qu'est-ce qu'une biopsie pour la maladie cœliaque?"
      ],
      diet: [
        "Quels aliments sont naturellement sans gluten?",
        "Comment éviter la contamination croisée?",
        "Qu'en est-il de l'avoine et de la maladie cœliaque?",
        "Puis-je manger au restaurant en toute sécurité avec la maladie cœliaque?"
      ],
      treatment: [
        "Quels médicaments aident avec la maladie cœliaque?",
        "Combien de temps faut-il pour guérir?",
        "Quels suppléments pourrais-je avoir besoin?",
        "Comment savoir si je guéris?"
      ],
      child: [
        "En quoi la maladie cœliaque est-elle différente chez les enfants?",
        "Quels sont les symptômes chez les enfants?",
        "Comment aider mon enfant atteint de la maladie cœliaque?"
      ]
    }
  };
  
  const contextSuggestionsList = contextSuggestions[currentLanguage] || contextSuggestions.en;
  
  // Check for keywords in both languages
  const symptomKeywords = currentLanguage === 'fr' 
    ? ['symptom', 'symptôme', 'symptomes'] 
    : ['symptom'];
  const diagnosKeywords = currentLanguage === 'fr'
    ? ['diagnos', 'test', 'diagnostic', 'diagnostiquer']
    : ['diagnos', 'test'];
  const dietKeywords = currentLanguage === 'fr'
    ? ['diet', 'food', 'gluten', 'régime', 'aliment', 'nourriture']
    : ['diet', 'food', 'gluten'];
  const treatmentKeywords = currentLanguage === 'fr'
    ? ['treatment', 'cure', 'manage', 'traitement', 'guérir', 'gérer', 'soin']
    : ['treatment', 'cure', 'manage'];
  const childKeywords = currentLanguage === 'fr'
    ? ['child', 'kid', 'pediatric', 'enfant', 'enfant', 'pédiatrie']
    : ['child', 'kid', 'pediatric'];
  
  if (symptomKeywords.some(keyword => queryLower.includes(keyword))) {
    suggestions.push(...contextSuggestionsList.symptom);
  } else if (diagnosKeywords.some(keyword => queryLower.includes(keyword))) {
    suggestions.push(...contextSuggestionsList.diagnos);
  } else if (dietKeywords.some(keyword => queryLower.includes(keyword))) {
    suggestions.push(...contextSuggestionsList.diet);
  } else if (treatmentKeywords.some(keyword => queryLower.includes(keyword))) {
    suggestions.push(...contextSuggestionsList.treatment);
  } else if (childKeywords.some(keyword => queryLower.includes(keyword))) {
    suggestions.push(...contextSuggestionsList.child);
  } else {
    // Use general suggestions
    suggestions.push(...generalSuggestionsList.slice(0, 4));
  }
  
  // Add some general follow-up questions
  if (suggestions.length < 4) {
    const remaining = generalSuggestionsList.filter(s => !suggestions.includes(s));
    suggestions.push(...remaining.slice(0, 4 - suggestions.length));
  }
  
  return suggestions.slice(0, 4); // Return top 4 suggestions
}

// Inline suggestions that appear below AI responses
function showInlineSuggestions(userQuery, aiResponse, messageNode) {
  const suggestions = generateSuggestions(userQuery, aiResponse);
  
  // Remove any existing inline suggestions
  const existingSuggestions = messageNode.querySelector('.inline-suggestions');
  if (existingSuggestions) {
    existingSuggestions.remove();
  }
  
  if (suggestions.length === 0) return;
  
  // Create inline suggestions container
  const suggestionsContainer = document.createElement('div');
  suggestionsContainer.className = 'inline-suggestions';
  
  const suggestionsTitle = document.createElement('div');
  suggestionsTitle.className = 'inline-suggestions__title';
  suggestionsTitle.textContent = currentLanguage === 'fr' ? 'Questions suggérées:' : 'Suggested questions:';
  suggestionsContainer.appendChild(suggestionsTitle);
  
  const suggestionsList = document.createElement('div');
  suggestionsList.className = 'inline-suggestions__list';
  
  suggestions.forEach(suggestion => {
    const item = document.createElement('button');
    item.className = 'inline-suggestion-item';
    item.textContent = suggestion;
    item.type = 'button';
    item.addEventListener('click', () => {
      // Set the input value and submit
      inputEl.value = suggestion;
      autoResize();
      formEl.requestSubmit();
    });
    suggestionsList.appendChild(item);
  });
  
  suggestionsContainer.appendChild(suggestionsList);
  messageNode.appendChild(suggestionsContainer);
  
  // Scroll to show suggestions
  requestAnimationFrame(() => {
    suggestionsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

// Track all sources across multiple questions
let allSources = [];
let sourceCounter = 0;

// Sources functionality - now accumulates sources instead of replacing
function showSources(citations, append = false, messageNode = null) {
  // If not appending, clear existing sources (only when explicitly clearing)
  if (!append) {
    // Only clear if there are no citations (empty response)
    if (!citations || citations.length === 0) {
      sourcesContentEl.innerHTML = '';
      const noSources = document.createElement('div');
      noSources.className = 'source-item';
      noSources.textContent = t('no-sources');
      sourcesContentEl.appendChild(noSources);
      // Show the menu with smooth slide animation
      sourcesMenuEl.classList.add('sources-menu--visible');
      return;
    }
  }
  
  // Remove "no sources" message if it exists
  const noSourcesMsg = sourcesContentEl.querySelector('.source-item:only-child');
  if (noSourcesMsg && noSourcesMsg.textContent === t('no-sources')) {
    noSourcesMsg.remove();
  }
  
  console.log('Showing sources:', citations, 'append:', append);
  
  if (citations && citations.length > 0) {
    // Create mapping from local citation index to global source index for this message
    const citationMapping = {};
    let mappingCreated = false;
    
    // Add a separator if appending to existing sources
    if (append && sourcesContentEl.children.length > 0) {
      const separator = document.createElement('div');
      separator.className = 'source-separator';
      separator.innerHTML = '<div class="source-separator__line"></div>';
      sourcesContentEl.appendChild(separator);
    }
    
    citations.forEach((source, localIndex) => {
      // Check if source already exists to avoid duplicates
      const existingSources = Array.from(sourcesContentEl.querySelectorAll('.source-item__url'));
      const existingItem = Array.from(sourcesContentEl.querySelectorAll('.source-item')).find(
        item => item.querySelector('.source-item__url')?.href === source
      );
      
      if (existingItem) {
        // Source already exists - map to existing global index
        const existingIndex = parseInt(existingItem.getAttribute('data-source-index'));
        citationMapping[localIndex] = existingIndex;
        mappingCreated = true;
        return; // Skip adding duplicate
      }
      
      // New source - add it
      const item = document.createElement('div');
      item.className = 'source-item';
      sourceCounter++;
      const currentSourceNum = sourceCounter;
      const globalIndex = currentSourceNum - 1;
      item.setAttribute('data-source-index', globalIndex);
      
      // Map local index to global index
      citationMapping[localIndex] = globalIndex;
      mappingCreated = true;
      
      const sourceNum = document.createElement('div');
      sourceNum.className = 'source-item__number';
      sourceNum.textContent = `${t('source')} ${currentSourceNum}`;
      
      const url = document.createElement('a');
      url.className = 'source-item__url';
      url.href = source;
      url.target = '_blank';
      url.rel = 'noopener noreferrer';
      url.textContent = source.length > 80 ? source.substring(0, 80) + '...' : source;
      
      item.appendChild(sourceNum);
      item.appendChild(url);
      sourcesContentEl.appendChild(item);
      
      // Add to tracking array
      allSources.push(source);
    });
    
    // Store citation mapping for this message if we have a message node
    if (messageNode && mappingCreated) {
      const messageId = messageNode.getAttribute('data-message-id') || 
                       `msg-${Date.now()}-${Math.random()}`;
      messageNode.setAttribute('data-message-id', messageId);
      citationMappings.set(messageId, citationMapping);
    }
    
    // Scroll to bottom of sources menu to show new sources
    requestAnimationFrame(() => {
      sourcesContentEl.scrollTo({ top: sourcesContentEl.scrollHeight, behavior: 'smooth' });
    });
  }
  
  // Show the menu with smooth slide animation
  sourcesMenuEl.classList.add('sources-menu--visible');
}

function hideSources() {
  sourcesMenuEl.classList.remove('sources-menu--visible');
}

// Language selector event
languageSelectEl.value = currentLanguage;
languageSelectEl.addEventListener('change', (e) => {
  currentLanguage = e.target.value;
  localStorage.setItem('preferred-language', currentLanguage);
  updateTranslations();
  // Keep chat history - new responses will use the new language
  updateComposerPosition();
  addEmptyHintIfNeeded();
});

// Region selector event
regionSelectEl.value = currentRegion;
regionSelectEl.addEventListener('change', (e) => {
  currentRegion = e.target.value;
  localStorage.setItem('preferred-region', currentRegion);
  // Keep chat history - new responses will use the new region
  updateComposerPosition();
  addEmptyHintIfNeeded();
});

// Initialize translations
updateTranslations();

// Initialize
updateComposerPosition();
addEmptyHintIfNeeded();


