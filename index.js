const express = require('express');
const { 
    default: makeWASocket, 
    DisconnectReason, 
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    jidNormalizedUser,
    downloadMediaMessage,
    Sticker, 
    StickerTypes
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;

const BOT_NAME = 'EZED X TECH';
const OWNER_NUMBER = '254769532338@s.whatsapp.net';
const MENU_IMAGE_URL = 'https://files.catbox.moe/poo7ky.png'; // YOUR LOGO ✅

let currentQR = null;
let sock;

const MENU_TEXT =
'*================================*\n' +
'* [ EZED X TECH BOT ] *\n' +
'*================================*\n' +
'*\n' +
'* *👑 OWNER PANEL* \n' +
'*\n' +
'* *--- [ COMMANDS ] ---*\n' +
'*\n' +
'* 1..menu > Show this panel\n' +
'* 2..ping > Check bot speed ⚡\n' +
'* 3..time > Kenya time 🕒 \n' +
'* 4..jid > Get chat ID\n' +
'* 5..owner > Show owner\n' +
'* 6..sticker> Image to sticker\n' +
'*\n' +
'* *--- [ STATUS ] ---*\n' +
'* Mode : Owner + Bot Only\n' +
'* Status : Online ✅\n' +
'*\n' +
'*================================*\n' +
'* Powered by EZED X TECH *\n' +
'*================================*';

app.get('/', (req, res) => res.send('<h1>' + BOT_NAME + ' is running</h1><p><a href="/qr">Open QR</a></p>'));
app.get('/qr', async (req, res) => {
    if (!currentQR) return res.send('<h2>No QR yet. Wait 10s and refresh.</h2>');
    const qrImage = await QRCode.toDataURL(currentQR);
    res.send('<h1>Scan ' + BOT_NAME + ' QR</h1><img src="' + qrImage + '" style="width:300px;" />');
});
app.listen(PORT, () => console.log('Web server on port ' + PORT));

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
                await sock.sendMessage(OWNER_NUMBER, { image: qrBuffer, caption: '*' + BOT_NAME + ' QR Code*' });
            } catch (e) {}
        }
        if (connection === 'open') {
            currentQR = null;
            console.log(BOT_NAME + ' Connected');
            await sock.sendMessage(OWNER_NUMBER, { text: '✅ ' + BOT_NAME + ' is online. Owner + Bot access: ON' });
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
            await sock.sendMessage(from, { text: '❌ Access Denied. ' + BOT_NAME + ' is private.' });
            return;
        }

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const command = text.toLowerCase().trim();

        switch (command) {
            case '.menu':
            case 'menu':
            case '.help':
                // IMAGE MENU ✅
                await sock.sendMessage(from, { 
                    image: { url: MENU_IMAGE_URL }, 
                    caption: MENU_TEXT 
                });
                break;
            case '.ping':
                const start = Date.now();
                await sock.sendMessage(from, { text: '🏓 Pinging...' });
                const speed = Date.now() - start;
                await sock.sendMessage(from, { text: '🏓 *Pong!* \n⚡ *Speed:* `' + speed + 'ms`\n*' + BOT_NAME + '* is online' });
                break;
            case '.time':
                const now = new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });
                await sock.sendMessage(from, { text: '🕒 *Kenya Time:* `' + now + '`' });
                break;
            case '.jid':
                await sock.sendMessage(from, { text: '🆔 *Chat JID:* `' + from + '`' });
                break;
            case '.owner':
                await sock.sendMessage(from, { text: '👑 *Owner:* `254769532338`' });
                break;
            case '.sticker':
                if (msg.message.imageMessage || msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
                    const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage || msg.message;
                    const buffer = await downloadMediaMessage({ message: quoted }, 'buffer', {});
                    const sticker = new Sticker(buffer, {
                        pack: BOT_NAME,
                        author: 'EZED X TECH',
                        type: StickerTypes.FULL,
                        categories: ['🤖'],
                    });
                    await sock.sendMessage(from, await sticker.toMessage());
                } else {
                    await sock.sendMessage(from, { text: '❌ Reply to an image with.sticker' });
                }
                break;
        }
    });
}

startBot();
