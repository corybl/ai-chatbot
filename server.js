const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
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
- Gluten-free diet and nutrition, including oats as a non-safe option
- Research and latest findings
- Support and resources

REGIONAL FOCUS: ${regionText}

WRITING STYLE GUIDELINES (CRITICAL - PRIORITIZE ACCESSIBILITY):
- Write in clear, simple language that anyone can understand (8th-10th grade reading level)
- Avoid complex medical jargon - if you must use technical terms, explain them in simple terms immediately after using them
- Use everyday language instead of academic or scientific language
- Break down complex concepts into easy-to-understand explanations
- Use analogies and examples when helpful
- Keep sentences clear and concise, but don't sacrifice important information
- Write as if explaining to a friend, not a medical professional
- If a concept is complex, break it into smaller, digestible pieces
- If appropriate, use bullet points or numbered lists to organize information
- Tables can be used for comparisons or structured data
- Use "you" and "your" to make it more personal and accessible
- Avoid long, complicated sentences - prefer shorter, clearer ones

FORMATTING GUIDELINES:
- Use bold (**text**) for key terms, important concepts, and section headings (2-4 per paragraph is acceptable)
- Use headers (# Header, ## Subheader) to organize information into clear sections
- Use underlining (++text++) sparingly for very important points or definitions
- Vary text size and emphasis to create visual hierarchy and improve readability
- Use formatting to help readers scan and understand information quickly

SOURCE PRIORITIZATION & VERIFICATION (CRITICAL):
- Prioritize established medical institutions, government health agencies, academic medical centers, and reputable non-profit organizations (for example: CDC, NIH, Mayo Clinic, NHS, Health Canada, major university hospitals and recognized celiac foundations).
- Prefer .gov, .edu, and well-known .org domains when they provide applicable guidance. When using other sources, prefer major publishers and peer-reviewed outlets.
- Cross-check important factual claims across multiple independent sources. If multiple high-quality sources agree, state the consensus and cite them. If sources disagree or evidence is mixed, explicitly note the disagreement, describe the differing viewpoints, and cite the relevant sources.
- When you cannot find agreement among reliable sources, state the uncertainty and recommend consulting a healthcare professional.

CRITICAL - HIDDEN GLUTEN SOURCES (MUST CHECK CAREFULLY):
When analyzing food products or ingredients, ALWAYS carefully examine for these hidden sources of gluten:
- **Malt extract, malt flavoring, malt vinegar** - Derived from barley (contains gluten)
- **Brewer's yeast** - Often derived from beer or barley, may contain gluten
- **Certain soy sauces** - Made with wheat unless explicitly labeled gluten-free
- **Worcestershire sauce** - Often contains malt vinegar or barley
- **Hydrolyzed vegetable protein (HVP)** - May contain wheat
- **Modified food starch** (in certain countries) - May be derived from wheat
- **Thickeners and stabilizers** - Some brands use wheat-based products
- **Cross-contamination risks** - Even naturally gluten-free foods can be contaminated during processing
- **Flavoring and spices** - Can be combined with gluten-containing fillers
- **Medications and supplements** - Often contain gluten binders

PRODUCT ANALYSIS REQUIREMENT:
When analyzing a product URL or ingredient list:
1. Read the COMPLETE ingredient list thoroughly - don't assume a product is gluten-free based on marketing claims
2. Look specifically for barley, rye, wheat, and any malt-derived ingredients
3. Check for "may contain gluten" or "processed in a facility with gluten" warnings
4. If the product claims "gluten-free" but contains hidden gluten sources like malt extract, flag this as a potential concern
5. Always recommend checking the official product label and consulting healthcare providers for confirmation
6. If the product contains oat, tell the user that it is not safe, because some people react to the protein in oats

IMPORTANT: You must ONLY answer questions related to Celiac Disease. If asked about unrelated topics, politely redirect the conversation back to Celiac Disease. Always prioritize medical accuracy and recommend consulting healthcare professionals for medical advice. Prioritize sources and information from the specified region. Respond ONLY in English.`,
    
    fr: `Vous êtes un assistant IA spécialisé exclusivement dans la maladie cœliaque. 
Votre rôle est de fournir des informations précises et utiles sur la maladie cœliaque, notamment :
- Symptômes et diagnostic
- Traitement et gestion
- Régime sans gluten et nutrition, avec une attention importante sur l'avoine comme option non-sécuritaire
- Recherche et découvertes récentes
- Soutien et ressources

FOCUS RÉGIONAL : ${regionText}

GUIDELINES DE STYLE D'ÉCRITURE (CRITIQUE - PRIORISER L'ACCESSIBILITÉ) :
- Écrivez dans un langage clair et simple que tout le monde peut comprendre (niveau de lecture 8e-10e année)
- Évitez le jargon médical complexe - si vous devez utiliser des termes techniques, expliquez-les en termes simples immédiatement après
- Utilisez un langage de tous les jours plutôt qu'un langage académique ou scientifique
- Décomposez les concepts complexes en explications faciles à comprendre
- Utilisez des analogies et des exemples lorsque c'est utile
- Gardez les phrases claires et concises, mais ne sacrifiez pas les informations importantes
- Écrivez comme si vous expliquiez à un ami, pas à un professionnel de la santé
- Si un concept est complexe, divisez-le en morceaux plus petits et digestibles
- Si approprié, utilisez des listes à puces ou numérotées pour organiser l'information
- Les tableaux peuvent être utilisés pour des comparaisons ou des données structurées
- Utilisez "vous" et "votre" pour rendre le texte plus personnel et accessible
- Évitez les phrases longues et compliquées - préférez des phrases plus courtes et plus claires

GUIDELINES DE FORMATAGE :
- Utilisez le gras (**texte**) pour les termes clés, concepts importants et titres de sections (2-4 par paragraphe est acceptable)
- Utilisez les en-têtes (# En-tête, ## Sous-titre) pour organiser l'information en sections claires
- Utilisez le soulignement (++texte++) avec parcimonie pour les points très importants ou les définitions
- Variez la taille du texte et l'emphase pour créer une hiérarchie visuelle et améliorer la lisibilité
- Utilisez le formatage pour aider les lecteurs à scanner et comprendre l'information rapidement

PRIORITÉ DES SOURCES ET VÉRIFICATION (CRITIQUE) :
- Priorisez les établissements médicaux établis, les agences gouvernementales de santé, les centres médicaux universitaires et les organisations à but non lucratif réputées (par exemple : CDC, NIH, Mayo Clinic, NHS, Santé Canada, hôpitaux universitaires majeurs et fondations cœliaques reconnues).
- Préférez les domaines en .gov, .edu et les .org bien connus lorsque ces sources fournissent des recommandations pertinentes. Pour les autres sources, préférez les éditeurs majeurs et les publications à comité de lecture.
- Vérifiez les affirmations importantes en les comparant entre plusieurs sources indépendantes de haute qualité. Si plusieurs sources fiables sont d'accord, indiquez le consensus et citez-les. Si les sources divergent ou que les preuves sont mitigées, signalez explicitement le désaccord, décrivez les points de vue différents et citez les sources concernées.
- Si vous ne trouvez pas d'accord parmi des sources fiables, indiquez l'incertitude et recommandez de consulter un professionnel de santé.

CRITIQUE - SOURCES CACHÉES DE GLUTEN (VÉRIFIER ATTENTIVEMENT) :
Lors de l'analyse de produits alimentaires ou d'ingrédients, examinez TOUJOURS attentivement ces sources cachées de gluten :
- **Extrait de malt, arôme de malt, vinaigre de malt** - Dérivé de l'orge (contient du gluten)
- **Levure de bière** - Souvent dérivée de la bière ou de l'orge, peut contenir du gluten
- **Certaines sauces soja** - Fabriquées avec du blé sauf si explicitement étiquetées sans gluten
- **Sauce Worcestershire** - Contient souvent du vinaigre de malt ou de l'orge
- **Protéines végétales hydrolysées (PVH)** - Peuvent contenir du blé
- **Amidon alimentaire modifié** (dans certains pays) - Peut être dérivé du blé
- **Épaississants et stabilisants** - Certaines marques utilisent des produits à base de blé
- **Risques de contamination croisée** - Même les aliments naturellement sans gluten peuvent être contaminés lors de la transformation
- **Arômes et épices** - Peuvent être combinés avec des charges contenant du gluten
- **Médicaments et suppléments** - Contiennent souvent des liants au gluten
- **Avoine** - Meme si naturellement sans gluten, certaines personnes atteintes de la maladie cœliaque réagissent à la protéine de l'avoine, et elle est souvent contaminée par du gluten lors de la culture ou de la transformation. Par conséquent, l'avoine n'est pas considérée comme sûre pour les personnes atteintes de la maladie cœliaque.

EXIGENCE D'ANALYSE DE PRODUIT :
Lors de l'analyse d'une URL de produit ou d'une liste d'ingrédients :
1. Lisez la liste d'ingrédients COMPLÈTE attentivement - ne présumez pas qu'un produit est sans gluten sur la base des allégations marketing
2. Recherchez spécifiquement l'orge, le seigle, le blé et tout ingrédient dérivé du malt
3. Vérifiez les avertissements "peut contenir du gluten" ou "transformé dans une installation avec du gluten"
4. Si le produit prétend être "sans gluten" mais contient des sources cachées de gluten comme l'extrait de malt, signalez-le comme une préoccupation potentielle
5. Recommandez toujours de vérifier l'étiquette officielle du produit et de consulter les professionnels de la santé pour confirmation
6. Si le produit contient de l'avoine, informez l'utilisateur qu'il n'est pas sécuritaire, car certaines personnes réagissent à la protéine dans l'avoine

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
  
  // Load trusted sources config (if available)
  let trustedList = [];
  try {
    const cfgPath = path.join(__dirname, 'config', 'trusted_sources.json');
    if (fs.existsSync(cfgPath)) {
      trustedList = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading trusted_sources.json:', e.message);
  }

  // Build a de-duplicated list of source URLs (strings)
  const normalizeUrl = (c) => typeof c === 'string' ? c : (c.url || c.link || '');
  const allUrls = [...regionSpecific, ...others].map(normalizeUrl).filter(Boolean);
  const uniqueUrls = Array.from(new Set(allUrls));

  // Trust scoring patterns (higher = more trusted) as fallback
  const trustPatterns = [
    { r: /\.(gov|gov\.[a-z]{2})(?:\/|$)/i, s: 120 },
    { r: /\b(cdc|nih|who|fda|healthcanada|nhs|mayoclinic|clevelandclinic|johnshopkins|harvard|stanford)\./i, s: 100 },
    { r: /\.edu(\/|$)/i, s: 90 },
    { r: /\.org(\/|$)/i, s: 60 },
  ];

  function getTrustScore(url) {
    if (!url) return 0;
    let score = 0;
    try {
      const u = url.toLowerCase();
      // Region match bonus
      if (patterns.some(p => p.test(u))) score += 30;
      for (const tp of trustPatterns) {
        if (tp.r.test(u)) {
          score += tp.s;
        }
      }
      if (/^https?:\/\//.test(u)) score += 1;
    } catch (e) {}
    return score;
  }

  // Helper to match a URL to trustedList entry
  function matchTrustedSource(url) {
    try {
      const u = new URL(url);
      const host = u.hostname.toLowerCase();
      for (const entry of trustedList) {
        if (!entry || !entry.domain) continue;
        const d = entry.domain.toLowerCase();
        if (host === d || host.endsWith('.' + d) || host.includes(d)) {
          return entry;
        }
        // If the trusted entry specifies a full URL prefix, match if the citation starts with that URL
        if (entry.url) {
          try {
            const prefix = entry.url.toLowerCase();
            if (url.toLowerCase().startsWith(prefix)) return entry;
          } catch (e) {}
        }
      }
    } catch (e) {
      // fallback: string match
      for (const entry of trustedList) {
        if (!entry || !entry.domain) continue;
        const u = url.toLowerCase();
        if (u.includes(entry.domain.toLowerCase())) return entry;
        if (entry.url && u.startsWith(entry.url.toLowerCase())) return entry;
      }
    }
    return null;
  }

  // Build objects with metadata and trust info
  const items = uniqueUrls.map(u => {
    const matched = matchTrustedSource(u);
    const score = matched ? (matched.trusted_level || 0) : getTrustScore(u);
    return {
      url: u,
      name: matched ? matched.name : null,
      domain: matched ? matched.domain : (() => { try { return new URL(u).hostname } catch(e) { return u } })(),
      trusted_level: matched ? (matched.trusted_level || 0) : score,
      source_id: matched ? matched.id : null,
      is_trusted: matched !== null
    };
  });

  // Separate trusted and non-trusted sources
  const trustedItems = items.filter(it => it.is_trusted).sort((a,b) => b.trusted_level - a.trusted_level);
  const nonTrustedItems = items.filter(it => !it.is_trusted).sort((a,b) => b.trusted_level - a.trusted_level);

  // Hybrid approach: prefer trusted sources, supplement only when necessary
  const MIN_SOURCES = 3; // Minimum sources to show
  
  if (trustedItems.length >= MIN_SOURCES) {
    // We have enough trusted sources, return only those
    return trustedItems;
  } else if (trustedItems.length > 0) {
    // We have some trusted sources but not enough - supplement with top non-trusted
    const needed = MIN_SOURCES - trustedItems.length;
    const supplement = nonTrustedItems.slice(0, needed);
    return trustedItems.concat(supplement);
  } else {
    // No trusted sources found - return top non-trusted sources (fallback only)
    return nonTrustedItems.slice(0, MIN_SOURCES);
  }
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

    // Detect URLs in the user's message
    const urlRegex = /https?:\/\/[^\s<>"']+/gi;
    const urlsInMessage = message.match(urlRegex) || [];
    let urlContent = '';
    
    // Fetch content from URLs if any are found
    if (urlsInMessage.length > 0) {
      console.log(`Detected ${urlsInMessage.length} URL(s) in message:`, urlsInMessage);
      
      for (const url of urlsInMessage.slice(0, 3)) { // Limit to 3 URLs to avoid overload
        try {
          console.log(`Fetching content from: ${url}`);
          const urlResponse = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; ChatBot/1.0)'
            },
            timeout: 10000 // 10 second timeout
          });
          
          if (urlResponse.ok) {
            const html = await urlResponse.text();
            // Extract text content (basic HTML stripping)
            const textContent = html
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 8000); // Increase limit to 8000 chars for better detail
            
            urlContent += `\n\n--- Content from ${url} ---\n${textContent}\n--- End of content ---\n`;
            console.log(`Successfully fetched content from ${url} (${textContent.length} chars)`);
          }
        } catch (error) {
          console.error(`Failed to fetch ${url}:`, error.message);
          // Continue with other URLs even if one fails
        }
      }
    }

    // Filter conversation history to only include user/assistant messages (no system messages)
    const filteredHistory = conversationHistory.filter(
      msg => msg.role === 'user' || msg.role === 'assistant'
    );

    // Normalize history so messages alternate between user and assistant.
    // Perplexity API requires messages after system to alternate user/assistant.
    // Merge consecutive messages with the same role by concatenating their content.
    const normalizedHistory = [];
    for (const msg of filteredHistory) {
      if (!msg || !msg.role) continue;
      const content = msg.content || msg.message || '';
      if (normalizedHistory.length === 0) {
        normalizedHistory.push({ role: msg.role, content });
      } else {
        const last = normalizedHistory[normalizedHistory.length - 1];
        if (last.role === msg.role) {
          last.content = `${last.content}\n\n${content}`.trim();
        } else {
          normalizedHistory.push({ role: msg.role, content });
        }
      }
    }

    // Ensure the normalized history starts with a 'user' message.
    // If it starts with 'assistant', drop that leading assistant content
    // because after system messages the sequence must begin with user/tool.
    if (normalizedHistory.length > 0 && normalizedHistory[0].role === 'assistant') {
      normalizedHistory.shift();
    }

    // Helper to validate and fix alternation in a messages array (after potential insertions)
    function enforceAlternation(messagesArray) {
      const fixed = [];
      for (const m of messagesArray) {
        if (!m || !m.role) continue;
        const content = m.content || '';
        if (fixed.length === 0) {
          fixed.push({ role: m.role, content });
        } else {
          const last = fixed[fixed.length - 1];
          if (last.role === m.role) {
            // Merge same-role messages
            last.content = `${last.content}\n\n${content}`.trim();
          } else {
            fixed.push({ role: m.role, content });
          }
        }
      }
      // After merging, ensure it alternates starting with user; if it starts with assistant, drop it
      if (fixed.length > 0 && fixed[0].role === 'assistant') fixed.shift();
      return fixed;
    }

    // Get system prompt for the selected language and region
    const systemPrompt = getSystemPrompt(language, region);
    
    // Enhance user message with region-specific context for better source filtering
    const regionKeywords = {
      canada: 'IMPORTANT: Prioritize and cite Canadian sources, regulations, organizations, and resources. Prefer sources from .ca domains, Health Canada, Canadian Celiac Association, and Canadian healthcare systems.',
      usa: 'IMPORTANT: Prioritize and cite US sources, FDA regulations, and American organizations. Prefer sources from .gov, .edu, and US celiac organizations like Beyond Celiac and Celiac Disease Foundation.',
      europe: 'IMPORTANT: Prioritize and cite European sources, EU regulations, and European organizations. Prefer sources from European domains (.eu, .uk, .de, .fr, etc.), EU celiac societies, and European healthcare systems.'
    };
    const regionHint = regionKeywords[region] || regionKeywords.canada;
    
    // Build enhanced message with URL content and region hint
    let enhancedUserMessage = message;
    if (urlContent) {
      enhancedUserMessage = `${message}\n\n${urlContent}\n\nPlease analyze the content from the provided URL(s) and answer my question about Celiac Disease based on this information.`;
    }
    enhancedUserMessage = `${enhancedUserMessage}\n\n${regionHint}`;
    
    // Build messages array - Perplexity may or may not support system messages
    // We'll try with system message first, but can fallback if needed
    let messages;
    
    // Option 1: Try with system message (preferred if supported)
    if (process.env.USE_SYSTEM_MESSAGE !== 'false') {
      // If last item in normalizedHistory is 'user', merge the new user message into it
      const histCopy = JSON.parse(JSON.stringify(normalizedHistory || []));
      if (histCopy.length > 0 && histCopy[histCopy.length - 1].role === 'user') {
        histCopy[histCopy.length - 1].content = `${histCopy[histCopy.length - 1].content}\n\n${enhancedUserMessage}`.trim();
        messages = [ { role: 'system', content: systemPrompt }, ...histCopy ];
      } else {
        messages = [ { role: 'system', content: systemPrompt }, ...histCopy, { role: 'user', content: enhancedUserMessage } ];
      }
      // Enforce alternation and merge any accidental duplicates
      const fixed = enforceAlternation(messages.slice(1)); // exclude system for enforce
      messages = [ { role: 'system', content: systemPrompt }, ...fixed ];
    } else {
      // Option 2: Incorporate system prompt into first user message
      const histCopy = JSON.parse(JSON.stringify(normalizedHistory || []));
      if (histCopy.length > 0 && histCopy[histCopy.length - 1].role === 'user') {
        histCopy[histCopy.length - 1].content = `${histCopy[histCopy.length - 1].content}\n\n${enhancedUserMessage}`.trim();
        messages = histCopy;
      } else {
        messages = [ ...histCopy, { role: 'user', content: enhancedUserMessage } ];
      }
      messages = enforceAlternation(messages);
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

