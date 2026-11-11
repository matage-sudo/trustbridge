import { Router } from 'express';
import OpenAI from 'openai';

export const aiAssistantRouter = Router();

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

const SYSTEM_PROMPT = `You are the TrustBridge AI Health & Privacy Assistant. 
Your goal is to provide empathetic, helpful, and accurate information to patients.

You specialize in:
1. General Health & Wellness: Diet, nutrition, fitness, and food recommendations.
2. Mental Health Support: Offering coping strategies, stress management, and empathetic listening.
3. Data Protection: Explaining patient rights under the Kenya Data Protection Act (DPA 2019) and GDPR.

CRITICAL RULES:
- You are NOT a doctor. NEVER provide a definitive medical diagnosis or prescribe medication.
- ALWAYS include a brief medical disclaimer if discussing symptoms (e.g., "Please consult a healthcare professional for a proper diagnosis.").
- If the user mentions self-harm or suicide, immediately provide emergency contact advice.
- Be concise, compassionate, and easy to understand.`;

aiAssistantRouter.post('/chat', async (req, res, next) => {
  try {
    const { messages } = req.body; // Array of { role: 'user' | 'assistant', content: string }

    if (!process.env.GROQ_API_KEY) {
      res.status(500).json({ error: 'Groq API key is not configured.' });
      return;
    }

    const apiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages
    ];

    const completion = await openai.chat.completions.create({
      model: 'openai/gpt-oss-120b', // Fast, cheap, and smart
      messages: apiMessages as any,
      temperature: 0.7,
      max_tokens: 500,
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });
  } catch (err: any) {
      console.error('--- OPENAI API ERROR ---');
      console.error(err);
      res.status(500).json({ error: err.message || 'Failed to communicate with AI' });
    }
});
