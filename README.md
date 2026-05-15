# Resume Template Builder

A small static resume builder that keeps resume content separate from the print
layout. It ships with placeholder data so the repo can be published as a
GitHub Pages site for friends or classmates to use.

## Use The Builder

Run the local editor:

```sh
npm run dev
```

Then open <http://localhost:4173>. Changes update the preview in the browser.
Use **Print / PDF** to open the browser print dialog and save a PDF.

## Edit The Template Data

Default resume content lives in [content/resume.yml](content/resume.yml):

- Update the placeholder roles, dates, bullets, projects, education, and skills.
- Use Markdown-style links inside bullets when needed:
  `[Project](https://example.com)`.
- Keep indentation at two spaces.

Layout changes live in [templates/resume.html](templates/resume.html), and print
styling lives in [styles/resume.css](styles/resume.css).

## Build

Run:

```sh
npm run build
```

The build writes:

- [resume.html](resume.html), a generated standalone resume
- [dist/resume.html](dist/resume.html), the generated resume for artifacts
- [dist/index.html](dist/index.html), the static GitHub Pages app

## Deploy To GitHub Pages

This repo includes a Pages workflow at
[.github/workflows/pages.yml](.github/workflows/pages.yml). Before the first
successful deploy, enable GitHub Pages for the repository:

1. Open **Settings** -> **Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Save the setting, then rerun the **Deploy GitHub Pages** workflow.

After that one-time setup, pushes to `main` build `dist` and deploy it.

Before publishing, search the repo for any real personal details you do not want
online.
