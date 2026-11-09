import { z } from 'zod';
import { studioLabels } from './src/text/schema.ts';

const preparedText = z.object({
  locales: z.record(z.string(), z.object({ main: z.record(z.string(), z.string()) })),
});

/** Every locale must supply the text contract used by the Studio editor and workspace. */
const studioInputs = {
  validate(text: unknown) {
    for (const { main } of Object.values(preparedText.parse(text).locales)) {
      studioLabels(Object.entries(main));
    }
  },
};
export default studioInputs;
