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
  
  // Update sources menu position based on composer state
  updateSourcesMenuPosition();
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
  
  // Process text to add citation numbers (needs original text to parse markers)
  const processedText = addCitationNumbers(finalText, citations);
  
  // Format text with markdown-like formatting (after citation processing)
  const formattedText = formatText(processedText);
  bubble.innerHTML = formattedText;
  
  // Post-process: sweep for any missed formatting (hashtags, asterisks)
  postProcessFormatting(bubble);
  
  // Add hover event listeners to citation numbers
  setupCitationHovers(bubble, citations, node);
}

// Check if a paragraph is a markdown table
function isMarkdownTable(text) {
  const lines = text.split('\n');
  // A table needs at least 2 lines (header + separator)
  if (lines.length < 2) return false;
  
  // Check if we have pipe characters indicating table structure
  const hasPipes = lines.some(line => line.includes('|'));
  if (!hasPipes) return false;
  
  // Check for separator line (contains hyphens and pipes)
  const hasSeparator = lines.some(line => /^\|?[\s\-:|]+\|[\s\-:|]*$/.test(line.trim()));
  return hasSeparator;
}

// Convert markdown table to HTML table
function convertMarkdownTableToHTML(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  if (lines.length < 2) return text;
  
  let html = '<table class="markdown-table">';
  let inHeader = true;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip separator line (contains only |, -, :, and spaces)
    if (/^\|?[\s\-:|]+\|[\s\-:|]*$/.test(line)) {
      inHeader = false;
      continue;
    }
    
    // Parse table row
    let cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
    
    // Build row
    const tag = inHeader ? 'th' : 'td';
    html += '<tr>';
    cells.forEach(cell => {
      // Apply inline formatting to cell content
      const formattedCell = applyInlineFormatting(cell);
      html += `<${tag}>${formattedCell}</${tag}>`;
    });
    html += '</tr>';
    
    if (inHeader) inHeader = false;
  }
  
  html += '</table>';
  return html;
}

// Format text with markdown-like formatting (bold, underline, lists, etc.)
// Uses conservative styling approach - only key terms, not whole paragraphs
function formatText(text) {
  if (!text) return '';
  
  let formatted = text;
  
  // Split by double newlines to preserve paragraphs
  const paragraphs = formatted.split(/\n\n+/);
  
  const processedParagraphs = paragraphs.map(para => {
    let processed = para.trim();
    if (!processed) return '';
    
    // Check if this paragraph is a markdown table
    if (isMarkdownTable(processed)) {
      return convertMarkdownTableToHTML(processed);
    }
    
    // Split paragraph by single newlines to handle multi-line content
    const lines = processed.split('\n');
    const processedLines = [];
    
    for (let line of lines) {
      let processedLine = line.trim();
      if (!processedLine) continue;
      
      // Check if this line is a list item (starts with -, *, or •)
      if (/^[\-\*•]\s+/.test(processedLine)) {
        // Extract the list item content and apply inline formatting
        const listContent = processedLine.replace(/^[\-\*•]\s+/, '');
        const formattedContent = applyInlineFormatting(listContent);
        processedLines.push('<li>' + formattedContent + '</li>');
      } 
      // Check if it's a numbered list (1., 2., etc.)
      else if (/^\d+\.\s+/.test(processedLine)) {
        // Extract the list item content and apply inline formatting
        const listContent = processedLine.replace(/^\d+\.\s+/, '');
        const formattedContent = applyInlineFormatting(listContent);
        processedLines.push('<li>' + formattedContent + '</li>');
      }
      // Check if it's a header
      else if (/^###\s+/.test(processedLine)) {
        processedLines.push(processedLine.replace(/^###\s+(.+)$/, '<h3>$1</h3>'));
      } else if (/^##\s+/.test(processedLine)) {
        processedLines.push(processedLine.replace(/^##\s+(.+)$/, '<h2>$1</h2>'));
      } else if (/^#\s+/.test(processedLine)) {
        processedLines.push(processedLine.replace(/^#\s+(.+)$/, '<h1>$1</h1>'));
      }
      // Regular line
      else {
        // Remove any stray citation markers
        processedLine = processedLine.replace(/\[[^\]]+\]/g, '');
        
        if (processedLine.trim()) {
          processedLines.push(applyInlineFormatting(processedLine));
        }
      }
    }
    
    return processedLines.join('\n');
  }).filter(p => p);
  
  // Group consecutive list items
  let result = [];
  let currentList = [];
  
  for (let i = 0; i < processedParagraphs.length; i++) {
    const para = processedParagraphs[i];
    const lines = para.split('\n');
    
    for (let line of lines) {
      if (line.startsWith('<li>')) {
        currentList.push(line);
      } else {
        if (currentList.length > 0) {
          result.push('<ul>' + currentList.join('') + '</ul>');
          currentList = [];
        }
        if (line.trim()) {
          result.push(line);
        }
      }
    }
  }
  
  if (currentList.length > 0) {
    result.push('<ul>' + currentList.join('') + '</ul>');
  }
  
  // Join with double line breaks, then convert remaining newlines to <br>
  formatted = result.join('<br><br>');
  formatted = formatted.replace(/\n/g, '<br>');
  
  return formatted;
}

// Post-process formatting: sweep for any missed hashtags or asterisks
// This catches formatting that might have been missed in the initial processing
function postProcessFormatting(bubbleElement) {
  if (!bubbleElement) return;

  // Work on the HTML string first for block-level patterns (code fences, headings)
  let html = bubbleElement.innerHTML;

  // Escape helper for code blocks
  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Convert triple-backtick code blocks to <pre><code> (preserve content)
  html = html.replace(/```([\s\S]*?)```/g, (m, code) => {
    return '<pre><code>' + escapeHtml(code) + '</code></pre>';
  });

  // Convert markdown headings (lines starting with #) into bold lines
  html = html.replace(/^#{1,6}\s*(.+)$/gm, (m, txt) => {
    return `<div class="markdown-heading">${txt.trim()}</div>`;
  });

  // Now operate safely on text nodes only to avoid mangling existing HTML tags.
  const container = document.createElement('div');
  container.innerHTML = html;

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  textNodes.forEach(node => {
    let t = node.nodeValue;
    if (!t || !t.trim()) return;

    // Inline code `code`
    t = t.replace(/`([^`]+?)`/g, (m, c) => '<code>' + escapeHtml(c) + '</code>');

    // Bold **text** or __text__
    t = t.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/__([^_]+?)__/g, '<strong>$1</strong>');

    // Underline ++text++
    t = t.replace(/\+\+([^+]+?)\+\+/g, '<u>$1</u>');

    // Strikethrough ~~text~~
    t = t.replace(/~~([^~]+?)~~/g, '<s>$1</s>');

    // Italic *text* or _text_ (avoid converting inside already converted tags)
    t = t.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
    t = t.replace(/(?<!_)_([^_]+?)_(?!_)/g, '<em>$1</em>');

    // After replacements, if any markdown markers remain unmatched, strip them
    t = t.replace(/\*{1,2}|_{1,2}|\+{2}|`{1,3}|#{1,6}|~{2}/g, '');

    // If changes occurred, replace the text node with HTML nodes
    if (t !== node.nodeValue) {
      const span = document.createElement('span');
      span.innerHTML = t;
      const parent = node.parentNode;
      while (span.firstChild) parent.insertBefore(span.firstChild, node);
      parent.removeChild(node);
    }
  });

  // Final pass: remove any stray standalone markers left in HTML
  let cleaned = container.innerHTML;
  cleaned = cleaned.replace(/(^|\s)(\*{1,2}|_{1,2}|\+{2}|`{1,3}|#{1,6}|~{2})(?=\s|$)/g, '$1');

  bubbleElement.innerHTML = cleaned;
}

// Apply inline formatting (bold, italic, underline) to text
// Conservative approach: only style key terms, not whole paragraphs
// Similar to Perplexity's minimal styling approach
function applyInlineFormatting(text) {
  let processed = text;
  
  // First, protect already formatted content (HTML tags)
  // This prevents double-processing
  
  // Bold: **text** - but limit to reasonable length (max 100 chars) to avoid styling whole paragraphs
  processed = processed.replace(/\*\*([^*]{1,100}(?:\*(?!\*)[^*]{0,100})*)\*\*/g, (match, content) => {
    // Only apply if it's not too long (likely a key term, not a whole paragraph)
    if (content.length <= 100) {
      return '<strong>' + content + '</strong>';
    }
    return match; // Return original if too long
  });
  
  // Bold: __text__ - same length limit
  processed = processed.replace(/__([^_]{1,100})__/g, (match, content) => {
    if (content.length <= 100) {
      return '<strong>' + content + '</strong>';
    }
    return match;
  });
  
  // Underline: ++text++ - only for short key terms
  processed = processed.replace(/\+\+([^+]{1,80})\+\+/g, (match, content) => {
    if (content.length <= 80) {
      return '<u>' + content + '</u>';
    }
    return match;
  });
  
  // Italic: *text* (only if not part of **text** or ++text++)
  // Use negative lookbehind/lookahead to avoid conflicts
  // Also limit length
  processed = processed.replace(/(?<!\*)\*([^*]{1,80})\*(?!\*)/g, (match, content) => {
    if (content.length <= 80) {
      return '<em>' + content + '</em>';
    }
    return match;
  });
  processed = processed.replace(/(?<!_)_([^_]{1,80})_(?!_)/g, (match, content) => {
    if (content.length <= 80) {
      return '<em>' + content + '</em>';
    }
    return match;
  });
  
  return processed;
}

function addCitationNumbers(text, citations) {
  if (!citations || citations.length === 0) {
    return text;
  }
  
  // Extract all types of citation markers: [1], [web:1], [descriptive text], etc.
  const citationMarkerRegex = /\[([^\]]+)\]/g;
  const citationMarkers = [];
  let match;
  const originalText = text;
  
  // Find all citation markers and their positions in the original text
  while ((match = citationMarkerRegex.exec(originalText)) !== null) {
    const citationContent = match[1];
    let citationIndex = -1;
    
    // Parse different citation formats
    // Format 1: [1], [2], [3] - numeric index
    if (/^\d+$/.test(citationContent)) {
      citationIndex = parseInt(citationContent) - 1;
    }
    // Format 2: [web:1] - web source format
    else if (/^web:(\d+)$/.test(citationContent)) {
      citationIndex = parseInt(citationContent.match(/\d+/)[0]) - 1;
    }
    // Format 3: [descriptive text] - try to find matching citation by description
    else {
      // For descriptive citations, find the first citation that partially matches or use as label
      for (let i = 0; i < citations.length; i++) {
        const citation = citations[i];
        const citationText = typeof citation === 'string' ? citation : (citation.name || citation.url || '');
        // Do a loose match - if the description appears in the citation
        if (citationText.toLowerCase().includes(citationContent.toLowerCase().slice(0, 20))) {
          citationIndex = i;
          break;
        }
      }
      // If no match found, try to use it as a label for the first available citation
      if (citationIndex === -1 && citations.length > 0) {
        citationIndex = 0; // Default to first citation if descriptive match fails
      }
    }
    
    if (citationIndex >= 0 && citationIndex < citations.length) {
      citationMarkers.push({
        index: match.index,
        citationIndex: citationIndex,
        fullMatch: match[0],
        content: citationContent
      });
    }
  }
  
  // Remove citation markers from text (they'll be replaced with superscripts at paragraph ends)
  let cleanedText = text.replace(/\[[^\]]+\]/g, '');
  
  // Split text into paragraphs by double newlines (before HTML formatting)
  const paragraphs = cleanedText.split(/\n\n+/).filter(p => p.trim().length > 0);
  
  // Build a map of which paragraph each citation marker belongs to
  // by tracking character positions
  const paragraphBoundaries = [];
  let currentPos = 0;
  paragraphs.forEach((para, idx) => {
    const start = currentPos;
    const end = start + para.length;
    paragraphBoundaries.push({ start, end, index: idx });
    currentPos = end + 2; // +2 for \n\n separator
  });
  
  // Map citation markers to paragraphs
  const paragraphCitations = paragraphs.map(() => new Set());
  
  citationMarkers.forEach(marker => {
    // Find which paragraph this marker belongs to
    for (let i = 0; i < paragraphBoundaries.length; i++) {
      const boundary = paragraphBoundaries[i];
      // Check if marker is in this paragraph's range
      // Account for slight offsets due to marker removal
      if (marker.index >= boundary.start - 5 && marker.index <= boundary.end + 5) {
        paragraphCitations[i].add(marker.citationIndex);
        break; // Found the paragraph, move to next marker
      }
    }
  });
  
  // Process each paragraph and add citations at the end
  const processedParagraphs = paragraphs.map((para, paraIndex) => {
    const trimmedPara = para.trim();
    if (!trimmedPara) return '';
    
    // Get citations for this paragraph (convert Set to sorted array)
    const paraCitations = Array.from(paragraphCitations[paraIndex]).sort((a, b) => a - b);
    
    // Add citation numbers at the end of the paragraph
    const citationNumbers = paraCitations.map(citationIndex => {
      const citationNum = citationIndex + 1;
      return `<sup class="citation-number" data-citation="${citationIndex}" title="Click to view source">${citationNum}</sup>`;
    }).join(' ');
    
    return trimmedPara + (citationNumbers ? ` ${citationNumbers}` : '');
  });
  
  // Join paragraphs with double newlines (formatText will convert these to <br><br>)
  return processedParagraphs.join('\n\n');
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
    
    // Add click handler to open the source URL
    citationEl.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (citationIndex >= 0 && citationIndex < citations.length) {
        const citation = citations[citationIndex];
        const url = typeof citation === 'string' ? citation : (citation.url || citation.link || '');
        
        if (url) {
          // Open URL in new tab
          window.open(url, '_blank', 'noopener,noreferrer');
        } else {
          // If no URL, at least highlight the source in the sources panel
          highlightSource(citationIndex, messageNode);
        }
      }
    });
    
    // Add pointer cursor to indicate clickability
    citationEl.style.cursor = 'pointer';
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
  
  // Add citation numbers first (needs original text to parse markers)
  const textWithCitations = addCitationNumbers(fullText, citations);
  
  // Then format the text (bold, underline, lists, etc.)
  const processedTextWithCitations = formatText(textWithCitations);
  
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
        // Post-process: sweep for any missed formatting
        postProcessFormatting(bubble);
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
      // Post-process: sweep for any missed formatting
      postProcessFormatting(bubble);
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
    // Append new sources grouped by the user question
    showSources(citations, true, typing, userQuery);
    
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

// (Top-tier source helper removed — trust detection now handled server-side)

// Update sources menu bottom position based on composer state
function updateSourcesMenuPosition() {
  const isComposerFooter = composerEl.classList.contains('composer--bottom') && 
                           composerEl.classList.contains('has-messages');
  
  if (isComposerFooter) {
    sourcesMenuEl.classList.remove('sources-menu--composer-floating');
    sourcesMenuEl.classList.add('sources-menu--composer-footer');
  } else {
    sourcesMenuEl.classList.remove('sources-menu--composer-footer');
    sourcesMenuEl.classList.add('sources-menu--composer-floating');
  }
}

// Sources functionality - now accumulates sources instead of replacing
function showSources(citations, append = false, messageNode = null, questionText = '') {
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
      chatEl.classList.add('chat--sources-menu-visible');
      updateSourcesMenuPosition();
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

    // Create a group container for this question
    const group = document.createElement('div');
    group.className = 'source-group';

    const header = document.createElement('div');
    header.className = 'source-group__header';
    const title = document.createElement('div');
    title.className = 'source-group__title';
    title.textContent = questionText && questionText.trim() ? questionText.trim() : (currentLanguage === 'fr' ? 'Sources' : 'Sources');
    header.appendChild(title);

    // Count indicator (hidden by default; shown when collapsed)
    const countEl = document.createElement('div');
    countEl.className = 'source-group__count';
    countEl.textContent = '';
    header.appendChild(countEl);

    // Toggle icon
    const toggle = document.createElement('div');
    toggle.className = 'source-group__toggle';
    toggle.textContent = '▾';
    header.appendChild(toggle);

    // Clicking header toggles collapse
    header.addEventListener('click', () => {
      const collapsed = group.classList.toggle('source-group--collapsed');
      toggle.textContent = collapsed ? '▸' : '▾';
    });

    group.appendChild(header);

    const list = document.createElement('div');
    list.className = 'source-group__list';

    // displayCounter tracks visible source numbering within this group (starts at 1)
    let displayCounter = 1;
    citations.forEach((source, localIndex) => {
      // Normalize source string
      const sourceUrl = typeof source === 'string' ? source : (source.url || source.link || '');

      // Check if source already exists to avoid duplicates
      const existingItem = Array.from(sourcesContentEl.querySelectorAll('.source-item')).find(
        item => item.querySelector('.source-item__url')?.href === sourceUrl
      );

      if (existingItem) {
        // Source already exists - map to existing global index
        const existingIndex = parseInt(existingItem.getAttribute('data-source-index'));
        citationMapping[localIndex] = existingIndex;
        mappingCreated = true;
        return; // Skip adding duplicate
      }

      // New source - add it under this group
      const item = document.createElement('div');
      item.className = 'source-item';
      sourceCounter++;
      const currentSourceNum = sourceCounter;
      const globalIndex = currentSourceNum - 1;
      item.setAttribute('data-source-index', globalIndex);

      // Map local index to global index
      citationMapping[localIndex] = globalIndex;
      mappingCreated = true;

      // Favicon (attempt to load from origin/favicon.ico)
      const favicon = document.createElement('img');
      favicon.className = 'source-item__favicon';
      try {
        const urlObj = new URL(sourceUrl);
        favicon.src = `${urlObj.origin}/favicon.ico`;
      } catch (e) {
        favicon.src = '';
      }
      // If favicon fails, hide the image
      favicon.onerror = () => { favicon.style.display = 'none'; };

      const contentWrap = document.createElement('div');
      contentWrap.style.display = 'flex';
      contentWrap.style.flexDirection = 'column';
      contentWrap.style.flex = '1';

      // Row containing the source number (title) and optional trusted icon
      const titleRow = document.createElement('div');
      titleRow.style.display = 'flex';
      titleRow.style.alignItems = 'center';
      titleRow.style.gap = '8px';

      const sourceNum = document.createElement('div');
      sourceNum.className = 'source-item__number';
      // Display number restarts per group
      const displayNum = displayCounter++;
      sourceNum.textContent = `${t('source')} ${displayNum}`;
      titleRow.appendChild(sourceNum);

      // Mark trusted sources based on `trusted_level` returned by the server
      // (do not restrict to presence in the JSON; allow heuristic trust scoring)
      const isJsonTrusted = (typeof source === 'object' && (source.trusted_level || 0) >= 3);

      const url = document.createElement('a');
      url.className = 'source-item__url';
      url.href = sourceUrl;
      url.target = '_blank';
      url.rel = 'noopener noreferrer';
      url.textContent = sourceUrl.length > 80 ? sourceUrl.substring(0, 80) + '...' : sourceUrl;

      contentWrap.appendChild(titleRow);

      // If server provided a friendly name, show it (below the title row, above the URL)
      if (typeof source === 'object' && source.name) {
        const friendly = document.createElement('div');
        friendly.className = 'source-item__title';
        if (isJsonTrusted) friendly.classList.add('source-item__title--trusted');
        friendly.textContent = source.name;
        contentWrap.appendChild(friendly);
      } else {
        // No friendly name: create a title element from hostname to allow highlighting when trusted
        try {
          const u = new URL(sourceUrl);
          const friendly = document.createElement('div');
          friendly.className = 'source-item__title';
          if (isJsonTrusted) friendly.classList.add('source-item__title--trusted');
          friendly.textContent = u.hostname;
          contentWrap.appendChild(friendly);
        } catch (e) {
          // fallback: no-op, rely on URL line
        }
      }

      contentWrap.appendChild(url);

      item.appendChild(contentWrap);
      item.appendChild(favicon);
      list.appendChild(item);

      // Add to tracking array
      allSources.push(sourceUrl);
    });

    group.appendChild(list);
    sourcesContentEl.appendChild(group);

    // Update count (number of source items actually added to this group)
    const addedCount = list.querySelectorAll('.source-item').length;
    countEl.textContent = `(${addedCount})`;

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
  chatEl.classList.add('chat--sources-menu-visible');
  updateSourcesMenuPosition();
}

function hideSources() {
  sourcesMenuEl.classList.remove('sources-menu--visible');
  chatEl.classList.remove('chat--sources-menu-visible');
}

// Language selector event
languageSelectEl.value = currentLanguage;
languageSelectEl.addEventListener('change', (e) => {
  currentLanguage = e.target.value;
  localStorage.setItem('preferred-language', currentLanguage);
  updateTranslations();
  // Clear conversation history entirely when changing language
  // to avoid mixing languages and contexts
  conversationHistory = [];
  updateComposerPosition();
  addEmptyHintIfNeeded();
});

// Region selector event
regionSelectEl.value = currentRegion;
regionSelectEl.addEventListener('change', (e) => {
  currentRegion = e.target.value;
  localStorage.setItem('preferred-region', currentRegion);
  // Clear conversation history entirely when changing region
  // to avoid mixing regional contexts
  conversationHistory = [];
  updateComposerPosition();
  addEmptyHintIfNeeded();
});

// Initialize translations
updateTranslations();

// Initialize
updateComposerPosition();
updateSourcesMenuPosition();
addEmptyHintIfNeeded();


