"use client"

import { useRef, useEffect, Suspense } from "react"
import { Canvas, useFrame, useLoader } from "@react-three/fiber"
import { OBJLoader } from "three/addons/loaders/OBJLoader.js"
import * as THREE from "three"

function LogoMesh() {
  const obj = useLoader(OBJLoader, "/3d/logo.obj")
  const outerRef = useRef<THREE.Group>(null)
  const innerRef = useRef<THREE.Group>(null)

  useEffect(() => {
    if (!innerRef.current) return

    const box = new THREE.Box3().setFromObject(innerRef.current)
    const center = box.getCenter(new THREE.Vector3())
    innerRef.current.position.sub(center)

    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    const scale = 5.4 / maxDim
    innerRef.current.scale.setScalar(scale)

    innerRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(0xffffff),
          emissive: new THREE.Color(0xaabbff),
          emissiveIntensity: 0.25,
          metalness: 0.85,
          roughness: 0.12,
        })
        child.castShadow = false
        child.receiveShadow = false
      }
    })
  }, [obj])

  useFrame(({ clock }) => {
    if (!outerRef.current) return
    const t = clock.elapsedTime
    // Very slow continuous Y rotation (~90s per full turn)
    outerRef.current.rotation.y = t * 0.07
    // Very slow X tilt oscillation (~75s cycle)
    outerRef.current.rotation.x = Math.sin(t * 0.083) * 0.18
    // Very subtle Z roll (~110s cycle)
    outerRef.current.rotation.z = Math.sin(t * 0.057) * 0.05
    // Slow float (~50s cycle)
    outerRef.current.position.y = Math.sin(t * 0.13) * 0.3
  })

  return (
    <group ref={outerRef}>
      <group ref={innerRef}>
        <primitive object={obj} />
      </group>
    </group>
  )
}

export default function Logo3D({ className }: { className?: string }) {
  return (
    <div className={className} style={{ pointerEvents: "none" }}>
      <Canvas
        camera={{ position: [0, 0, 7], fov: 55 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        {/* Soft fill */}
        <ambientLight intensity={0.35} />
        {/* Main key light — top-right front */}
        <directionalLight position={[4, 6, 5]} intensity={2.2} color={0xffffff} />
        {/* Blue-tinted fill from left */}
        <directionalLight position={[-5, 2, 3]} intensity={0.8} color={0x8899ff} />
        {/* Rim light from behind-bottom — catches the extruded edge */}
        <directionalLight position={[0, -4, -6]} intensity={1.0} color={0xaaccff} />
        {/* Warm point glow in front */}
        <pointLight position={[0, 1, 6]} intensity={1.8} color={0xffffff} distance={18} />

        <Suspense fallback={null}>
          <LogoMesh />
        </Suspense>
      </Canvas>
    </div>
  )
}
