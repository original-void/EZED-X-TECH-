const express = require('express');
const { 
    default: makeWASocket, 
    DisconnectReason, 
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    jidNormalizedUser,
    proto,
    downloadContentFromMessage
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;

const BOT_NAME = 'EZED X TECH';
const OWNER_NUMBER = '254769532338@s.whatsapp.net';
const MENU_IMAGE_URL = 'https://files.catbox.moe/poo7ky.png';

// AUTO FEATURES TOGGLES ✅
let autoRecording = true;
let autoTyping = true;
let autoViewStatus = true;
let autoLikeStatus = true;
let autoReadMessages = false;
let autoReactDM = false;
let antiDelete = false;

// CACHE FOR ANTI-DELETE
const msgStore = new Map();

// RANDOM EMOJI LIST 🔥
const REACT_EMOJIS = ['❤️', '🔥', '😍', '💯', '👀', '😂', '🫡', '✨', '💀', '🥶'];

let currentQR = null;
let sock;

const MENU_TEXT =
'*================================*\n' +
'* [ EZED X TECH BOT V5.2 ] *\n' +
'*================================*\n' +
'* *👑 OWNER PANEL* \n' +
'* *--- [ AUTO ] ---*\n' +
'*.arec on/off > Auto Recording\n' +
'*.atype on/off> Auto Typing\n' +
'*.aview on/off> Auto View Status\n' +
'*.alike on/off> Auto DM Status\n' +
'*.aread on/off> Auto Read All DMs\n' +
'*.areact on/off> Auto React DMs\n' +
'*.antidelete on/off> Anti Delete V5.2\n' +
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
            await sock.sendMessage(OWNER_NUMBER, { text: '✅ ' + BOT_NAME + ' V5.2 is online. Ghost Mode: ON' });
        } else if (connection === 'close') {
            if (lastDisconnect.error?.output?.statusCode!== DisconnectReason.loggedOut) startBot();
        }
    });

    // AUTO VIEW + AUTO DM STATUS
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

    // MAIN HANDLER V5.2
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

            // 1. ANTI-DELETE CATCHER V5.2 ✅ type 0 or 3
            if (antiDelete && msg.message.protocolMessage) {
                const pType = msg.message.protocolMessage.type;
                if (pType === proto.Message.ProtocolMessage.Type.REVOKE || pType === 3) {
                    const deletedKeyId = msg.message.protocolMessage.key.id;
                    const stored = msgStore.get(deletedKeyId);
                    if (stored &&!from.endsWith('@g.us')) {
                        const name = await sock.getName(sender) || sender.split('@')[0];
                        await sock.sendMessage(OWNER_NUMBER, { 
                            text: `🗑️ *ANTIDELETE ALERT*\n\n*From:* ${name}\n*Time:* ${new Date().toLocaleTimeString('en-KE')}\n` 
                        });
                        await sock.sendMessage(OWNER_NUMBER, stored.msg.message); // RESEND, not quote
                        console.log('AntiDelete triggered V5.2:', name, deletedKeyId);
                    }
                    continue;
                }
            }

            // 2. CACHE MESSAGE FOR ANTI-DELETE ✅ Cache BOTH sides now
            if (antiDelete &&!isGroup) {
                msgStore.set(msg.key.id, { msg, from });
                if (msgStore.size > 500) msgStore.delete(msgStore.keys().next().value); // Cache 500
                console.log('Cached msg:', msg.key.id, isFromMe? '[You]' : '[Them]');
            }

            // 3. AUTO READ BOTH SIDES ✅
            if (autoReadMessages) await sock.readMessages([msg.key]);

            // 4. AUTO REACT TO DM FROM OTHERS ✅
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
                case '.antidelete on': antiDelete = true; await sock.sendMessage(from, { text: '🛡️ AntiDelete V5.2: `ON`' }); break;
                case '.antidelete off': antiDelete = false; await sock.sendMessage(from, { text: '🛡️ AntiDelete: `OFF`' }); break;
            }
            setTimeout(() => sock.sendPresenceUpdate('available', from), 3000);
        }
    });
}

startBot();
