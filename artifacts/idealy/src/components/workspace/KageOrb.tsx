import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';
import type { Mesh } from 'three';

function KageCore() {
  const meshRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y += delta * 0.18;
    meshRef.current.rotation.x += delta * 0.08;
  });

  return (
    <Float speed={1.1} rotationIntensity={0.22} floatIntensity={0.35}>
      <mesh ref={meshRef} scale={1.08}>
        <icosahedronGeometry args={[0.85, 4]} />
        <MeshDistortMaterial
          color="#8b5cf6"
          emissive="#32146f"
          emissiveIntensity={1.35}
          roughness={0.28}
          metalness={0.62}
          distort={0.18}
          speed={1.25}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} scale={1.45}>
        <torusGeometry args={[0.86, 0.012, 12, 96]} />
        <meshBasicMaterial color="#f97316" transparent opacity={0.65} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, Math.PI / 5]} scale={1.26}>
        <torusGeometry args={[0.86, 0.008, 12, 96]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.42} />
      </mesh>
    </Float>
  );
}

export default function KageOrb() {
  return (
    <div className="relative h-[172px] w-[172px]" aria-label="Orbe du Kage" role="img">
      <div aria-hidden="true" className="absolute inset-5 rounded-full bg-violet-500/20 blur-2xl" />
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 3.2], fov: 42 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.7} />
        <pointLight position={[2, 2, 3]} intensity={3.2} color="#f97316" />
        <pointLight position={[-2, -1, 2]} intensity={2.4} color="#8b5cf6" />
        <KageCore />
      </Canvas>
    </div>
  );
}
