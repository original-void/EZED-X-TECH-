const crypto = require('crypto');
global.crypto = crypto;

const fs = require('fs');
const AdmZip = require('adm-zip');
const express = require('express');
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, Browsers, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');

const app = express();
const PORT = process.env.PORT || 3000;
const AUTH_PATH = 'auth_info_ezed';
const SECRET_ZIP = '/etc/secrets/auth_info_ezed.zip';

// 1. Unzip session on boot if it doesn't exist
if (!fs.existsSync(AUTH_PATH) && fs.existsSync(SECRET_ZIP)) {
    console.log('Unzipping session from Secret Files...');
    const zip = new AdmZip(SECRET_ZIP);
    zip.extractAllTo(AUTH_PATH, true);
    console.log('Session unzipped');
} else if (!fs.existsSync(AUTH_PATH)) {
    console.log('ERROR: No session found. Upload auth_info_ezed.zip to Secret Files');
    process.exit(1);
}

// 2. Simple web server so Render doesn't sleep
app.get('/', (req, res) => res.send('EZED X TECH is alive 💀'));
app.listen(PORT, () => console.log(`Web on ${PORT}`));

// 3. WhatsApp connection
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_PATH);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level:'silent' }),
        browser: Browsers.ubuntu('Chrome'),
        printQRInTerminal: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (u) => {
        const { connection, lastDisconnect } = u;
        if (connection === 'open') console.log('✅ EZED X TECH CONNECTED');
        if (connection === 'close') {
            const code = lastDisconnect.error?.output?.statusCode;
            if (code === DisconnectReason.loggedOut) {
                console.log('Session logged out. Delete Secret File and re-upload');
                process.exit(1);
            }
            setTimeout(startBot, 3000);
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').toLowerCase().trim();
        if (text === 'ping') await sock.sendMessage(from, { text: 'pong 💀 EZED X TECH is live' });
        if (text === 'menu') await sock.sendMessage(from, { text: '*EZED X TECH* 💀\n\n*ping* *menu*' });
    });
}
startBot();
