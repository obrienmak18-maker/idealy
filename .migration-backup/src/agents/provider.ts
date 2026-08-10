import { createOpenAI } from '@ai-sdk/openai';
import { generateText, streamText } from 'ai';
import { logger } from '@/utils/logger';

// Provider configurations using environment variables
// ⚠️ These are VITE_ prefixed so they're available in the browser
// For production, use the ai-proxy Edge Function instead

function openRouterProvider() {
  return createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: import.meta.env.VITE_OPENROUTER_API_KEY || '',
  });
}

function groqProvider() {
  return createOpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: import.meta.env.VITE_GROQ_API_KEY || '',
  });
}

function anthropicProvider() {
  return createOpenAI({
    baseURL: 'https://api.anthropic.com/v1',
    apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
  });
}

function openAIProvider() {
  return createOpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  });
}

function deepSeekProvider() {
  return createOpenAI({
    baseURL: 'https://api.deepseek.com/v1',
    apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY || '',
  });
}

function mistralProvider() {
  return createOpenAI({
    baseURL: 'https://api.mistral.ai/v1',
    apiKey: import.meta.env.VITE_MISTRAL_API_KEY || '',
  });
}

// Model routing - picks the best model for the job
export function getModel(taskComplexity: 'low' | 'medium' | 'high' | 'fast') {
  switch (taskComplexity) {
    case 'fast':
      // Fast generations (Groq with llama3)
      return groqProvider()('llama3-8b-8192');
    case 'high':
      // Complex reasoning (OpenRouter with Claude 3.5 Sonnet)
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
    logger.error('Agent error:', error instanceof Error ? error : undefined, {
      component: 'provider',
      action: 'askAgent',
      complexity,
    });
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