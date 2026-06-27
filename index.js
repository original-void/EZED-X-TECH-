const express = require('express');
const { 
    default: makeWASocket, 
    DisconnectReason, 
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    jidNormalizedUser,
    downloadMediaMessage,
    getContentType
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;

const BOT_NAME = 'EZED X TECH';
const OWNER_NUMBER = '254769532338@s.whatsapp.net';
const RENDER_URL = 'https://ezed-x-tech-2.onrender.com';

let antiDelete = true;
const MAX_CACHE = 200; // Reduced to prevent RAM crash
const msgStore = new Map(); 
let currentQR = null;
let sock;

// Auto cleanup cache every 5 mins to prevent memory leak
setInterval(() => {
    if (msgStore.size > MAX_CACHE) {
        const keysToDelete = Array.from(msgStore.keys()).slice(0, msgStore.size - MAX_CACHE);
        keysToDelete.forEach(k => msgStore.delete(k));
        console.log('[CACHE CLEANED] Removed', keysToDelete.length);
    }
}, 5 * 60 * 1000);

app.get('/', async (req, res) => {
    if (!currentQR) return res.send(`<h1>🤖 ${BOT_NAME} V6.1</h1><h2>Waiting for QR... Refresh</h2>`);
    const qrImage = await QRCode.toDataURL(currentQR);
    res.send(`<h1>🤖 Scan ${BOT_NAME} QR</h1><img src="${qrImage}" style="width:320px;" />`);
});
app.listen(PORT, () => console.log('Server:', RENDER_URL));

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        version,
        browser: [BOT_NAME, 'Chrome', '1.0.0'],
        markOnlineOnConnect: true,
        syncFullHistory: true
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, qr } = update;
        if (qr) {
            currentQR = qr;
            try {
                const qrBuffer = await QRCode.toBuffer(qr);
                await sock.sendMessage(OWNER_NUMBER, { image: qrBuffer, caption: `*${BOT_NAME} V6.1*\nScan at: ${RENDER_URL}` });
            } catch(e){}
        }
        if (connection === 'open') {
            currentQR = null;
            await sock.sendMessage(OWNER_NUMBER, { text: `✅ ${BOT_NAME} V6.1 Stable\n🛡️ AntiDelete: ON\nCache: ${MAX_CACHE} msgs` });
        } else if (connection === 'close' && update.lastDisconnect.error?.output?.statusCode!== DisconnectReason.loggedOut) {
            startBot();
        }
    });

    // 1. CACHE DMS SAFELY ✅
    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            for (const msg of messages) {
                if (!msg.message || msg.key.remoteJid === 'status@broadcast') continue;
                const from = msg.key.remoteJid;
                if (from.endsWith('@g.us')) continue;

                msgStore.set(msg.key.id, { 
                    msg, 
                    from, 
                    sender: jidNormalizedUser(msg.key.participant || from),
                    timestamp: msg.messageTimestamp
                });
                if (msgStore.size % 50 === 0) console.log('[CACHE]', msgStore.size);
            }
        } catch(e) { console.log('Cache error:', e.message); }
    });

    // 2. ANTI-DELETE EXPOSER V6.1 STABLE ✅
    sock.ev.on('messages.update', async (updates) => {
        try {
            for (const { key, update } of updates) {
                if (antiDelete && update.message === null &&!key.remoteJid?.endsWith('@g.us')) {
                    const stored = msgStore.get(key.id);
                    if (stored) {
                        const name = await sock.getName(stored.sender) || stored.sender.split('@')[0];
                        const time = new Date(stored.timestamp * 1000).toLocaleTimeString('en-KE');
                        const type = getContentType(stored.msg.message);

                        await sock.sendMessage(OWNER_NUMBER, { 
                            text: `🗑️ *DELETED MESSAGE EXPOSED*\n\n*From:* ${name}\n*Type:* ${type}\n*Time:* ${time}\n*Status:* ${stored.msg.key.fromMe? 'You deleted' : 'They deleted'}` 
                        }).catch(()=>{});
                        
                        // Re-download media before resend to avoid expired URL crash
                        if (type === 'imageMessage' || type === 'videoMessage' || type === 'audioMessage' || type === 'documentMessage' || type === 'stickerMessage') {
                            const buffer = await downloadMediaMessage(stored.msg, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
                            const sendObj = {};
                            sendObj[type.replace('Message','')] = buffer;
                            sendObj.mimetype = stored.msg.message[type].mimetype;
                            if(type === 'imageMessage') sendObj.caption = stored.msg.message[type].caption || '';
                            await sock.sendMessage(OWNER_NUMBER, sendObj).catch(()=>{});
                        } else {
                            await sock.sendMessage(OWNER_NUMBER, stored.msg.message).catch(()=>{});
                        }
                        
                        console.log('[EXPOSED]', name, key.id);
                        msgStore.delete(key.id); // Free RAM after exposing
                    }
                }
            }
        } catch(e) { console.log('AntiDelete error:', e.message); } // Prevent crash
    });

    // COMMANDS
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.remoteJid!== OWNER_NUMBER) return;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const cmd = text.toLowerCase().trim();

        if (cmd === '.antidelete on') { antiDelete = true; await sock.sendMessage(OWNER_NUMBER, { text: '🛡️ AntiDelete: ON' }); }
        if (cmd === '.antidelete off') { antiDelete = false; await sock.sendMessage(OWNER_NUMBER, { text: '🛡️ AntiDelete: OFF' }); }
        if (cmd === '.cache') await sock.sendMessage(OWNER_NUMBER, { text: `🗂️ Cache size: ${msgStore.size}/${MAX_CACHE}` });
    });
}

startBot();
