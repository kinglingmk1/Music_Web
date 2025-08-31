const http = require('http');
// Log every HTTP request for debugging
function logRequest(req) {
    console.log(`[HTTP] ${req.method} ${req.url} from ${req.socket.remoteAddress}`);
}
const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif'
};
const ip = '127.0.0.1';

http.createServer((req, res) => {
    logRequest(req);
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(__dirname, filePath);

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, {
                'Content-Type': 'text/plain',
                'Access-Control-Allow-Origin': '*'
            });
            res.end('404 Not Found');
            return;
        }
        const ext = path.extname(filePath);
        res.writeHead(200, {
            'Content-Type': mimeTypes[ext] || 'application/octet-stream',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache'
        });
        res.end(data);
    });
}).listen(80, ip, () => {
    console.log(`HTTP server running at http://${ip}:80/`);
});

const app = express();
const lovedFilePath = path.join(__dirname, 'loved.json');

app.use(cors());
app.use(bodyParser.json());

let lovedSongs = [];
if (fs.existsSync(lovedFilePath)) {
    fs.readFile(lovedFilePath, 'utf8', (err, data) => {
        if (err) {
            lovedSongs = [];
        } else {
            try {
                const lovedRaw = JSON.parse(data);
                lovedSongs = lovedRaw.songs || [];
            } catch (e) {
                lovedSongs = [];
            }
        }
    });
}

// GET loved songs
app.get('/api/loved-songs', (req, res) => {
    console.log('[API] GET /api/loved-songs');
    res.json(lovedSongs);
});

// POST add loved song
app.post('/api/loved-songs', (req, res) => {
    console.log('[API] POST /api/loved-songs', req.body);
    const newSong = req.body;
    lovedSongs.push(newSong);
    fs.writeFile(lovedFilePath, JSON.stringify({ songs: lovedSongs }, null, 2), err => {
        if (err) {
            console.error('Error writing to loved.json:', err);
            return res.status(500).send('Internal Server Error: Could not update loved songs file.');
        }
        res.status(201).json(newSong);
    });
});

// DELETE loved song by fileNo
app.delete('/api/loved-songs', (req, res) => {
    console.log('[API] DELETE /api/loved-songs', req.body);
    console.log('DELETE request received for /api/loved-songs');
    console.log('Request body:', req.body);
    const { fileNo } = req.body;
    console.log('Extracted fileNo:', fileNo);

    if (fileNo === undefined) {
        return res.status(400).send('Bad Request: fileNo is missing.');
    }

    const initialCount = lovedSongs.length;
    lovedSongs = lovedSongs.filter(song => song.fileNo != fileNo);
    const finalCount = lovedSongs.length;

    console.log(`Songs before deletion: ${initialCount}, after: ${finalCount}`);

    fs.writeFile(lovedFilePath, JSON.stringify({ songs: lovedSongs }, null, 2), err => {
        if (err) {
            console.error('Error writing to loved.json:', err);
            return res.status(500).send('Internal Server Error: Could not update loved songs file.');
        }
        console.log('loved.json file updated successfully.');
        res.status(204).end();
    });
});

// Start Express server on a different port (e.g. 3000)
app.listen(3000, () => {
    console.log(`API server running at http://${ip}:3000/`);
});
