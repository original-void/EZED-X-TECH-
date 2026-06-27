const express = require('express');
const { 
    default: makeWASocket, 
    DisconnectReason, 
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    jidNormalizedUser,
    proto
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;

const BOT_NAME = 'EZED X TECH';
const OWNER_NUMBER = '254769532338@s.whatsapp.net';
const MENU_IMAGE_URL = 'https://files.catbox.moe/poo7ky.png';

let autoRecording = true;
let autoTyping = true;
let autoViewStatus = true;
let autoLikeStatus = true;
let autoReadMessages = false;
let autoReactDM = false;
let antiDelete = false;

const msgStore = new Map();
const REACT_EMOJIS = ['❤️', '🔥', '😍', '💯', '👀', '😂', '🫡', '✨', '💀', '🥶'];

let currentQR = null;
let sock;

const MENU_TEXT =
'*================================*\n' +
'* [ EZED X TECH BOT V5.3 ] *\n' +
'*================================*\n' +
'*.antidelete on/off> Anti Delete V5.3\n' +
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
        browser: [BOT_NAME, 'Chrome', '1.0.0'],
        markOnlineOnConnect: true,
        syncFullHistory: false
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
            await sock.sendMessage(OWNER_NUMBER, { text: '✅ ' + BOT_NAME + ' V5.3 is online' });
        } else if (connection === 'close') {
            if (lastDisconnect.error?.output?.statusCode!== DisconnectReason.loggedOut) startBot();
        }
    });

    // STATUS HANDLER
    sock.ev.on('messages.upsert', async (m) => {
        const messages = m.messages;
        for (const msg of messages) {
            if (!msg.key || msg.key.remoteJid!== 'status@broadcast') continue;
            if (msg.key.fromMe) continue;
            if (!msg.key.participant) continue;
            try {
                if (autoViewStatus) await sock.readMessages([msg.key]);
                if (autoLikeStatus) {
                    const randomEmoji = REACT_EMOJIS[Math.floor(Math.random() * REACT_EMOJIS.length)];
                    await sock.sendMessage(msg.key.participant, { text: randomEmoji + ' *EZED X TECH* liked your status' });
                }
            } catch (e) {}
        }
    });

    // MAIN HANDLER V5.3
    sock.ev.on('messages.upsert', async (m) => {
        const messages = m.messages;
        for (const msg of messages) {
            if (!msg.message) continue;
            if (msg.key.remoteJid === 'status@broadcast') continue;

            const from = msg.key.remoteJid;
            const sender = jidNormalizedUser(msg.key.participant || from);
            const isFromMe = msg.key.fromMe;
            const isGroup = from.endsWith('@g.us');
            const isOwner = (sender === OWNER_NUMBER) || isFromMe;

            // CACHE ALL DMS BOTH SIDES ✅
            if (antiDelete &&!isGroup) {
                msgStore.set(msg.key.id, { msg, from, sender });
                if (msgStore.size > 500) msgStore.delete(msgStore.keys().next().value);
                console.log('Cached msg:', msg.key.id, isFromMe? '[You]' : '[Them]');
            }

            if (autoReadMessages) await sock.readMessages([msg.key]);

            if (autoReactDM &&!isFromMe &&!isGroup) {
                try {
                    const randomEmoji = REACT_EMOJIS[Math.floor(Math.random() * REACT_EMOJIS.length)];
                    await sock.sendMessage(from, { react: { text: randomEmoji, key: msg.key } });
                } catch (e) {}
            }

            if (!isOwner) continue;
            
            if (autoTyping) await sock.sendPresenceUpdate('composing', from);
            if (autoRecording) await sock.sendPresenceUpdate('recording', from);

            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
            const command = text.toLowerCase().trim();

            switch (command) {
                case '.menu': case 'menu': case '.help':
                    await sock.sendMessage(from, { image: { url: MENU_IMAGE_URL }, caption: MENU_TEXT });
                    break;
                case '.ping':
                    const start = Date.now();
                    await sock.sendMessage(from, { text: '🏓 Pinging...' });
                    const speed = Date.now() - start;
                    await sock.sendMessage(from, { text: '🏓 *Pong!* \n⚡ *Speed:* `' + speed + 'ms`' });
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

                case '.arec on': autoRecording = true; await sock.sendMessage(from, { text: '🎤 Auto Recording: `ON`' }); break;
                case '.arec off': autoRecording = false; await sock.sendMessage(from, { text: '🎤 Auto Recording: `OFF`' }); break;
                case '.atype on': autoTyping = true; await sock.sendMessage(from, { text: '⌨️ Auto Typing: `ON`' }); break;
                case '.atype off': autoTyping = false; await sock.sendMessage(from, { text: '⌨️ Auto Typing: `OFF`' }); break;
                case '.aview on': autoViewStatus = true; await sock.sendMessage(from, { text: '👀 Auto View Status: `ON`' }); break;
                case '.aview off': autoViewStatus = false; await sock.sendMessage(from, { text: '👀 Auto View Status: `OFF`' }); break;
                case '.alike on': autoLikeStatus = true; await sock.sendMessage(from, { text: '❤️ Auto DM Status: `ON`' }); break;
                case '.alike off': autoLikeStatus = false; await sock.sendMessage(from, { text: '❤️ Auto DM Status: `OFF`' }); break;
                case '.aread on': autoReadMessages = true; await sock.sendMessage(from, { text: '📖 Auto Read All DMs: `ON`' }); break;
                case '.aread off': autoReadMessages = false; await sock.sendMessage(from, { text: '📖 Auto Read All DMs: `OFF`' }); break;
                case '.areact on': autoReactDM = true; await sock.sendMessage(from, { text: '😈 Auto React DMs: `ON`' }); break;
                case '.areact off': autoReactDM = false; await sock.sendMessage(from, { text: '😈 Auto React DMs: `OFF`' }); break;
                case '.antidelete on': antiDelete = true; await sock.sendMessage(from, { text: '🛡️ AntiDelete V5.3: `ON`' }); break;
                case '.antidelete off': antiDelete = false; await sock.sendMessage(from, { text: '🛡️ AntiDelete: `OFF`' }); break;
            }
            setTimeout(() => sock.sendPresenceUpdate('available', from), 3000);
        }
    });

    // V5.3 ANTI-DELETE LISTENER ✅ THIS IS THE FIX
    sock.ev.on('messages.update', async (updates) => {
        for (const { key, update } of updates) {
            if (antiDelete && update.message === null &&!key.remoteJid?.endsWith('@g.us')) {
                const stored = msgStore.get(key.id);
                if (stored) {
                    const name = await sock.getName(stored.sender) || stored.sender.split('@')[0];
                    await sock.sendMessage(OWNER_NUMBER, { 
                        text: `🗑️ *ANTIDELETE ALERT V5.3*\n\n*From:* ${name}\n*Time:* ${new Date().toLocaleTimeString('en-KE')}\n` 
                    });
                    await sock.sendMessage(OWNER_NUMBER, stored.msg.message); // Resend
                    console.log('AntiDelete triggered V5.3:', name, key.id);
                } else {
                    console.log('AntiDelete: Message not cached:', key.id);
                }
            }
        }
    });

    // V5.3 DELETE EVENT LISTENER ✅ Backup for new WhatsApp
    sock.ev.on('messages.delete', async (m) => {
        if (!antiDelete) return;
        const keys = m.keys || [];
        for (const key of keys) {
            if (key.remoteJid?.endsWith('@g.us')) continue;
            const stored = msgStore.get(key.id);
            if (stored) {
                const name = await sock.getName(stored.sender) || stored.sender.split('@')[0];
                await sock.sendMessage(OWNER_NUMBER, { 
                    text: `🗑️ *ANTIDELETE ALERT V5.3 [DELETE EVENT]*\n\n*From:* ${name}\n` 
                });
                await sock.sendMessage(OWNER_NUMBER, stored.msg.message);
                console.log('AntiDelete triggered V5.3 DELETE:', name, key.id);
            }
        }
    });
}

startBot();
