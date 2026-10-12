export function isSimpleGreeting(text: string): boolean {
  if (!text) return false;
  const clean = text
    .toLowerCase()
    .trim()
    .replace(/[!?,;.:\s]+/g, " ")
    .trim();

  if (!clean) return false;

  const words = clean.split(" ").filter(Boolean);
  if (words.length > 5) return false;

  const greetingTokens = new Set([
    "bonjour",
    "salut",
    "hey",
    "hello",
    "hi",
    "coucou",
    "yo",
    "bonsoir",
    "hola",
    "buenas",
    "buenos",
    "dias",
    "tardes",
    "good",
    "morning",
    "afternoon",
    "evening",
    "cc",
    "slt",
    "bjr",
    "wesh",
    "re",
  ]);

  const conversationalPhrases = [
    "ca va",
    "ça va",
    "comment vas tu",
    "comment tu vas",
    "comment ca va",
    "comment ça va",
    "how are you",
    "what's up",
    "whats up",
    "como estas",
    "cómo estás",
    "que tal",
    "qué tal",
  ];

  if (
    conversationalPhrases.some(
      (phrase) => clean.startsWith(phrase) || clean === phrase
    )
  ) {
    return true;
  }

  // If 1 to 3 words and all are greeting tokens
  return (
    words.length <= 3 &&
    words.every((w) => greetingTokens.has(w) || w === "")
  );
}

export function getGreetingReply({
  displayName,
  language = "fr",
  tone,
  way = "professional",
}: {
  displayName?: string | null;
  language?: string | null;
  tone?: string | null;
  way?: string | null;
}): string {
  const nameGreeting = displayName ? ` ${displayName}` : "";
  const lang = (language ?? "fr").toLowerCase().slice(0, 2);

  if (lang === "en") {
    switch (way) {
      case "ninja":
        return `Hey${nameGreeting}! Ready to build with speed and laser focus? Tell me what you'd like to create today.`;
      case "mage":
        return `Hello${nameGreeting}! What creative idea or prototype shall we design and explore today?`;
      case "hunter":
        return `Hello${nameGreeting}! Ready to track down the best architecture and build something solid? What's your project idea?`;
      default:
        return `Hello${nameGreeting}! How can I help you today? Describe your idea, and we will turn it into a clear plan and code.`;
    }
  }

  if (lang === "es") {
    switch (way) {
      case "ninja":
        return `¡Hola${nameGreeting}! ¿Listo para avanzar a toda velocidad? Cuéntame qué aplicación o idea quieres construir hoy.`;
      case "mage":
        return `¡Hola${nameGreeting}! ¿Qué idea innovadora o prototipo vamos a explorar y diseñar juntos hoy?`;
      case "hunter":
        return `¡Hola${nameGreeting}! ¿Listo para analizar y construir la mejor solución técnica? Describe tu proyecto.`;
      default:
        return `¡Hola${nameGreeting}! ¿En qué puedo ayudarte hoy? Describe tu idea y la transformaremos en una misión clara y código funcional.`;
    }
  }

  // French (default)
  switch (way) {
    case "ninja":
      return `Salut${nameGreeting} ! Prêt à avancer à vitesse maximale ? Décrivez l’application ou la fonctionnalité que vous voulez construire.`;
    case "mage":
      return `Bonjour${nameGreeting} ! Quelle idée fascinante ou quel prototype allons-nous concevoir et explorer aujourd’hui ?`;
    case "hunter":
      return `Salut${nameGreeting} ! Prêt à traquer la meilleure solution technique ? Dites-moi ce que vous souhaitez concevoir.`;
    default:
      return `Bonjour${nameGreeting} ! Comment puis-je vous aider aujourd'hui ? Décrivez votre idée d'application ou d'outil, et préparons les fondations ensemble.`;
  }
}
