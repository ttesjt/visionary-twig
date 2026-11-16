import { describe, expect, it } from 'vitest';
import { parseProjectLocation, projectLocationHref } from './project-location';

describe('project location', () => {
  it.each(
    ['0', '-2', '1.5', '01', '9007199254740991', ['2', '3'], undefined].map((page) => ({ page }))
  )('defaults an invalid or ambiguous page ($page) to page one', ({ page }) => {
    expect(parseProjectLocation({ page }, 2).page).toBe(1);
  });

  it('preserves locale, unrelated parameters, and the fragment when resetting the view', () => {
    expect(
      projectLocationHref('/', 'category=tools&page=2&ref=example', '#work', 'zh', {
        category: null,
        page: 1,
      })
    ).toBe('/?ref=example&lang=zh#work');
    expect(parseProjectLocation({ category: ['web', 'tools'], page: '2' }, 2)).toEqual({
      category: null,
      page: 2,
    });
  });
});
