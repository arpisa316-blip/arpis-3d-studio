'use client';

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Stage, Center } from '@react-three/drei';

function Model({ url }: { url: string }) {
const proxyUrl = `/api/generate?fileUrl=${encodeURIComponent(url)}`;
  const { scene } = useGLTF(proxyUrl);
  return <primitive object={scene} />;
}

export default function ModelViewer({ url }: { url?: string | null }) {
  if (!url) return null;

  return (
    <div className="w-full h-full">
      <Canvas shadows camera={{ position: [0, 0, 4], fov: 45 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} />
        <Suspense fallback={null}>
          <Stage environment="city" intensity={0.6}>
            <Center>
              <Model url={url} />
            </Center>
          </Stage>
        </Suspense>
        <OrbitControls autoRotate enableZoom enablePan />
      </Canvas>
    </div>
  );
}