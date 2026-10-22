// ============================================================
// 🔇 TERMINAL SILENCE — Zero logs to save RAM & CPU
// ============================================================
if (process.env.DEBUG !== '1') {
    const noop = () => {};
    console.log = noop;
    console.info = noop;
    console.warn = noop;
    console.error = noop;
    console.debug = noop;
    process.stdout.write = noop;
    process.stderr.write = noop;
}

global.WebSocket = require('ws');

const express = require('express');
const fs = require('fs');
const { Client } = require('meta-messenger.js'); // ✅ Tumhari library

const app = express();
const PORT = process.env.PORT || 3000;

// Anti-Crash System
process.on('uncaughtException', () => {});
process.on('unhandledRejection', () => {});

// Keep-Alive Routes (Render Health Check)
app.head('/', (req, res) => res.status(200).end());
app.get('/', (req, res) => res.status(200).send('Server running ✅️'));
app.get('/ping', (req, res) => res.status(200).send('Pong'));
app.get('/health', (req, res) => res.status(200).json({ 
    status: 'ONLINE', 
    uptime: process.uptime(),
    memory_mb: Math.round(process.memoryUsage().rss / 1024 / 1024)
}));

app.listen(PORT, '0.0.0.0', () => {
    startInfiniteBot();
});

// Helper to read config files safely
function readTextFile(filename, defaultValue = '') {
    try {
        if (fs.existsSync(filename)) {
            return fs.readFileSync(filename, 'utf8').trim();
        }
    } catch (e) {}
    return defaultValue;
}

// Helper to parse raw cookies string into object
function parseCookies(cookieStr) {
    const cookies = {};
    cookieStr.split(';').forEach(pair => {
        const [key, ...valueParts] = pair.trim().split('=');
        if (key && valueParts.length > 0) {
            cookies[key.trim()] = valueParts.join('=').trim();
        }
    });
    return cookies;
}

// ==================== 24/7 Infinite Loop ====================
async function startInfiniteBot() {
    while (true) {
        let client = null; // ✅ Local variable for memory cleanup
        try {
            // 1. Read Config Files
            const cookieRaw = readTextFile('cookies.txt');
            const threadId = readTextFile('convo.txt');
            const delaySec = parseFloat(readTextFile('time.txt', '120')) || 120;
            const hatersName = readTextFile('hatersname.txt');
            const messagesRaw = readTextFile('messages.txt', 'Hello');
            const messages = messagesRaw.split('\n').map(m => m.trim()).filter(Boolean);

            // 2. Validation
            if (!cookieRaw || !threadId || messages.length === 0) {
                await new Promise(r => setTimeout(r, 10000));
                continue;
            }

            const cookies = parseCookies(cookieRaw);
            if (!cookies.c_user || !cookies.xs) {
                // Invalid cookies, wait and retry
                await new Promise(r => setTimeout(r, 10000));
                continue;
            }

            // 3. Login
            client = new Client(cookies, { platform: 'facebook' });
            const { user } = await client.connect();

            let msgIndex = 0;

            // 4. Inner Message Loop
            while (true) {
                // Dynamically re-read files so changes take effect instantly
                const currentDelaySec = parseFloat(readTextFile('time.txt', delaySec.toString())) || delaySec;
                const currentHaters = readTextFile('hatersname.txt');
                const currentMsgsRaw = readTextFile('messages.txt');
                const currentMsgs = currentMsgsRaw ? currentMsgsRaw.split('\n').map(m => m.trim()).filter(Boolean) : messages;

                if (msgIndex >= currentMsgs.length) {
                    msgIndex = 0;
                }

                const rawMsg = currentMsgs[msgIndex] || "Hello";
                const finalMessage = currentHaters ? `${currentHaters} ${rawMsg}` : rawMsg;

                try {
                    // Send Message using BigInt threadId
                    await client.sendMessage(BigInt(threadId), finalMessage);
                } catch (err) {
                    // If session drops or error occurs, break loop to trigger auto-reconnect
                    break;
                }

                msgIndex++;
                await new Promise(resolve => setTimeout(resolve, currentDelaySec * 1000));
            }

        } catch (err) {
            // Login Error / Network Error -> Wait 30s before retry (Prevents Spam Checkpoint)
            await new Promise(resolve => setTimeout(resolve, 30000));
        } finally {
            // ✅ CRITICAL: Cleanup to prevent memory leak
            if (client) {
                try { await client.disconnect(); } catch (_) {}
            }
            client = null;
            if (global.gc) { try { global.gc(); } catch (_) {} } 
        }
    }
                }
