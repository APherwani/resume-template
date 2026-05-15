#!/usr/bin/env node

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, relative } from "node:path";
import { root } from "./build.mjs";

const port = Number(process.env.PORT ?? 4173);
const host = process.env.HOST ?? "127.0.0.1";

const mimeTypes = new Map([
    [".html", "text/html; charset=utf-8"],
    [".css", "text/css; charset=utf-8"],
    [".js", "text/javascript; charset=utf-8"],
    [".mjs", "text/javascript; charset=utf-8"],
    [".json", "application/json; charset=utf-8"],
    [".yml", "text/yaml; charset=utf-8"],
]);

const server = createServer(async (request, response) => {
    if (request.method !== "GET") {
        sendText(response, 405, "Method not allowed");
        return;
    }

    try {
        await serveStatic(new URL(request.url, `http://${request.headers.host}`).pathname, response);
    } catch (error) {
        console.error(error);
        sendText(response, 500, "Unexpected server error");
    }
});

server.listen(port, host, () => {
    console.log(`Resume builder running at http://${host}:${port}`);
});

async function serveStatic(pathname, response) {
    const cleanPath = pathname === "/" ? "/index.html" : pathname;
    let filePath = normalize(join(root, cleanPath));
    const relativePath = relative(root, filePath);

    if (relativePath.startsWith("..")) {
        sendText(response, 403, "Forbidden");
        return;
    }

    try {
        let metadata = await stat(filePath);
        if (metadata.isDirectory()) {
            filePath = join(filePath, "index.html");
            metadata = await stat(filePath);
        }
        if (!metadata.isFile()) {
            sendText(response, 404, "Not found");
            return;
        }

        response.writeHead(200, {
            "Content-Type": mimeTypes.get(extname(filePath)) ?? "application/octet-stream",
        });
        response.end(await readFile(filePath));
    } catch {
        sendText(response, 404, "Not found");
    }
}

function sendText(response, statusCode, body) {
    response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(body);
}
