# Secrets Supabase à configurer manuellement

Va sur : https://supabase.com/dashboard/project/vhucjkyktdflwocrmzhe/settings/functions

Ajoute ces secrets un par un :

| Clé | Valeur |
|-----|--------|
| STRIPE_PRICE_ID_PRO_MONTHLY | price_1U2tWRFEtyiGNczlVbfu79Cl |
| STRIPE_PRICE_ID_PRO_YEARLY | price_1U2tWSFEtyiGNczldAFQA36y |
| STRIPE_PRICE_ID_BUSINESS_MONTHLY | price_1U2tWTFEtyiGNczlEVCaqQ1P |
| STRIPE_PRICE_ID_BUSINESS_YEARLY | price_1U2tWUFEtyiGNczl969RCInQ |
| STRIPE_SECRET_KEY | rk_test_votre_cle_stripe_ici |
| GITHUB_CLIENT_ID | Ov23ctIwcyJ5NvIdYDok |
| GITHUB_CLIENT_SECRET | aa67cd512b748439962c71feebdb23f7dfa387d6 |
| APP_URL | https://idealy.example.com |
| GROQ_API_KEY | (ta clé Groq — https://console.groq.com/keys) |
| OPENROUTER_API_KEY | (ta clé OpenRouter — https://openrouter.ai/keys) |
| DEEPSEEK_API_KEY | (ta clé DeepSeek — https://platform.deepseek.com) |

## SQL à appliquer sur Supabase

Va sur : https://supabase.com/dashboard/project/vhucjkyktdflwocrmzhe/sql/new

Colle le contenu de : supabase/migrations/00001_init_schema.sql
Puis colle le contenu de : supabase/migrations/00002_missing_tables.sql
