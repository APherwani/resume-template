export const generatedNotice =
    "<!-- Generated from content/resume.yml, styles/resume.css, and templates/resume.html. Run `npm run build` after edits. -->";

export function renderResumeHtml(resume, { styles, template, notice = generatedNotice }) {
    const content = renderResume(resume);
    return renderTemplate(template, {
        title: `${resume.contact.name} - Resume`,
        styles: indent(styles.trimEnd(), 8),
        content: `${notice}\n${content}`,
    });
}

export function resumePdfFilename(resume, date = new Date()) {
    const name = slugify(resume.contact?.name || "resume");
    return `${name}-resume-${formatDate(date)}.pdf`;
}

export function renderResume(resume) {
    const sections = [
        renderHeader(resume.contact),
        renderSection("Work Experience", resume.experience.map(renderJob).join("\n\n")),
    ];

    if (resume.projects?.length) {
        sections.push(renderSection("Projects", resume.projects.map(renderProject).join("\n\n")));
    }

    sections.push(
        renderSection("Education", resume.education.map(renderEducation).join("\n\n")),
        renderSection("Skills", renderSkills(resume.skills)),
    );

    return sections.join("\n\n");
}

export function parseYaml(source) {
    const lines = source
        .split(/\r?\n/)
        .map((raw, index) => ({
            indent: raw.match(/^ */)[0].length,
            text: raw.trim(),
            lineNumber: index + 1,
        }))
        .filter((line) => line.text && !line.text.startsWith("#"));

    const [value, nextIndex] = parseBlock(lines, 0, 0);
    if (nextIndex !== lines.length) {
        throw new Error(`Unexpected YAML content on line ${lines[nextIndex].lineNumber}`);
    }

    return value;
}

export function stringifyResumeYaml(resume) {
    const lines = ["# Edit resume content here, then run `npm run build`.", "contact:"];

    scalar(lines, 2, "name", resume.contact.name);
    scalar(lines, 2, "phone", resume.contact.phone);
    scalar(lines, 2, "email", resume.contact.email);
    scalar(lines, 2, "location", resume.contact.location);
    const contactOrder = normalizeContactOrder(resume.contact.order, contactOrderKeys(resume.contact));
    if (contactOrder.length) {
        lines.push("  order:");
        for (const key of contactOrder) {
            lines.push(`    - ${yamlScalar(key, { listItem: true })}`);
        }
    }
    lines.push("  links:");
    for (const link of resume.contact.links ?? []) {
        lines.push(`    - label: ${yamlScalar(link.label)}`);
        scalar(lines, 6, "url", link.url);
    }

    lines.push("", "experience:");
    for (const job of resume.experience ?? []) {
        lines.push(`  - title: ${yamlScalar(job.title)}`);
        scalar(lines, 4, "dates", job.dates);
        lines.push("    bullets:");
        for (const bullet of job.bullets ?? []) {
            lines.push(`      - ${yamlScalar(bullet, { listItem: true })}`);
        }
        lines.push("");
    }

    if (resume.projects?.length) {
        lines.push("projects:");
        for (const project of resume.projects) {
            const bullets = project.bullets?.length
                ? project.bullets
                : project.description
                    ? [project.description]
                    : [];

            lines.push(`  - name: ${yamlScalar(project.name)}`);
            lines.push("    bullets:");
            for (const bullet of bullets) {
                lines.push(`      - ${yamlScalar(bullet, { listItem: true })}`);
            }
        }
        lines.push("");
    }

    lines.push("education:");
    for (const education of resume.education ?? []) {
        lines.push(`  - school: ${yamlScalar(education.school)}`);
        scalar(lines, 4, "dates", education.dates);
        scalar(lines, 4, "degree", education.degree);
        lines.push("    details:");
        for (const detail of education.details ?? []) {
            lines.push(`      - ${yamlScalar(detail, { listItem: true })}`);
        }
        lines.push("");
    }

    lines.push("skills:");
    for (const skill of resume.skills ?? []) {
        lines.push(`  - label: ${yamlScalar(skill.label)}`);
        lines.push("    items:");
        for (const item of skill.items ?? []) {
            lines.push(`      - ${yamlScalar(item, { listItem: true })}`);
        }
    }

    return `${trimTrailingBlankLines(lines).join("\n")}\n`;
}

function renderHeader(contact) {
    const items = contactItems(contact);
    const order = normalizeContactOrder(contact.order, items.map((item) => item.key));
    const itemByKey = new Map(items.map((item) => [item.key, item.value]));
    const contactLine = order
        .map((key) => itemByKey.get(key))
        .filter(Boolean)
        .map(renderInline)
        .join(" | ");

    return [
        '    <div class="header">',
        `        <div class="name">${escapeHtml(contact.name)}</div>`,
        `        <div class="contact">${contactLine}</div>`,
        "    </div>",
    ].join("\n");
}

function contactItems(contact) {
    return [
        { key: "phone", value: contact.phone },
        { key: "email", value: renderEmailLink(contact.email) },
        { key: "location", value: contact.location },
        ...(contact.links ?? []).map((link, index) => ({
            key: `link:${index}`,
            value: renderContactLink(link),
        })),
    ];
}

function contactOrderKeys(contact) {
    return contactItems(contact).map((item) => item.key);
}

function normalizeContactOrder(order, keys) {
    const allowed = new Set(keys);
    const seen = new Set();
    const normalized = [];

    for (const key of order ?? keys) {
        if (typeof key !== "string" || !allowed.has(key) || seen.has(key)) {
            continue;
        }
        normalized.push(key);
        seen.add(key);
    }

    for (const key of keys) {
        if (!seen.has(key)) {
            normalized.push(key);
        }
    }

    return normalized;
}

function renderEmailLink(email) {
    if (!email) {
        return "";
    }

    return `[${email}](mailto:${email})`;
}

function renderContactLink(link) {
    if (!link.url) {
        return link.label;
    }

    return `[${link.label ?? link.url}](${link.url})`;
}

function renderSection(title, body) {
    return [
        `    <div class="section-title">${escapeHtml(title)}</div>`,
        "",
        body,
    ].join("\n");
}

function renderJob(job) {
    return [
        '    <div class="job-header">',
        `        <span class="job-title">${escapeHtml(job.title)}</span>`,
        `        <span class="job-dates">${escapeHtml(job.dates)}</span>`,
        "    </div>",
        '    <div class="job-details">',
        "        <ul>",
        ...job.bullets.map((bullet) => `            <li>${renderInline(bullet)}</li>`),
        "        </ul>",
        "    </div>",
    ].join("\n");
}

function renderEducation(education) {
    return [
        '    <div class="education-header">',
        `        <span class="job-title">${escapeHtml(education.school)}</span>`,
        `        <span class="job-dates">${escapeHtml(education.dates)}</span>`,
        "    </div>",
        `    <div>${renderInline(education.degree)}</div>`,
        ...(education.details ?? []).map((detail) => `    <div>${renderInline(detail)}</div>`),
    ].join("\n");
}

function renderProject(project) {
    const bullets = project.bullets?.length
        ? project.bullets
        : project.description
            ? [project.description]
            : [];

    return [
        '    <div class="job-header project-header">',
        `        <span class="job-title">${escapeHtml(project.name)}</span>`,
        "    </div>",
        '    <div class="job-details project-details">',
        "        <ul>",
        ...bullets.map((bullet) => `            <li>${renderInline(bullet)}</li>`),
        "        </ul>",
        "    </div>",
    ].join("\n");
}

function renderSkills(skills) {
    return [
        '    <div class="skills">',
        "        <ul>",
        ...skills.map((skill) => {
            const items = (skill.items ?? []).map(escapeHtml).join(", ");
            return `            <li><strong>${escapeHtml(skill.label)}:</strong> ${items}</li>`;
        }),
        "        </ul>",
        "    </div>",
    ].join("\n");
}

function renderTemplate(template, values) {
    return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => {
        if (!(key in values)) {
            throw new Error(`Missing template value: ${key}`);
        }

        return values[key];
    });
}

function renderInline(value) {
    return escapeHtml(value).replace(
        /\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^)]+)\)/g,
        (_match, label, url) => `<a href="${url}">${label}</a>`,
    );
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

function indent(value, spaces) {
    const prefix = " ".repeat(spaces);
    return value
        .split("\n")
        .map((line) => `${prefix}${line}`)
        .join("\n");
}

function parseBlock(lines, index, indentLevel) {
    if (index >= lines.length || lines[index].indent < indentLevel) {
        return [null, index];
    }

    if (lines[index].indent !== indentLevel) {
        throw new Error(`Unexpected indentation on line ${lines[index].lineNumber}`);
    }

    return lines[index].text.startsWith("- ")
        ? parseList(lines, index, indentLevel)
        : parseMap(lines, index, indentLevel);
}

function parseMap(lines, index, indentLevel) {
    const value = {};

    while (index < lines.length) {
        const line = lines[index];

        if (line.indent < indentLevel) {
            break;
        }

        if (line.indent !== indentLevel || line.text.startsWith("- ")) {
            throw new Error(`Expected a mapping entry on line ${line.lineNumber}`);
        }

        const pair = parsePair(line.text, line.lineNumber);
        index += 1;

        if (pair.value === "") {
            const [nested, nextIndex] = parseBlock(lines, index, indentLevel + 2);
            value[pair.key] = nested;
            index = nextIndex;
        } else {
            value[pair.key] = parseScalar(pair.value);
        }
    }

    return [value, index];
}

function parseList(lines, index, indentLevel) {
    const value = [];

    while (index < lines.length) {
        const line = lines[index];

        if (line.indent < indentLevel) {
            break;
        }

        if (line.indent !== indentLevel || !line.text.startsWith("- ")) {
            throw new Error(`Expected a list item on line ${line.lineNumber}`);
        }

        const itemText = line.text.slice(2).trim();
        index += 1;

        if (itemText === "") {
            const [nested, nextIndex] = parseBlock(lines, index, indentLevel + 2);
            value.push(nested);
            index = nextIndex;
            continue;
        }

        const pair = maybeParsePair(itemText);
        if (!pair) {
            value.push(parseScalar(itemText));
            continue;
        }

        const item = { [pair.key]: pair.value === "" ? null : parseScalar(pair.value) };

        if (index < lines.length && lines[index].indent > indentLevel) {
            const [nested, nextIndex] = parseBlock(lines, index, indentLevel + 2);
            if (!nested || typeof nested !== "object" || Array.isArray(nested)) {
                throw new Error(`Expected nested mapping after line ${line.lineNumber}`);
            }
            Object.assign(item, nested);
            index = nextIndex;
        }

        value.push(item);
    }

    return [value, index];
}

function parsePair(text, lineNumber) {
    const pair = maybeParsePair(text);
    if (!pair) {
        throw new Error(`Expected key/value pair on line ${lineNumber}`);
    }

    return pair;
}

function maybeParsePair(text) {
    const match = text.match(/^([A-Za-z0-9_-]+):(.*)$/);
    if (!match) {
        return null;
    }

    return {
        key: match[1],
        value: match[2].trim(),
    };
}

function parseScalar(value) {
    if (value.startsWith('"') && value.endsWith('"')) {
        try {
            return JSON.parse(value);
        } catch {
            return value.slice(1, -1);
        }
    }

    if (value.startsWith("'") && value.endsWith("'")) {
        return value.slice(1, -1);
    }

    return value;
}

function scalar(lines, indentLevel, key, value) {
    if (value !== undefined && value !== null) {
        lines.push(`${" ".repeat(indentLevel)}${key}: ${yamlScalar(value)}`);
    }
}

function yamlScalar(value, { listItem = false } = {}) {
    const text = String(value ?? "");
    const needsQuotes =
        text === "" ||
        /^\s|\s$/.test(text) ||
        text.startsWith("#") ||
        text.startsWith("- ") ||
        (listItem && /^[A-Za-z0-9_-]+:/.test(text)) ||
        /[\n\r]/.test(text);

    if (!needsQuotes) {
        return text;
    }

    return JSON.stringify(text);
}

function trimTrailingBlankLines(lines) {
    const trimmed = [...lines];
    while (trimmed.at(-1) === "") {
        trimmed.pop();
    }

    return trimmed;
}

function slugify(value) {
    const slug = String(value)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    return slug || "resume";
}

function formatDate(date) {
    const value = date instanceof Date ? date : new Date(date);
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
