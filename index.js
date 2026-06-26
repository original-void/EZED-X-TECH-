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

// AUTO FEATURES TOGGLES ✅
let autoRecording = true;
let autoTyping = true;
let autoViewStatus = true;
let autoLikeStatus = true; // Auto DM Status with emoji
let autoReadMessages = false; // NEW: Auto read DMs
let autoReactDM = false; // NEW: Auto react to DMs

// RANDOM EMOJI LIST 🔥
const REACT_EMOJIS = ['❤️', '🔥', '😍', '💯', '👀', '😂', '🫡', '✨', '💀', '🥶'];

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
'*\n' +
'* *--- [ AUTO ] ---*\n' +
'* 6..arec on/off > Auto Recording\n' +
'* 7..atype on/off> Auto Typing\n' +
'* 8..aview on/off> Auto View Status\n' +
'* 9..alike on/off> Auto DM Status\n' +
'* 10..aread on/off> Auto Read DMs\n' +
'* 11..areact on/off> Auto React DMs\n' +
'*\n' +
'* *--- [ STATUS ] ---*\n' +
'* Mode : Owner Only\n' +
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
            await sock.sendMessage(OWNER_NUMBER, { text: '✅ ' + BOT_NAME + ' is online. Auto Features: ON' });
        } else if (connection === 'close') {
            if (lastDisconnect.error?.output?.statusCode!== DisconnectReason.loggedOut) startBot();
        }
    });

    // AUTO VIEW + AUTO DM STATUS WITH RANDOM EMOJI ✅
    sock.ev.on('messages.upsert', async (m) => {
        const messages = m.messages;
        for (const msg of messages) {
            if (!msg.key || msg.key.remoteJid!== 'status@broadcast') continue;
            if (msg.key.fromMe) continue;
            if (!msg.key.participant) continue;

            try {
                if (autoViewStatus) {
                    await sock.readMessages([msg.key]); // View the status
                    console.log('Viewed status from:', msg.key.participant);
                }
                if (autoLikeStatus) {
                    const randomEmoji = REACT_EMOJIS[Math.floor(Math.random() * REACT_EMOJIS.length)];
                    await sock.sendMessage(msg.key.participant, { 
                        text: randomEmoji + ' *EZED X TECH* liked your status' 
                    });
                    console.log('DMd status from:', msg.key.participant, 'with', randomEmoji);
                }
            } catch (e) {
                console.log('Status error:', e.message);
            }
        }
    });

    // MAIN COMMAND + AUTO DM REACT/READ HANDLER ✅
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.remoteJid === 'status@broadcast') return;

        const from = msg.key.remoteJid;
        const sender = jidNormalizedUser(msg.key.participant || from);
        const isFromMe = msg.key.fromMe;
        const isGroup = from.endsWith('@g.us');
        const isOwner = (sender === OWNER_NUMBER) || isFromMe;

        // AUTO READ MESSAGES ✅
        if (autoReadMessages &&!isFromMe) {
            await sock.readMessages([msg.key]);
            console.log('Auto read:', from);
        }

        // AUTO REACT TO DM ✅
        if (autoReactDM &&!isFromMe &&!isGroup) {
            try {
                const randomEmoji = REACT_EMOJIS[Math.floor(Math.random() * REACT_EMOJIS.length)];
                await sock.sendMessage(from, { 
                    react: { text: randomEmoji, key: msg.key } 
                });
                console.log('Auto reacted to:', from, 'with', randomEmoji);
            } catch (e) {
                console.log('React error:', e.message);
            }
        }

        // OWNER ONLY COMMANDS
        if (!isOwner) return;

        // AUTO TYPING + RECORDING
        if (autoTyping) await sock.sendPresenceUpdate('composing', from);
        if (autoRecording) await sock.sendPresenceUpdate('recording', from);

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const command = text.toLowerCase().trim();

        switch (command) {
            case '.menu':
            case 'menu':
            case '.help':
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

            // AUTO TOGGLES
            case '.arec on': autoRecording = true; await sock.sendMessage(from, { text: '🎤 Auto Recording: `ON`' }); break;
            case '.arec off': autoRecording = false; await sock.sendMessage(from, { text: '🎤 Auto Recording: `OFF`' }); break;
            case '.atype on': autoTyping = true; await sock.sendMessage(from, { text: '⌨️ Auto Typing: `ON`' }); break;
            case '.atype off': autoTyping = false; await sock.sendMessage(from, { text: '⌨️ Auto Typing: `OFF`' }); break;
            case '.aview on': autoViewStatus = true; await sock.sendMessage(from, { text: '👀 Auto View Status: `ON`' }); break;
            case '.aview off': autoViewStatus = false; await sock.sendMessage(from, { text: '👀 Auto View Status: `OFF`' }); break;
            case '.alike on': autoLikeStatus = true; await sock.sendMessage(from, { text: '❤️ Auto DM Status: `ON`' }); break;
            case '.alike off': autoLikeStatus = false; await sock.sendMessage(from, { text: '❤️ Auto DM Status: `OFF`' }); break;
            case '.aread on': autoReadMessages = true; await sock.sendMessage(from, { text: '📖 Auto Read DMs: `ON`' }); break;
            case '.aread off': autoReadMessages = false; await sock.sendMessage(from, { text: '📖 Auto Read DMs: `OFF`' }); break;
            case '.areact on': autoReactDM = true; await sock.sendMessage(from, { text: '😈 Auto React DMs: `ON`' }); break;
            case '.areact off': autoReactDM = false; await sock.sendMessage(from, { text: '😈 Auto React DMs: `OFF`' }); break;
        }
        // Stop presence after 3s
        setTimeout(() => sock.sendPresenceUpdate('available', from), 3000);
    });
}

startBot();
