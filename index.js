const express = require('express');
const { 
    default: makeWASocket, 
    DisconnectReason, 
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    jidNormalizedUser,
    downloadMediaMessage
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;

const BOT_NAME = 'EZED X TECH';
const OWNER_NUMBER = '254769532338@s.whatsapp.net'; // Your DM
const RENDER_URL = 'https://ezed-x-tech-2.onrender.com';

let antiDelete = true; // ON by default
const msgStore = new Map(); // Cache everything
let currentQR = null;
let sock;

app.get('/', async (req, res) => {
    if (!currentQR) return res.send(`<h1>🤖 ${BOT_NAME} V6.0</h1><h2>Waiting for QR... Refresh</h2>`);
    const qrImage = await QRCode.toDataURL(currentQR);
    res.send(`<h1>🤖 Scan ${BOT_NAME} QR</h1><img src="${qrImage}" style="width:320px;" /><p>https://ezed-x-tech-2.onrender.com</p>`);
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
        syncFullHistory: true // CRITICAL FOR DELETE
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, qr } = update;
        if (qr) {
            currentQR = qr;
            const qrBuffer = await QRCode.toBuffer(qr);
            await sock.sendMessage(OWNER_NUMBER, { image: qrBuffer, caption: `*${BOT_NAME} V6.0*\nScan at: ${RENDER_URL}` }).catch(()=>{});
        }
        if (connection === 'open') {
            currentQR = null;
            await sock.sendMessage(OWNER_NUMBER, { text: `✅ ${BOT_NAME} V6.0 Online\n🛡️ AntiDelete: ON\nDMs deleted messages will be exposed here.` });
        } else if (connection === 'close' && update.lastDisconnect.error?.output?.statusCode!== DisconnectReason.loggedOut) {
            startBot();
        }
    });

    // 1. CACHE ALL INCOMING DMS BOTH SIDES ✅
    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
            if (!msg.message || msg.key.remoteJid === 'status@broadcast') continue;
            const from = msg.key.remoteJid;
            if (from.endsWith('@g.us')) continue; // Only DMs

            // Save message + sender + time
            msgStore.set(msg.key.id, { 
                msg, 
                from, 
                sender: jidNormalizedUser(msg.key.participant || from),
                timestamp: msg.messageTimestamp
            });
            if (msgStore.size > 1000) msgStore.delete(msgStore.keys().next().value); // Keep 1000 msgs
            console.log('[CACHED]', msg.key.id, msg.key.fromMe? '[You]' : '[Them]');
        }
    });

    // 2. ANTI-DELETE EXPOSER ✅ THIS IS THE MAIN ONE
    sock.ev.on('messages.update', async (updates) => {
        for (const { key, update } of updates) {
            // update.message === null = WhatsApp delete signal
            if (antiDelete && update.message === null &&!key.remoteJid?.endsWith('@g.us')) {
                const stored = msgStore.get(key.id);
                if (stored) {
                    const name = await sock.getName(stored.sender) || stored.sender.split('@')[0];
                    const time = new Date(stored.timestamp * 1000).toLocaleTimeString('en-KE');
                    const type = Object.keys(stored.msg.message)[0];

                    // EXPOSE IN YOUR DM
                    await sock.sendMessage(OWNER_NUMBER, { 
                        text: `🗑️ *DELETED MESSAGE EXPOSED*\n\n*From:* ${name} \`${stored.sender}\`\n*Type:* ${type}\n*Time:* ${time}\n*Status:* ${stored.msg.key.fromMe? 'You deleted' : 'They deleted'}\n\n*Content below:*` 
                    });
                    
                    // Resend the actual deleted message
                    await sock.sendMessage(OWNER_NUMBER, stored.msg.message);
                    console.log('[EXPOSED]', name, key.id, type);
                } else {
                    console.log('[MISS] Deleted but not cached:', key.id);
                }
            }
        }
    });

    // 3. BACKUP LISTENER FOR NEW WHATSAPP ✅
    sock.ev.on('messages.delete', async ({ keys }) => {
        if (!antiDelete) return;
        for (const key of keys) {
            if (key.remoteJid?.endsWith('@g.us')) continue;
            const stored = msgStore.get(key.id);
            if (stored) {
                const name = await sock.getName(stored.sender) || stored.sender.split('@')[0];
                await sock.sendMessage(OWNER_NUMBER, { text: `🗑️ *DELETED MESSAGE EXPOSED [BACKUP]*\n*From:* ${name}` });
                await sock.sendMessage(OWNER_NUMBER, stored.msg.message);
                console.log('[EXPOSED BACKUP]', name, key.id);
            }
        }
    });

    // COMMANDS
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.remoteJid!== OWNER_NUMBER) return;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const cmd = text.toLowerCase().trim();

        if (cmd === '.antidelete on') { antiDelete = true; await sock.sendMessage(OWNER_NUMBER, { text: '🛡️ AntiDelete: ON' }); }
        if (cmd === '.antidelete off') { antiDelete = false; await sock.sendMessage(OWNER_NUMBER, { text: '🛡️ AntiDelete: OFF' }); }
        if (cmd === '.menu') await sock.sendMessage(OWNER_NUMBER, { text: '*V6.0*\n.antidelete on/off\nBot exposes ALL deleted DMs here.' });
    });
}

startBot();
