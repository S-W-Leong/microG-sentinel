import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildAstronaut } from './model';
import { anatomy, regionIds } from './regions';
import { SceneResources } from './resources';
import type { ProjectedMarkers, RegionId } from './types';

export function createAstronautScene(
  stage: HTMLElement,
  markers: Record<RegionId, HTMLButtonElement>,
  onSelect: (id: RegionId | null) => void,
  onProject: (positions: ProjectedMarkers) => void,
  onError: () => void,
) {
  const resources = new SceneResources();
  const listeners = new AbortController();
  let renderer: THREE.WebGLRenderer | undefined;
  let controls: OrbitControls | undefined;
  let environmentTarget: THREE.WebGLRenderTarget | undefined;
  let observer: ResizeObserver | undefined;
  let animationId: number | null = null;
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (animationId !== null) cancelAnimationFrame(animationId);
    listeners.abort();
    observer?.disconnect();
    controls?.dispose();
    resources.dispose();
    environmentTarget?.dispose();
    renderer?.dispose();
    renderer?.forceContextLoss();
    renderer?.domElement.remove();
  };
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2', { antialias: true, alpha: true });
    if (!context) throw new Error('WebGL unavailable');
    const view = new THREE.WebGLRenderer({ canvas, context, antialias: true, alpha: true });
    renderer = view;
    view.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    view.setClearColor(0x111315, 0);
    view.outputColorSpace = THREE.SRGBColorSpace;
    view.toneMapping = THREE.ACESFilmicToneMapping;
    view.toneMappingExposure = 0.92;
    view.debug.onShaderError = () => {
      throw new Error('Astronaut shader unavailable');
    };
    canvas.setAttribute('role', 'img');
    canvas.setAttribute(
      'aria-label',
      '3D astronaut body map. Drag to rotate; use the region cards to explore.',
    );
    stage.prepend(canvas);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
    const defaultTarget = new THREE.Vector3(0, 4.12, 0);
    const desiredTarget = defaultTarget.clone();
    const desiredCamera = new THREE.Vector3(0, 4.65, 14.8);
    camera.position.copy(desiredCamera);
    const orbit = new OrbitControls(camera, canvas);
    controls = orbit;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = preference.matches;
    orbit.enableDamping = !reduced;
    orbit.dampingFactor = 0.075;
    orbit.enablePan = false;
    orbit.minDistance = 6;
    orbit.maxDistance = 20;
    orbit.minPolarAngle = Math.PI * 0.29;
    orbit.maxPolarAngle = Math.PI * 0.65;
    orbit.rotateSpeed = 0.55;
    orbit.target.copy(defaultTarget);
    orbit.update();
    const environment = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(view);
    try {
      environmentTarget = pmrem.fromScene(environment, 0.04);
      scene.environment = environmentTarget.texture;
    } finally {
      environment.dispose();
      pmrem.dispose();
    }
    scene.add(new THREE.HemisphereLight(0xd4eeed, 0x393d43, 0.85));
    const key = new THREE.DirectionalLight(0xfff0d9, 2.2);
    key.position.set(-3, 9, 6);
    const rim = new THREE.DirectionalLight(0xb6e3f1, 2.2);
    rim.position.set(4, 6, -4);
    const fill = new THREE.DirectionalLight(0xdbe9ef, 0.45);
    fill.position.set(3, 3, 6);
    scene.add(key, rim, fill);
    const { astronaut, suitParts, clickable, organs, glass, scan } = buildAstronaut(
      scene,
      resources,
      reduced,
    );
    let selected: RegionId | null = null;
    let interacting = false;
    let framing = false;
    let lastInteraction = -10;
    let width = 1;
    let height = 1;
    let previousTime = performance.now();
    let elapsed = 0;
    const projected = new THREE.Vector3();
    const positions = Object.fromEntries(
      regionIds.map((id) => [id, { x: 0, y: 0, visible: false }]),
    ) as ProjectedMarkers;
    const anchors = Object.fromEntries(
      regionIds.map((id) => [id, new THREE.Vector3(...anatomy[id].anchor)]),
    ) as Record<RegionId, THREE.Vector3>;
    const placed: { x: number; y: number }[] = [];
    function projectMarkers() {
      astronaut.updateMatrixWorld();
      camera.updateMatrixWorld();
      placed.length = 0;
      for (const id of regionIds) {
        projected.copy(anchors[id]).applyMatrix4(astronaut.matrixWorld).project(camera);
        const position = positions[id];
        position.x = (projected.x * 0.5 + 0.5) * width;
        position.y = (-projected.y * 0.5 + 0.5) * height;
        position.visible =
          projected.z > -1 &&
          projected.z < 1 &&
          position.x > 22 &&
          position.x < width - 22 &&
          position.y > 22 &&
          position.y < height - 22;
        if (position.visible) {
          for (const previous of placed) {
            if (Math.hypot(previous.x - position.x, previous.y - position.y) < 44)
              position.y = previous.y + 45;
          }
          position.visible = position.y < height - 22;
          placed.push(position);
        }
        markers[id].hidden = !position.visible;
        markers[id].style.left = `${position.x}px`;
        markers[id].style.top = `${position.y}px`;
      }
      onProject(positions);
    }
    function frame(now: number) {
      animationId = null;
      if (disposed || document.hidden) return;
      try {
        const delta = Math.min((now - previousTime) / 1000, 0.05);
        previousTime = now;
        elapsed += delta;
        if (!reduced && !interacting && !selected && now / 1000 - lastInteraction > 2) {
          astronaut.position.y = Math.sin(elapsed * 0.9) * 0.055;
          astronaut.rotation.y = -0.38 + Math.sin(elapsed * 0.27) * 0.08;
        }
        if (framing) {
          const factor = reduced ? 1 : 1 - Math.exp(-delta * 4.5);
          camera.position.lerp(desiredCamera, factor);
          orbit.target.lerp(desiredTarget, factor);
          if (
            camera.position.distanceTo(desiredCamera) < 0.008 &&
            orbit.target.distanceTo(desiredTarget) < 0.008
          )
            framing = false;
        }
        if (scan.visible) {
          scan.position.y = 8.3 - elapsed * 2.6;
          if (scan.position.y < 0.3) scan.visible = false;
        }
        orbit.update();
        projectMarkers();
        view.render(scene, camera);
        if (!reduced || framing || interacting) requestFrame();
      } catch {
        dispose();
        onError();
      }
    }
    function requestFrame() {
      if (!disposed && !document.hidden && animationId === null)
        animationId = requestAnimationFrame(frame);
    }
    function select(id: RegionId | null) {
      selected = id;
      framing = true;
      if (id) {
        const region = anatomy[id];
        desiredTarget.set(...region.target);
        desiredCamera.set(region.target[0] + 0.35, region.target[1] + 0.25, region.distance);
      } else {
        desiredTarget.copy(defaultTarget);
        desiredCamera.set(0, 4.65, 14.8);
      }
      for (const regionId of regionIds) organs[regionId].visible = regionId === selected;
      for (const { object, original, region } of suitParts) {
        const localRegion =
          region === selected &&
          (selected !== 'skin' ||
            (object.position.x > 1.2 && object.position.y >= 4 && object.position.y <= 4.95));
        const reveal =
          localRegion ||
          ((selected === 'head' || selected === 'eyes') &&
            (region === 'head' || region === 'eyes')) ||
          (selected === 'bones' && region === 'gut');
        object.material = reveal ? glass : original;
        object.renderOrder = reveal ? 3 : 0;
      }
      if (id) scan.visible = false;
      requestFrame();
    }
    orbit.addEventListener('start', () => {
      interacting = true;
      framing = false;
      requestFrame();
    });
    orbit.addEventListener('end', () => {
      interacting = false;
      lastInteraction = performance.now() / 1000;
      requestFrame();
    });
    orbit.addEventListener('change', requestFrame);
    const signal = listeners.signal;
    preference.addEventListener(
      'change',
      (event) => {
        reduced = event.matches;
        orbit.enableDamping = !reduced;
        if (reduced) {
          scan.visible = false;
          astronaut.position.y = 0;
          astronaut.rotation.y = -0.38;
        }
        requestFrame();
      },
      { signal },
    );
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDown: { x: number; y: number; id: number } | null = null;
    canvas.addEventListener(
      'pointerdown',
      (event) => {
        pointerDown = event.isPrimary
          ? { x: event.clientX, y: event.clientY, id: event.pointerId }
          : null;
      },
      { signal },
    );
    canvas.addEventListener(
      'pointercancel',
      () => {
        pointerDown = null;
      },
      { signal },
    );
    canvas.addEventListener(
      'pointerup',
      (event) => {
        const start = pointerDown;
        pointerDown = null;
        if (
          !start ||
          start.id !== event.pointerId ||
          Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6
        )
          return;
        const bounds = canvas.getBoundingClientRect();
        pointer.set(
          ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
          -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
        );
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(clickable, false)[0];
        const id = hit?.object.userData.region as RegionId | undefined;
        onSelect(id && id !== selected ? id : null);
      },
      { signal },
    );
    canvas.addEventListener(
      'webglcontextlost',
      (event) => {
        event.preventDefault();
        dispose();
        onError();
      },
      { signal },
    );
    observer = new ResizeObserver(() => {
      width = Math.max(stage.clientWidth, 1);
      height = Math.max(stage.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      view.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      view.setSize(width, height, false);
      requestFrame();
    });
    observer.observe(stage);
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden && animationId !== null) {
          cancelAnimationFrame(animationId);
          animationId = null;
        } else {
          previousTime = performance.now();
          requestFrame();
        }
      },
      { signal },
    );
    requestFrame();
    return { select, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
