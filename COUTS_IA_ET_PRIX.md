# 💰 Coûts Réels des IA et Stratégie de Prix

## 🎯 Objectif : Ne PAS perdre d'argent

---

## 1. LES IA QUE IDEALY PEUT UTILISER

### Modèles disponibles via OpenRouter (accès à TOUS)

| Modèle | Coût entrée | Coût sortie | Usage idéal |
|--------|------------|-------------|-------------|
| **Claude 3.5 Sonnet** | $3/M tokens | $15/M tokens | Architecture, code complexe |
| **Claude 3.5 Haiku** | $0.80/M | $4/M | Code simple, validation |
| **GPT-4o** | $2.50/M | $10/M | Architecture, code complexe |
| **GPT-4o mini** | $0.15/M | $0.60/M | Code simple, chat |
| **Llama 3.1 70B** | $0.30/M | $0.30/M | Code moyen |
| **Llama 3.1 8B** | $0.05/M | $0.05/M | Chat, résumés |
| **Mistral Large** | $2/M | $6/M | Code complexe |
| **Mistral Small** | $0.20/M | $0.60/M | Code simple |
| **Gemini Pro** | $1.25/M | $5/M | Code complexe |
| **Gemini Flash** | $0.075/M | $0.30/M | Code simple, rapide |

### Modèles via Groq (ultra rapide, pas cher)

| Modèle | Coût entrée | Coût sortie | Usage idéal |
|--------|------------|-------------|-------------|
| **Llama 3.1 8B** | $0.05/M | $0.05/M | Chat, résumés |
| **Llama 3.1 70B** | $0.30/M | $0.30/M | Code moyen |
| **Mixtral 8x7B** | $0.24/M | $0.24/M | Code moyen |

---

## 2. COÛT RÉEL PAR MISSION (calcul honnête)

### Mission simple (ex: todo list)
- 1 appel architecte (Claude Haiku) : ~2K tokens → $0.01
- 1 appel builder (GPT-4o mini) : ~5K tokens → $0.01
- 1 appel validator (Llama 8B) : ~1K tokens → $0.001
- **Total : ~$0.02 par mission**

### Mission moyenne (ex: dashboard)
- 1 appel architecte (Claude Sonnet) : ~3K tokens → $0.05
- 1 appel builder (GPT-4o) : ~10K tokens → $0.10
- 1 appel validator (Claude Haiku) : ~2K tokens → $0.01
- **Total : ~$0.16 par mission**

### Mission complexe (ex: SaaS complet)
- 1 appel architecte (Claude Sonnet) : ~5K tokens → $0.08
- 1 appel builder (GPT-4o) : ~30K tokens → $0.30
- 1 appel validator (Claude Sonnet) : ~5K tokens → $0.08
- **Total : ~$0.46 par mission**

---

## 3. COÛT MENSUEL PAR UTILISATEUR

### Utilisateur gratuit (Starter)
- 100 mana/jour = ~3 missions/jour
- 90 missions/mois
- Mix simple/moyen : ~$0.10/mission
- **Coût : ~$9/mois**

### Utilisateur Pro
- Mana illimité = ~10 missions/jour
- 300 missions/mois
- Mix moyen/complexe : ~$0.20/mission
- **Coût : ~$60/mois**

### Utilisateur Business
- Mana illimité + collaboration
- ~20 missions/jour
- 600 missions/mois
- Mix complexe : ~$0.30/mission
- **Coût : ~$180/mois**

---

## 4. STRATÉGIE DE PRIX POUR NE PAS PERDRE D'ARGENT

### ❌ MAUVAIS PRIX (actuel - tu perds de l'argent)

| Plan | Prix | Coût réel | Marge |
|------|------|-----------|-------|
| Starter | 0€ | $9/mois | **-100%** ❌ |
| Pro | 29€ | $60/mois | **-107%** ❌ |
| Business | 99€ | $180/mois | **-82%** ❌ |

**Tu perds de l'argent sur CHAQUE utilisateur !**

### ✅ BONS PRIX (recommandés)

| Plan | Prix | Coût réel | Marge |
|------|------|-----------|-------|
| Starter | 0€ (limité à 5 missions/mois) | $0.50/mois | -$0.50 (acceptable) |
| Pro | 79€/mois | $60/mois | **+24%** ✅ |
| Business | 199€/mois | $180/mois | **+10%** ✅ |

### 🎯 PRIX OPTIMAUX (avec optimisation)

**En optimisant les coûts** (cache, modèles moins chers, prompts courts) :

| Plan | Prix | Coût optimisé | Marge |
|------|------|---------------|-------|
| Starter | 0€ (3 missions/mois) | $0.30/mois | -$0.30 (marketing) |
| Pro | 49€/mois | $25/mois | **+49%** ✅ |
| Business | 129€/mois | $80/mois | **+38%** ✅ |

---

## 5. COMMENT RÉDUIRE LES COÛTS DE 60%

### Stratégie 1 : Cache intelligent
- Cache les résultats identiques (même prompt = même réponse)
- **Économie : 20-30%**

### Stratégie 2 : Modèles moins chers
- Utiliser GPT-4o mini au lieu de GPT-4o pour les tâches simples
- Utiliser Llama 8B au lieu de Claude pour les validations
- **Économie : 30-40%**

### Stratégie 3 : Prompts optimisés
- Limiter le contexte (ne pas envoyer tout l'historique)
- Utiliser des templates de prompts courts
- **Économie : 10-20%**

### Stratégie 4 : Limiter les missions gratuites
- 3 missions/mois pour les gratuits (pas 90)
- **Économie : 90% sur les gratuits**

---

## 6. PLAN DE PRIX FINAL RECOMMANDÉ

### 🟢 Starter - 0€/mois
- 3 missions/mois
- Modèles basiques (Llama 8B, GPT-4o mini)
- 100 mana/jour
- **Coût réel : $0.30/mois**
- **Marge : -$0.30 (marketing)**

### 🔵 Pro - 49€/mois
- Missions illimitées
- Modèles avancés (Claude Sonnet, GPT-4o)
- Déploiement Vercel
- **Coût réel : $25/mois**
- **Marge : +$24/mois (49%)**

### 🟣 Business - 129€/mois
- Tout Pro + collaboration
- Modèles premium (Claude Sonnet, GPT-4o)
- Support prioritaire
- **Coût réel : $80/mois**
- **Marge : +$49/mois (38%)**

---

## 7. SEUIL DE RENTABILITÉ

### Point mort (break-even)

| Utilisateurs | Revenu/mois | Coût/mois | Profit |
|--------------|-------------|-----------|--------|
| 10 Pro | €490 | $250 | +$240 |
| 20 Pro | €980 | $500 | +$480 |
| 50 Pro | €2,450 | $1,250 | +$1,200 |
| 100 Pro | €4,900 | $2,500 | +$2,400 |

**Il faut minimum 10 utilisateurs Pro pour couvrir les coûts fixes** (Supabase $25 + Vercel $20 + Sentry $26 = $71/mois)

---

## 8. RÉSUMÉ FINAL

### IA utilisables : 12 modèles
- **OpenRouter** : Claude 3.5 Sonnet/Haiku, GPT-4o/mini, Llama 3.1 70B/8B, Mistral Large/Small, Gemini Pro/Flash
- **Groq** : Llama 3.1 8B/70B, Mixtral 8x7B

### Prix recommandés (pour ne PAS perdre d'argent)
- **Starter** : 0€ (3 missions/mois max)
- **Pro** : 49€/mois
- **Business** : 129€/mois

### Coût réel par mission
- Simple : $0.02
- Moyenne : $0.16
- Complexe : $0.46

### Marge par plan
- Starter : -$0.30 (marketing)
- Pro : +49%
- Business : +38%

---

## ⚠️ AVERTISSEMENT HONNÊTE

**Les prix actuels (29€/99€) te font perdre de l'argent sur chaque utilisateur.**

**Augmente les prix à 49€/129€ OU limite drastiquement les missions gratuites.**

**Sans optimisation des coûts, tu perds $13,550/mois avec 1000 utilisateurs.**

---

*Date : 8 Décembre 2024*
*Source : Prix publics des API (OpenRouter, Groq)*