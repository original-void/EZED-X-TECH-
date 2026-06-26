const express = require('express');
const { 
    default: makeWASocket, 
    DisconnectReason, 
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    jidNormalizedUser
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;

const BOT_NAME = 'EZED X TECH';
const OWNER_NUMBER = '254769532338@s.whatsapp.net'; // <-- MUST match the number you scanned with

let currentQR = null;
let sock;

const MENU = {
    text: `*🤖 ${BOT_NAME} - OWNER ONLY*\n\nWelcome Boss! Tap a button below 👇`,
    footer: 'Powered by EZED X TECH',
    templateButtons: [
        { index: 1, quickReplyButton: { displayText: '1. Ping 🏓', id: '.ping' } },
        { index: 2, quickReplyButton: { displayText: '2. Time 🕒', id: '.time' } },
        { index: 3, quickReplyButton: { displayText: '3. Help ❓', id: '.help' } },
    ]
};

app.get('/', (req, res) => res.send(`<h1>${BOT_NAME} is running</h1>`));
app.get('/qr', async (req, res) => {
    if (!currentQR) return res.send('<h2>No QR yet. Wait 10s and refresh.</h2>');
    const qrImage = await QRCode.toDataURL(currentQR);
    res.send(`<h1>Scan ${BOT_NAME} QR</h1><img src="${qrImage}" style="width:300px;" />`);
});
app.listen(PORT, () => console.log(`Web server on port ${PORT}`));

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        version,
        browser: [BOT_NAME, 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            currentQR = qr;
            try {
                const qrBuffer = await QRCode.toBuffer(qr);
                await sock.sendMessage(OWNER_NUMBER, { 
                    image: qrBuffer, 
                    caption: `*${BOT_NAME} QR Code*\nScan this. Only this number will have access.`
                });
            } catch (e) {}
        }
        if (connection === 'open') {
            currentQR = null;
            console.log(`${BOT_NAME} Connected`);
            await sock.sendMessage(OWNER_NUMBER, { text: `✅ ${BOT_NAME} is now online. Owner only mode: ON` });
        } else if (connection === 'close') {
            if (lastDisconnect.error?.output?.statusCode!== DisconnectReason.loggedOut) startBot();
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const sender = jidNormalizedUser(msg.key.participant || from); // normalize 254...@s.whatsapp.net

        // OWNER CHECK
        if (sender!== OWNER_NUMBER) {
            await sock.sendMessage(from, { text: `❌ Access Denied. This is ${BOT_NAME} Owner Only Bot.` });
            return;
        }

        const text = msg.message.conversation 
                  || msg.message.extendedTextMessage?.text 
                  || msg.message.buttonsResponseMessage?.selectedButtonId 
                  || '';
        const command = text.toLowerCase().trim();

        switch (command) {
            case '.menu':
            case 'menu':
                await sock.sendMessage(from, MENU);
                break;
            case '.ping':
                await sock.sendMessage(from, { text: '🏓 Pong! EZED X TECH is online - Owner Access' });
                break;
            case '.time':
                const now = new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });
                await sock.sendMessage(from, { text: `🕒 Kenya Time: ${now}` });
                break;
            case '.help':
                await sock.sendMessage(from, { text: `Owner Commands:\n.menu.ping.time.help\n${BOT_NAME}` });
                break;
        }
    });
}

startBot();
