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
const MENU_IMAGE_URL = 'https://files.catbox.moe/poo7ky.png';
const RENDER_URL = 'https://ezed-x-tech-2.onrender.com'; // Your link

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
'* [ EZED X TECH BOT V5.5 ] *\n' +
'*================================*\n' +
'*.antidelete on/off> Anti Delete\n' +
'*.aread on/off > Auto Read\n' +
'*.areact on/off> Auto React\n' +
'*================================*';

// QR CODE ON HOMEPAGE ✅
app.get('/', async (req, res) => {
    if (!currentQR) {
        return res.send(`
        <div style="font-family:sans-serif;text-align:center;padding:40px;">
            <h1>🤖 ${BOT_NAME} V5.5</h1>
            <h2>Waiting for QR...</h2>
            <p>Refresh this page in 5 seconds</p>
        </div>
        `);
    }
    const qrImage = await QRCode.toDataURL(currentQR);
    res.send(`
    <div style="font-family:sans-serif;text-align:center;padding:40px;">
        <h1>🤖 Scan ${BOT_NAME} QR</h1>
        <img src="${qrImage}" style="width:320px;border:5px solid #25D366;border-radius:20px;" />
        <p>Open WhatsApp > Linked Devices > Link a Device</p>
        <p><b>Owner:</b> 254769532338</p>
    </div>
    `);
});

app.listen(PORT, () => console.log('Web server on port ' + PORT + ' | ' + RENDER_URL));

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
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            currentQR = qr;
            console.log('QR Generated. Go to:', RENDER_URL);
            try {
                const qrBuffer = await QRCode.toBuffer(qr);
                await sock.sendMessage(OWNER_NUMBER, { image: qrBuffer, caption: '*' + BOT_NAME + ' QR Code*\nScan at: ' + RENDER_URL });
            } catch (e) {}
        }
        if (connection === 'open') {
            currentQR = null;
            console.log(BOT_NAME + ' Connected');
            await sock.sendMessage(OWNER_NUMBER, { text: '✅ ' + BOT_NAME + ' V5.5 is online\nDashboard: ' + RENDER_URL });
        } else if (connection === 'close') {
            if (lastDisconnect.error?.output?.statusCode!== DisconnectReason.loggedOut) startBot();
        }
    });

    // STATUS HANDLER
    sock.ev.on('messages.upsert', async (m) => {
        const messages = m.messages;
        for (const msg of messages) {
            if (msg.key.remoteJid === 'status@broadcast' && msg.key.participant &&!msg.key.fromMe) {
                try {
                    if (autoViewStatus) await sock.readMessages([msg.key]);
                    if (autoLikeStatus) {
                        const randomEmoji = REACT_EMOJIS[Math.floor(Math.random() * REACT_EMOJIS.length)];
                        await sock.sendMessage(msg.key.participant, { text: randomEmoji + ' *EZED X TECH* liked your status' });
                    }
                } catch (e) {}
            }
        }
    });

    // MAIN HANDLER
    sock.ev.on('messages.upsert', async (m) => {
        for (const msg of m.messages) {
            if (!msg.message || msg.key.remoteJid === 'status@broadcast') continue;
            const from = msg.key.remoteJid;
            const isGroup = from.endsWith('@g.us');
            const isFromMe = msg.key.fromMe;
            const isOwner = from === OWNER_NUMBER || isFromMe;

            if (antiDelete &&!isGroup) {
                msgStore.set(msg.key.id, { msg, from, sender: jidNormalizedUser(msg.key.participant || from) });
                if (msgStore.size > 500) msgStore.delete(msgStore.keys().next().value);
                console.log('[CACHE] ', msg.key.id, isFromMe? '[You]' : '[Them]');
            }

            if (autoReadMessages) await sock.readMessages([msg.key]);
            if (autoReactDM &&!isFromMe &&!isGroup) {
                await sock.sendMessage(from, { react: { text: REACT_EMOJIS[Math.floor(Math.random() * REACT_EMOJIS.length)], key: msg.key } }).catch(()=>{});
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
                case '.antidelete on': antiDelete = true; await sock.sendMessage(from, { text: '🛡️ AntiDelete: `ON`' }); break;
                case '.antidelete off': antiDelete = false; await sock.sendMessage(from, { text: '🛡️ AntiDelete: `OFF`' }); break;
            }
            setTimeout(() => sock.sendPresenceUpdate('available', from), 3000);
        }
    });

    // ANTI-DELETE LISTENER
    sock.ev.on('messages.update', async (updates) => {
        for (const { key, update } of updates) {
            if (antiDelete && update.message === null &&!key.remoteJid?.endsWith('@g.us')) {
                const stored = msgStore.get(key.id);
                if (stored) {
                    const name = await sock.getName(stored.sender) || stored.sender.split('@')[0];
                    await sock.sendMessage(OWNER_NUMBER, { 
                        text: `🗑️ *ANTIDELETE ALERT*\n\n*From:* ${name}\n*Time:* ${new Date().toLocaleTimeString('en-KE')}\n` 
                    });
                    await sock.sendMessage(OWNER_NUMBER, stored.msg.message);
                    console.log('[ANTIDELETE HIT]', key.id);
                }
            }
        }
    });
}

startBot();
