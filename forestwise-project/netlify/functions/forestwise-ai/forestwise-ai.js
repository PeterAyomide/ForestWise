const OpenAI = require('openai');

exports.handler = async function(event, context) {
  // Handle CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const { message, conversationHistory = [], imageData, context } = JSON.parse(event.body);
    
    // System prompt to make it context-aware and prevent hallucinations
    const systemPrompt = `You are ForestWise AI, an expert forestry and ecological restoration assistant. You provide accurate, scientifically-grounded information about trees, planting, soil health, and ecosystem restoration.

CRITICAL GUIDELINES:
- Focus on tree species in the tree species database species.json
- Be extremely accurate and fact-based
- If you're unsure about something, say so rather than guessing
- Focus on practical, actionable advice
- Reference scientific consensus when possible
- For tree identification from images, be cautious and suggest verification
- When discussing medicinal uses, include appropriate warnings
- Always consider local context and conditions
- Prioritize native species and sustainable practices

${context ? `Current Context: ${context}` : ''}

Specialize in:
- Tree species identification and characteristics
- Planting guides and seasonal advice
- Soil health assessment and improvement
- Pest and disease management
- Ecological restoration techniques
- Agroforestry practices
- Climate-appropriate species selection`;

    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      ...conversationHistory,
      {
        role: "user",
        content: imageData ? [
          {
            type: "text",
            text: message
          },
          {
            type: "image_url",
            image_url: {
              url: imageData
            }
          }
        ] : message
      }
    ];

    console.log('Sending request to OpenAI with messages:', messages.length);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      max_tokens: 1000,
      temperature: 0.2,
    });

    const response = completion.choices[0].message.content;

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        response: response,
        usage: completion.usage
      })
    };

  } catch (error) {
    console.error('OpenAI API error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        error: 'Failed to get AI response',
        details: error.message 
      })
    };
  }
};