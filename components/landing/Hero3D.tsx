"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Voice-reactive aurora orb, built as a shader rather than the generated GLB:
// image-to-3D can't reproduce translucent glass, and a procedural surface
// animates from the audio envelope for free (0 KB of geometry assets).

const VERT = /* glsl */ `
// Ashima simplex noise (condensed)
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

uniform float uTime;
uniform float uLevel;
varying vec3 vNormal;
varying vec3 vView;
varying float vNoise;

void main() {
  float n = snoise(normal * 1.6 + vec3(uTime * 0.25));
  float breath = 0.015 * sin(uTime * 0.8);
  // Displacement ceiling keeps the sphere inside the camera frustum at full
  // pulse — exceeding it clips the silhouette flat at the canvas edges.
  float disp = n * (0.025 + uLevel * 0.08) + breath;
  vec3 pos = position + normal * disp;
  vNoise = n;
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const FRAG = /* glsl */ `
uniform float uTime;
uniform float uLevel;
varying vec3 vNormal;
varying vec3 vView;
varying float vNoise;

void main() {
  vec3 violet = vec3(0.545, 0.361, 0.965);
  vec3 cyan = vec3(0.133, 0.827, 0.933);
  vec3 magenta = vec3(0.910, 0.475, 0.977);

  float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.6);
  float swirl = 0.5 + 0.5 * sin(vNoise * 6.0 + uTime * 0.9);
  vec3 base = mix(violet, cyan, swirl);
  float band = 0.5 + 0.5 * sin(uTime * 0.5 + vNoise * 4.5 + vNormal.y * 3.0);
  base = mix(base, magenta, band * 0.6);

  vec3 color = base * (0.55 + uLevel * 0.7) + base * fres * 2.0;
  float alpha = 0.34 + fres * 0.66;
  gl_FragColor = vec4(color, alpha);
}
`;

function Orb({ level }: { level: () => number }) {
  const mesh = useRef<THREE.Mesh>(null);
  const smoothed = useRef(0);
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uLevel: { value: 0 } }),
    [],
  );

  useFrame((state, dt) => {
    const target = Math.min(1, Math.max(0, level()));
    // fast attack, slow release — reads as "speech" rather than flicker
    const rate = target > smoothed.current ? 14 : 3.5;
    smoothed.current += (target - smoothed.current) * Math.min(1, dt * rate);
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uLevel.value = smoothed.current;
    if (mesh.current) {
      mesh.current.rotation.y += dt * 0.12;
      mesh.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.18) * 0.12;
    }
  });

  return (
    <mesh ref={mesh}>
      <icosahedronGeometry args={[1, 64]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={VERT}
        fragmentShader={FRAG}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

export default function Hero3D({ level }: { level: () => number }) {
  const [mode, setMode] = useState<"3d" | "static">("3d");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas = document.createElement("canvas");
    const webgl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (reduced || !webgl) setMode("static");
  }, []);

  return (
    <div className="relative w-full aspect-square max-w-105 mx-auto">
      {/* soft halo — cheaper than a bloom pass */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-full blur-3xl opacity-40"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.55), rgba(34,211,238,0.25) 55%, transparent 75%)",
        }}
      />
      {mode === "static" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/orb-a.png" alt="" className="relative w-full h-full object-contain" />
      ) : (
        <Canvas
          dpr={[1, 1.75]}
          camera={{ position: [0, 0, 2.85], fov: 45 }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          className="relative"
        >
          <Orb level={level} />
        </Canvas>
      )}
    </div>
  );
}
