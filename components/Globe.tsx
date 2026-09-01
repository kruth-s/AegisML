'use client';

import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import globePoints from '@/lib/globePoints.json';

function latLonToVector3(lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function createCurvePoints(start: THREE.Vector3, end: THREE.Vector3, altitude = 1.2) {
  const mid = start.clone().lerp(end, 0.5);
  const midLength = mid.length();
  mid.normalize().multiplyScalar(midLength * altitude);

  const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
  return curve.getPoints(50);
}

function EarthDots() {
  const pointsGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(globePoints, 3)
    );
    return geometry;
  }, []);

  return (
    <points geometry={pointsGeometry}>
      <pointsMaterial
        color="#ff5a1f"
        size={0.022}
        sizeAttenuation={true}
        transparent={true}
        opacity={0.95}
      />
    </points>
  );
}

function Globe() {
  const innerGlobeRef = useRef<THREE.Group>(null);

  // Smooth rotation directly around the 15-degree tilted local axis
  useFrame((_, delta) => {
    if (innerGlobeRef.current) {
      innerGlobeRef.current.rotation.y += delta * 0.05;
    }
  });

  // 15 degrees tilt in radians: 15 * (PI / 180) ≈ 0.2618 rad
  const tilt15Deg = 15 * (Math.PI / 180);

  return (
    // Outer Group fixed at 15-degree slant
    <group rotation={[tilt15Deg, 0, -tilt15Deg]} scale={0.78}>
      {/* Inner Group rotating smoothly around the 15° tilted axis */}
      <group ref={innerGlobeRef}>
        {/* Dark Earth Base */}
        <mesh>
          <sphereGeometry args={[2.5, 64, 64]} />
          <meshBasicMaterial color="#080808" />
        </mesh>

        {/* Orange continent dots */}
        <EarthDots />

        {/* Latitude / longitude wireframe grid */}
        <mesh>
          <sphereGeometry args={[2.512, 32, 32]} />
          <meshBasicMaterial
            color="#222222"
            wireframe={true}
            transparent={true}
            opacity={0.35}
          />
        </mesh>

        {/* Outer subtle atmospheric glow */}
        <mesh>
          <sphereGeometry args={[2.56, 48, 48]} />
          <meshBasicMaterial
            color="#ff5a1f"
            transparent={true}
            opacity={0.03}
            side={THREE.BackSide}
          />
        </mesh>

      </group>
    </group>
  );
}

export default function GlobeScene() {
  return (
    <div className="w-full h-full relative cursor-grab active:cursor-grabbing select-none">
      <Canvas
        camera={{
          position: [0, 0, 6.4],
          fov: 40,
        }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <Globe />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          rotateSpeed={0.6}
          enableDamping={true}
          dampingFactor={0.05}
        />
      </Canvas>
    </div>
  );
}
