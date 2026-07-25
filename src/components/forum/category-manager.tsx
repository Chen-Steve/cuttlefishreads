"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  createCategory,
  createSection,
  deleteCategory,
  deleteSection,
  updateCategory,
  updateSection,
  type CategoryInput,
  type SectionInput,
} from "@/app/(originals)/originals/forum/actions";
import {
  MAX_CATEGORY_DESCRIPTION_LENGTH,
  MAX_CATEGORY_NAME_LENGTH,
  MAX_SECTION_NAME_LENGTH,
} from "@/lib/forum/constants";
import type {
  ForumCategoryGroup,
  ForumCategoryOverview,
  ForumSection,
} from "@/lib/forum/types";

const fieldClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50";

const primaryButtonClass =
  "inline-flex h-9 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50";

const deleteButtonClass =
  "inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-sm font-medium text-muted transition-colors hover:border-red-500/40 hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400";

const headingClass =
  "text-xs font-semibold uppercase tracking-[0.14em] text-accent";

function SectionFields({
  value,
  onChange,
  disabled,
  idPrefix,
}: {
  value: SectionInput;
  onChange: (next: SectionInput) => void;
  disabled: boolean;
  idPrefix: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_6rem]">
      <div>
        <label htmlFor={`${idPrefix}-name`} className="sr-only">
          Section name
        </label>
        <input
          id={`${idPrefix}-name`}
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
          placeholder="Section name"
          maxLength={MAX_SECTION_NAME_LENGTH}
          disabled={disabled}
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-order`} className="sr-only">
          Order
        </label>
        <input
          id={`${idPrefix}-order`}
          type="number"
          value={value.sortOrder}
          onChange={(event) =>
            onChange({ ...value, sortOrder: Number(event.target.value) })
          }
          disabled={disabled}
          className={`${fieldClass} tabular-nums`}
        />
      </div>
    </div>
  );
}

function SectionRow({ section }: { section: ForumSection }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [input, setInput] = useState<SectionInput>({
    name: section.name,
    sortOrder: section.sortOrder,
  });

  function handleSave() {
    startTransition(async () => {
      const result = await updateSection(section.id, input);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Saved ${input.name}.`);
      router.refresh();
    });
  }

  function handleDelete() {
    const confirmed = window.confirm(
      `Delete the ${section.name} section? Its categories stay on the board without a heading.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteSection(section.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
      <div className="flex-1">
        <SectionFields
          value={input}
          onChange={setInput}
          disabled={pending}
          idPrefix={`section-${section.id}`}
        />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className={deleteButtonClass}
        >
          <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
          Delete
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className={primaryButtonClass}
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </li>
  );
}

const emptySection: SectionInput = { name: "", sortOrder: 0 };

function SectionManager({ sections }: { sections: ForumSection[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<SectionInput>(emptySection);

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();

    startTransition(async () => {
      const result = await createSection(draft);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setDraft(emptySection);
      toast.success("Section added.");
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className={headingClass}>Sections</h2>

      {sections.length > 0 ? (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {sections.map((section) => (
            <SectionRow key={section.id} section={section} />
          ))}
        </ul>
      ) : null}

      <form
        onSubmit={handleCreate}
        className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center"
      >
        <div className="flex-1">
          <SectionFields
            value={draft}
            onChange={setDraft}
            disabled={pending}
            idPrefix="new-section"
          />
        </div>
        <button
          type="submit"
          disabled={pending || !draft.name.trim()}
          className={`${primaryButtonClass} shrink-0`}
        >
          <Plus className="size-4" strokeWidth={1.75} aria-hidden />
          {pending ? "Adding…" : "Add section"}
        </button>
      </form>
    </section>
  );
}

function CategoryFields({
  value,
  onChange,
  disabled,
  idPrefix,
  sections,
}: {
  value: CategoryInput;
  onChange: (next: CategoryInput) => void;
  disabled: boolean;
  idPrefix: string;
  sections: ForumSection[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_6rem]">
      <div className="flex flex-col gap-2">
        <label htmlFor={`${idPrefix}-name`} className="sr-only">
          Category name
        </label>
        <input
          id={`${idPrefix}-name`}
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
          placeholder="Category name"
          maxLength={MAX_CATEGORY_NAME_LENGTH}
          disabled={disabled}
          className={fieldClass}
        />

        <label htmlFor={`${idPrefix}-description`} className="sr-only">
          Description
        </label>
        <input
          id={`${idPrefix}-description`}
          value={value.description}
          onChange={(event) =>
            onChange({ ...value, description: event.target.value })
          }
          placeholder="What belongs in this category?"
          maxLength={MAX_CATEGORY_DESCRIPTION_LENGTH}
          disabled={disabled}
          className={fieldClass}
        />

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label
              htmlFor={`${idPrefix}-section`}
              className="text-sm text-muted"
            >
              Section
            </label>
            <select
              id={`${idPrefix}-section`}
              value={value.sectionId ?? ""}
              onChange={(event) =>
                onChange({ ...value, sectionId: event.target.value || null })
              }
              disabled={disabled}
              className={`${fieldClass} w-auto`}
            >
              <option value="">No section</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={value.adminOnlyThreads}
              onChange={(event) =>
                onChange({ ...value, adminOnlyThreads: event.target.checked })
              }
              disabled={disabled}
              className="size-4 rounded border-border accent-accent"
            />
            Moderators only
          </label>
        </div>
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}-order`}
          className="text-xs font-medium text-muted"
        >
          Order
        </label>
        <input
          id={`${idPrefix}-order`}
          type="number"
          value={value.sortOrder}
          onChange={(event) =>
            onChange({ ...value, sortOrder: Number(event.target.value) })
          }
          disabled={disabled}
          className={`mt-1 ${fieldClass} tabular-nums`}
        />
      </div>
    </div>
  );
}

function CategoryRow({
  category,
  sections,
}: {
  category: ForumCategoryOverview;
  sections: ForumSection[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [input, setInput] = useState<CategoryInput>({
    name: category.name,
    description: category.description,
    sortOrder: category.sortOrder,
    adminOnlyThreads: category.adminOnlyThreads,
    sectionId: category.sectionId,
  });

  function handleSave() {
    startTransition(async () => {
      const result = await updateCategory(category.id, input);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Saved ${input.name}.`);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!window.confirm(`Delete the ${category.name} category?`)) return;

    startTransition(async () => {
      const result = await deleteCategory(category.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="px-4 py-4 sm:px-5">
      <CategoryFields
        value={input}
        onChange={setInput}
        disabled={pending}
        idPrefix={`category-${category.id}`}
        sections={sections}
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted tabular-nums">
          /{category.slug} · {category.threadCount.toLocaleString()} threads
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className={deleteButtonClass}
          >
            <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
            Delete
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className={primaryButtonClass}
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </li>
  );
}

const emptyCategory: CategoryInput = {
  name: "",
  description: "",
  sortOrder: 0,
  adminOnlyThreads: false,
  sectionId: null,
};

export function CategoryManager({
  groups,
  sections,
}: {
  groups: ForumCategoryGroup[];
  sections: ForumSection[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<CategoryInput>({
    ...emptyCategory,
    sectionId: sections[0]?.id ?? null,
  });

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();

    startTransition(async () => {
      const result = await createCategory(draft);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setDraft({ ...emptyCategory, sectionId: draft.sectionId });
      toast.success("Category added.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <SectionManager sections={sections} />

      <section className="flex flex-col gap-5">
        <h2 className={headingClass}>Categories</h2>

        {groups.map((group) => (
          <div key={group.id} className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-foreground">
              {group.name}
            </p>
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
              {group.categories.map((category) => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  sections={sections}
                />
              ))}
            </ul>
          </div>
        ))}

        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-border bg-surface p-4"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            Add a category
          </p>
          <CategoryFields
            value={draft}
            onChange={setDraft}
            disabled={pending}
            idPrefix="new-category"
            sections={sections}
          />
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={pending || !draft.name.trim()}
              className={primaryButtonClass}
            >
              <Plus className="size-4" strokeWidth={1.75} aria-hidden />
              {pending ? "Adding…" : "Add category"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
