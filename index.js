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

// Keep Render awake
app.get('/', (req, res) => res.send(`${BOT_NAME} is running`));
app.listen(PORT, () => console.log(`Web server on port ${PORT}`));

const MENU = {
    text: `*🤖 ${BOT_NAME}*\n\nWelcome! Tap a button below 👇`,
    footer: 'Powered by EZED X TECH',
    templateButtons: [
        { index: 1, quickReplyButton: { displayText: '1. Ping 🏓', id: '.ping' } },
        { index: 2, quickReplyButton: { displayText: '2. Time 🕒', id: '.time' } },
        { index: 3, quickReplyButton: { displayText: '3. Help ❓', id: '.help' } },
    ]
};

let sock;
let pendingQR = null;

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
            console.log('QR generated. Sending to owner WhatsApp only...');
            pendingQR = qr;
            try {
                const qrBuffer = await QRCode.toBuffer(qr);
                await sock.sendMessage(OWNER_NUMBER, { 
                    image: qrBuffer, 
                    caption: `*${BOT_NAME} QR Code*\nScan this in WhatsApp > Linked Devices`
                });
                pendingQR = null;
            } catch (e) {
                console.log('Waiting for connection to send QR...');
            }
        }

        if (connection === 'open') {
            console.log(`${BOT_NAME} Connected Successfully`);
            await sock.sendMessage(OWNER_NUMBER, { text: `✅ ${BOT_NAME} is now online` });
            // Send pending QR if we couldn't before
            if (pendingQR) {
                const qrBuffer = await QRCode.toBuffer(pendingQR);
                await sock.sendMessage(OWNER_NUMBER, { 
                    image: qrBuffer, 
                    caption: `*${BOT_NAME} QR Code*\nScan this in WhatsApp > Linked Devices`
                });
                pendingQR = null;
            }
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
