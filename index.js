global.WebSocket = require('ws'); // Railway & Node WebSocket fix

const express = require('express');
const { MessengerClient, Platform, CookieManager } = require('messagix-js');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Anti-Crash System
process.on('uncaughtException', (err) => console.error('[ANTI-CRASH] Uncaught Exception:', err.message));
process.on('unhandledRejection', (reason) => console.error('[ANTI-CRASH] Unhandled Rejection:', reason));

app.head('/', (req, res) => res.status(200).end());
app.get('/', (req, res) => res.send('raj mishra dc server running ✅️'));
app.get('/ping', (req, res) => res.status(200).send('Pong - Server is Active!'));
app.get('/health', (req, res) => res.status(200).json({ status: 'ONLINE', uptime: process.uptime() }));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SYSTEM LIVE] Headless server listening on port ${PORT}`);
    startSmartBot();
});

function readTextFile(filename, defaultValue = '') {
    try {
        if (fs.existsSync(filename)) {
            return fs.readFileSync(filename, 'utf8').trim();
        }
    } catch (e) {
        console.error(`Error reading ${filename}:`, e.message);
    }
    return defaultValue;
}

// State variables aur memory management ke liye
let msgIndex = 0;
let loopCount = 1;
let clientInstance = null;

async function initializeClient() {
    const cookies = readTextFile('cookies.txt');
    if (!cookies) return null;

    // Agar pehle se koi purana client instance zinda hai, toh usko pehle delete/free karein
    if (clientInstance) {
        console.log('[MEMORY] Cleaning up old client instance to free RAM & CPU...');
        try {
            if (typeof clientInstance.logout === 'function') {
                await clientInstance.logout();
            }
        } catch (e) {
            console.error('[CLEANUP WARNING] Error clearing old client:', e.message);
        }
        clientInstance = null; // Garbage collection ke liye reference hata diya
    }

    const cookieManager = CookieManager.fromString(Platform.Messenger, cookies);
    const client = new MessengerClient({ 
        platform: Platform.Messenger, 
        cookies: cookieManager.getAll(), 
        enableE2EE: false 
    });

    await client.loadMessagesPage();
    await client.connect();
    return client;
}

async function startSmartBot() {
    console.log('[BOT] Starting Smart State-Preserving Messenger Bot...');

    try {
        const threadId = readTextFile('convo.txt');
        const cookies = readTextFile('cookies.txt');

        if (!cookies || !threadId) {
            console.log('[CONFIG ERROR] Missing cookies.txt or convo.txt! Retrying in 10 seconds...');
            setTimeout(startSmartBot, 10000);
            return;
        }

        // Agar client instance nahi hai, toh naya banayenge (purana automatically clear ho jayega)
        if (!clientInstance) {
            console.log(`[AUTH] Authenticating via messagix-js for Thread ID: ${threadId}...`);
            clientInstance = await initializeClient();
            console.log('[AUTH] ✅ New Client Login Successful & RAM Optimized!');
        }

        const timeStr = readTextFile('time.txt', '600');
        const delaySec = parseInt(timeStr, 10) || 600;
        const hatersName = readTextFile('hatersname.txt');
        
        const messagesRaw = readTextFile('messages.txt', 'Hello');
        const messages = messagesRaw.split('\n').map(m => m.trim()).filter(Boolean);

        if (messages.length === 0) {
            console.log('[CONFIG ERROR] messages.txt is empty! Retrying in 10 seconds...');
            setTimeout(startSmartBot, 10000);
            return;
        }

        if (msgIndex >= messages.length) {
            msgIndex = 0;
            loopCount++;
            console.log(`[LOOP] 🔄 Completed full list. Restarting loop (Round ${loopCount})...`);
        }

        const rawMsg = messages[msgIndex] || "Hello";
        const finalMessage = hatersName ? `${hatersName} ${rawMsg}` : rawMsg;

        try {
            await clientInstance.sendMessage(threadId, finalMessage);
            console.log(`[${new Date().toLocaleTimeString()}] 🚀 Sent [Index ${msgIndex}]: ${finalMessage}`);
            msgIndex++; 
        } catch (err) {
            console.error(`[${new Date().toLocaleTimeString()}] ⚠️ Send Error: ${err.message}`);
            if (err.message.includes('login') || err.message.includes('auth') || err.message.includes('connect')) {
                console.log('[REAUTH] Connection dropped. Forcing client recreation to clear memory...');
                clientInstance = null; // Instance null karne se purana data RAM se hat jayega
            }
        }

        console.log(`[WAIT] Next run in ${delaySec} seconds (Index preserved, RAM clean)...`);
        setTimeout(startSmartBot, delaySec * 1000);

    } catch (err) {
        console.error(`[FATAL ERROR] ${err.message}. Reconnecting in 30 seconds...`);
        clientInstance = null; // Fatal error par bhi instance clear rakhenge
        setTimeout(startSmartBot, 30000);
    }
}
