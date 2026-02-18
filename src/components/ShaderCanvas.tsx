"use client";

import { useEffect, useRef } from "react";

interface ShaderCanvasProps {
  className?: string;
}

const VERT_SRC = `#version 300 es
void main() {
  vec2 pos[3] = vec2[](vec2(-1,-1), vec2(3,-1), vec2(-1,3));
  gl_Position = vec4(pos[gl_VertexID], 0.0, 1.0);
}
`;

const FRAG_SRC = `#version 300 es
precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;
out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f); // smoothstep

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 4; i++) {
    value += amplitude * valueNoise(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t = u_time * 0.08;

  float n = fbm(uv * 3.0 + vec2(t * 0.4, t * 0.3));
  n += 0.4 * fbm(uv * 6.0 - vec2(t * 0.2, t * 0.5));

  // Warm off-white range: #f0efe8 → #e2e0d8
  vec3 colorA = vec3(0.941, 0.937, 0.910); // #f0efe8
  vec3 colorB = vec3(0.886, 0.878, 0.847); // #e2e0d8
  vec3 color = mix(colorA, colorB, n);

  fragColor = vec4(color, 1.0);
}
`;

export default function ShaderCanvas({ className }: ShaderCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // --- WebGL2 context ---
    const gl = canvas.getContext("webgl2");
    if (!gl) {
      console.warn("ShaderCanvas: WebGL2 not supported, canvas will be blank.");
      return;
    }

    // --- Compile shader helper ---
    function compileShader(type: number, source: string): WebGLShader | null {
      const shader = gl!.createShader(type);
      if (!shader) return null;
      gl!.shaderSource(shader, source);
      gl!.compileShader(shader);
      if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl!.getShaderInfoLog(shader));
        gl!.deleteShader(shader);
        return null;
      }
      return shader;
    }

    // --- Build program ---
    const vert = compileShader(gl.VERTEX_SHADER, VERT_SRC);
    const frag = compileShader(gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vert || !frag) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    // Empty VAO required for no-VBO draw
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // Uniform locations
    const uTime = gl.getUniformLocation(program, "u_time");
    const uResolution = gl.getUniformLocation(program, "u_resolution");

    // --- Resize handler ---
    function syncSize() {
      if (!canvas || !gl) return;
      const { clientWidth, clientHeight } = canvas;
      if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
        canvas.width = clientWidth;
        canvas.height = clientHeight;
        gl.viewport(0, 0, clientWidth, clientHeight);
      }
      gl.uniform2f(uResolution, canvas.width, canvas.height);
    }

    const resizeObserver = new ResizeObserver(syncSize);
    resizeObserver.observe(canvas);
    syncSize();

    // --- Render loop ---
    let rafId: number;
    const startTime = performance.now();

    function render() {
      if (!gl) return;
      const t = (performance.now() - startTime) / 1000;
      gl.uniform1f(uTime, t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      rafId = requestAnimationFrame(render);
    }

    rafId = requestAnimationFrame(render);

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      gl.deleteProgram(program);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
