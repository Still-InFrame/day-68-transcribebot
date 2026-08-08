"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// Voice-reactive aurora orb, modeled on the generated orb-a.png concept art:
// thin iridescent light ribbons flowing inside a glass shell. Procedural
// shader (0 KB of assets) — image-to-3D couldn't reproduce translucent glass.
// Additive blending renders both sphere faces without sorting artifacts,
// which is what creates the "ribbons on the far side of the glass" depth.

const NOISE = /* glsl */ `
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
`;

const VERT = /* glsl */ `
${NOISE}
uniform float uTime;
uniform float uLevel;
varying vec3 vObjN;
varying vec3 vNormal;
varying vec3 vView;

void main() {
  float n = snoise(normal * 1.6 + vec3(uTime * 0.22));
  // Small ceiling: displacement beyond the frustum margin clips the
  // silhouette flat at the canvas edges.
  float disp = n * (0.02 + uLevel * 0.05) + 0.012 * sin(uTime * 0.8);
  vec3 pos = position + normal * disp;
  vObjN = normal;
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const FRAG = /* glsl */ `
${NOISE}
uniform float uTime;
uniform float uLevel;
varying vec3 vObjN;
varying vec3 vNormal;
varying vec3 vView;

void main() {
  vec3 n = normalize(vObjN);
  float fres = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.4);

  // Two slow warp fields bend the ribbon paths so nothing looks geometric.
  float w1 = snoise(n * 1.8 + vec3(0.0, uTime * 0.10, 0.0));
  float w2 = snoise(n * 2.6 + vec3(uTime * 0.07, 0.0, uTime * 0.05));

  // Aurora ribbons: thin bright bands along warped sphere coordinates.
  float band1 = pow(0.5 + 0.5 * sin(4.0 * n.y * 3.14159 + w1 * 3.5 + uTime * 0.35), 18.0);
  float band2 = pow(0.5 + 0.5 * sin(3.0 * atan(n.z, n.x) + w2 * 3.0 - uTime * 0.28), 22.0);
  float band3 = pow(0.5 + 0.5 * sin(5.0 * n.x * 3.14159 + (w1 + w2) * 2.5 + uTime * 0.22), 26.0);

  vec3 violet  = vec3(0.545, 0.361, 0.965);
  vec3 cyan    = vec3(0.133, 0.827, 0.933);
  vec3 magenta = vec3(0.910, 0.475, 0.977);
  vec3 white   = vec3(0.95, 0.97, 1.0);

  // Voice flares the ribbons.
  float boost = 0.7 + uLevel * 1.3;
  vec3 ribbons =
    (band1 * cyan * 1.35 + band2 * magenta * 1.15 + band3 * mix(violet, white, 0.35)) * boost;

  // Deep glass body + bright iridescent rim.
  vec3 base = mix(violet * 0.16, cyan * 0.12, 0.5 + 0.5 * w1);
  vec3 rim = mix(white, mix(cyan, magenta, 0.5 + 0.5 * sin(uTime * 0.3)), 0.4) * fres * 1.35;

  // Far-side ribbons render dimmer — that's the see-through-glass depth.
  float facing = gl_FrontFacing ? 1.0 : 0.4;
  vec3 color = (base * 0.6 + ribbons + rim) * facing;

  // Additive blending: alpha scales contribution; order-independent.
  float a = clamp(0.10 + fres * 0.5 + (band1 + band2 + band3) * 0.5, 0.0, 1.0);
  gl_FragColor = vec4(color, a * (gl_FrontFacing ? 1.0 : 0.55));
}
`;

// Inner plasma core: slow nebula swirl + one counter-rotating ribbon. The
// counter-motion against the outer shell is what makes the inside read as
// alive rather than painted on.
const VERT_INNER = /* glsl */ `
varying vec3 vObjN;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vObjN = normal;
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const FRAG_INNER = /* glsl */ `
${NOISE}
uniform float uTime;
uniform float uLevel;
varying vec3 vObjN;
varying vec3 vNormal;
varying vec3 vView;

void main() {
  vec3 n = normalize(vObjN);

  // Two slow octaves of drifting noise = nebula clouds.
  float s1 = snoise(n * 2.2 + vec3(0.0, uTime * 0.055, uTime * 0.03));
  float s2 = snoise(n * 4.6 - vec3(uTime * 0.04, 0.0, uTime * 0.05));
  float plasma = smoothstep(0.05, 0.95, 0.5 + 0.5 * (s1 + 0.5 * s2));

  // Bright toward the center of the disc — fakes a volumetric glow core.
  float core = pow(abs(dot(normalize(vNormal), normalize(vView))), 1.6);

  vec3 violet  = vec3(0.545, 0.361, 0.965);
  vec3 cyan    = vec3(0.133, 0.827, 0.933);
  vec3 magenta = vec3(0.910, 0.475, 0.977);

  vec3 cloud = mix(violet, magenta, 0.5 + 0.5 * s1) * plasma;
  // One dim ribbon drifting the OPPOSITE way to the outer shell.
  float band = pow(0.5 + 0.5 * sin(3.0 * atan(n.z, n.x) + s2 * 2.0 - uTime * -0.15), 20.0);
  vec3 color = (cloud * 0.5 + band * cyan * 0.35) * core * (0.55 + uLevel * 0.9);

  float facing = gl_FrontFacing ? 1.0 : 0.5;
  gl_FragColor = vec4(color * facing, core * 0.8);
}
`;

function Orb({ level }: { level: () => number }) {
  const smoothed = useRef(0);
  const innerRef = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uLevel: { value: 0 } }),
    [],
  );
  const innerUniforms = useMemo(
    () => ({ uTime: { value: 0 }, uLevel: { value: 0 } }),
    [],
  );

  useFrame((state, dt) => {
    const target = Math.min(1, Math.max(0, level()));
    const rate = target > smoothed.current ? 14 : 3.5;
    smoothed.current += (target - smoothed.current) * Math.min(1, dt * rate);
    const t = state.clock.elapsedTime;
    uniforms.uTime.value = t;
    uniforms.uLevel.value = smoothed.current;
    innerUniforms.uTime.value = t;
    innerUniforms.uLevel.value = smoothed.current;
    if (innerRef.current) {
      // Slow counter-rotation against the auto-rotating camera.
      innerRef.current.rotation.y -= dt * 0.06;
      innerRef.current.rotation.z = Math.sin(t * 0.05) * 0.2;
    }
  });

  return (
    <group>
      <mesh>
        <icosahedronGeometry args={[1, 64]} />
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={VERT}
          fragmentShader={FRAG}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh ref={innerRef} scale={0.58}>
        <icosahedronGeometry args={[1, 32]} />
        <shaderMaterial
          uniforms={innerUniforms}
          vertexShader={VERT_INNER}
          fragmentShader={FRAG_INNER}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
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
          className="relative cursor-grab active:cursor-grabbing"
          title="Drag to spin"
        >
          <Orb level={level} />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            enableDamping
            dampingFactor={0.08}
            rotateSpeed={0.9}
            autoRotate
            autoRotateSpeed={0.7}
          />
        </Canvas>
      )}
    </div>
  );
}
