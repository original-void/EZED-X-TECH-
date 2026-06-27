const express = require('express');
const { 
    default: makeWASocket, 
    DisconnectReason, 
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    jidNormalizedUser,
    downloadMediaMessage,
    getContentType
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const BOT_NAME = 'EZED X TECH';
const OWNER_NUMBER = '254769532338@s.whatsapp.net';
const MENU_IMAGE_URL = 'https://files.catbox.moe/poo7ky.png';
const RENDER_URL = 'https://ezed-x-tech-2.onrender.com';

let autoRecording = true;
let autoTyping = true;
let autoViewStatus = false; // CHANGED: OFF by default
let autoLikeStatus = false; // CHANGED: REMOVED SPAM
let autoReadMessages = false;
let autoReactDM = false;
let antiDelete = true;

const msgStore = new Map();
const vvStore = new Map(); 
const REACT_EMOJIS = ['❤️', '🔥', '😍', '💯', '👀', '😂', '🫡', '✨', '💀', '🥶'];

let currentQR = null;
let sock;

setInterval(() => { axios.get(RENDER_URL).catch(()=>{}); }, 3 * 60 * 1000);

// V7.7 DECORATED MENU - REMOVED.alike
const MENU_TEXT = `
╭══════════════╮
║ 👑 ${BOT_NAME} V7.7 👑 ║
║ 𝗡𝗢 𝗦𝗧𝗔𝗧𝗨𝗦 𝗦𝗣𝗔𝗠 ║
╰══════════════╯

┏━━━━━━━━━━━〔 𝗦𝗬𝗦𝗧𝗘𝗠 𝗜𝗡𝗙𝗢 〕━━━━━━━━━━━┓
┃ 📛 𝗕𝗼𝘁 : ${BOT_NAME}
┃ 🛡️ 𝗔𝗻𝘁𝗶𝗗𝗲𝗹𝗲𝘁𝗲 : \`${antiDelete? 'ON ✅' : 'OFF ❌'}\`
┃ 🗂️ 𝗖𝗮𝗰𝗵𝗲 : \`${msgStore.size}\` | 👻 𝗩𝗩 : \`${vvStore.size}\`
┃ ⏱️ 𝗨𝗽𝘁𝗶𝗺𝗲 : \`${Math.floor(process.uptime()/60)}m\`
┗━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━〔 𝗚𝗘𝗡𝗘𝗥𝗔𝗟 〕━━━━━━━━━━━┓
┃ 𝟭. \`.menu\` 𝟮. \`.ping\` 𝟯. \`.time\` 𝟰. \`.jid\`
┃ 𝟱. \`.owner\` 𝟲. \`.cache\` 𝟳. \`.logs\`
┗━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━〔 𝗔𝗨𝗧𝗢 𝗙𝗘𝗔𝗧𝗨𝗥𝗘𝗦 〕━━━━━━━━┓
┃ 𝟴. \`.arec on/off\` > Auto Recording 🎤
┃ 𝟵. \`.atype on/off\` > Auto Typing ⌨️
┃ 𝟭𝟬. \`.aview on/off\` > Auto View Status 👀
┃ 𝟭. \`.aread on/off\` > Auto Read DMs 📖
┃ 𝟭𝟮. \`.areact on/off\` > Auto React DMs 😈
┃ 𝟭𝟯. \`.antidelete on/off\` > Anti Delete 🗑️
┗━━━━━━━━━━━━━━━┛
*Note:.alike removed. No more status spam*
`;

app.get('/', async (req, res) => {
    if (!currentQR) return res.send(`<h1>🤖 ${BOT_NAME} V7.7 Online</h1>`);
    const qrImage = await QRCode.toDataURL(currentQR);
    res.send(`<div style="text-align:center;padding:40px;"><h1>🤖 Scan QR</h1><img src="${qrImage}" style="width:320px;" /></div>`);
});
app.listen(PORT, () => console.log('Server:', RENDER_URL));

function unwrapViewOnce(msg) {
    let m = msg.message;
    let depth = 0;
    while (m && depth < 3) {
        const type = getContentType(m);
        if (type === 'imageMessage' || type === 'videoMessage') {
            if (m[type]?.viewOnce === true) return { isVV: true, realType: type, realMsg: m };
        }
        if (type === 'ephemeralMessage' || type.includes('viewOnceMessage')) {
            m = m[type]?.message; 
            depth++;
            continue;
        }
        break;
    }
    return { isVV: false };
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        version,
        browser: [BOT_NAME, 'Chrome', '1.0.0'],
        markOnlineOnConnect: true,
        syncFullHistory: false,
        getMessage: async key => {
            const stored = msgStore.get(key.id);
            return stored?.msg?.message || { conversation: '' };
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, qr } = update;
        if (qr) {
            currentQR = qr;
            const qrBuffer = await QRCode.toBuffer(qr);
            await sock.sendMessage(OWNER_NUMBER, { image: qrBuffer, caption: `*${BOT_NAME} V7.7 QR*` }).catch(()=>{});
        }
        if (connection === 'open') {
            currentQR = null;
            await sock.sendMessage(OWNER_NUMBER, { text: `✅ ${BOT_NAME} V7.7 Online\n❌ Status Spam REMOVED` });
        } else if (connection === 'close' && update.lastDisconnect.error?.output?.statusCode!== DisconnectReason.loggedOut) {
            startBot();
        }
    });

    // DELETED: STATUS HANDLER REMOVED COMPLETELY
    // No more "EZED X TECH liked your status" spam

    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            for (const msg of messages) {
                if (!msg.message || msg.key.remoteJid === 'status@broadcast') continue;
                const from = msg.key.remoteJid;
                const isGroup = from.endsWith('@g.us');
                const isFromMe = msg.key.fromMe;
                const isOwner = from === OWNER_NUMBER || isFromMe;

                if (antiDelete &&!isGroup &&!isFromMe) {
                    msgStore.set(msg.key.id, { 
                        msg, from, 
                        sender: jidNormalizedUser(msg.key.participant || from),
                        timestamp: msg.messageTimestamp
                    });
                }

                if (!isGroup &&!isFromMe) {
                    const { isVV, realType, realMsg } = unwrapViewOnce(msg);
                    if (isVV) {
                        const fromName = await sock.getName(from) || from.split('@')[0];
                        await sock.sendMessage(OWNER_NUMBER, { text: `👻 *VIEW ONCE V7.7*\nFrom: ${fromName}` });
                        try {
                            const buffer = await downloadMediaMessage({ key: msg.key, message: realMsg }, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
                            const sendObj = {};
                            sendObj[realType.replace('Message','')] = buffer;
                            sendObj.mimetype = realMsg[realType].mimetype;
                            if(realType === 'imageMessage') sendObj.caption = realMsg[realType].caption || '';
                            await sock.sendMessage(OWNER_NUMBER, sendObj);
                            vvStore.set(msg.key.id, 1);
                        } catch (err) {
                            await sock.sendMessage(OWNER_NUMBER, { text: `❌ VV Fail: ${err.message}` });
                        }
                    }
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
                    case '.menu': await sock.sendMessage(from, { image: { url: MENU_IMAGE_URL }, caption: MENU_TEXT }); break;
                    case '.ping': const s = Date.now(); await sock.sendMessage(from, { text: `🏓 Pong \`${Date.now() - s}ms\`` }); break;
                    case '.time': await sock.sendMessage(from, { text: `🕒 \`${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}\`` }); break;
                    case '.jid': await sock.sendMessage(from, { text: `🆔 \`${from}\`` }); break;
                    case '.owner': await sock.sendMessage(from, { text: '👑 `254769532338`' }); break;
                    case '.cache': await sock.sendMessage(from, { text: `🗂️ Cache: \`${msgStore.size}\`\n👻 VV: \`${vvStore.size}\`\nUptime: \`${Math.floor(process.uptime()/60)}m\`` }); break;
                    case '.logs': await sock.sendMessage(from, { text: `🧪 VV Count: \`${vvStore.size}\`` }); break;
                    
                    case '.arec on': autoRecording = true; await sock.sendMessage(from, { text: '🎤 ON' }); break;
                    case '.arec off': autoRecording = false; await sock.sendMessage(from, { text: '🎤 OFF' }); break;
                    case '.atype on': autoTyping = true; await sock.sendMessage(from, { text: '⌨️ ON' }); break;
                    case '.atype off': autoTyping = false; await sock.sendMessage(from, { text: '⌨️ OFF' }); break;
                    case '.aview on': autoViewStatus = true; await sock.sendMessage(from, { text: '👀 ON' }); break;
                    case '.aview off': autoViewStatus = false; await sock.sendMessage(from, { text: '👀 OFF' }); break;
                    case '.aread on': autoReadMessages = true; await sock.sendMessage(from, { text: '📖 ON' }); break;
                    case '.aread off': autoReadMessages = false; await sock.sendMessage(from, { text: '📖 OFF' }); break;
                    case '.areact on': autoReactDM = true; await sock.sendMessage(from, { text: '😈 ON' }); break;
                    case '.areact off': autoReactDM = false; await sock.sendMessage(from, { text: '😈 OFF' }); break;
                    case '.antidelete on': antiDelete = true; await sock.sendMessage(from, { text: '🛡️ ON' }); break;
                    case '.antidelete off': antiDelete = false; await sock.sendMessage(from, { text: '🛡️ OFF' }); break;
                }
                setTimeout(() => sock.sendPresenceUpdate('available', from), 3000);
            }
        } catch(e) { console.log('Error:', e); }
    });

    sock.ev.on('messages.update', async (updates) => {
        for (const { key, update } of updates) {
            if (antiDelete && update.message === null &&!key.remoteJid?.endsWith('@g.us')) {
                const stored = msgStore.get(key.id);
                if (stored) {
                    const name = await sock.getName(stored.sender) || stored.sender.split('@')[0];
                    const type = getContentType(stored.msg.message);
                    await sock.sendMessage(OWNER_NUMBER, { text: `🗑️ *DELETED by ${name}*\n*Type:* ${type}` });
                    try {
                        if (type === 'imageMessage' || type === 'videoMessage' || type === 'audioMessage' || type === 'documentMessage' || type === 'stickerMessage') {
                            const buffer = await downloadMediaMessage(stored.msg, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
                            const sendObj = {};
                            sendObj[type.replace('Message','')] = buffer;
                            sendObj.mimetype = stored.msg.message[type].mimetype;
                            if(type === 'imageMessage') sendObj.caption = stored.msg.message[type].caption || '';
                            await sock.sendMessage(OWNER_NUMBER, sendObj);
                        } else {
                            await sock.sendMessage(OWNER_NUMBER, stored.msg.message);
                        }
                    } catch (e) {}
                    msgStore.delete(key.id);
                }
            }
        }
    });
}

startBot();
