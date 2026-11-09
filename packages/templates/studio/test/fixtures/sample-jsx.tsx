import { Container, Column, Row, Grid } from '@frontend/ui/layout';
import {
  Hero,
  Heading,
  RichText,
  MediaFigure,
  ContentSection,
  MediaText,
} from '@frontend/content-blocks';
import { MediaGallery } from '@frontend/content-blocks/gallery';
import { sampleImages, layoutDiagram } from '../../src/samples/sample-assets';
import { sampleContent, overviewBody, detailBody } from '../../src/samples/sample-content';

/** Same fixture data, ordinary JSX composition for rendering/geometry comparison. */
export function SampleJsx() {
  return (
    <>
      <Hero title={sampleContent.title} summary={sampleContent.summary} headingLevel={1} />
      <Container width="content">
        <Column space="section">
          <Heading text={sampleContent.overview} level={2} />
          <RichText content={overviewBody} />
          <Row align="stretch">
            <Column>
              <Heading text={sampleContent.imageGrid} level={2} />
              <Grid columns={3}>
                {sampleImages.map((image) => (
                  <MediaFigure key={image.id} image={image} />
                ))}
              </Grid>
            </Column>
          </Row>
          <MediaGallery
            images={sampleImages}
            label={sampleContent.galleryLabel}
            layout="carousel"
            thumbnails
          />
          <ContentSection heading={{ text: sampleContent.details, level: 2 }}>
            <div>
              <MediaText media={{ type: 'image', image: layoutDiagram }} body={detailBody}>
                <div />
              </MediaText>
            </div>
          </ContentSection>
        </Column>
      </Container>
    </>
  );
}
