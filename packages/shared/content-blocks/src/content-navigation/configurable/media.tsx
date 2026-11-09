import { Bird, CodeXml, Compass, Leaf, Sparkles } from 'lucide-react';
import type { NavigationMedia } from './schema.js';
const icons = { bird: Bird, code: CodeXml, compass: Compass, leaf: Leaf, spark: Sparkles };
export function NavigationMediaContent({ media }: { readonly media: NavigationMedia }) {
  if (media.kind === 'image') return <img src={media.src} alt="" />;
  const Icon = icons[media.name];
  return <Icon aria-hidden="true" />;
}
/** SVG geometry keeps progress placement precise without injecting authored inline CSS. */
export function NavigationMarker({
  media,
  x,
  size,
}: {
  readonly media: NavigationMedia;
  readonly x: number;
  readonly size: number;
}) {
  if (media.kind === 'image')
    return (
      <image
        href={media.src}
        x={x}
        y={0}
        width={size}
        height={size}
        preserveAspectRatio="xMidYMid meet"
      />
    );
  const Icon = icons[media.name];
  return <Icon x={x} y={0} width={size} height={size} />;
}
