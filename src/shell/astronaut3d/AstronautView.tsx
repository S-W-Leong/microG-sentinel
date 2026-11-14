import { Component, lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import BodyFigure2D from './BodyFigure2D';
import type { AstronautProps } from './types';

const Astronaut3D = lazy(() => import('./Astronaut3D'));
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
  return (
    <SceneBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <Astronaut3D {...props} />
      </Suspense>
    </SceneBoundary>
  );
}
