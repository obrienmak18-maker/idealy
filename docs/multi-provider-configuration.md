# Configuration multi-providers Idealy

## Principe

Les clés des fournisseurs IA restent dans **Supabase → Edge Function Secrets**. Elles ne doivent pas être ajoutées au frontend, à `NEXT_PUBLIC_*`, à GitHub ou aux fichiers du workspace. Netlify conserve seulement les variables serveur nécessaires au workspace Next, notamment `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `POSTGRES_URL`, `AUTH_SECRET`, `IDEALY_AI_PROVIDER` et l’URL Edge si elle est explicitement utilisée.

Les variables existantes doivent être conservées. Les variables ci-dessous sont seulement à ajouter lorsqu’un fournisseur doit être activé et qu’une clé a été créée dans son tableau de bord.

| Provider | Secret Supabase Edge | Endpoint utilisé | Modèles de départ |
|---|---|---|---|
| OpenAI | `OPENAI_API_KEY` | `https://api.openai.com/v1/chat/completions` | `gpt-5`, `gpt-5-mini` |
| Anthropic | `ANTHROPIC_API_KEY` | `https://api.anthropic.com/v1/chat/completions` | `claude-sonnet-4-6`, `claude-haiku-4-5` |
| Gemini | `GEMINI_API_KEY` | `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` | `gemini-3.7-flash`, `gemini-2.5-flash` |
| Kimi / Moonshot | `MOONSHOT_API_KEY` | `https://api.moonshot.ai/v1/chat/completions` | `kimi-k3`, `kimi-k2.6`, `kimi-k2.5` |
| Together AI | `TOGETHER_API_KEY` | `https://api.together.ai/v1/chat/completions` | `openai/gpt-oss-120b`, `openai/gpt-oss-20b` |
| Groq | `GROQ_API_KEY` | `https://api.groq.com/openai/v1/chat/completions` | `llama-3.3-70b-versatile` |
| DeepSeek | `DEEPSEEK_API_KEY` | `https://api.deepseek.com/chat/completions` | `deepseek-chat`, `deepseek-v4-flash` |
| OpenRouter | `OPENROUTER_API_KEY` | `https://openrouter.ai/api/v1/chat/completions` | `openrouter/free` ou un modèle namespacé |

Les modèles autorisés peuvent être limitées côté Edge par `IDEALY_PROVIDER_MODELS_JSON`. Cette variable est une configuration non secrète, facultative, et doit contenir un objet JSON par provider. Si elle n’est pas définie, le registre par défaut de `process-ai-request` est utilisé.

## Liens officiels

Les clés sont créées dans [OpenAI API keys](https://platform.openai.com/api-keys), [Anthropic Console](https://console.anthropic.com/settings/keys), [Google AI Studio](https://aistudio.google.com/apikey), [Kimi API keys](https://platform.kimi.ai/console/api-keys), [Together API keys](https://api.together.ai/settings/api-keys), [Groq API keys](https://console.groq.com/keys), [DeepSeek API keys](https://platform.deepseek.com/api_keys) et [OpenRouter Keys](https://openrouter.ai/settings/keys).

Après création, ajoute les secrets uniquement dans [Supabase Edge Function Secrets](https://supabase.com/dashboard/project/vhucjkyktdflwocrmzhe/settings/functions). Ne m’envoie pas les valeurs. Un fournisseur ne sera considéré comme live qu’après un appel authentifié réussi et un test de streaming contrôlé.

## Activation progressive

Le catalogue direct de l’interface est protégé par `NEXT_PUBLIC_IDEALY_DIRECT_MODEL_CATALOG=false` par défaut. Cette protection évite de présenter un modèle dont le secret n’est pas encore disponible. Lorsque les providers souhaités sont configurés et testés, la variable peut être passée à `true` dans Netlify, puis un nouveau déploiement peut être lancé. Le mode principal reste `IDEALY_AI_PROVIDER=supabase-function`.

Kimi K3 est supporté par le registre Edge sous l’identifiant `kimi-k3`; sa documentation indique que `reasoning_effort` accepte `low`, `high` ou `max` et que sa température est fixe. Anthropic est disponible via la compatibilité OpenAI pour les appels courants, mais les structured outputs stricts et certaines fonctions avancées devront utiliser un adaptateur natif dans un palier ultérieur.
