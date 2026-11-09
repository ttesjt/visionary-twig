import { imageAssetsSchema, imageAssetSchema } from '@frontend/content-blocks/schema';

const SAMPLE_ASSET_BASE = '/samples/media';
const ILLUSTRATION_DIMENSIONS = { width: 720, height: 480 };
const illustrationSamples = [
  {
    id: 'rings',
    caption: 'Concentric rings',
    alt: 'Three nested green circles on a neutral background',
  },
  { id: 'arches', caption: 'Simple arches', alt: 'Three rounded arches in warm neutral colors' },
  { id: 'waves', caption: 'Layered waves', alt: 'Three blue waves arranged in overlapping layers' },
  {
    id: 'grid',
    caption: 'A grid of tiles',
    alt: 'Nine rounded tiles arranged in three rows and columns',
  },
  { id: 'columns', caption: 'Rounded columns', alt: 'Three green columns with different heights' },
];

export const sampleImages = imageAssetsSchema.parse([
  {
    id: 'lake',
    src: `${SAMPLE_ASSET_BASE}/lake.png`,
    alt: 'An AI-generated mountain lake with trees and stones along the shore',
    caption: 'A quiet lake',
    width: 1536,
    height: 1024,
  },
  ...illustrationSamples.map((image) => ({
    ...image,
    src: `${SAMPLE_ASSET_BASE}/${image.id}.svg`,
    ...ILLUSTRATION_DIMENSIONS,
  })),
]);

export const layoutDiagram = imageAssetSchema.parse({
  id: 'layout-diagram',
  src: `${SAMPLE_ASSET_BASE}/layout-diagram.svg`,
  alt: 'A simple page diagram with a heading above text and image regions',
  width: 1200,
  height: 720,
});
