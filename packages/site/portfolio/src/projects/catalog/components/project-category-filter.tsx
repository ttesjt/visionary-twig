'use client';

import type { ReactElement } from 'react';
import type { ProjectCategory } from '../contracts.js';

const ALL_CATEGORIES = '';

export interface ProjectCategoryFilterProps {
  readonly categories: readonly ProjectCategory[];
  readonly selectedCategoryId: string | null;
  readonly onCategoryChange: (categoryId: string | null) => void;
  readonly text: {
    readonly label: string;
    readonly all: string;
  };
}

export function ProjectCategoryFilter({
  categories,
  selectedCategoryId,
  onCategoryChange,
  text,
}: ProjectCategoryFilterProps): ReactElement {
  return (
    <label className="ui-project-category-filter">
      <span>{text.label}</span>
      <select
        value={selectedCategoryId ?? ALL_CATEGORIES}
        onChange={(event) => onCategoryChange(event.currentTarget.value || null)}
      >
        <option value={ALL_CATEGORIES}>{text.all}</option>
        {categories.map(({ id, label }) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
