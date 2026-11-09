'use client';
import { useLayoutEffect, useRef, useState } from 'react';
import type { NavigationPartProps } from '../presentation/parts.js';
import { configurableProgressSchema } from './schema.js';
import { resolveProgressDesign } from './resolve.js';
import { NavigationMarker } from './media.js';
export function ConfigurableNavigationProgress({
  navigation,
  reading,
  currentIndex,
  active,
  options,
  placement,
  className,
}: NavigationPartProps & { readonly className?: string }) {
  const data = configurableProgressSchema.parse(options);
  const design = resolveProgressDesign(data, reading.href, currentIndex, reading.progress);
  const svg = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!svg.current) return;
    const element = svg.current;
    const measure = () => setWidth(element.getBoundingClientRect().width);
    // Transitioning copies need correct geometry before paint; only the ongoing subscription is activity-gated.
    measure();
    if (!active) return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [active]);
  const ticks = data.ticks;
  const size = design.marker ? design.markerSize : 0;
  const height = Math.max(design.height, size);
  const inset = Math.min(size / 2, width / 2);
  const travel = Math.max(0, width - 2 * inset);
  const fraction = Math.max(0, Math.min(1, reading.progress));
  const head = inset + travel * fraction;
  return (
    <span
      className={'ui-navigation-part-progress' + (className ? ` ${className}` : '')}
      data-palette={design.palette}
      data-color={design.color}
      data-track={design.track}
      data-current-index={currentIndex}
      data-progress={fraction}
      data-placement={placement}
    >
      <svg ref={svg} width="100%" height={height} aria-hidden="true">
        <rect
          className="ui-navigation-progress-track"
          x={inset}
          y={(height - design.height) / 2}
          width={travel || '100%'}
          height={design.height}
          rx={design.rounded ? design.height / 2 : 0}
        />
        <rect
          className="ui-navigation-progress-fill"
          x={inset}
          y={(height - design.height) / 2}
          width={width ? travel * fraction : `${fraction * 100}%`}
          height={design.height}
          rx={design.rounded ? design.height / 2 : 0}
        />
        {ticks &&
          Array.from({ length: ticks }, (_, index) => (
            <line
              className="ui-navigation-progress-tick"
              key={index}
              x1={`${(index / (ticks - 1)) * 100}%`}
              x2={`${(index / (ticks - 1)) * 100}%`}
              y1={(height - design.height) / 2}
              y2={(height + design.height) / 2}
            />
          ))}
        {data.checkpoints &&
          navigation.items.map((item, index) => (
            <circle
              className="ui-navigation-progress-checkpoint"
              key={item.href}
              cx={inset + (travel * index) / Math.max(1, navigation.items.length - 1)}
              cy={height / 2}
              r={2}
              data-current={index === currentIndex}
            />
          ))}
        {design.marker && (
          <g className="ui-navigation-progress-marker">
            <NavigationMarker media={design.marker} x={Math.max(0, head - size / 2)} size={size} />
          </g>
        )}
      </svg>
    </span>
  );
}
