# 🚨 ALERTE SÉCURITÉ - Clés API Compromises

## ⚠️ ACTION IMMÉDIATE REQUISE

**Tu as partagé des clés API en clair dans le chat. Elles sont maintenant compromises.**

## 🔴 Ce que tu dois faire MAINTENANT

### 1. Révoquer TOUTES les clés partagées

| Service | Clé partagée | Action |
|---------|-------------|--------|
| OpenRouter | sk-or-v1-e6b2... | **RÉVOQUER** sur openrouter.ai |
| Groq | gsk_t4Zm... | **RÉVOQUER** sur console.groq.com |
| Anthropic | sk-ant-... | **RÉVOQUER** sur console.anthropic.com |
| OpenAI | sk-24a7... | **RÉVOQUER** sur platform.openai.com |
| Autres | sk-IYtX... | **RÉVOQUER** sur chaque service |

### 2. Créer de NOUVELLES clés

Après révocation, crée de nouvelles clés pour chaque service.

### 3. Configurer les nouvelles clés dans Supabase Secrets

```bash
# ⚠️ JAMAIS dans le code ! Uniquement dans Supabase Secrets
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-NOUVELLE_CLE
supabase secrets set GROQ_API_KEY=gsk_NOUVELLE_CLE
supabase secrets set ANTHROPIC_API_KEY=sk-ant-NOUVELLE_CLE
supabase secrets set OPENAI_API_KEY=sk-NOUVELLE_CLE
```

## ❌ CE QU'IL NE FAUT JAMAIS FAIRE

```typescript
// ❌ JAMAIS ÇA - Clés en dur dans le code
const apiKey = "sk-or-v1-e6b2911c..."; // DANGEREUX

// ❌ JAMAIS ÇA - Clés dans localStorage
localStorage.setItem('API_KEY', "sk-or-v1-e6b2911c..."); // DANGEREUX

// ❌ JAMAIS ÇA - Clés dans .env commité
// .env.local avec VITE_OPENROUTER_KEY=sk-or-v1-... // DANGEREUX
```

## ✅ CE QU'IL FAUT FAIRE

```typescript
// ✅ Le frontend appelle le backend
const { data } = await supabase.functions.invoke('ai-proxy', {
  body: { messages, model }
});

// ✅ Le backend utilise la clé depuis les secrets
// supabase/functions/ai-proxy/index.ts
const apiKey = Deno.env.get('OPENROUTER_API_KEY'); // ✅ Sécurisé
```

## 📋 Checklist de Sécurité

- [ ] Révoquer les clés partagées
- [ ] Créer de nouvelles clés
- [ ] Configurer dans Supabase Secrets
- [ ] Vérifier qu'aucune clé n'est dans le code
- [ ] Vérifier qu'aucune clé n'est dans .env
- [ ] Vérifier qu'aucune clé n'est dans localStorage
- [ ] Activer le rate limiting
- [ ] Activer le monitoring

## 💰 Coût potentiel si les clés sont volées

| Service | Coût max par jour |
|---------|------------------|
| OpenRouter | $100-500 |
| Groq | $50-200 |
| Anthropic | $100-500 |
| OpenAI | $100-500 |
| **Total** | **$350-1,700/jour** |

## 🎯 Conclusion

**Les clés partagées sont compromises. Révoque-les MAINTENANT.**

**Ne partage JAMAIS de clés API dans un chat, un email, ou un commit.**

**Toutes les clés doivent être dans Supabase Secrets, jamais dans le code.**

---

*Document créé pour ta sécurité. Suis ces instructions immédiatement.*