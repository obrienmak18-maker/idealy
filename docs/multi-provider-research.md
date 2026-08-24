# Recherche multi-providers — références officielles

## Kimi / Moonshot AI

La documentation officielle indique que l’API Kimi est compatible OpenAI et utilise `https://api.moonshot.ai/v1` comme base URL, avec une clé dans `MOONSHOT_API_KEY` [1]. Le modèle K3 est identifié comme `kimi-k3` et accepte `reasoning_effort` avec les valeurs `low`, `high` ou `max`; il ne faut pas lui envoyer explicitement `temperature` car ce paramètre est fixe [2]. La liste `/v1/models` est la source recommandée pour vérifier les modèles accessibles et leurs capacités [3].

## Together AI

Together fournit une compatibilité OpenAI avec la base `https://api.together.ai/v1` et `TOGETHER_API_KEY` [4]. Les identifiants de modèles sont namespacés, par exemple `openai/gpt-oss-120b`. Le streaming, les tools et les structured outputs sont pris en charge, mais les interfaces Assistants/Threads/Runs OpenAI ne le sont pas; la boucle d’agents doit donc rester dans Idealy [4].

## OpenRouter

OpenRouter normalise une API proche d’OpenAI, supporte le streaming SSE et le routage fallback via `models` et `route: "fallback"` [5]. Les headers optionnels `HTTP-Referer` et `X-OpenRouter-Title` identifient l’application. Les réponses normalisent `choices`, `usage` et les erreurs, ce qui en fait un bon fallback multi-modèles [5].

## DeepSeek

DeepSeek expose une API compatible OpenAI à `https://api.deepseek.com/chat/completions`, avec `DEEPSEEK_API_KEY`, le streaming `stream: true` et des modèles comme `deepseek-v4-flash` et `deepseek-v4-pro` dans la documentation consultée [6].

## Gemini

Google documente une compatibilité OpenAI à `https://generativelanguage.googleapis.com/v1beta/openai/` avec `GEMINI_API_KEY` [7]. Le streaming, les tools, la vision et les sorties structurées sont documentés. Les modèles Gemini utilisent `reasoning_effort` ou leurs paramètres de pensée Google selon le modèle; l’implémentation doit éviter de transmettre simultanément des contrôles incompatibles [7].

## Anthropic Claude

Anthropic fournit une couche de compatibilité OpenAI à `https://api.anthropic.com/v1` avec `ANTHROPIC_API_KEY`, mais précise qu’elle sert surtout à tester et comparer les modèles; pour les fonctionnalités complètes et les structured outputs stricts, l’API native Claude est préférable [8]. La compatibilité OpenAI prend en charge le streaming et les tools, mais ignore notamment `response_format` et le champ `strict` des tools [8].

## Groq

Groq documente une API principalement compatible OpenAI à `https://api.groq.com/openai/v1` avec `GROQ_API_KEY` [9]. Certains champs OpenAI comme `logprobs`, `logit_bias`, `top_logprobs` et plusieurs formes de `n` ne sont pas supportés; le proxy doit donc éviter de les envoyer par défaut [9].

## Décision d’architecture

Le premier palier utilise un registre interne `provider → model → endpoint → secret env`. Les clés restent exclusivement dans Supabase Edge Function Secrets. `process-ai-request` conserve son contrat et son contrôle de crédits/idempotence; les nouveaux providers sont ajoutés à son registre sans exposer les clés ni créer une nouvelle logique de facturation. Le catalogue direct de l’interface est derrière `NEXT_PUBLIC_IDEALY_DIRECT_MODEL_CATALOG`, désactivé par défaut pour ne pas afficher des modèles dont les secrets ne sont pas encore configurés.

## Providers à évaluer ensuite

Fireworks AI est pertinent pour les modèles open source et existe déjà comme route Gateway historique dans Idealy. Cerebras peut être évalué pour les missions où la latence est prioritaire. Mistral peut apporter une option européenne et multilingue. Ces providers ne sont pas activés dans le premier palier afin d’éviter la multiplication de clés et d’adaptateurs avant la validation de Kimi, Together, Gemini et Claude.

## Références

[1]: https://platform.kimi.ai/docs/api/overview — Kimi API Platform, API Overview.
[2]: https://platform.kimi.ai/docs/api/quickstart — Kimi API Platform, Quickstart.
[3]: https://platform.kimi.ai/docs/api/list-models — Kimi API Platform, List Models.
[4]: https://docs.together.ai/docs/inference/openai-compatibility — Together AI, OpenAI compatibility.
[5]: https://openrouter.ai/docs/api-reference/overview — OpenRouter, API Reference.
[6]: https://api-docs.deepseek.com/ — DeepSeek API Docs, Your First API Call.
[7]: https://ai.google.dev/gemini-api/docs/openai — Google Gemini API, OpenAI compatibility.
[8]: https://platform.claude.com/docs/en/cli-sdks-libraries/libraries/openai-sdk — Anthropic Claude Platform, OpenAI SDK compatibility.
[9]: https://console.groq.com/docs/openai — GroqDocs, OpenAI Compatibility.
