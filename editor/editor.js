import { parseYaml, renderResumeHtml } from "../src/resume-core.mjs";

const letterPageHeight = 1056;

const state = {
    resume: null,
    assets: null,
    previewTimer: null,
};

const elements = {
    form: document.querySelector("#resume-form"),
    preview: document.querySelector("#preview"),
    status: document.querySelector("#status"),
    pageStatus: document.querySelector("#page-status"),
    printButton: document.querySelector("#print-button"),
};

elements.printButton.addEventListener("click", printResume);
elements.preview.addEventListener("load", updatePageStatus);

load();

async function load() {
    try {
        const [source, styles, template] = await Promise.all([
            fetchText(new URL("../content/resume.yml", import.meta.url)),
            fetchText(new URL("../styles/resume.css", import.meta.url)),
            fetchText(new URL("../templates/resume.html", import.meta.url)),
        ]);
        state.resume = parseYaml(source);
        state.assets = { styles, template };
        renderEditor();
        await renderPreview();
        setStatus("Loaded. Edits stay in this browser tab; use Print / PDF when ready.");
    } catch (error) {
        setStatus(error.message);
    }
}

async function fetchText(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Could not load ${url.pathname}`);
    }

    return response.text();
}

function renderEditor() {
    elements.form.replaceChildren(
        section("Contact", renderContact()),
        section("Work Experience", renderExperience()),
        section("Projects", renderProjects()),
        section("Education", renderEducation()),
        section("Skills", renderSkills()),
    );
}

function renderContact() {
    const contact = state.resume.contact;
    contact.links ??= [];
    ensureContactOrder(contact);
    const body = div("section-body");

    body.append(
        row([
            field("Name", contact.name, (value) => {
                contact.name = value;
            }),
            field("Location", contact.location ?? "", (value) => {
                contact.location = value;
            }),
        ]),
        row([
            field("Phone", contact.phone, (value) => {
                contact.phone = value;
            }),
            field("Email", contact.email, (value) => {
                contact.email = value;
            }),
        ]),
    );

    for (const [index, link] of contact.links.entries()) {
        const entry = div("entry");
        entry.append(
            entryHeader(`Link ${index + 1}`, () => {
                removeContactLink(contact, index);
                changed(true);
            }),
            row([
                field("Link label", link.label, (value) => {
                    link.label = value;
                }),
                field("Link URL", link.url, (value) => {
                    link.url = value;
                }),
            ]),
        );
        body.append(entry);
    }

    body.append(actionRow("Add link", () => {
        addContactLink(contact);
        changed(true);
    }, "Add GitHub, portfolio, publications, or any other contact link."));
    body.append(renderContactOrder(contact));

    return body;
}

function renderContactOrder(contact) {
    ensureContactOrder(contact);

    const entry = div("entry");
    const title = div("entry-title");
    title.textContent = "Top Ribbon Order";

    const list = div("order-list");
    contact.order.forEach((key, index) => {
        const orderRow = div("order-row");
        const label = document.createElement("span");
        label.textContent = contactOrderLabel(contact, key);

        const controls = div("order-controls");
        const up = document.createElement("button");
        up.type = "button";
        up.textContent = "Up";
        up.disabled = index === 0;
        up.addEventListener("click", () => {
            moveContactOrderItem(contact, index, -1);
            changed(true);
        });

        const down = document.createElement("button");
        down.type = "button";
        down.textContent = "Down";
        down.disabled = index === contact.order.length - 1;
        down.addEventListener("click", () => {
            moveContactOrderItem(contact, index, 1);
            changed(true);
        });

        controls.append(up, down);
        orderRow.append(label, controls);
        list.append(orderRow);
    });

    entry.append(title, list);
    return entry;
}

function ensureContactOrder(contact) {
    const keys = contactOrderKeys(contact);
    const allowed = new Set(keys);
    const seen = new Set();
    const normalized = [];

    for (const key of contact.order ?? keys) {
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

    contact.order = normalized;
}

function contactOrderKeys(contact) {
    return [
        "phone",
        "email",
        "location",
        ...contact.links.map((_link, index) => `link:${index}`),
    ];
}

function contactOrderLabel(contact, key) {
    if (key === "phone") {
        return "Phone";
    }
    if (key === "email") {
        return "Email";
    }
    if (key === "location") {
        return "Location";
    }

    const linkIndex = Number(key.slice("link:".length));
    const link = contact.links[linkIndex];
    return `Link: ${link?.label || link?.url || linkIndex + 1}`;
}

function moveContactOrderItem(contact, index, direction) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= contact.order.length) {
        return;
    }

    const [item] = contact.order.splice(index, 1);
    contact.order.splice(nextIndex, 0, item);
}

function addContactLink(contact) {
    contact.links.push({ label: "", url: "" });
    ensureContactOrder(contact);
    const key = `link:${contact.links.length - 1}`;
    if (!contact.order.includes(key)) {
        contact.order.push(key);
    }
}

function removeContactLink(contact, index) {
    contact.links.splice(index, 1);
    contact.order = (contact.order ?? [])
        .filter((key) => key !== `link:${index}`)
        .map((key) => {
            if (!key.startsWith("link:")) {
                return key;
            }

            const linkIndex = Number(key.slice("link:".length));
            return linkIndex > index ? `link:${linkIndex - 1}` : key;
        });
    ensureContactOrder(contact);
}

function renderExperience() {
    const body = div("section-body");
    state.resume.experience ??= [];

    state.resume.experience.forEach((job, index) => {
        job.bullets ??= [""];

        const entry = div("entry");
        entry.append(
            entryHeader(`Role ${index + 1}`, () => {
                state.resume.experience.splice(index, 1);
                changed(true);
            }),
            row([
                field("Title", job.title, (value) => {
                    job.title = value;
                }),
                field("Dates", job.dates, (value) => {
                    job.dates = value;
                }),
            ]),
            bulletList(job.bullets),
            actionRow("Add bullet", () => {
                job.bullets.push("");
                changed(true);
            }),
        );
        body.append(entry);
    });

    body.append(actionRow("Add role", () => {
        state.resume.experience.push({ title: "", dates: "", bullets: [""] });
        changed(true);
    }));

    return body;
}

function renderProjects() {
    const body = div("section-body");
    state.resume.projects ??= [];

    state.resume.projects.forEach((project, index) => {
        project.bullets ??= project.description ? [project.description] : [""];

        const entry = div("entry");
        entry.append(
            entryHeader(`Project ${index + 1}`, () => {
                state.resume.projects.splice(index, 1);
                changed(true);
            }),
            field("Name", project.name, (value) => {
                project.name = value;
            }),
            bulletList(project.bullets),
            actionRow("Add bullet", () => {
                project.bullets.push("");
                changed(true);
            }),
        );
        body.append(entry);
    });

    body.append(actionRow("Add project", () => {
        state.resume.projects.push({ name: "", bullets: [""] });
        changed(true);
    }));

    return body;
}

function renderEducation() {
    const body = div("section-body");
    state.resume.education ??= [];

    state.resume.education.forEach((education, index) => {
        const entry = div("entry");
        entry.append(
            entryHeader(`School ${index + 1}`, () => {
                state.resume.education.splice(index, 1);
                changed(true);
            }),
            row([
                field("School", education.school, (value) => {
                    education.school = value;
                }),
                field("Dates", education.dates, (value) => {
                    education.dates = value;
                }),
            ]),
            field("Degree", education.degree, (value) => {
                education.degree = value;
            }),
            field(
                "Details",
                (education.details ?? []).join("\n"),
                (value) => {
                    education.details = splitLines(value);
                },
                { multiline: true },
            ),
        );
        body.append(entry);
    });

    body.append(actionRow("Add school", () => {
        state.resume.education.push({ school: "", dates: "", degree: "", details: [""] });
        changed(true);
    }));

    return body;
}

function renderSkills() {
    const body = div("section-body");
    state.resume.skills ??= [];

    state.resume.skills.forEach((skill, index) => {
        const entry = div("entry");
        entry.append(
            entryHeader(`Skill group ${index + 1}`, () => {
                state.resume.skills.splice(index, 1);
                changed(true);
            }),
            field("Label", skill.label, (value) => {
                skill.label = value;
            }),
            field(
                "Items, one per line",
                (skill.items ?? []).join("\n"),
                (value) => {
                    skill.items = splitLines(value);
                },
                { multiline: true },
            ),
        );
        body.append(entry);
    });

    body.append(actionRow("Add skill group", () => {
        state.resume.skills.push({ label: "", items: [""] });
        changed(true);
    }));

    return body;
}

function bulletList(bullets) {
    const container = div("bullet-list");

    bullets.forEach((bullet, index) => {
        const wrapper = div("bullet-row");
        const input = document.createElement("textarea");
        input.value = bullet;
        input.addEventListener("input", () => {
            bullets[index] = input.value;
            changed();
        });

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "danger";
        remove.textContent = "Remove";
        remove.addEventListener("click", () => {
            bullets.splice(index, 1);
            changed(true);
        });

        wrapper.append(input, remove);
        container.append(wrapper);
    });

    return container;
}

function section(title, body) {
    const details = document.createElement("details");
    details.className = "form-section";
    details.open = true;

    const summary = document.createElement("summary");
    summary.textContent = title;
    details.append(summary, body);
    return details;
}

function field(label, value, onInput, options = {}) {
    const wrapper = document.createElement("label");
    wrapper.className = "field";
    if (options.full) {
        wrapper.classList.add("full");
    }

    const text = document.createElement("span");
    text.textContent = label;

    const input = options.multiline ? document.createElement("textarea") : document.createElement("input");
    input.value = value ?? "";
    input.addEventListener("input", () => {
        onInput(input.value);
        changed();
    });

    wrapper.append(text, input);
    return wrapper;
}

function row(children) {
    const wrapper = div("grid-two");
    wrapper.append(...children);
    return wrapper;
}

function entryHeader(title, onRemove) {
    const header = div("entry-header");
    const label = div("entry-title");
    label.textContent = title;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "danger";
    remove.textContent = "Remove";
    remove.addEventListener("click", onRemove);

    header.append(label, remove);
    return header;
}

function actionRow(label, onClick, hintText = "Changes update the preview automatically.") {
    const wrapper = div("row-actions");
    const hint = document.createElement("p");
    hint.className = "hint";
    hint.textContent = hintText;

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", onClick);

    wrapper.append(hint, button);
    return wrapper;
}

function div(className) {
    const element = document.createElement("div");
    element.className = className;
    return element;
}

function splitLines(value) {
    return value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
}

function changed(rerender = false) {
    setStatus("Editing locally. Use Print / PDF when ready.");

    if (rerender) {
        renderEditor();
    }

    clearTimeout(state.previewTimer);
    state.previewTimer = setTimeout(renderPreview, 250);
}

async function renderPreview() {
    elements.preview.srcdoc = renderResumeHtml(state.resume, state.assets);
}

function updatePageStatus() {
    const documentElement = elements.preview.contentDocument?.documentElement;
    const body = elements.preview.contentDocument?.body;
    if (!documentElement || !body) {
        return;
    }

    const height = Math.max(documentElement.scrollHeight, body.scrollHeight);
    const pages = Math.max(1, Math.ceil((height - 2) / letterPageHeight));

    elements.pageStatus.classList.toggle("ok", pages <= 1);
    elements.pageStatus.classList.toggle("warn", pages > 1);
    elements.pageStatus.textContent =
        pages <= 1 ? "Fits on 1 page" : `Warning: ${pages} pages in Letter preview`;
}

function printResume() {
    const previewWindow = elements.preview.contentWindow;
    if (!previewWindow) {
        setStatus("Preview is not ready yet.");
        return;
    }

    previewWindow.focus();
    previewWindow.print();
    setStatus("Opened print dialog.");
}

function setStatus(message) {
    elements.status.textContent = message;
}
