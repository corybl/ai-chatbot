const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Node 18+ has native fetch built-in

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// System prompt to restrict conversation to Celiac Disease only
function getSystemPrompt(language = 'en', region = 'canada') {
  // Region-specific context
  const regionContext = {
    canada: {
      en: `Focus on Canadian sources, regulations, healthcare systems, and resources. Reference Canadian guidelines, Health Canada regulations, and Canadian celiac associations. Mention Canadian-specific labeling laws, healthcare coverage, and support organizations like the Canadian Celiac Association.`,
      fr: `Concentrez-vous sur les sources canadiennes, les règlementations, les systèmes de santé et les ressources. Référencez les lignes directrices canadiennes, les règlementations de Santé Canada et les associations canadiennes de la maladie cœliaque. Mentionnez les lois d'étiquetage spécifiques au Canada, la couverture des soins de santé et les organismes de soutien comme l'Association canadienne de la maladie cœliaque.`
    },
    usa: {
      en: `Focus on US sources, regulations, healthcare systems, and resources. Reference FDA regulations, US celiac organizations like Beyond Celiac and the Celiac Disease Foundation, US healthcare coverage (insurance), and FDA gluten-free labeling requirements (20ppm standard).`,
      fr: `Concentrez-vous sur les sources américaines, les règlementations, les systèmes de santé et les ressources. Référencez les règlementations de la FDA, les organisations américaines comme Beyond Celiac et la Celiac Disease Foundation, la couverture des soins de santé aux États-Unis (assurance), et les exigences d'étiquetage sans gluten de la FDA (norme de 20 ppm).`
    },
    europe: {
      en: `Focus on European sources, regulations, healthcare systems, and resources. Reference EU regulations, European celiac societies, EU gluten-free labeling laws (Codex Alimentarius standard of 20ppm, the "crossed grain" symbol), and European healthcare systems. Include information from various EU member countries when relevant.`,
      fr: `Concentrez-vous sur les sources européennes, les règlementations, les systèmes de santé et les ressources. Référencez les règlementations de l'UE, les sociétés européennes de la maladie cœliaque, les lois d'étiquetage sans gluten de l'UE (norme du Codex Alimentarius de 20 ppm, le symbole "épi barré"), et les systèmes de santé européens. Incluez des informations de divers pays membres de l'UE lorsque cela est pertinent.`
    }
  };

  const regionInfo = regionContext[region] || regionContext.canada;
  const regionText = regionInfo[language] || regionInfo.en;

  const prompts = {
    en: `You are a knowledgeable AI assistant specialized exclusively in Celiac Disease. 
Your role is to provide accurate, helpful information about Celiac Disease including:
- Symptoms and diagnosis
- Treatment and management
- Gluten-free diet and nutrition
- Research and latest findings
- Support and resources

REGIONAL FOCUS: ${regionText}

IMPORTANT: You must ONLY answer questions related to Celiac Disease. If asked about unrelated topics, politely redirect the conversation back to Celiac Disease. Always prioritize medical accuracy and recommend consulting healthcare professionals for medical advice. Prioritize sources and information from the specified region. Respond ONLY in English.`,
    
    fr: `Vous êtes un assistant IA spécialisé exclusivement dans la maladie cœliaque. 
Votre rôle est de fournir des informations précises et utiles sur la maladie cœliaque, notamment :
- Symptômes et diagnostic
- Traitement et gestion
- Régime sans gluten et nutrition
- Recherche et découvertes récentes
- Soutien et ressources

FOCUS RÉGIONAL : ${regionText}

IMPORTANT : Vous devez UNIQUEMENT répondre aux questions liées à la maladie cœliaque. Si on vous pose des questions sur d'autres sujets, redirigez poliment la conversation vers la maladie cœliaque. Priorisez toujours la précision médicale et recommandez de consulter des professionnels de la santé pour des conseils médicaux. Priorisez les sources et informations de la région spécifiée. Répondez UNIQUEMENT en français.`
  };
  
    return prompts[language] || prompts.en;
}

// Filter citations by region based on domain/URL patterns
// Returns prioritized list: region-specific sources first, then others
function filterCitationsByRegion(citations, region) {
  if (!citations || citations.length === 0) return citations;
  
  const regionPatterns = {
    canada: [
      /\.ca(\/|$)/i,
      /canadaceliac/i,
      /celiac\.ca/i,
      /canadian.*celiac/i,
      /healthcanada/i,
      /hc-sc\.gc\.ca/i,
      /canada\.ca/i,
      /canadianceliac/i,
      /celiac.*canada/i,
      /canada.*health/i
    ],
    usa: [
      /beyondceliac/i,
      /celiac\.org/i,
      /celiacdisease\.org/i,
      /fda\.gov/i,
      /nih\.gov/i,
      /cdc\.gov/i,
      /hhs\.gov/i,
      /mayoclinic\.org/i,
      /clevelandclinic\.org/i,
      /harvard\.edu/i,
      /stanford\.edu/i,
      /johnshopkins\.edu/i,
      /americanceliac\.org/i,
      /gluten\.org/i,
      /celiac.*usa/i,
      /us.*celiac/i,
      /american.*celiac/i,
      // More specific US patterns - check for .gov or .edu in US context
      /^https?:\/\/[^\/]+\.(gov|edu)(\/|$)/i
    ],
    europe: [
      /\.(eu|uk|de|fr|it|es|nl|be|ch|at|se|no|dk|fi|pl|ie|pt|gr|cz|ro|hu|sk|bg|hr|si|lt|lv|ee|mt|lu|cy)(\/|$)/i,
      /celiac\.eu/i,
      /european.*celiac/i,
      /aoecs\.org/i, // Association of European Coeliac Societies
      /celiac\.(uk|de|fr|it|es)/i,
      /\.co\.uk/i,
      /nhs\.uk/i,
      /\.gov\.uk/i,
      /\.de(\/|$)/i,
      /\.fr(\/|$)/i,
      /\.it(\/|$)/i,
      /\.es(\/|$)/i,
      /european.*coeliac/i,
      /celiac.*europe/i
    ]
  };
  
  const patterns = regionPatterns[region] || regionPatterns.canada;
  
  // Separate citations into region-specific and others
  const regionSpecific = [];
  const others = [];
  
  citations.forEach(citation => {
    const url = typeof citation === 'string' ? citation : (citation.url || citation.link || '');
    if (!url) {
      others.push(citation);
      return;
    }
    
    // Check if URL matches any of the region patterns
    const isRegionSpecific = patterns.some(pattern => pattern.test(url));
    
    if (isRegionSpecific) {
      regionSpecific.push(citation);
    } else {
      others.push(citation);
    }
  });
  
  // Return region-specific sources first, then others
  // This ensures region-specific sources are prioritized in the UI
  const prioritized = [...regionSpecific, ...others];
  
  // If we have region-specific sources, prefer showing those
  // But if we have very few region-specific sources, include some others for context
  if (regionSpecific.length > 0 && regionSpecific.length < 3 && others.length > 0) {
    // Include a few non-region sources for context, but prioritize region-specific
    return prioritized;
  }
  
  // If we have good number of region-specific sources, prefer those
  if (regionSpecific.length >= 3) {
    return regionSpecific;
  }
  
  // Fallback: return all sources if no region-specific ones found
  return prioritized;
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [], language = 'en', region = 'canada' } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'Perplexity API key not configured. Please set PERPLEXITY_API_KEY environment variable.' 
      });
    }

    // Filter conversation history to only include user/assistant messages (no system messages)
    const filteredHistory = conversationHistory.filter(
      msg => msg.role === 'user' || msg.role === 'assistant'
    );

    // Get system prompt for the selected language and region
    const systemPrompt = getSystemPrompt(language, region);
    
    // Enhance user message with region-specific context for better source filtering
    const regionKeywords = {
      canada: 'IMPORTANT: Prioritize and cite Canadian sources, regulations, organizations, and resources. Prefer sources from .ca domains, Health Canada, Canadian Celiac Association, and Canadian healthcare systems.',
      usa: 'IMPORTANT: Prioritize and cite US sources, FDA regulations, and American organizations. Prefer sources from .gov, .edu, and US celiac organizations like Beyond Celiac and Celiac Disease Foundation.',
      europe: 'IMPORTANT: Prioritize and cite European sources, EU regulations, and European organizations. Prefer sources from European domains (.eu, .uk, .de, .fr, etc.), EU celiac societies, and European healthcare systems.'
    };
    const regionHint = regionKeywords[region] || regionKeywords.canada;
    const enhancedUserMessage = `${message}\n\n${regionHint}`;
    
    // Build messages array - Perplexity may or may not support system messages
    // We'll try with system message first, but can fallback if needed
    let messages;
    
    // Option 1: Try with system message (preferred if supported)
    if (process.env.USE_SYSTEM_MESSAGE !== 'false') {
      messages = [
        { role: 'system', content: systemPrompt },
        ...filteredHistory,
        { role: 'user', content: enhancedUserMessage }
      ];
    } else {
      // Option 2: Incorporate system prompt into first user message
      const enhancedMessage = filteredHistory.length === 0 
        ? `${systemPrompt}\n\nUser question: ${enhancedUserMessage}`
        : enhancedUserMessage;
      
      messages = [
        ...filteredHistory,
        { role: 'user', content: enhancedMessage }
      ];
    }

    // Model name - Perplexity uses simpler model names now
    // Default model options (will try in order if first fails)
    const defaultModels = ['sonar', 'sonar-pro', 'llama-3.1-sonar-large-128k-online'];
    const model = process.env.PERPLEXITY_MODEL || 'sonar';

    // Build request payload
    const requestPayload = {
      model: model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 2048,
    };

    console.log('Request to Perplexity API:');
    console.log('- Model:', model);
    console.log('- Messages count:', messages.length);
    console.log('- First message role:', messages[0]?.role);
    console.log('- Last message role:', messages[messages.length - 1]?.role);

    // Call Perplexity API
    let response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    // If the model fails and user didn't specify one, try fallback models
    if (!response.ok && !process.env.PERPLEXITY_MODEL) {
      const errorData = await response.json().catch(() => ({}));
      const isModelError = response.status === 400 && (
        errorData?.error?.message?.toLowerCase().includes('model') ||
        errorData?.error?.message?.toLowerCase().includes('invalid')
      );

      if (isModelError) {
        console.log(`Model '${model}' failed, trying fallback models...`);
        for (const fallbackModel of defaultModels.slice(1)) {
          console.log(`Trying model: ${fallbackModel}`);
          requestPayload.model = fallbackModel;
          response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestPayload),
          });
          if (response.ok) {
            console.log(`Successfully using model: ${fallbackModel}`);
            break;
          }
        }
      }
    }

    if (!response.ok) {
      let errorData;
      let errorText;
      try {
        errorData = await response.json();
        errorText = JSON.stringify(errorData, null, 2);
        console.error('Perplexity API Error Response:');
        console.error('- Status:', response.status, response.statusText);
        console.error('- Error Data:', errorText);
        console.error('- Model tried:', requestPayload.model);
        
        // Extract specific error message if available
        const errorMessage = errorData.error?.message || errorData.message || errorData.error || 'Unknown error';
        console.error('- Error Message:', errorMessage);
      } catch (e) {
        errorText = await response.text();
        console.error('Perplexity API error (text):', response.status, errorText);
        errorData = { raw: errorText };
      }
      
      // Extract the actual error message from Perplexity's response
      let errorMessage = 'Unknown error';
      if (errorData?.error) {
        if (typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        } else if (errorData.error.message) {
          errorMessage = errorData.error.message;
        } else if (errorData.error.type) {
          errorMessage = `${errorData.error.type}: ${errorData.error.message || errorData.error.code || ''}`;
        }
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      }
      
      // Return detailed error information
      return res.status(response.status).json({ 
        error: errorMessage,
        details: errorText,
        status: response.status,
        model: requestPayload.model, // Use the actual model that was tried
        fullError: errorData // Include full error for debugging
      });
    }

    const data = await response.json();
    
    console.log(`Successfully received response using model: ${requestPayload.model}`);
    
    if (data.choices && data.choices.length > 0) {
      const replyText = data.choices[0].message.content;
      
      // Extract citations/sources from Perplexity response
      let citations = [];
      
      // Perplexity API may include citations in different formats
      if (data.citations && Array.isArray(data.citations)) {
        citations = data.citations;
      } else if (data.choices[0].citations && Array.isArray(data.choices[0].citations)) {
        citations = data.choices[0].citations;
      } else if (data.choices[0].message?.citations) {
        citations = data.choices[0].message.citations;
      }
      
      // Extract URLs from citations array if they're objects
      const extractedUrls = citations.map(citation => {
        if (typeof citation === 'string') {
          return citation;
        } else if (citation.url) {
          return citation.url;
        } else if (citation.link) {
          return citation.link;
        }
        return null;
      }).filter(Boolean);
      
      // Also try to extract URLs from the response text (Perplexity sometimes embeds them)
      const urlRegex = /https?:\/\/[^\s\)\]\"]+/g;
      const textUrls = replyText.match(urlRegex) || [];
      
      // Extract citation markers like [1], [2], etc. from the text
      const citationMarkerRegex = /\[(\d+)\]/g;
      const citationMarkers = [];
      let match;
      while ((match = citationMarkerRegex.exec(replyText)) !== null) {
        citationMarkers.push(parseInt(match[1]));
      }
      
      // Combine and deduplicate sources
      const allSources = [...extractedUrls, ...textUrls];
      let uniqueSources = [...new Set(allSources)].filter(Boolean);
      
      // If we have citation markers but no sources, try to extract from response metadata
      if (citationMarkers.length > 0 && uniqueSources.length === 0) {
        // Perplexity might have sources in a different format
        if (data.sources && Array.isArray(data.sources)) {
          uniqueSources.push(...data.sources.map(s => typeof s === 'string' ? s : s.url || s.link).filter(Boolean));
        }
      }
      
      // Log for debugging
      console.log('Extracted sources:', uniqueSources.length);
      console.log('Citation markers found:', citationMarkers.length);
      
      // Try to extract from Perplexity's search results if available
      if (uniqueSources.length === 0) {
        // Check for search_results or similar fields
        if (data.search_results && Array.isArray(data.search_results)) {
          uniqueSources = data.search_results.map(result => {
            if (typeof result === 'string') return result;
            return result.url || result.link || result.source || null;
          }).filter(Boolean);
        }
        
        // Check for references field
        if (uniqueSources.length === 0 && data.references && Array.isArray(data.references)) {
          uniqueSources = data.references.map(ref => {
            if (typeof ref === 'string') return ref;
            return ref.url || ref.link || ref.source || null;
          }).filter(Boolean);
        }
        
        // Check if citations are in the message metadata
        if (uniqueSources.length === 0 && data.choices[0].message?.metadata?.citations) {
          const metadataCitations = data.choices[0].message.metadata.citations;
          if (Array.isArray(metadataCitations)) {
            uniqueSources = metadataCitations.map(c => typeof c === 'string' ? c : c.url || c.link).filter(Boolean);
          }
        }
      }
      
      // If we still have no sources but found URLs in text, use those
      if (uniqueSources.length === 0 && textUrls.length > 0) {
        uniqueSources = [...new Set(textUrls)];
      }
      
      // Filter sources by region
      const filteredSources = filterCitationsByRegion(uniqueSources, region);
      
      // Log for debugging
      console.log('Final extracted sources (before region filter):', uniqueSources.length);
      console.log('Filtered sources (after region filter):', filteredSources.length);
      if (filteredSources.length > 0) {
        console.log('Sample filtered source:', filteredSources[0]);
      } else if (uniqueSources.length > 0) {
        console.log('No region-specific sources found, using all sources');
      } else {
        console.log('No sources found. Response keys:', Object.keys(data));
        if (data.choices && data.choices[0]) {
          console.log('Choice keys:', Object.keys(data.choices[0]));
        }
      }
      
      // Prioritize region-specific sources
      // If we have region-specific sources, use those primarily
      // Otherwise, use all sources but log a warning
      const finalSources = filteredSources.length > 0 ? filteredSources : uniqueSources;
      
      if (filteredSources.length === 0 && uniqueSources.length > 0) {
        console.log('WARNING: No region-specific sources found. Using all available sources.');
        console.log('Consider enhancing the query or region patterns to find region-specific sources.');
      }
      
      res.json({ 
        reply: replyText,
        usage: data.usage,
        model: requestPayload.model,
        citations: finalSources,
        citationMarkers: citationMarkers.length > 0 ? citationMarkers : null
      });
    } else {
      res.status(500).json({ error: 'No response from API' });
    }

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Make sure PERPLEXITY_API_KEY is set in your .env file');
});

