# apps/web conventions

## Component structure

One component, one folder named after it (PascalCase). Everything the component owns lives inside.

```
Button/
  Button.tsx          # component
  Button.test.tsx     # tests
  Button.styles.ts    # styles, only if there are any beyond utility classes
  Button.stories.tsx  # stories, only if the repo uses Storybook
  Button.types.ts     # props/types, when too big to inline
  index.ts            # `export * from "./Button"`
```

- Folder, files and export share the component name. One component per file.
- Import from the folder (`@/components/ui/Button`), never from inner files.
- A sub-component used by a single parent nests inside the parent's folder.
- A hook that has its own test gets its own folder too (`useAgentActivity/`).
- Plain helpers and untested hooks (`money.ts`, `useAgents.ts`) stay flat in the feature folder.
- Each component has a test file. Other files are created only when needed.
- Inside a component folder, sibling imports go through the parent (`../useAgents`).

## shadcn

`components.json` cannot express this layout: `shadcn add <x>` always writes a lowercase `ui/<x>.tsx`. After running it, move the file to `ui/<X>/<X>.tsx`, add an `index.ts`, and fix the import paths.
