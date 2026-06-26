const express = require('express');
const { 
    default: makeWASocket, 
    DisconnectReason, 
    useMultiFileAuthState,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;

const BOT_NAME = 'EZED X TECH';
const OWNER_NUMBER = '254112843071@s.whatsapp.net'; // <-- CHANGE THIS: Your number with 254, no +, + @s.whatsapp.net

let currentQR = null; // Store latest QR for /qr page
let sock;

const MENU = {
    text: `*🤖 ${BOT_NAME}*\n\nWelcome! Tap a button below 👇`,
    footer: 'Powered by EZED X TECH',
    templateButtons: [
        { index: 1, quickReplyButton: { displayText: '1. Ping 🏓', id: '.ping' } },
        { index: 2, quickReplyButton: { displayText: '2. Time 🕒', id: '.time' } },
        { index: 3, quickReplyButton: { displayText: '3. Help ❓', id: '.help' } },
    ]
};

// Keep Render awake + QR page
app.get('/', (req, res) => res.send(`<h1>${BOT_NAME} is running</h1><p>Visit /qr to scan</p>`));

app.get('/qr', async (req, res) => {
    if (!currentQR) return res.send('<h2>No QR yet. Wait 10s and refresh.</h2>');
    try {
        const qrImage = await QRCode.toDataURL(currentQR);
        res.send(`
            <h1>Scan ${BOT_NAME} QR</h1>
            <p>WhatsApp > Settings > Linked Devices > Link a Device</p>
            <img src="${qrImage}" style="width:300px;height:300px;" />
            <p>This QR expires in ~20s. Refresh if it fails.</p>
        `);
    } catch (e) {
        res.send('Error generating QR');
    }
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
            currentQR = qr; // Save for /qr page
            console.log('QR generated. Check /qr or WhatsApp DM');
            try {
                const qrBuffer = await QRCode.toBuffer(qr);
                await sock.sendMessage(OWNER_NUMBER, { 
                    image: qrBuffer, 
                    caption: `*${BOT_NAME} QR Code*\nScan this in WhatsApp > Linked Devices`
                });
            } catch (e) {
                console.log('Bot not logged in yet. Use /qr page instead.');
            }
        }

        if (connection === 'open') {
            currentQR = null; // Clear QR after login
            console.log(`${BOT_NAME} Connected Successfully`);
            await sock.sendMessage(OWNER_NUMBER, { text: `✅ ${BOT_NAME} is now online` });
        } else if (connection === 'close') {
            const code = lastDisconnect.error?.output?.statusCode;
            const shouldReconnect = code!== DisconnectReason.loggedOut;
            console.log(`Connection closed. Reconnecting: ${shouldReconnect}`);
            if (shouldReconnect) startBot();
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
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
                await sock.sendMessage(from, { text: '🏓 Pong! EZED X TECH is online' });
                break;
            case '.time':
                const now = new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });
                await sock.sendMessage(from, { text: `🕒 Kenya Time: ${now}` });
                break;
            case '.help':
                await sock.sendMessage(from, { text: `Send.menu for options\n${BOT_NAME}` });
                break;
        }
    });
}

startBot();
