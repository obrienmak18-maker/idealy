import type { DesignContract } from '@/core/mission/contracts';

export interface StitchDesignRequest {
  direction: string;
  screens: DesignContract['screens'];
  visualReferences?: string[];
}

/**
 * Stitch is represented as a design-process adapter, not as an executable runtime.
 * It produces a versioned DesignContract that IUPS can enforce and validate.
 */
export function adaptStitchDesign(request: StitchDesignRequest): DesignContract {
  return {
    version: 1,
    source: 'stitch',
    direction: `${request.direction} Processus Stitch contrôlé : hiérarchie visuelle, états explicites et parcours principal validable.`,
    visualReferences: (request.visualReferences ?? []).filter(Boolean).slice(0, 8),
    screens: request.screens.map((screen) => ({
      ...screen,
      states: Array.from(new Set([...screen.states, 'loading', 'empty', 'ready', 'error'])),
    })),
    tokens: {
      colors: { background: 'ink-950', foreground: 'ink-50', accent: 'mission-accent' },
      typography: { heading: 'display', body: 'sans' },
      spacing: { page: '1.5rem', section: '2.5rem' },
      radii: { panel: '1rem', control: '0.75rem' },
    },
  };
}

export function shouldUseStitchAdapter(prompt: string): boolean {
  return /(?:^|\W)stitch(?:\W|$)/i.test(prompt);
}
