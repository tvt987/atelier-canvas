import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SHADER_CONFIG,
  SANDBOX_STATES,
  SHADER_PALETTES,
  SHADER_PRESETS,
  VERTEX_SHADER_ES300,
  Z_STRATA_META,
  classifyLayerStratum,
  compileShaderStudioCode,
  computeCodeDiffLines,
  computeInteractiveStateStyle,
  computePointer3DTilt,
  computeStrataAltitudes,
  computeZStackGeometry,
  getFragmentShaderSource,
  getShaderPaletteById,
  getShaderPresetById,
  hexToVec3,
  normalizeHexColor,
  repairArtboardContrastToAAA,
  sanitizeShaderConfig,
} from '../shaderStudioEngine';
import { createDocumentByTemplateId } from '../templates';
import { auditNodeContrast } from '../wcag';

describe('v7.0 Live Procedural GLSL Shader Studio, 3D Z-Stack & Component Sandbox Engine', () => {
  it('exposes exactly 4 curated procedural GLSL shader presets and 4 studio palettes', () => {
    expect(SHADER_PRESETS).toHaveLength(4);
    expect(SHADER_PRESETS.map((p) => p.id)).toEqual([
      'mesh-warp',
      'liquid-iridescence',
      'kinetic-dot-orbit',
      'liquid-glass-refract',
    ]);
    expect(SHADER_PALETTES).toHaveLength(4);
    expect(SHADER_PALETTES.map((p) => p.id)).toEqual([
      'obsidian-electric',
      'swiss-vermilion',
      'kyoto-jade',
      'iridescent-pearl',
    ]);
  });

  it('provides a valid GLSL ES 3.00 full-screen triangle vertex shader', () => {
    expect(VERTEX_SHADER_ES300).toContain('#version 300 es');
    expect(VERTEX_SHADER_ES300).toContain('gl_VertexID');
    expect(VERTEX_SHADER_ES300).toContain('out vec2 v_uv;');
    expect(VERTEX_SHADER_ES300).toContain('gl_Position');
  });

  it.each(SHADER_PRESETS)(
    'generates complete GLSL ES 3.00 fragment shader source for $id with all required uniforms',
    (preset) => {
      const src = getFragmentShaderSource(preset.id);
      expect(src).toContain('#version 300 es');
      expect(src).toContain('precision highp float;');
      expect(src).toContain('uniform float u_time;');
      expect(src).toContain('uniform vec2 u_resolution;');
      expect(src).toContain('uniform vec2 u_pointer;');
      expect(src).toContain('uniform vec2 u_pointerVel;');
      expect(src).toContain('uniform float u_warp;');
      expect(src).toContain('uniform float u_grain;');
      expect(src).toContain('uniform float u_scale;');
      expect(src).toContain('uniform float u_intensity;');
      expect(src).toContain('uniform vec3 u_color0;');
      expect(src).toContain('uniform vec3 u_color3;');
      expect(src).toContain('outColor = vec4(');
    },
  );

  it('produces distinct mathematical shader kernels across all 4 presets', () => {
    const sources = SHADER_PRESETS.map((p) => getFragmentShaderSource(p.id));
    expect(new Set(sources).size).toBe(4);
    expect(sources[1]).toContain('thinFilm');
    expect(sources[2]).toContain('dotRadius');
    expect(sources[3]).toContain('sampleGlassField');
  });

  it('normalizes 3-char and 6-char hex colors and falls back safely on malformed input', () => {
    expect(normalizeHexColor('#0af', '#000000')).toBe('#00AAFF');
    expect(normalizeHexColor('  #6366f1 ', '#000000')).toBe('#6366F1');
    expect(normalizeHexColor('javascript:alert(1)', '#06B6D4')).toBe('#06B6D4');
    expect(normalizeHexColor('#ZZZZZZ', '#E11D48')).toBe('#E11D48');
  });

  it('converts hex colors deterministically into normalized RGB vec3 floats', () => {
    expect(hexToVec3('#000000')).toEqual([0, 0, 0]);
    expect(hexToVec3('#FFFFFF')).toEqual([1, 1, 1]);
    const [r, g, b] = hexToVec3('#FF8000');
    expect(r).toBeCloseTo(1, 3);
    expect(g).toBeCloseTo(128 / 255, 3);
    expect(b).toBeCloseTo(0, 3);
  });

  it('clamps shader numeric uniforms cleanly within deterministic studio bounds', () => {
    const high = sanitizeShaderConfig({
      speed: 99,
      warp: 12,
      grain: 5,
      scale: 42,
      intensity: 9,
    });
    expect(high.speed).toBe(3.0);
    expect(high.warp).toBe(2.0);
    expect(high.grain).toBe(0.35);
    expect(high.scale).toBe(3.0);
    expect(high.intensity).toBe(1.0);

    const low = sanitizeShaderConfig({
      speed: -5,
      warp: -1,
      grain: -0.4,
      scale: 0.01,
      intensity: 0,
    });
    expect(low.speed).toBe(0.1);
    expect(low.warp).toBe(0.0);
    expect(low.grain).toBe(0.0);
    expect(low.scale).toBe(0.5);
    expect(low.intensity).toBe(0.15);
  });

  it('handles NaN and Infinity uniform inputs gracefully without corrupting state', () => {
    const safe = sanitizeShaderConfig({
      speed: Number.NaN,
      warp: Number.POSITIVE_INFINITY,
      grain: Number.NEGATIVE_INFINITY,
      scale: Number.NaN,
    });
    expect(Number.isFinite(safe.speed)).toBe(true);
    expect(Number.isFinite(safe.warp)).toBe(true);
    expect(Number.isFinite(safe.grain)).toBe(true);
    expect(Number.isFinite(safe.scale)).toBe(true);
  });

  it('resolves palette and preset lookups with safe fallback', () => {
    expect(getShaderPaletteById('swiss-vermilion').colors[1]).toBe('#E11D48');
    expect(getShaderPresetById('kinetic-dot-orbit').shortName).toBe('Dot-Orbit');
  });

  it('computes exact architectural Z+0, Z+40, Z+80, Z+120 strata altitudes at 80% explode', () => {
    const strata80 = computeStrataAltitudes(0.8);
    expect(strata80.map((s) => s.liveBadgeLabel)).toEqual([
      'Z+0 Shader',
      'Z+40 Surface',
      'Z+80 Cards',
      'Z+120 Type & CTA',
    ]);
    expect(strata80.map((s) => s.liveZPx)).toEqual([0, 40, 80, 120]);
  });

  it('collapses all Z strata cleanly to Z+0 at 0% explode and scales linearly to 100%', () => {
    const flat = computeStrataAltitudes(0);
    expect(flat.every((s) => s.liveZPx === 0)).toBe(true);

    const full = computeStrataAltitudes(1);
    expect(full.map((s) => s.liveZPx)).toEqual(
      Z_STRATA_META.map((s) => s.baseAltitudePx),
    );
  });

  it('classifies artboard layers into deterministic architectural Z strata', () => {
    const doc = createDocumentByTemplateId('fintech-spatial');
    const orb = doc.nodes.find((n) => n.id === 'ft-orb-primary')!;
    const card = doc.nodes.find((n) => n.id === 'ft-balance-card')!;
    const cta = doc.nodes.find((n) => n.id === 'ft-cta-transfer')!;
    const title = doc.nodes.find((n) => n.id === 'ft-balance-value')!;

    expect(classifyLayerStratum(orb).id).toBe('surface');
    expect(classifyLayerStratum(card).id).toBe('cards');
    expect(classifyLayerStratum(cta).id).toBe('controls');
    expect(classifyLayerStratum(title).id).toBe('controls');
  });

  it('computes monotonic 3D Z-Stack geometry, hit-testing priority, and shadow elevation', () => {
    const doc = createDocumentByTemplateId('fintech-spatial');
    const geom = computeZStackGeometry(doc.nodes, 0.8);
    const orbG = geom.find((g) => g.nodeId === 'ft-orb-primary')!;
    const cardG = geom.find((g) => g.nodeId === 'ft-balance-card')!;
    const ctaG = geom.find((g) => g.nodeId === 'ft-cta-transfer')!;

    expect(orbG.zOffsetPx).toBeLessThan(cardG.zOffsetPx);
    expect(cardG.zOffsetPx).toBeLessThan(ctaG.zOffsetPx);
    expect(ctaG.hitOrder).toBeGreaterThan(cardG.hitOrder);
    expect(cardG.hitOrder).toBeGreaterThan(orbG.hitOrder);
    expect(ctaG.shadowBlurPx).toBeGreaterThan(orbG.shadowBlurPx);
  });

  it('excludes hidden layers from 3D Z-Stack geometry', () => {
    const doc = createDocumentByTemplateId('fintech-spatial');
    const modified = doc.nodes.map((n, i) =>
      i === 0 ? { ...n, visible: false } : n,
    );
    const geom = computeZStackGeometry(modified, 0.8);
    expect(geom.some((g) => g.nodeId === doc.nodes[0].id)).toBe(false);
    expect(geom.length).toBe(modified.filter((n) => n.visible).length);
  });

  it('computes bounded pointer-reactive 3D isometric tilt and respects tilt toggle', () => {
    const off = computePointer3DTilt(46, -24, 1, -1, false);
    expect(off).toEqual({ rotateX: 46, rotateY: -24, tiltX: 0, tiltY: 0 });

    const tilted = computePointer3DTilt(46, -24, 0.8, -0.5, true, 8);
    expect(tilted.tiltY).toBeCloseTo(6.4, 2);
    expect(tilted.tiltX).toBeCloseTo(4.0, 2);
    expect(tilted.rotateX).toBeCloseTo(50.0, 2);
    expect(tilted.rotateY).toBeCloseTo(-17.6, 2);

    const clamped = computePointer3DTilt(90, -90, 5, -5, true, 10);
    expect(clamped.rotateX).toBeLessThanOrEqual(78);
    expect(clamped.rotateY).toBeGreaterThanOrEqual(-68);
  });

  it('returns distinct tactile visual specs for all 5 Interactive Component Sandbox states', () => {
    expect(SANDBOX_STATES).toHaveLength(5);
    const hover = computeInteractiveStateStyle('hover', '#06B6D4');
    const pressed = computeInteractiveStateStyle('pressed', '#06B6D4');
    const focus = computeInteractiveStateStyle('focus', '#06B6D4');
    const disabled = computeInteractiveStateStyle('disabled', '#06B6D4');
    const def = computeInteractiveStateStyle('default', '#06B6D4');

    expect(hover.transform).toContain('scale(1.02)');
    expect(pressed.transform).toContain('scale(0.97)');
    expect(focus.outline).toContain('#06B6D4');
    expect(disabled.opacityMultiplier).toBeLessThan(0.6);
    expect(def.transform).toBe('none');
  });

  it('repairs failing artboard text/button contrast to WCAG AAA in 1 click without touching other artboards', () => {
    const doc = createDocumentByTemplateId('fintech-spatial');
    const degradedDoc = {
      ...doc,
      nodes: doc.nodes.map((n) =>
        n.id === 'ft-balance-eyebrow' || n.id === 'ft-balance-delta'
          ? {
              ...n,
              textColor: '#2A2F42',
              tokenBinding: undefined,
            }
          : n,
      ),
    };

    const beforeAudit = auditNodeContrast(
      degradedDoc.nodes.find((n) => n.id === 'ft-balance-eyebrow')!,
      degradedDoc,
    )!;
    expect(beforeAudit.passesAAA).toBe(false);

    const result = repairArtboardContrastToAAA(degradedDoc, doc.artboard.id);
    expect(result.repairedCount).toBeGreaterThanOrEqual(2);
    expect(result.repairedNodeIds).toContain('ft-balance-eyebrow');
    expect(result.repairedNodeIds).toContain('ft-balance-delta');
    expect(result.passingAAAAfter).toBeGreaterThanOrEqual(result.passingAAABefore);

    const afterDoc = { ...degradedDoc, nodes: result.nextNodes };
    const afterAudit = auditNodeContrast(
      afterDoc.nodes.find((n) => n.id === 'ft-balance-eyebrow')!,
      afterDoc,
    )!;
    expect(afterAudit.passesAAA).toBe(true);
    expect(afterAudit.ratio).toBeGreaterThanOrEqual(7);
  });

  it('compiles live GLSL ES 3.00, React 19 + Tailwind v4, and SwiftUI MeshGradient code', () => {
    const doc = createDocumentByTemplateId('fintech-spatial');
    const selected = doc.nodes.find((n) => n.id === 'ft-cta-transfer')!;

    const glsl = compileShaderStudioCode({
      target: 'glsl',
      config: DEFAULT_SHADER_CONFIG,
      tokens: doc.tokens,
      sandboxState: 'default',
      selectedNode: selected,
    });
    expect(glsl.filename).toBe('atelier-mesh-warp.frag.glsl');
    expect(glsl.code).toContain('#version 300 es');
    expect(glsl.code).toContain('warp=1.15');

    const react = compileShaderStudioCode({
      target: 'react-tailwind',
      config: DEFAULT_SHADER_CONFIG,
      tokens: doc.tokens,
      sandboxState: 'hover',
      selectedNode: selected,
    });
    expect(react.filename).toBe('AtelierShaderHero.tsx');
    expect(react.code).toContain('ProceduralShaderCanvas');
    expect(react.code).toContain('data-state="hover"');
    expect(react.code).toContain('hover:scale-[1.02]');

    const swift = compileShaderStudioCode({
      target: 'swiftui',
      config: { ...DEFAULT_SHADER_CONFIG, preset: 'liquid-iridescence' },
      tokens: doc.tokens,
      sandboxState: 'pressed',
      selectedNode: selected,
    });
    expect(swift.filename).toBe('AtelierShaderSurface.swift');
    expect(swift.code).toContain('MeshGradient(');
    expect(swift.code).toContain('atelier_liquid_iridescence');
    expect(swift.code).toContain('isPressed = true');
  });

  it('highlights exact mutated line numbers in live codegen when shader uniforms or state change', () => {
    const doc = createDocumentByTemplateId('fintech-spatial');
    const first = compileShaderStudioCode({
      target: 'react-tailwind',
      config: DEFAULT_SHADER_CONFIG,
      tokens: doc.tokens,
      sandboxState: 'default',
    });
    const second = compileShaderStudioCode({
      target: 'react-tailwind',
      config: { ...DEFAULT_SHADER_CONFIG, warp: 1.75, speed: 2.1 },
      tokens: doc.tokens,
      sandboxState: 'hover',
      previousCode: first.code,
    });

    expect(second.changedLineNumbers.length).toBeGreaterThanOrEqual(4);
    for (const lineNum of second.changedLineNumbers) {
      expect(second.lines[lineNum - 1]).not.toBe(first.lines[lineNum - 1]);
    }
  });

  it('returns empty diff list when previousCode is null or identical', () => {
    expect(computeCodeDiffLines(null, 'line1\nline2')).toEqual([]);
    expect(computeCodeDiffLines('line1\nline2', 'line1\nline2')).toEqual([]);
    expect(computeCodeDiffLines('a\nb\nc', 'a\nX\nc')).toEqual([2]);
  });

  it('contains zero UI emoji characters in presets, palettes, strata labels, or compiled code', () => {
    const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    const doc = createDocumentByTemplateId('fintech-spatial');
    const combined = [
      ...SHADER_PRESETS.map((p) => `${p.name} ${p.tagline}`),
      ...SHADER_PALETTES.map((p) => `${p.name} ${p.shortName}`),
      ...Z_STRATA_META.map((s) => s.fullLabel),
      compileShaderStudioCode({
        target: 'react-tailwind',
        config: DEFAULT_SHADER_CONFIG,
        tokens: doc.tokens,
        sandboxState: 'focus',
      }).code,
      compileShaderStudioCode({
        target: 'glsl',
        config: DEFAULT_SHADER_CONFIG,
        tokens: doc.tokens,
        sandboxState: 'focus',
      }).code,
      compileShaderStudioCode({
        target: 'swiftui',
        config: DEFAULT_SHADER_CONFIG,
        tokens: doc.tokens,
        sandboxState: 'focus',
      }).code,
    ].join('\n');
    expect(emojiRe.test(combined)).toBe(false);
  });

  it('propagates palette hex colors cleanly when only paletteId is provided to sanitizeShaderConfig', () => {
    const jade = sanitizeShaderConfig({ paletteId: 'kyoto-jade' });
    expect(jade.colors).toEqual(['#061517', '#0D9488', '#34D399', '#38BDF8']);
    const pearl = sanitizeShaderConfig({ paletteId: 'iridescent-pearl' });
    expect(pearl.colors[1]).toBe('#EC4899');
  });

  it('clamps computeStrataAltitudes and computeZStackGeometry safely for out-of-range explode factors', () => {
    const negative = computeStrataAltitudes(-0.5);
    expect(negative.every((s) => s.liveZPx === 0)).toBe(true);

    const overshoot = computeStrataAltitudes(2.4);
    expect(overshoot[3].liveZPx).toBe(150);

    expect(computeZStackGeometry([], 0.8)).toEqual([]);
  });

  it('injects WCAG AAA repair verification metadata into GLSL, React 19, and SwiftUI compiled targets', () => {
    const doc = createDocumentByTemplateId('fintech-spatial');
    const summary = { repairedCount: 4, minRatioAfter: 8.4 };

    for (const target of ['glsl', 'react-tailwind', 'swiftui'] as const) {
      const compiled = compileShaderStudioCode({
        target,
        config: DEFAULT_SHADER_CONFIG,
        tokens: doc.tokens,
        sandboxState: 'default',
        wcagRepairSummary: summary,
      });
      expect(compiled.code).toContain('WCAG AAA Verified: min 8.4:1 (4 layers repaired)');
    }
  });

  it('highlights exact WCAG comment diff line when repair summary updates on live codegen', () => {
    const doc = createDocumentByTemplateId('fintech-spatial');
    const before = compileShaderStudioCode({
      target: 'react-tailwind',
      config: DEFAULT_SHADER_CONFIG,
      tokens: doc.tokens,
      sandboxState: 'default',
    });
    const after = compileShaderStudioCode({
      target: 'react-tailwind',
      config: DEFAULT_SHADER_CONFIG,
      tokens: doc.tokens,
      sandboxState: 'default',
      wcagRepairSummary: { repairedCount: 3, minRatioAfter: 7.5 },
      previousCode: before.code,
    });
    expect(after.changedLineNumbers).toContain(3);
  });

  it('renders disabled and focus SwiftUI modifiers accurately in SwiftUI codegen', () => {
    const doc = createDocumentByTemplateId('fintech-spatial');
    const focusSwift = compileShaderStudioCode({
      target: 'swiftui',
      config: DEFAULT_SHADER_CONFIG,
      tokens: doc.tokens,
      sandboxState: 'focus',
    });
    expect(focusSwift.code).toContain('.focusable(true)');

    const disabledSwift = compileShaderStudioCode({
      target: 'swiftui',
      config: DEFAULT_SHADER_CONFIG,
      tokens: doc.tokens,
      sandboxState: 'disabled',
    });
    expect(disabledSwift.code).toContain('.disabled(true)');
  });

  it('serializes normalized RGB vec3 palette constants cleanly into GLSL header comments', () => {
    const doc = createDocumentByTemplateId('fintech-spatial');
    const glsl = compileShaderStudioCode({
      target: 'glsl',
      config: sanitizeShaderConfig({ paletteId: 'swiss-vermilion', warp: 1.8 }),
      tokens: doc.tokens,
      sandboxState: 'default',
    });
    expect(glsl.code).toContain('warp=1.80');
    expect(glsl.code).toContain('u_color1=vec3(0.882, 0.114, 0.282)');
  });

  it('keeps hitOrder strictly unique from 1..N across all visible nodes in 3D Z-Stack geometry', () => {
    const doc = createDocumentByTemplateId('fintech-spatial');
    const geom = computeZStackGeometry(doc.nodes, 0.85);
    const orders = geom.map((g) => g.hitOrder).sort((a, b) => a - b);
    expect(orders[0]).toBe(1);
    expect(orders[orders.length - 1]).toBe(geom.length);
    expect(new Set(orders).size).toBe(geom.length);
  });

  it('handles pointer tilt smoothly with zero NaN across extreme pointer coordinates', () => {
    const res = computePointer3DTilt(46, -24, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, true, 7.5);
    expect(Number.isFinite(res.rotateX)).toBe(true);
    expect(Number.isFinite(res.rotateY)).toBe(true);
  });

  it('lifts 100% of default fintech-spatial artboard text and button nodes to WCAG AAA >= 7.0:1', () => {
    const doc = createDocumentByTemplateId('fintech-spatial');
    const repaired = repairArtboardContrastToAAA(doc, doc.artboard.id);
    expect(repaired.totalAudited).toBeGreaterThanOrEqual(14);
    expect(repaired.passingAAAAfter).toBe(repaired.totalAudited);
    expect(repaired.minRatioAfter).toBeGreaterThanOrEqual(7.0);
  });
});
