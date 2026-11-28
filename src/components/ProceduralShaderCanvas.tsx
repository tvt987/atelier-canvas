import { useEffect, useRef, useState } from 'react';
import {
  VERTEX_SHADER_ES300,
  getFragmentShaderSource,
  hexToVec3,
  sanitizeShaderConfig,
  type ShaderPresetId,
  type ShaderStudioConfig,
} from '../engines/shaderStudioEngine';

export type ShaderRendererBackend = 'webgl2' | 'canvas2d';

interface ProceduralShaderCanvasProps {
  config: ShaderStudioConfig;
  width: number;
  height: number;
  borderRadius?: number;
  pointerNorm?: { x: number; y: number };
  className?: string;
  testId?: string;
  onRendererReady?: (backend: ShaderRendererBackend) => void;
}

interface GlProgramBundle {
  program: WebGLProgram;
  vao: WebGLVertexArrayObject | null;
  preset: ShaderPresetId;
  uniforms: {
    time: WebGLUniformLocation | null;
    resolution: WebGLUniformLocation | null;
    pointer: WebGLUniformLocation | null;
    pointerVel: WebGLUniformLocation | null;
    warp: WebGLUniformLocation | null;
    grain: WebGLUniformLocation | null;
    scale: WebGLUniformLocation | null;
    intensity: WebGLUniformLocation | null;
    color0: WebGLUniformLocation | null;
    color1: WebGLUniformLocation | null;
    color2: WebGLUniformLocation | null;
    color3: WebGLUniformLocation | null;
  };
}

function compileWebGl2Program(
  gl: WebGL2RenderingContext,
  preset: ShaderPresetId,
): GlProgramBundle | null {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  if (!vs || !fs) return null;

  gl.shaderSource(vs, VERTEX_SHADER_ES300);
  gl.compileShader(vs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }

  gl.shaderSource(fs, getFragmentShaderSource(preset));
  gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }

  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }

  const vao = gl.createVertexArray();
  return {
    program,
    vao,
    preset,
    uniforms: {
      time: gl.getUniformLocation(program, 'u_time'),
      resolution: gl.getUniformLocation(program, 'u_resolution'),
      pointer: gl.getUniformLocation(program, 'u_pointer'),
      pointerVel: gl.getUniformLocation(program, 'u_pointerVel'),
      warp: gl.getUniformLocation(program, 'u_warp'),
      grain: gl.getUniformLocation(program, 'u_grain'),
      scale: gl.getUniformLocation(program, 'u_scale'),
      intensity: gl.getUniformLocation(program, 'u_intensity'),
      color0: gl.getUniformLocation(program, 'u_color0'),
      color1: gl.getUniformLocation(program, 'u_color1'),
      color2: gl.getUniformLocation(program, 'u_color2'),
      color3: gl.getUniformLocation(program, 'u_color3'),
    },
  };
}

function renderCanvas2DFallbackFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  cfg: ShaderStudioConfig,
  ptrX: number,
  ptrY: number,
) {
  ctx.save();
  ctx.globalAlpha = cfg.intensity;
  ctx.fillStyle = cfg.colors[0];
  ctx.fillRect(0, 0, w, h);

  const warpAmp = 0.22 + cfg.warp * 0.14;

  if (cfg.preset === 'kinetic-dot-orbit') {
    const cols = Math.max(12, Math.round(22 * cfg.scale));
    const rows = Math.max(8, Math.round((cols * h) / Math.max(1, w)));
    const cellW = w / cols;
    const cellH = h / rows;

    const glow = ctx.createRadialGradient(
      w * (0.5 + Math.cos(t * 0.6) * 0.2),
      h * (0.5 + Math.sin(t * 0.5) * 0.2),
      10,
      w * 0.5,
      h * 0.5,
      Math.max(w, h) * 0.6,
    );
    glow.addColorStop(0, `${cfg.colors[1]}66`);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const cx = (c + 0.5) * cellW;
        const cy = (r + 0.5) * cellH;
        const dx = cx / w - (0.5 + Math.cos(t * 0.7) * 0.22);
        const dy = cy / h - (0.5 + Math.sin(t * 0.6) * 0.2);
        const dist = Math.hypot(dx, dy);
        const wave = 0.5 + 0.5 * Math.sin(dist * 16 * cfg.scale - t * 2.6);
        const ptrBoost = Math.exp(-Math.hypot(cx / w - ptrX, cy / h - ptrY) * 4) * 0.45;
        const radius = Math.min(cellW, cellH) * (0.12 + 0.32 * Math.min(1, wave * cfg.warp * 0.6 + ptrBoost));
        ctx.fillStyle = wave > 0.68 ? cfg.colors[3] : wave > 0.35 ? cfg.colors[2] : cfg.colors[1];
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(1.2, radius), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    return;
  }

  // Fluid Mesh Warp / Iridescence / Liquid Glass layered procedural fallback
  const lobes: Array<{ x: number; y: number; r: number; color: string; alpha: number }> = [
    {
      x: w * (0.28 + Math.sin(t * 0.55) * warpAmp + (ptrX - 0.5) * 0.14),
      y: h * (0.34 + Math.cos(t * 0.48) * warpAmp + (ptrY - 0.5) * 0.12),
      r: Math.max(w, h) * 0.62,
      color: cfg.colors[1],
      alpha: 0.82,
    },
    {
      x: w * (0.74 + Math.cos(t * 0.44) * warpAmp),
      y: h * (0.62 + Math.sin(t * 0.61) * warpAmp),
      r: Math.max(w, h) * 0.58,
      color: cfg.colors[2],
      alpha: 0.78,
    },
    {
      x: w * (0.52 + Math.sin(t * 0.72 + 1.8) * warpAmp),
      y: h * (0.25 + Math.cos(t * 0.53 + 0.9) * warpAmp),
      r: Math.max(w, h) * 0.52,
      color: cfg.colors[3],
      alpha: 0.64,
    },
  ];

  ctx.globalCompositeOperation = 'screen';
  for (const lobe of lobes) {
    const grad = ctx.createRadialGradient(lobe.x, lobe.y, 0, lobe.x, lobe.y, lobe.r);
    grad.addColorStop(0, lobe.color);
    grad.addColorStop(0.55, `${lobe.color}70`);
    grad.addColorStop(1, 'transparent');
    ctx.globalAlpha = lobe.alpha * cfg.intensity;
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  if (cfg.preset === 'liquid-iridescence' || cfg.preset === 'liquid-glass-refract') {
    const sheen = ctx.createLinearGradient(0, 0, w, h);
    sheen.addColorStop(0, 'transparent');
    sheen.addColorStop(0.42, `${cfg.colors[2]}44`);
    sheen.addColorStop(0.5, '#FFFFFF38');
    sheen.addColorStop(0.58, `${cfg.colors[3]}44`);
    sheen.addColorStop(1, 'transparent');
    ctx.globalAlpha = 0.75 * cfg.intensity;
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.restore();
}

export function ProceduralShaderCanvas({
  config,
  width,
  height,
  borderRadius = 0,
  pointerNorm,
  className = '',
  testId = 'procedural-shader-canvas',
  onRendererReady,
}: ProceduralShaderCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [backend, setBackend] = useState<ShaderRendererBackend>('webgl2');
  const safeConfig = sanitizeShaderConfig(config);
  const configRef = useRef<ShaderStudioConfig>(safeConfig);
  configRef.current = safeConfig;

  const pointerTargetRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  if (pointerNorm) {
    pointerTargetRef.current = {
      x: Math.max(0, Math.min(1, pointerNorm.x)),
      y: Math.max(0, Math.min(1, pointerNorm.y)),
    };
  }

  const onReadyRef = useRef(onRendererReady);
  onReadyRef.current = onRendererReady;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const targetW = Math.max(64, Math.round(width * dpr));
    const targetH = Math.max(64, Math.round(height * dpr));
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    let gl: WebGL2RenderingContext | null = null;
    try {
      gl = canvas.getContext('webgl2', {
        antialias: true,
        alpha: true,
        premultipliedAlpha: false,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      });
    } catch {
      gl = null;
    }

    let bundle: GlProgramBundle | null = null;
    let ctx2d: CanvasRenderingContext2D | null = null;
    let activeBackend: ShaderRendererBackend = 'webgl2';

    if (gl) {
      bundle = compileWebGl2Program(gl, configRef.current.preset);
      if (!bundle) {
        gl = null;
      }
    }

    if (!gl) {
      activeBackend = 'canvas2d';
      ctx2d = canvas.getContext('2d');
    }

    setBackend(activeBackend);
    onReadyRef.current?.(activeBackend);

    let rafId = 0;
    let lastTs = performance.now();
    // Start well into fluid motion so initial render is lush and organic
    let simTime = 4.6;
    const smoothPtr = { x: 0.5, y: 0.5 };
    const ptrVel = { x: 0, y: 0 };

    const drawFrame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      const cfg = configRef.current;
      simTime += dt * cfg.speed;

      const prevX = smoothPtr.x;
      const prevY = smoothPtr.y;
      smoothPtr.x += (pointerTargetRef.current.x - smoothPtr.x) * Math.min(1, dt * 8);
      smoothPtr.y += (pointerTargetRef.current.y - smoothPtr.y) * Math.min(1, dt * 8);
      ptrVel.x = ptrVel.x * 0.85 + ((smoothPtr.x - prevX) / dt) * 0.15;
      ptrVel.y = ptrVel.y * 0.85 + ((smoothPtr.y - prevY) / dt) * 0.15;

      if (gl && bundle) {
        if (bundle.preset !== cfg.preset) {
          gl.deleteProgram(bundle.program);
          if (bundle.vao) gl.deleteVertexArray(bundle.vao);
          bundle = compileWebGl2Program(gl, cfg.preset);
        }

        if (bundle) {
          gl.viewport(0, 0, canvas.width, canvas.height);
          gl.useProgram(bundle.program);
          if (bundle.vao) gl.bindVertexArray(bundle.vao);

          const c0 = hexToVec3(cfg.colors[0]);
          const c1 = hexToVec3(cfg.colors[1]);
          const c2 = hexToVec3(cfg.colors[2]);
          const c3 = hexToVec3(cfg.colors[3]);

          gl.uniform1f(bundle.uniforms.time, simTime);
          gl.uniform2f(bundle.uniforms.resolution, canvas.width, canvas.height);
          gl.uniform2f(bundle.uniforms.pointer, smoothPtr.x, 1.0 - smoothPtr.y);
          gl.uniform2f(bundle.uniforms.pointerVel, ptrVel.x, -ptrVel.y);
          gl.uniform1f(bundle.uniforms.warp, cfg.warp);
          gl.uniform1f(bundle.uniforms.grain, cfg.grain);
          gl.uniform1f(bundle.uniforms.scale, cfg.scale);
          gl.uniform1f(bundle.uniforms.intensity, cfg.intensity);
          gl.uniform3f(bundle.uniforms.color0, c0[0], c0[1], c0[2]);
          gl.uniform3f(bundle.uniforms.color1, c1[0], c1[1], c1[2]);
          gl.uniform3f(bundle.uniforms.color2, c2[0], c2[1], c2[2]);
          gl.uniform3f(bundle.uniforms.color3, c3[0], c3[1], c3[2]);

          gl.drawArrays(gl.TRIANGLES, 0, 3);
          if (bundle.vao) gl.bindVertexArray(null);
        }
      } else if (ctx2d) {
        renderCanvas2DFallbackFrame(
          ctx2d,
          canvas.width,
          canvas.height,
          simTime,
          cfg,
          smoothPtr.x,
          smoothPtr.y,
        );
      }

      rafId = window.requestAnimationFrame(drawFrame);
    };

    // Paint frame 0 synchronously so screenshots & first paint never flash empty
    drawFrame(lastTs);

    return () => {
      window.cancelAnimationFrame(rafId);
      if (gl && bundle) {
        gl.deleteProgram(bundle.program);
        if (bundle.vao) gl.deleteVertexArray(bundle.vao);
      }
    };
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      data-testid={testId}
      data-renderer={backend}
      data-shader-preset={safeConfig.preset}
      data-shader-palette={safeConfig.paletteId}
      className={`block pointer-events-none select-none ${className}`}
      style={{
        width: '100%',
        height: '100%',
        borderRadius,
      }}
    />
  );
}
