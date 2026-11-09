import { parseDocument } from '@frontend/ui-document';
import { contentRegistry } from '@frontend/puck-adapter/schema';
import { sampleImages, layoutDiagram } from './sample-assets';
import { sampleContent, overviewBody, detailBody } from './sample-content';

const rawDocument = {
  documentId: 'sample-runtime',
  schemaVersion: 1,
  revision: 1,
  locale: 'en',
  data: {
    root: { props: {} },
    content: [
      { type: 'Hero', props: { id: 'hero', title: '', headingLevel: 1, summary: '' } },
      {
        type: 'Container',
        props: {
          id: 'container',
          width: 'content',
          content: [
            {
              type: 'Column',
              props: {
                id: 'stack',
                space: 'section',
                content: [
                  { type: 'Heading', props: { id: 'overview-title', text: '', level: 2 } },
                  { type: 'RichText', props: { id: 'overview-body', content: overviewBody } },
                  {
                    type: 'Row',
                    props: {
                      id: 'row',
                      align: 'stretch',
                      content: [
                        {
                          type: 'Column',
                          props: {
                            id: 'images',
                            content: [
                              {
                                type: 'Heading',
                                props: {
                                  id: 'images-title',
                                  text: sampleContent.imageGrid,
                                  level: 2,
                                },
                              },
                              {
                                type: 'Grid',
                                props: {
                                  id: 'image-grid',
                                  columns: 3,
                                  content: sampleImages.map((image) => ({
                                    type: 'MediaFigure',
                                    props: { id: `figure-${image.id}`, image },
                                  })),
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                  {
                    type: 'MediaGallery',
                    props: {
                      id: 'gallery',
                      images: [],
                      label: sampleContent.galleryLabel,
                      layout: 'carousel',
                      thumbnails: true,
                    },
                  },
                  {
                    type: 'ContentSection',
                    props: {
                      id: 'details',
                      heading: { text: sampleContent.details, level: 2 },
                      content: [
                        {
                          type: 'MediaText',
                          props: {
                            id: 'layout-detail',
                            media: { type: 'image', image: layoutDiagram },
                            body: detailBody,
                            content: [],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    ],
  },
  variables: { content: sampleContent, assets: { images: sampleImages } },
  bindings: [
    { nodeId: 'hero', targetPath: ['title'], sourcePath: ['content', 'title'] },
    { nodeId: 'hero', targetPath: ['summary'], sourcePath: ['content', 'summary'] },
    { nodeId: 'overview-title', targetPath: ['text'], sourcePath: ['content', 'overview'] },
    { nodeId: 'gallery', targetPath: ['images'], sourcePath: ['assets', 'images'] },
  ],
};

const parsed = parseDocument(rawDocument, contentRegistry);
if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
export const sampleDocument = parsed.value;
