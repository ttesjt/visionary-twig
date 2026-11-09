import { expect, test } from '@playwright/test';

const endpoint = '/api/examples/slug';

for (const example of [
  {
    home: '/',
    link: 'Backend API example',
    label: 'Page title',
    submit: 'Generate slug',
    invalid: 'Include at least one letter or number.',
    title: 'Café & Field Notes!',
    slug: 'café-field-notes',
    result: 'Slug result',
  },
  {
    home: '/?lang=zh',
    link: '后端 API 示例',
    label: '页面标题',
    submit: '生成短名',
    invalid: '标题至少需要包含一个文字或数字。',
    title: '春日 手记 ２０２６',
    slug: '春日-手记-2026',
    result: '短名结果',
  },
]) {
  test(
    'the form calls the real API and recovers from invalid input at ' + example.home,
    async ({ page }) => {
      await page.goto(example.home);
      await page.getByRole('link', { name: example.link }).click();
      const input = page.getByRole('textbox', { name: example.label });
      const submit = page.getByRole('button', { name: example.submit });
      const output = page.getByRole('status', { name: example.result });

      await input.fill('---');
      const invalid = page.waitForResponse((response) => response.url().endsWith(endpoint));
      await submit.click();
      expect((await invalid).status()).toBe(422);
      await expect(output).toHaveText(example.invalid);

      await input.fill(example.title);
      const success = page.waitForResponse((response) => response.url().endsWith(endpoint));
      await submit.click();
      const response = await success;
      expect(response.request().method()).toBe('POST');
      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual({ slug: example.slug });
      await expect(output).toHaveText(example.slug);
    }
  );
}

test('the slug endpoint validates the HTTP request independently of the form', async ({
  request,
}) => {
  const post = (data: string, type = 'application/json') =>
    request.post(endpoint, { data: Buffer.from(data), headers: { 'Content-Type': type } });
  for (const [response, status, error] of [
    [await post('{}', 'text/plain'), 415, 'expected-json'],
    [await post('{'), 400, 'invalid-json'],
    [await post(JSON.stringify({ title: 42 })), 422, 'invalid-title'],
    [await post(JSON.stringify({ title: 'a'.repeat(121) })), 422, 'invalid-title'],
    [await post(JSON.stringify({ title: 'a'.repeat(4096) })), 413, 'body-too-large'],
  ] as const) {
    expect(response.status()).toBe(status);
    expect(await response.json()).toEqual({ error });
  }
  expect((await request.get(endpoint)).status()).toBe(405);
});
