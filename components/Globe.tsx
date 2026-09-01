'use client';

import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Database, User } from 'lucide-react';
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

function NetworkArc({ start, end, altitude = 1.2 }: { start: THREE.Vector3; end: THREE.Vector3; altitude?: number }) {
  const lineGeometry = useMemo(() => {
    const pts = createCurvePoints(start, end, altitude);
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [start, end, altitude]);

  return (
    <line geometry={lineGeometry}>
      <lineBasicMaterial color="#ff5a1f" transparent opacity={0.9} linewidth={1.5} />
    </line>
  );
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

  // Network Nodes Coordinates on Globe surface (radius: 2.52)
  const radius = 2.52;
  const dbPos = useMemo(() => latLonToVector3(40, -68, radius), [radius]);
  const user1Pos = useMemo(() => latLonToVector3(54, -110, radius), [radius]);
  const user2Pos = useMemo(() => latLonToVector3(-8, -42, radius), [radius]);

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

        {/* Connecting Network Arcs */}
        <NetworkArc start={user1Pos} end={dbPos} altitude={1.2} />
        <NetworkArc start={user2Pos} end={dbPos} altitude={1.22} />

        {/* Central Database / Server Node */}
        <group position={dbPos}>
          <Html center distanceFactor={9} zIndexRange={[100, 0]}>
            <div className="relative flex items-center justify-center pointer-events-none select-none">
              <div className="w-8 h-8 rounded-full bg-[#ff5a1f] shadow-md border-2 border-[#ff7a45] flex items-center justify-center text-zinc-950">
                <Database className="w-4 h-4 text-zinc-950 stroke-[2.5]" />
              </div>
            </div>
          </Html>
        </group>

        {/* User Node 1 Badge */}
        <group position={user1Pos}>
          <Html center distanceFactor={9} zIndexRange={[100, 0]}>
            <div className="relative flex items-center justify-center pointer-events-none select-none">
              <div className="w-7 h-7 rounded-full bg-[#0b0f17]/95 border-2 border-[#ff5a1f] shadow-lg shadow-black/60 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-[#ff5a1f] stroke-[2.2]" />
              </div>
            </div>
          </Html>
        </group>

        {/* User Node 2 Badge */}
        <group position={user2Pos}>
          <Html center distanceFactor={9} zIndexRange={[100, 0]}>
            <div className="relative flex items-center justify-center pointer-events-none select-none">
              <div className="w-7 h-7 rounded-full bg-[#0b0f17]/95 border-2 border-[#ff5a1f] shadow-lg shadow-black/60 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-[#ff5a1f] stroke-[2.2]" />
              </div>
            </div>
          </Html>
        </group>
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
