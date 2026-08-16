import { lazy, Suspense } from 'react';

type MissionLottieProps = {
  variant: 'thinking' | 'success' | 'chief';
  size?: number;
};

type LottieData = Record<string, unknown>;

const LazyLottie = lazy(() => import('lottie-react').then((module) => ({ default: module.default })));

function ringAnimation(name: string, color: [number, number, number, number], opacity: number[], frames: number): LottieData {
  return {
    v: '5.7.4',
    fr: 30,
    ip: 0,
    op: frames,
    w: 80,
    h: 80,
    nm: name,
    ddd: 0,
    layers: [{
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: name,
      sr: 1,
      ks: {
        o: { a: 1, k: opacity.map((value, index) => ({ t: Math.round((frames / Math.max(opacity.length - 1, 1)) * index), s: [value] })) },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [40, 40, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100, 100] },
      },
      shapes: [{
        ty: 'gr',
        it: [
          { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [20, 20] } },
          { ty: 'st', c: { a: 0, k: color }, o: { a: 0, k: 100 }, w: { a: 0, k: 3 }, lc: 2, lj: 2 },
          { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
        ],
      }],
    }],
  };
}

const ANIMATIONS: Record<MissionLottieProps['variant'], LottieData> = {
  thinking: ringAnimation('Idealy thinking', [0.55, 0.36, 0.96, 1], [45, 100, 45], 36),
  success: ringAnimation('Idealy success', [0.13, 0.77, 0.37, 1], [0, 100, 100], 42),
  chief: ringAnimation('Idealy chief', [0.98, 0.45, 0.09, 1], [35, 100, 35], 30),
};

export function MissionLottie({ variant, size = 34 }: MissionLottieProps) {
  return (
    <span className="inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} aria-hidden="true">
      <Suspense fallback={<span className="h-2 w-2 rounded-full bg-violet-300/60 motion-safe:animate-pulse" />}>
        <LazyLottie animationData={ANIMATIONS[variant]} loop autoplay style={{ width: size, height: size }} />
      </Suspense>
    </span>
  );
}
