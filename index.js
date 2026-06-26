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
const OWNER_NUMBER = '254769532338@s.whatsapp.net';

let currentQR = null;
let sock;

const MENU_TEXT = `
╭━━━〔 *🤖 ${BOT_NAME}* 〕━━━╮
┃ 
┃ *👑 Owner Panel* 
┃ 
┣━━━〔 *📜 COMMANDS* 〕━━━┫
┃
┃ 1️⃣ *\`.menu`*  → Show this panel
┃ 2️⃣ *\`.ping`*  → Check bot speed ⚡
┃ 3️⃣ *\`.time`*  → Kenya time 🕒 
┃ 4️⃣ *\`.help`*  → Show commands
┃
┣━━━〔 *ℹ️ STATUS* 〕━━━┫
┃  *Mode:* \`Owner + Bot Only\`
┃  *Uptime:* \`Online\`
┃
╰━━━〔 *EZED X TECH* 〕━━━╯
`;

app.get('/', (req, res) => res.send(`<h1>${BOT_NAME} is running</h1><p><a href="/qr">Open QR</a></p>`));
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
                await sock.sendMessage(OWNER_NUMBER, { image: qrBuffer, caption: `*${BOT_NAME} QR Code*` });
            } catch (e) {}
        }
        if (connection === 'open') {
            currentQR = null;
            console.log(`${BOT_NAME} Connected`);
            await sock.sendMessage(OWNER_NUMBER, { text: `✅ ${BOT_NAME} is online. Owner + Bot access: ON` });
        } else if (connection === 'close') {
            if (lastDisconnect.error?.output?.statusCode!== DisconnectReason.loggedOut) startBot();
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;

        const from = msg.key.remoteJid;
        const sender = jidNormalizedUser(msg.key.participant || from);
        const isFromMe = msg.key.fromMe;

        const isAllowed = (sender === OWNER_NUMBER) || isFromMe;
        if (!isAllowed) {
            await sock.sendMessage(from, { text: `❌ Access Denied. ${BOT_NAME} is private.` });
            return;
        }

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const command = text.toLowerCase().trim();

        switch (command) {
            case '.menu':
            case 'menu':
            case '.help':
                await sock.sendMessage(from, { text: MENU_TEXT });
                break;
            case '.ping':
                const start = Date.now();
                await sock.sendMessage(from, { text: '🏓 Pinging...' });
                const speed = Date.now() - start;
                await sock.sendMessage(from, { text: `🏓 *Pong!* \n⚡ *Speed:* \`${speed}ms`\n*${BOT_NAME}* is online` });
                break;
            case '.time':
                const now = new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });
                await sock.sendMessage(from, { text: `🕒 *Kenya Time:* \`${now}\`` });
                break;
        }
    });
}

startBot();
