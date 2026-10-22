global.WebSocket = require('ws');

const express = require('express');
const fs = require('fs');
const { Client } = require('meta-messenger.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Keep-Alive Routes
app.head('/', (req, res) => res.status(200).end());
app.get('/', (req, res) => res.status(200).send('Server running ✅️'));
app.get('/ping', (req, res) => res.status(200).send('Pong'));
app.get('/health', (req, res) => res.status(200).json({ status: 'ONLINE', uptime: process.uptime() }));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server started on port ${PORT}`);
    startInfiniteBot();
});

function readTextFile(filename, defaultValue = '') {
    try {
        if (fs.existsSync(filename)) {
            return fs.readFileSync(filename, 'utf8').trim();
        }
    } catch (e) {
        console.error(`❌ Error reading ${filename}:`, e.message);
    }
    return defaultValue;
}

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

async function startInfiniteBot() {
    while (true) {
        let client = null;
        try {
            console.log("🔄 Checking config files...");
            const cookieRaw = readTextFile('cookies.txt');
            const threadId = readTextFile('convo.txt');
            const delaySec = parseFloat(readTextFile('time.txt', '60')) || 60; // डिफ़ॉल्ट 60s
            const hatersName = readTextFile('hatersname.txt');
            const messagesRaw = readTextFile('messages.txt', 'Hello');
            const messages = messagesRaw.split('\n').map(m => m.trim()).filter(Boolean);

            if (!cookieRaw || !threadId || messages.length === 0) {
                console.log("⚠️ Missing cookies, threadId, or messages. Retrying in 10s...");
                await new Promise(r => setTimeout(r, 10000));
                continue;
            }

            const cookies = parseCookies(cookieRaw);
            if (!cookies.c_user || !cookies.xs) {
                console.log("⚠️ Invalid cookies (c_user or xs missing). Retrying in 10s...");
                await new Promise(r => setTimeout(r, 10000));
                continue;
            }

            console.log("🔐 Attempting to login...");
            client = new Client(cookies, { platform: 'facebook' });
            const { user } = await client.connect();
            console.log(`✅ Login Successful! Logged in as: ${user.name}`);

            let msgIndex = 0;

            while (true) {
                const currentDelaySec = parseFloat(readTextFile('time.txt', delaySec.toString())) || delaySec;
                const currentHaters = readTextFile('hatersname.txt');
                const currentMsgsRaw = readTextFile('messages.txt');
                const currentMsgs = currentMsgsRaw ? currentMsgsRaw.split('\n').map(m => m.trim()).filter(Boolean) : messages;

                if (msgIndex >= currentMsgs.length) msgIndex = 0;

                const rawMsg = currentMsgs[msgIndex] || "Hello";
                const finalMessage = currentHaters ? `${currentHaters} ${rawMsg}` : rawMsg;

                try {
                    console.log(`📤 Sending message to ${threadId}: ${finalMessage}`);
                    await client.sendMessage(BigInt(threadId), finalMessage);
                    console.log(`✅ Message sent successfully!`);
                } catch (err) {
                    console.error(`❌ Send Error: ${err.message}`);
                    break; // ब्रेक करके रीकनेक्ट होगा
                }

                msgIndex++;
                console.log(`⏳ Waiting ${currentDelaySec} seconds before next message...`);
                await new Promise(resolve => setTimeout(resolve, currentDelaySec * 1000));
            }

        } catch (err) {
            console.error(`❌ Login Error: ${err.message}`);
            console.log("⏳ Waiting 30 seconds before reconnecting...");
            await new Promise(r => setTimeout(r, 30000));
        } finally {
            if (client) {
                try { 
                    await client.disconnect(); 
                    console.log("🔌 Disconnected client.");
                } catch (_) {}
            }
            client = null;
        }
    }
}
