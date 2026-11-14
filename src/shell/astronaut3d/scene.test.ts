import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import BodyFigure2D from './BodyFigure2D';
import AstronautView from './AstronautView';
import { createAstronautScene } from './scene';
import { regionIds } from './regions';
import { SceneResources } from './resources';
import type { RegionFlags, RegionId } from './types';

const render = vi.hoisted(() => vi.fn());
const disposeRenderer = vi.hoisted(() => vi.fn());
const disposeEnvironment = vi.hoisted(() => vi.fn());
vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  return {
    ...actual,
    WebGLRenderer: class {
      domElement: HTMLCanvasElement;
      debug = {};
      constructor({ canvas }: { canvas: HTMLCanvasElement }) {
        this.domElement = canvas;
      }
      setPixelRatio = vi.fn();
      setClearColor = vi.fn();
      setSize = vi.fn();
      render = render;
      dispose = disposeRenderer;
      forceContextLoss = vi.fn();
    },
    PMREMGenerator: class {
      fromScene() {
        return { texture: new actual.Texture(), dispose: disposeEnvironment };
      }
      dispose = vi.fn();
    },
  };
});
vi.mock('three/examples/jsm/controls/OrbitControls.js', async () => {
  const actual = await import('three');
  return {
    OrbitControls: class extends actual.EventDispatcher {
      target = new actual.Vector3();
      camera: THREE.Camera;
      constructor(camera: THREE.Camera) {
        super();
        this.camera = camera;
      }
      update() {
        this.camera.lookAt(this.target);
      }
      dispose = vi.fn();
    },
  };
});

class Canvas extends EventTarget {
  style = {};
  hidden = false;
  setAttribute = vi.fn();
  remove = vi.fn();
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 410, height: 547 };
  }
  getContext = vi.fn((type: string) =>
    type === 'webgl2'
      ? {}
      : {
          fillRect: vi.fn(),
          fillText: vi.fn(),
          beginPath: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          stroke: vi.fn(),
          createRadialGradient: () => ({ addColorStop: vi.fn() }),
        },
  );
}
const flags = Object.fromEntries(regionIds.map((id) => [id, 'empty'])) as RegionFlags;
let canvas: Canvas;
let documentMock: EventTarget & { hidden: boolean; createElement: () => Canvas };
let preference: EventTarget & { matches: boolean };
let frames: Map<number, FrameRequestCallback>;
let sequence: number;
let disconnect: ReturnType<typeof vi.fn>;
let stage: HTMLElement;
let markers: Record<RegionId, HTMLButtonElement>;
let activeScene: ReturnType<typeof createAstronautScene> | undefined;
function frame() {
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach((callback) => callback(performance.now() + 20));
}
function start(onSelect = vi.fn(), onError = vi.fn()) {
  activeScene = createAstronautScene(stage, markers, onSelect, vi.fn(), onError);
  return activeScene;
}
beforeEach(() => {
  vi.clearAllMocks();
  canvas = new Canvas();
  let first = true;
  documentMock = Object.assign(new EventTarget(), {
    hidden: false,
    createElement: () => {
      if (first) {
        first = false;
        return canvas;
      }
      return new Canvas();
    },
  });
  preference = Object.assign(new EventTarget(), { matches: true });
  frames = new Map();
  sequence = 0;
  disconnect = vi.fn();
  stage = { clientWidth: 410, clientHeight: 547, prepend: vi.fn() } as unknown as HTMLElement;
  markers = Object.fromEntries(regionIds.map((id) => [id, new Canvas()])) as unknown as Record<
    RegionId,
    HTMLButtonElement
  >;
  vi.stubGlobal('document', documentMock);
  vi.stubGlobal('window', { devicePixelRatio: 3, matchMedia: () => preference });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      callback: () => void;
      constructor(callback: () => void) {
        this.callback = callback;
      }
      observe() {
        this.callback();
      }
      disconnect = disconnect;
    },
  );
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++sequence, callback);
    return sequence;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
});
afterEach(() => {
  activeScene?.dispose();
  activeScene = undefined;
  vi.unstubAllGlobals();
});

describe('astronaut scene and fallback', () => {
  it('shows an empty loading stage, not the 2D figure, while the lazy scene loads', () => {
    const html = renderToStaticMarkup(
      createElement(AstronautView, { selected: 'heart-lungs', onSelect: vi.fn(), flags }),
    );
    expect(html).toContain('astronaut-loading');
    expect(html).not.toContain('body-fallback');
  });
  it('keeps all six accessible fallback buttons and selection state', () => {
    const html = renderToStaticMarkup(
      createElement(BodyFigure2D, { selected: 'skin', onSelect: vi.fn() }),
    );
    expect(html).toContain('data-selected="skin"');
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html).toContain('aria-controls="region-skin"');
  });
  it('rejects missing WebGL without trying to render', () => {
    canvas.getContext.mockReturnValue(null as unknown as ReturnType<Canvas['getContext']>);
    expect(() => start()).toThrow('WebGL unavailable');
    expect(render).not.toHaveBeenCalled();
    expect(frames.size).toBe(0);
  });
  it('synchronizes selected anatomy and restores the suit on deselection', () => {
    const scene = start();
    scene.select('heart-lungs');
    frame();
    const world = render.mock.calls[render.mock.calls.length - 1][0] as THREE.Scene;
    const chest: THREE.Mesh[] = [];
    world.traverse((object) => {
      if (object instanceof THREE.Mesh && object.userData.region === 'heart-lungs')
        chest.push(object);
    });
    expect(chest.length).toBeGreaterThan(0);
    expect(chest.every((mesh) => mesh.material instanceof THREE.ShaderMaterial)).toBe(true);
    scene.select('eyes');
    frame();
    expect(chest.every((mesh) => !(mesh.material instanceof THREE.ShaderMaterial))).toBe(true);
    scene.select(null);
    frame();
    const revealed: THREE.Mesh[] = [];
    world.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material instanceof THREE.ShaderMaterial)
        revealed.push(object);
    });
    expect(revealed).toHaveLength(0);
  });
  it('emits deselection for an empty canvas click but not an orbit drag', () => {
    const select = vi.fn();
    start(select).select('head');
    frame();
    const pointer = (type: string, x: number) =>
      canvas.dispatchEvent(
        Object.assign(new Event(type), { clientX: x, clientY: 0, pointerId: 1, isPrimary: true }),
      );
    pointer('pointerdown', 0);
    pointer('pointerup', 70);
    expect(select).not.toHaveBeenCalled();
    pointer('pointerdown', 0);
    pointer('pointerup', 0);
    expect(select).toHaveBeenCalledWith(null);
  });
  it('falls back after context loss and releases rendering resources once', () => {
    const error = vi.fn();
    const scene = start(vi.fn(), error);
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    expect(error).toHaveBeenCalledOnce();
    scene.dispose();
    expect(disposeRenderer).toHaveBeenCalledOnce();
    expect(disposeEnvironment).toHaveBeenCalledOnce();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(canvas.remove).toHaveBeenCalledOnce();
    expect(frames.size).toBe(0);
  });
  it('pauses in hidden tabs and renders reduced motion only on demand', () => {
    const scene = start();
    frame();
    expect(frames.size).toBe(0);
    documentMock.hidden = true;
    documentMock.dispatchEvent(new Event('visibilitychange'));
    scene.select('bones');
    expect(frames.size).toBe(0);
    documentMock.hidden = false;
    documentMock.dispatchEvent(new Event('visibilitychange'));
    expect(frames.size).toBe(1);
    frame();
    expect(frames.size).toBe(0);
  });
  it('deduplicates and clears geometry, material, and texture disposal', () => {
    const resources = new SceneResources();
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial();
    const texture = new THREE.Texture();
    const geometryDispose = vi.spyOn(geometry, 'dispose');
    const materialDispose = vi.spyOn(material, 'dispose');
    const textureDispose = vi.spyOn(texture, 'dispose');
    resources.geometries.add(geometry);
    resources.geometries.add(geometry);
    resources.materials.add(material);
    resources.textures.add(texture);
    resources.dispose();
    resources.dispose();
    expect(geometryDispose).toHaveBeenCalledOnce();
    expect(materialDispose).toHaveBeenCalledOnce();
    expect(textureDispose).toHaveBeenCalledOnce();
  });
});
