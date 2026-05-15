#!/usr/bin/env node

import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
    parseYaml,
    renderResumeHtml as renderResumeHtmlFromAssets,
} from "../src/resume-core.mjs";

export const root = dirname(dirname(fileURLToPath(import.meta.url)));

export const paths = {
    content: join(root, "content", "resume.yml"),
    styles: join(root, "styles", "resume.css"),
    template: join(root, "templates", "resume.html"),
    dist: join(root, "dist", "resume.html"),
    distRoot: join(root, "dist"),
    rootHtml: join(root, "resume.html"),
};

export async function loadResumeData() {
    return parseYaml(await readFile(paths.content, "utf8"));
}

export async function loadResumeAssets() {
    return Promise.all([
        readFile(paths.content, "utf8"),
        readFile(paths.styles, "utf8"),
        readFile(paths.template, "utf8"),
    ]);
}

export async function renderResumeHtml(resume) {
    const [styles, template] = await Promise.all([
        readFile(paths.styles, "utf8"),
        readFile(paths.template, "utf8"),
    ]);

    return renderResumeHtmlFromAssets(resume, { styles, template });
}

export async function buildResume() {
    const resume = await loadResumeData();
    const [styles, template] = await Promise.all([
        readFile(paths.styles, "utf8"),
        readFile(paths.template, "utf8"),
    ]);
    const html = renderResumeHtmlFromAssets(resume, { styles, template });

    await mkdir(paths.distRoot, { recursive: true });

    await Promise.all([
        writeFile(paths.dist, `${html}\n`),
        writeFile(paths.rootHtml, `${html}\n`),
        writeFile(join(paths.distRoot, ".nojekyll"), ""),
    ]);

    await copyStaticSiteAssets();
}

async function copyStaticSiteAssets() {
    const assets = [
        ["index.html", "index.html"],
        ["content/resume.yml", "content/resume.yml"],
        ["editor/index.html", "editor/index.html"],
        ["editor/editor.css", "editor/editor.css"],
        ["editor/editor.js", "editor/editor.js"],
        ["src/resume-core.mjs", "src/resume-core.mjs"],
        ["styles/resume.css", "styles/resume.css"],
        ["templates/resume.html", "templates/resume.html"],
    ];

    await Promise.all(assets.map(([source, destination]) => copyAsset(source, destination)));
}

async function copyAsset(source, destination) {
    const output = join(paths.distRoot, destination);
    await mkdir(dirname(output), { recursive: true });
    await copyFile(join(root, source), output);
}

async function main() {
    await buildResume();
    console.log("Generated resume.html, dist/resume.html, and dist static site");
}

function isCliEntrypoint() {
    return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isCliEntrypoint()) {
    main().catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    });
}
