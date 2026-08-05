import { createOpenAI } from '@ai-sdk/openai';
import { generateText, streamText } from 'ai';

// Initialize multiple providers based on available keys
function openRouterProvider() {
  return createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    // Only a user-provided browser key may be used here. Platform keys belong in a server-side Edge Function.
    apiKey: localStorage.getItem('IDEALY_OPENROUTER_KEY') || '',
  });
}

function groqProvider() {
  return createOpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    // Never read VITE_* secrets: Vite exposes those values to every browser bundle.
    apiKey: localStorage.getItem('IDEALY_GROQ_KEY') || '',
  });
}

// A basic routing function to pick the best model for the job
// The user doesn't see which model is chosen.
export function getModel(taskComplexity: 'low' | 'medium' | 'high' | 'fast') {
  switch (taskComplexity) {
    case 'fast':
      // Fast generations (Groq with llama3)
      return groqProvider()('llama3-8b-8192');
    case 'high':
      // Complex reasoning (OpenRouter with Claude 3.5 Sonnet or GPT-4o)
      return openRouterProvider()('anthropic/claude-3.5-sonnet');
    case 'medium':
      return openRouterProvider()('meta-llama/llama-3.1-70b-instruct');
    case 'low':
    default:
      return groqProvider()('llama3-8b-8192');
  }
}

export async function askAgent(
  prompt: string,
  systemPrompt: string,
  complexity: 'low' | 'medium' | 'high' | 'fast' = 'medium'
) {
  const model = getModel(complexity);
  
  try {
    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt,
    });
    return text;
  } catch (error) {
    console.error('Agent error:', error);
    return "Je rencontre une perturbation dans mon mana. Essayons à nouveau.";
  }
}

export function streamAgent(
  prompt: string,
  systemPrompt: string,
  complexity: 'low' | 'medium' | 'high' | 'fast' = 'medium'
) {
  const model = getModel(complexity);
  
  return streamText({
    model,
    system: systemPrompt,
    prompt,
  });
}
