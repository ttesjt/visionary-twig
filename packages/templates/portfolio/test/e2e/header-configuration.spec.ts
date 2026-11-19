import { test } from './fixtures/portfolio';
import { assertPreparedHeader } from './fixtures/header';
test('renders prepared Header configuration and keyboard controls', async ({ page }) => {
  await assertPreparedHeader(page);
});
