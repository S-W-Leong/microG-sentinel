import { replayTest, type Condition, type Sample, type StandTest } from './model';

type PermissionConstructor = { prototype?: unknown; requestPermission?: () => Promise<string> };
export async function sensorPermission(host: {
  DeviceOrientationEvent?: PermissionConstructor;
  DeviceMotionEvent?: PermissionConstructor;
}) {
  const constructors = [
    host.DeviceOrientationEvent,
    host.DeviceMotionEvent,
  ] as PermissionConstructor[];
  const results = await Promise.all(
    constructors.map(async (constructor) => {
      if (!constructor) return false;
      try {
        return (
          !constructor.requestPermission || (await constructor.requestPermission()) === 'granted'
        );
      } catch {
        return false;
      }
    }),
  );
  return { orientation: results[0], gravity: results[1] };
}
export function orientationSample(
  seconds: number,
  pitch: number | null,
  roll: number | null,
): Sample | null {
  return pitch !== null &&
    roll !== null &&
    Number.isFinite(pitch) &&
    Number.isFinite(roll) &&
    Math.abs(pitch) <= 180 &&
    Math.abs(roll) <= 180
    ? { seconds, pitch, roll }
    : null;
}
export function gravitySample(
  seconds: number,
  gravity: DeviceMotionEventAcceleration | null,
): Sample | null {
  if (
    !gravity ||
    gravity.x === null ||
    gravity.y === null ||
    gravity.z === null ||
    ![gravity.x, gravity.y, gravity.z].every(Number.isFinite) ||
    Math.hypot(gravity.x, gravity.y, gravity.z) < 0.01
  )
    return null;
  return {
    seconds,
    pitch: (Math.atan2(gravity.y, Math.hypot(gravity.x, gravity.z)) * 180) / Math.PI,
    roll: (Math.atan2(-gravity.x, gravity.z) * 180) / Math.PI,
  };
}
export function startStandTest(options: {
  host: Window;
  condition: Condition;
  deviceId: string;
  permission: { orientation: boolean; gravity: boolean };
  replay: boolean;
  update: (test: StandTest) => void;
  done: (test: StandTest) => void;
}) {
  const { host, condition, update, done } = options;
  const fixture = replayTest(condition);
  let start = performance.now(),
    stopped = false;
  let test: StandTest = {
    ...fixture,
    mode: options.replay ? 'replay' : 'live',
    acquisition: options.replay ? 'synthetic' : 'orientation',
    deviceId: options.replay ? fixture.deviceId : options.deviceId,
    permission: options.replay ? 'unavailable' : 'granted',
    duration: 0,
    complete: false,
    samples: [],
  };
  let sensor: 'orientation' | 'gravity' | null = null;
  const elapsed = () => Math.min(30, (performance.now() - start) / 1000);
  function append(sample: Sample | null, source: 'orientation' | 'gravity') {
    if (stopped || test.mode === 'replay' || !sample || (sensor && sensor !== source)) return;
    if (test.samples.length && sample.seconds <= test.samples[test.samples.length - 1].seconds)
      return;
    sensor = source;
    test.acquisition = source;
    test.samples.push(sample);
  }
  const orientation = (event: DeviceOrientationEvent) =>
    append(orientationSample(elapsed(), event.beta, event.gamma), 'orientation');
  const motion = (event: DeviceMotionEvent) =>
    append(gravitySample(elapsed(), event.accelerationIncludingGravity), 'gravity');
  const detach = () => {
    host.removeEventListener('deviceorientation', orientation);
    host.removeEventListener('devicemotion', motion);
    host.removeEventListener('orientationchange', abort);
    host.document.removeEventListener('visibilitychange', hidden);
    host.clearInterval(timer);
  };
  function stop(complete: boolean, notify = true) {
    if (stopped) return;
    stopped = true;
    test = { ...test, duration: complete ? 30 : elapsed(), complete };
    detach();
    if (notify) done(structuredClone(test));
  }
  function abort() {
    stop(false);
  }
  function hidden() {
    if (host.document.hidden) abort();
  }
  if (options.permission.orientation) host.addEventListener('deviceorientation', orientation);
  if (options.permission.gravity) host.addEventListener('devicemotion', motion);
  host.addEventListener('orientationchange', abort);
  host.document.addEventListener('visibilitychange', hidden);
  const timer = host.setInterval(() => {
    if (test.mode === 'live' && elapsed() >= 1.5 && !sensor) {
      test = { ...fixture, duration: 0, complete: false, samples: [], permission: 'unavailable' };
      start = performance.now();
    }
    const seconds = elapsed();
    if (test.mode === 'replay')
      test.samples = fixture.samples.filter((sample) => sample.seconds <= seconds);
    test.duration = seconds;
    update(structuredClone(test));
    if (seconds >= 30) stop(true);
  }, 100);
  update(structuredClone(test));
  return { abort, dispose: () => stop(false, false) };
}
