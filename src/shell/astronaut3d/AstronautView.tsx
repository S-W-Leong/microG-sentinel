import { Component, lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import BodyFigure2D from './BodyFigure2D';
import type { AstronautProps } from './types';

// Start fetching the 3D chunk as soon as this module loads, not on first render.
const loadScene = import('./Astronaut3D');
const Astronaut3D = lazy(() => loadScene);
class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
export default function AstronautView(props: AstronautProps) {
  const fallback = <BodyFigure2D {...props} />;
  // While the 3D chunk loads, show an empty stage, not the 2D figure: swapping figures reads as a glitch.
  // The 2D figure is only for devices where 3D fails.
  return (
    <SceneBoundary fallback={fallback}>
      <Suspense fallback={<div className="astronaut-loading" aria-hidden="true" />}>
        <Astronaut3D {...props} />
      </Suspense>
    </SceneBoundary>
  );
}
