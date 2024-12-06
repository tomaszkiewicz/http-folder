#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = process.argv[2] || process.env.HTTP_FOLDER_ROOT_DIR || __dirname
const PORT = process.argv[3] || process.env.HTTP_FOLDER_PORT || 8080;

const httpServer = http.createServer(requestHandler);
httpServer.listen(PORT, () => { console.log(`Serving ${ROOT_DIR} on port ${PORT}`) });

async function requestHandler(req, res) {
    const { method, url } = req;
    console.log(method, url)

    try {
        if (url.endsWith('/')) {
            return dir(req, res);
        }
        if (method == "GET") {
            return downloadFile(req, res);
        }
        if (method == "POST") {
            return uploadFile(req, res);
        }
        if (method == "DELETE") {
            return deleteFile(req, res);
        }

        return error(req, res, "Bad Request");
    } catch (err) {
        return error(req, res, err.message);
    }
}

function error(req, res, message) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.write(message);
    res.end();
}

function isPathSafe(filePath) {
    const normalizedPath = path.normalize(filePath);
    return normalizedPath.startsWith(ROOT_DIR);
}

async function dir(req, res) {
    const dirPath = req.url === '/' ? ROOT_DIR : path.join(ROOT_DIR, req.url);

    if (!isPathSafe(dirPath)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.write('Access Denied');
        res.end();
        return;
    }

    try {
        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

        const files = entries
            .filter(entry => !entry.name.startsWith('.'))
            .map(entry => entry.isDirectory() ? entry.name + '/' : entry.name);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.write(JSON.stringify(files));
        res.end();
    } catch (err) {
        console.log(err);
        return error(req, res, err.message);
    }
}

async function downloadFile(req, res) {
    let file = path.join(ROOT_DIR, req.url);

    // Check if path attempts to traverse above ROOT_DIR
    const normalizedPath = path.normalize(file);
    if (!normalizedPath.startsWith(ROOT_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.write('Access Denied');
        res.end();
        return;
    }

    try {
        const content = await fs.promises.readFile(file);
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
        res.write(content);
        res.end();
    } catch (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.write('File Not Found');
        res.end();
    }
}

async function uploadFile(req, res) {
    let file = path.join(ROOT_DIR, req.url);

    if (!isPathSafe(file)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.write('Access Denied');
        res.end();
        return;
    }

    let dir = path.dirname(file);

    try {
        await fs.promises.mkdir(dir, { recursive: true });

        const writeStream = fs.createWriteStream(file);
        req.pipe(writeStream);

        await new Promise((resolve, reject) => {
            req.on('end', resolve);
            req.on('error', reject);
        });

        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.write('Uploaded successfully');
        res.end();
    } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.write('Failed to create directory');
        res.end();
    }
}

async function deleteFile(req, res) {
    const file = path.join(ROOT_DIR, req.url);

    if (!isPathSafe(file)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.write('Access Denied');
        res.end();
        return;
    }

    try {
        await fs.promises.unlink(file);
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.write('Deleted succesfully');
        res.end();
    } catch (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.write('File Not Found');
        res.end();
    }
}
