import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { regionIds } from './regions';
import type { Point } from './regions';
import type { RegionId } from './types';
import type { SceneResources } from './resources';

export function buildAstronaut(scene: THREE.Scene, resources: SceneResources, reduced: boolean) {
  const astronaut = new THREE.Group();
  astronaut.rotation.y = -0.38;
  scene.add(astronaut);
  const suitParts: { object: THREE.Mesh; original: THREE.Material; region: RegionId }[] = [];
  const clickable: THREE.Mesh[] = [];
  const organs = {} as Record<RegionId, THREE.Group>;
  function canvasTexture(
    size: number,
    paint: (context: CanvasRenderingContext2D, size: number) => void,
  ) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    paint(context, size);
    const texture = new THREE.CanvasTexture(canvas);
    resources.textures.add(texture);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
  const fabricTexture = canvasTexture(128, (context, size) => {
    context.fillStyle = '#cfcfc6';
    context.fillRect(0, 0, size, size);
    for (let row = 0; row < size; row += 2)
      for (let column = 0; column < size; column += 2) {
        context.fillStyle = (row + column) % 4 === 0 ? '#d8d8ce' : '#c5c7c0';
        context.fillRect(column, row, 1, 2);
      }
  });
  fabricTexture.wrapS = fabricTexture.wrapT = THREE.RepeatWrapping;
  fabricTexture.repeat.set(5, 5);
  const shell = new THREE.MeshStandardMaterial({
    color: 0xf0eee1,
    metalness: 0.18,
    roughness: 0.34,
  });
  const fabric = new THREE.MeshStandardMaterial({
    color: 0xe4e6dc,
    roughness: 0.82,
    bumpMap: fabricTexture,
    bumpScale: 0.017,
  });
  const seam = new THREE.MeshStandardMaterial({
    color: 0x798c8c,
    roughness: 0.75,
    metalness: 0.15,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x273337, roughness: 0.46, metalness: 0.4 });
  const trim = new THREE.MeshStandardMaterial({ color: 0xa5b5b2, roughness: 0.3, metalness: 0.65 });
  const pale = new THREE.MeshStandardMaterial({ color: 0xc8d7d0, roughness: 0.48 });
  const visorMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x706348,
    metalness: 0.94,
    roughness: 0.13,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.8,
  });
  const glass = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    uniforms: { tint: { value: new THREE.Color(0x9ee9df) } },
    vertexShader: `varying vec3 vNormalView; varying vec3 vPositionView; void main(){vec4 positionView=modelViewMatrix*vec4(position,1.0);vPositionView=positionView.xyz;vNormalView=normalize(normalMatrix*normal);gl_Position=projectionMatrix*positionView;}`,
    fragmentShader: `uniform vec3 tint; varying vec3 vNormalView; varying vec3 vPositionView; void main(){float fresnel=pow(1.0-abs(dot(normalize(vNormalView),normalize(-vPositionView))),2.5);gl_FragColor=vec4(tint,0.035+fresnel*0.36);}`,
  });
  const sphereGeometry = new THREE.SphereGeometry(1, 32, 24);
  const roundedGeometry = new RoundedBoxGeometry(1, 1, 1, 4, 0.22);
  const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 32);
  function mesh(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    position: Point,
    scale: Point = [1, 1, 1],
    parent: THREE.Object3D = astronaut,
    region: RegionId | null = null,
  ) {
    resources.geometries.add(geometry);
    resources.materials.add(material);
    const object = new THREE.Mesh(geometry, material);
    object.position.set(...position);
    object.scale.set(...scale);
    parent.add(object);
    if (region) {
      object.userData.region = region;
      suitParts.push({ object, original: material, region });
      clickable.push(object);
    }
    return object;
  }
  function ball(
    position: Point,
    scale: Point,
    material: THREE.Material = fabric,
    region: RegionId | null = null,
    parent: THREE.Object3D = astronaut,
  ) {
    return mesh(sphereGeometry, material, position, scale, parent, region);
  }
  function box(
    position: Point,
    scale: Point,
    material: THREE.Material = shell,
    region: RegionId | null = null,
    parent: THREE.Object3D = astronaut,
  ) {
    return mesh(roundedGeometry, material, position, scale, parent, region);
  }
  function cylinder(
    position: Point,
    radius: number,
    height: number,
    material: THREE.Material,
    region: RegionId | null = null,
    parent: THREE.Object3D = astronaut,
  ) {
    return mesh(cylinderGeometry, material, position, [radius, height, radius], parent, region);
  }
  function tube(
    points: Point[],
    radius: number,
    material: THREE.Material,
    region: RegionId | null = null,
    parent: THREE.Object3D = astronaut,
  ) {
    return mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point))),
        Math.max(16, points.length * 5),
        radius,
        8,
        false,
      ),
      material,
      [0, 0, 0],
      [1, 1, 1],
      parent,
      region,
    );
  }
  function capsuleBetween(
    start: Point,
    end: Point,
    radius: number,
    material: THREE.Material,
    region: RegionId | null = null,
    parent: THREE.Object3D = astronaut,
  ) {
    const startVector = new THREE.Vector3(...start);
    const endVector = new THREE.Vector3(...end);
    const difference = endVector.clone().sub(startVector);
    const object = mesh(
      new THREE.CapsuleGeometry(radius, Math.max(0.01, difference.length() - radius * 2), 8, 20),
      material,
      startVector.add(endVector).multiplyScalar(0.5).toArray(),
      [1, 1, 1],
      parent,
      region,
    );
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), difference.normalize());
    return object;
  }
  function ring(
    position: Point,
    radius: number,
    thickness: number,
    material: THREE.Material = trim,
    region: RegionId | null = null,
    parent: THREE.Object3D = astronaut,
  ) {
    const object = mesh(
      new THREE.TorusGeometry(radius, thickness, 8, 40),
      material,
      position,
      [1, 1, 1],
      parent,
      region,
    );
    object.rotation.x = Math.PI / 2;
    return object;
  }

  box([0, 5.72, -0.7], [1.92, 2.02, 0.78], dark);
  box([0, 5.74, -1.04], [1.7, 1.8, 0.36], shell);
  box([0, 6.63, -0.65], [1.65, 0.22, 0.65], pale);
  for (const side of [-1, 1]) {
    capsuleBetween([side * 0.89, 4.91, -0.69], [side * 0.89, 6.25, -0.69], 0.22, pale);
    ring([side * 0.89, 5.1, -0.69], 0.22, 0.055, dark);
    ring([side * 0.89, 6.08, -0.69], 0.22, 0.055, dark);
  }
  box([0, 5.68, 0], [1.75, 1.7, 1.05], shell, 'heart-lungs');
  ball([0, 5.12, 0], [0.82, 0.55, 0.51], fabric, 'heart-lungs');
  box([0, 4.46, 0], [1.43, 0.98, 0.91], fabric, 'gut');
  ball([0, 4.08, -0.03], [0.77, 0.43, 0.47], fabric, 'gut');
  const belt = cylinder([0, 4.82, 0], 0.75, 0.17, dark, 'gut');
  belt.scale.z = 0.49;
  const beltEdge = ring([0, 4.9, 0], 0.74, 0.045, trim, 'gut');
  beltEdge.scale.z = 0.65;
  box([0, 4.82, 0.53], [0.34, 0.24, 0.11], trim, 'gut');
  for (const side of [-1, 1]) {
    box([side * 0.53, 4.63, 0.46], [0.25, 0.32, 0.1], shell, 'gut');
    tube(
      [
        [side * 0.7, 6.2, 0.3],
        [side * 0.73, 5.95, 0.51],
        [side * 0.67, 5.02, 0.48],
      ],
      0.048,
      pale,
      'heart-lungs',
    );
  }
  cylinder([0, 6.5, 0], 0.57, 0.25, dark, 'head');
  ring([0, 6.61, 0], 0.57, 0.075, trim, 'head');
  ring([0, 6.42, 0], 0.58, 0.065, shell, 'head');
  ball([0, 7.26, 0], [0.85, 0.88, 0.75], shell, 'head');
  ball([0, 7.23, 0.4], [0.746, 0.66, 0.435], dark, 'eyes');
  const visorGeometry = new THREE.SphereGeometry(1, 64, 40, 0, Math.PI * 2, 0, 1.32);
  visorGeometry.rotateX(Math.PI / 2);
  mesh(visorGeometry, visorMaterial, [0, 7.25, 0.57], [0.705, 0.615, 0.38], astronaut, 'eyes');
  const reflectionMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
  });
  tube(
    [
      [-0.5, 7.55, 0.725],
      [-0.34, 7.69, 0.773],
      [-0.06, 7.73, 0.77],
      [0.19, 7.7, 0.76],
    ],
    0.018,
    reflectionMaterial,
    'eyes',
  );
  for (const side of [-1, 1]) {
    const ear = cylinder([side * 0.81, 7.2, 0], 0.18, 0.12, trim, 'head');
    ear.rotation.z = Math.PI / 2;
    box([side * 0.54, 7.91, 0.22], [0.2, 0.13, 0.2], shell, 'head');
    box(
      [side * 0.54, 7.91, 0.33],
      [0.13, 0.06, 0.035],
      new THREE.MeshBasicMaterial({ color: 0xd9eee6 }),
      'head',
    );
  }
  const displayTexture = canvasTexture(256, (context) => {
    context.fillStyle = '#152d32';
    context.fillRect(0, 0, 256, 256);
    context.fillStyle = '#a8cfc6';
    context.font = '18px sans-serif';
    context.fillText('Life support', 23, 41);
    context.font = 'bold 50px sans-serif';
    context.fillStyle = '#d5e9db';
    context.fillText('O₂', 23, 108);
    context.fillStyle = '#83aaa5';
    context.font = '15px sans-serif';
    context.fillText('EVA system', 23, 150);
    context.strokeStyle = '#a5d1c4';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(23, 199);
    [
      [66, 199],
      [80, 184],
      [91, 212],
      [109, 173],
      [121, 199],
      [228, 199],
    ].forEach(([horizontal, vertical]) => context.lineTo(horizontal, vertical));
    context.stroke();
    context.fillStyle = '#617e78';
    context.fillRect(23, 229, 90, 3);
    context.fillRect(125, 229, 103, 3);
  });
  box([0, 5.72, 0.59], [1.03, 0.92, 0.22], dark, 'heart-lungs');
  box(
    [-0.07, 5.78, 0.72],
    [0.75, 0.68, 0.07],
    new THREE.MeshStandardMaterial({
      map: displayTexture,
      roughness: 0.37,
      emissiveMap: displayTexture,
      emissive: 0xffffff,
      emissiveIntensity: 0.24,
    }),
    'heart-lungs',
  );
  for (const height of [5.47, 5.67, 5.87])
    ball([0.4, height, 0.72], [0.047, 0.047, 0.026], trim, 'heart-lungs');
  for (const side of [-1, 1]) {
    const armRegion = 'skin';
    ball([side * 1.02, 6.02, 0], [0.43, 0.43, 0.44], dark, armRegion);
    ball([side * 1.12, 6.03, 0.02], [0.39, 0.39, 0.43], shell, armRegion);
    capsuleBetween([side * 1.12, 5.98, 0], [side * 1.48, 4.99, 0.04], 0.32, fabric, armRegion);
    ball([side * 1.25, 5.65, 0.01], [0.34, 0.38, 0.34], fabric, armRegion);
    for (const height of [5.45, 5.56]) {
      const fold = ring(
        [side * (1.36 - (height - 5.45) * 0.2), height, 0.03],
        0.315,
        0.027,
        fabric,
        armRegion,
      );
      fold.rotation.z = side * -0.3;
    }
    ball([side * 1.48, 4.98, 0.04], [0.305, 0.26, 0.31], dark, armRegion);
    for (const offset of [-0.12, 0, 0.12])
      ring([side * 1.47, 5 + offset, 0.04], 0.298, 0.034, trim, armRegion);
    capsuleBetween([side * 1.49, 4.94, 0.04], [side * 1.66, 3.95, 0.15], 0.285, fabric, armRegion);
    box([side * 1.57, 4.48, 0.29], [0.39, 0.4, 0.13], shell, armRegion);
    ring([side * 1.65, 4.03, 0.13], 0.27, 0.065, dark, armRegion);
    ring([side * 1.66, 3.96, 0.15], 0.265, 0.045, trim, armRegion);
    ball([side * 1.69, 3.69, 0.19], [0.28, 0.36, 0.26], shell, armRegion);
    ball([side * 1.47, 3.73, 0.34], [0.12, 0.21, 0.13], fabric, armRegion);
    for (let finger = 0; finger < 3; finger++)
      tube(
        [
          [side * 1.55 + finger * 0.085, 3.55, 0.395],
          [side * 1.55 + finger * 0.085, 3.7, 0.44],
        ],
        0.009,
        seam,
        armRegion,
      );
    capsuleBetween([side * 0.45, 4.16, 0], [side * 0.52, 2.61, 0], 0.435, fabric, 'bones');
    box([side * 0.54, 3.33, 0.34], [0.46, 0.62, 0.14], fabric, 'bones');
    tube(
      [
        [side * 0.54 - 0.19, 3.55, 0.42],
        [side * 0.54 + 0.19, 3.55, 0.42],
      ],
      0.012,
      seam,
      'bones',
    );
    ball([side * 0.54, 2.59, 0.02], [0.37, 0.35, 0.37], fabric, 'bones');
    box([side * 0.54, 2.57, 0.33], [0.51, 0.51, 0.25], shell, 'bones');
    capsuleBetween([side * 0.54, 2.53, 0.01], [side * 0.57, 0.98, 0.07], 0.35, fabric, 'bones');
    for (const height of [2.05, 2.16])
      ring([side * 0.56, height, 0.035], 0.346, 0.024, fabric, 'bones');
    for (const height of [1.1, 1.21, 1.32])
      ring([side * 0.57, height, 0.07], 0.31, 0.033, pale, 'bones');
    ring([side * 0.57, 0.98, 0.07], 0.33, 0.065, dark, 'bones');
    box([side * 0.57, 0.63, 0.23], [0.72, 0.62, 1.03], shell, 'bones');
    box([side * 0.57, 0.35, 0.26], [0.75, 0.17, 1.08], dark, 'bones');
    box([side * 0.57, 0.59, 0.71], [0.62, 0.22, 0.12], pale, 'bones');
    for (const offset of [-0.22, 0, 0.22])
      box([side * 0.57 + offset, 0.37, 0.8], [0.09, 0.1, 0.035], trim, 'bones');
  }
  tube(
    [
      [-0.65, 5.1, 0.4],
      [-0.99, 4.98, 0.43],
      [-1.04, 4.58, 0.26],
      [-0.89, 4.38, -0.42],
    ],
    0.065,
    dark,
    'gut',
  );
  tube(
    [
      [0.65, 5.1, 0.4],
      [0.98, 4.92, 0.4],
      [0.98, 4.52, -0.12],
      [0.86, 4.46, -0.51],
    ],
    0.065,
    pale,
    'gut',
  );

  function organMaterial(color: number) {
    return new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.43,
      roughness: 0.38,
      metalness: 0.08,
    });
  }
  const mint = organMaterial(0x80d4c7);
  const pink = organMaterial(0xdc8ea6);
  const ivory = organMaterial(0xe5edcf);
  const organDark = organMaterial(0x3f8e94);
  for (const id of regionIds) {
    const group = new THREE.Group();
    group.visible = false;
    astronaut.add(group);
    organs[id] = group;
  }
  for (const side of [-1, 1]) {
    ball([side * 0.24, 7.42, 0.27], [0.29, 0.32, 0.35], pink, null, organs.head);
    for (let fold = 0; fold < 10; fold++) {
      const angle = (fold * Math.PI * 2) / 10;
      ball(
        [side * (0.22 + 0.15 * Math.cos(angle)), 7.43 + 0.24 * Math.sin(angle), 0.44],
        [0.13, 0.11, 0.15],
        pink,
        null,
        organs.head,
      );
    }
    ball([side * 0.255, 7.21, 0.49], [0.19, 0.19, 0.19], ivory, null, organs.eyes);
    ball([side * 0.255, 7.21, 0.663], [0.092, 0.098, 0.045], organDark, null, organs.eyes);
    ball([side * 0.255, 7.21, 0.701], [0.043, 0.055, 0.012], dark, null, organs.eyes);
    ball([side * 0.255 - 0.024, 7.25, 0.71], [0.023, 0.023, 0.012], ivory, null, organs.eyes);
    ball([side * 0.38, 5.66, 0.15], [0.29, 0.55, 0.25], mint, null, organs['heart-lungs']);
    tube(
      [
        [0, 6.22, 0.24],
        [0, 5.95, 0.26],
        [side * 0.25, 5.77, 0.36],
        [side * 0.4, 5.48, 0.36],
      ],
      0.038,
      ivory,
      null,
      organs['heart-lungs'],
    );
    for (const height of [5.5, 5.7, 5.85])
      tube(
        [
          [side * 0.25, height, 0.38],
          [side * 0.46, height + 0.1, 0.38],
        ],
        0.017,
        organDark,
        null,
        organs['heart-lungs'],
      );
  }
  ball([0.04, 5.52, 0.4], [0.22, 0.3, 0.22], pink, null, organs['heart-lungs']).rotation.z = -0.35;
  ball([-0.09, 5.66, 0.42], [0.14, 0.15, 0.14], pink, null, organs['heart-lungs']);
  tube(
    [
      [0.05, 5.65, 0.38],
      [0.03, 5.97, 0.35],
      [0.19, 6.02, 0.34],
      [0.23, 5.83, 0.29],
    ],
    0.068,
    pink,
    null,
    organs['heart-lungs'],
  );
  cylinder([0, 7.05, 0.2], 0.075, 0.25, ivory, null, organs.head);
  box([1.58, 4.43, 0.25], [0.39, 0.57, 0.17], pink, null, organs.skin).rotation.z = 0.14;
  for (let bump = 0; bump < 9; bump++)
    ball(
      [1.45 + (bump % 3) * 0.115, 4.26 + Math.floor(bump / 3) * 0.15, 0.37],
      [0.047, 0.038, 0.05],
      ivory,
      null,
      organs.skin,
    );
  ball([0.22, 4.56, 0.18], [0.23, 0.28, 0.19], pink, null, organs.gut).rotation.z = -0.6;
  tube(
    [
      [0.02, 4.88, 0.18],
      [0.03, 4.66, 0.18],
      [0.18, 4.5, 0.18],
      [0.28, 4.51, 0.18],
    ],
    0.07,
    pink,
    null,
    organs.gut,
  );
  const coil: Point[] = [];
  for (let step = 0; step < 60; step++) {
    const angle = (step / 59) * Math.PI * 6;
    coil.push([Math.cos(angle) * 0.36, 4.3 - (step / 59) * 0.32, 0.2 + Math.sin(angle) * 0.14]);
  }
  tube(coil, 0.057, mint, null, organs.gut);
  tube(
    [
      [-0.46, 4.03, 0.13],
      [-0.47, 4.47, 0.14],
      [0, 4.53, 0.09],
      [0.46, 4.39, 0.12],
      [0.43, 4.03, 0.14],
    ],
    0.075,
    pink,
    null,
    organs.gut,
  );
  for (const side of [-1, 1]) {
    capsuleBetween(
      [side * 0.43, 3.99, 0.07],
      [side * 0.53, 2.68, 0.07],
      0.105,
      ivory,
      null,
      organs.bones,
    );
    ball([side * 0.32, 4.01, 0.07], [0.18, 0.16, 0.17], ivory, null, organs.bones);
    ball([side * 0.52, 2.71, 0.08], [0.17, 0.14, 0.16], ivory, null, organs.bones);
    tube(
      [
        [side * 0.11, 4.25, 0],
        [side * 0.4, 4.35, 0],
        [side * 0.6, 4.19, 0],
        [side * 0.34, 3.99, 0],
      ],
      0.12,
      ivory,
      null,
      organs.bones,
    );
    capsuleBetween(
      [side * 0.53, 2.48, 0.06],
      [side * 0.57, 1.08, 0.08],
      0.075,
      ivory,
      null,
      organs.bones,
    );
    capsuleBetween(
      [side * 0.68, 2.45, 0.06],
      [side * 0.7, 1.08, 0.08],
      0.045,
      ivory,
      null,
      organs.bones,
    );
  }

  const staticBatches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  for (const object of [...astronaut.children]) {
    if (!(object instanceof THREE.Mesh) || object.userData.region) continue;
    object.updateMatrix();
    const batch = staticBatches.get(object.material) ?? [];
    const geometry = object.geometry.index
      ? object.geometry.toNonIndexed()
      : object.geometry.clone();
    batch.push(geometry.applyMatrix4(object.matrix));
    staticBatches.set(object.material, batch);
    astronaut.remove(object);
  }
  for (const [material, geometries] of staticBatches) {
    const merged = mergeGeometries(geometries);
    if (merged) {
      resources.geometries.add(merged);
      astronaut.add(new THREE.Mesh(merged, material));
    }
    geometries.forEach((geometry) => geometry.dispose());
  }
  const shadowTexture = canvasTexture(128, (context, size) => {
    const gradient = context.createRadialGradient(
      size / 2,
      size / 2,
      4,
      size / 2,
      size / 2,
      size / 2,
    );
    gradient.addColorStop(0, '#000000bb');
    gradient.addColorStop(0.5, '#00000055');
    gradient.addColorStop(1, '#00000000');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  });
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 3),
    new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.1;
  resources.geometries.add(shadow.geometry);
  resources.materials.add(shadow.material);
  scene.add(shadow);
  for (const radius of [1.7, 2.15]) {
    const orbit = ring(
      [0, 0.09, 0],
      radius,
      0.006,
      new THREE.MeshBasicMaterial({ color: 0x849b98, transparent: true, opacity: 0.18 }),
      null,
      scene,
    );
    orbit.scale.z = 0.72;
  }
  const scanMaterial = new THREE.MeshBasicMaterial({
    color: 0xb9f1e2,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const scan = ring([0, 8.3, 0], 1.65, 0.009, scanMaterial);
  scan.scale.z = 0.68;
  const scanHalo = ring(
    [0, 0, 0],
    1.65,
    0.038,
    new THREE.MeshBasicMaterial({
      color: 0xa1d9d0,
      transparent: true,
      opacity: 0.06,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    null,
    scan,
  );
  scanHalo.rotation.x = 0;
  scan.visible = !reduced;
  resources.materials.add(glass);
  return { astronaut, suitParts, clickable, organs, glass, scan };
}
