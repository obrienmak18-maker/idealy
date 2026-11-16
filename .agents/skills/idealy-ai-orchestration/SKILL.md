---
name: idealy-ai-orchestration
description: Multi-agent orchestration, squad dispatching (Ninja, Mage, Hunter, Pro), structured JSON mission payloads, conversation-specific Way persistence, and multimodal attachment ingestion.
license: MIT
metadata:
  author: Idealy Engineering Team
  version: "1.0.0"
---

# Idealy AI Orchestration

## Core Principles
1. **The 4 Ways & Universal Dispatcher**:
   - Alvin is the lead squad orchestrator.
   - Squad members for each Way:
     - Ninja: Naruto (Full-Stack), Sasuke (Lead/Review), Sakura (Design/QA), Kakashi (Tech Lead), Minato (Architect/DevOps).
     - Mage, Hunter, Professional: Distinct specialized squad personas.
2. **Way Persistence**:
   - Each conversation stores its own `way`.
   - Account global `userWay` sets the default for new conversations.
   - Changing global Way does NOT mutate historical conversations.
3. **Structured Payload Transfer**:
   - Agents and connectors are transmitted as structured JSON arrays (`agents: string[]`, `connectors: string[]`), not plain text injected tags.
   - Server validates agent permissions and tool availability.
4. **Multimodal Ingestion**:
   - Attachments must be properly processed (base64 Data URLs or storage URLs) with content extraction before model generation.
