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
let autoViewStatus = true;
let autoLikeStatus = true;
let autoReadMessages = false;
let autoReactDM = false;
let antiDelete = true;

const msgStore = new Map(); // NO LIMIT
const vvStore = new Map(); 
const REACT_EMOJIS = ['❤️', '🔥', '😍', '💯', '👀', '😂', '🫡', '✨', '💀', '🥶'];

let currentQR = null;
let sock;

// KEEP RENDER AWAKE
setInterval(() => { axios.get(RENDER_URL).catch(()=>{}); }, 3 * 60 * 1000);

// V7.6 DECORATED MENU
const MENU_TEXT = `
╭══════════════╮
║ 👑 ${BOT_NAME} V7.6 👑 ║
║ 𝗔𝗨𝗧𝗢 𝗩𝗩 + 𝗔𝗡𝗧𝗜𝗗𝗘𝗟𝗘𝗧𝗘 ║
╰══════════════╯

┏━━━━━━━━━━━〔 𝗦𝗬𝗦𝗧𝗘𝗠 𝗜𝗡𝗙𝗢 〕━━━━━━━━━━━┓
┃ 📛 𝗕𝗼𝘁 𝗡𝗮𝗺𝗲 : ${BOT_NAME}
┃ ⚡ 𝗦𝘁𝗮𝘁𝘂𝘀 : \`Online ✅\`
┃ 🛡️ 𝗔𝗻𝘁𝗶𝗗𝗲𝗹𝗲𝘁𝗲 : \`${antiDelete? 'ON ✅' : 'OFF ❌'}\`
┃ 🗂️ 𝗖𝗮𝗰𝗵𝗲 : \`${msgStore.size}\` Msgs Saved
┃ 👻 𝗩𝗩 𝗖𝗮𝘂𝗴𝗵𝘁 : \`${vvStore.size}\` ViewOnce
┃ ⏱️ 𝗨𝗽𝘁𝗶𝗺𝗲 : \`${Math.floor(process.uptime()/60)}m ${Math.floor(process.uptime()%60)}s\`
┃ 🔓 𝗠𝗼𝗱𝗲 : \`Auto Extract DM Media\`
┗━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━〔 𝗚𝗘𝗡𝗘𝗥𝗔𝗟 𝗖𝗠𝗗𝗦 〕━━━━━━━━━━┓
┃ 𝟭. \`.menu\` > Show this panel 🖼️
┃ 𝟮. \`.ping\` > Check bot speed ⚡
┃ 𝟯. \`.time\` > Kenya time 🕒
┃ 𝟰. \`.jid\` > Get chat JID 🆔
┃ 𝟱. \`.owner\` > Show owner 👑
┃ 𝟲. \`.cache\` > Cache stats 🗂️
┃ 𝟳. \`.logs\` > Last 10 VV IDs 🧪
┗━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━〔 𝗔𝗨𝗧𝗢 𝗙𝗘𝗔𝗧𝗨𝗥𝗘𝗦 〕━━━━━━━━┓
┃ 𝟴. \`.arec on/off\` > Auto Recording 🎤
┃ 𝟵. \`.atype on/off\` > Auto Typing ⌨️
┃ 𝟭𝟬. \`.aview on/off\` > Auto View Status 👀
┃ 𝟭. \`.alike on/off\` > Auto Like Status ❤️
┃ 𝟭𝟮. \`.aread on/off\` > Auto Read DMs 📖
┃ 𝟭𝟯. \`.areact on/off\` > Auto React DMs 😈
┃ 𝟭𝟰. \`.antidelete on/off\` > Anti Delete 🗑️
┗━━━━━━━━━━━━━━━┛

╭─〔 𝗜𝗠𝗣𝗢𝗥𝗧𝗔𝗡𝗧 𝗡𝗢𝗧𝗘 〕─╮
│ 👻 Send View Once to BOT = Auto
│ 🗑️ Delete any DM = Bot exposes it
│ ❌.vv command removed. Auto only.
╰─────────────────────────╯

  𝗣𝗼𝘄𝗲𝗿𝗲𝗱 𝗯𝘆 ${BOT_NAME} | V7.6
`;

app.get('/', async (req, res) => {
    if (!currentQR) return res.send(`<div style="text-align:center;padding:40px;font-family:sans-serif;"><h1>🤖 ${BOT_NAME} V7.6</h1><h2>Keep-Alive Active ✅</h2></div>`);
    const qrImage = await QRCode.toDataURL(currentQR);
    res.send(`<div style="text-align:center;padding:40px;font-family:sans-serif;"><h1>🤖 Scan ${BOT_NAME} QR</h1><img src="${qrImage}" style="width:320px;border:5px solid #25D366;border-radius:20px;" /><p>${RENDER_URL}</p></div>`);
});
app.listen(PORT, () => console.log('Server:', RENDER_URL));

// UNWRAP: ephemeral > viewOnceMessage > imageMessage.viewOnce:true
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
            try {
                const qrBuffer = await QRCode.toBuffer(qr);
                await sock.sendMessage(OWNER_NUMBER, { image: qrBuffer, caption: `*${BOT_NAME} V7.6 QR*\nScan: ${RENDER_URL}` });
            } catch(e){}
        }
        if (connection === 'open') {
            currentQR = null;
            await sock.sendMessage(OWNER_NUMBER, { text: `✅ ${BOT_NAME} V7.6 Online\n🛡️ AntiDelete: ON | 👻 Auto VV: ON` });
        } else if (connection === 'close' && update.lastDisconnect.error?.output?.statusCode!== DisconnectReason.loggedOut) {
            startBot();
        }
    });

    // STATUS HANDLER
    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
            if (msg.key.remoteJid === 'status@broadcast' && msg.key.participant &&!msg.key.fromMe) {
                try {
                    if (autoViewStatus) await sock.readMessages([msg.key]);
                    if (autoLikeStatus) {
                        const randomEmoji = REACT_EMOJIS[Math.floor(Math.random() * REACT_EMOJIS.length)];
                        await sock.sendMessage(msg.key.participant, { text: `${randomEmoji} *${BOT_NAME}* liked your status` });
                    }
                } catch (e) {}
            }
        }
    });

    // MAIN HANDLER
    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            for (const msg of messages) {
                if (!msg.message || msg.key.remoteJid === 'status@broadcast') continue;
                const from = msg.key.remoteJid;
                const isGroup = from.endsWith('@g.us');
                const isFromMe = msg.key.fromMe;
                const isOwner = from === OWNER_NUMBER || isFromMe;

                // 1. CACHE FIRST - FOR ANTIDELETE
                if (antiDelete &&!isGroup &&!isFromMe) {
                    msgStore.set(msg.key.id, { 
                        msg, from, 
                        sender: jidNormalizedUser(msg.key.participant || from),
                        timestamp: msg.messageTimestamp
                    });
                }

                // 2. AUTO VV GRAB
                if (!isGroup &&!isFromMe) {
                    const { isVV, realType, realMsg } = unwrapViewOnce(msg);
                    if (isVV) {
                        const fromName = await sock.getName(from) || from.split('@')[0];
                        await sock.sendMessage(OWNER_NUMBER, { text: `👻 *VIEW ONCE CAPTURED V7.6*\nFrom: ${fromName}\nType: ${realType}\nID: \`${msg.key.id}\`` });
                        try {
                            const buffer = await downloadMediaMessage({ key: msg.key, message: realMsg }, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
                            const sendObj = {};
                            sendObj[realType.replace('Message','')] = buffer;
                            sendObj.mimetype = realMsg[realType].mimetype;
                            if(realType === 'imageMessage') sendObj.caption = realMsg[realType].caption || '👻 Extracted View Once';
                            await sock.sendMessage(OWNER_NUMBER, sendObj);
                            vvStore.set(msg.key.id, 1);
                        } catch (err) {
                            await sock.sendMessage(OWNER_NUMBER, { text: `❌ VV Fail: ${err.message}` });
                        }
                    }
                }

                // 3. AUTO FEATURES
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
                        await sock.sendMessage(from, { text: `🏓 *Pong!* \n⚡ *Speed:* \`${Date.now() - start}ms\`` });
                        break;
                    case '.time':
                        const now = new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });
                        await sock.sendMessage(from, { text: `🕒 *Kenya Time:* \`${now}\`` });
                        break;
                    case '.jid':
                        await sock.sendMessage(from, { text: `🆔 *Chat JID:* \`${from}\`` });
                        break;
                    case '.owner':
                        await sock.sendMessage(from, { text: '👑 *Owner:* `254769532338`' });
                        break;
                    case '.cache':
                        await sock.sendMessage(from, { text: `🗂️ *Cache Status*\nAntiDelete: \`${msgStore.size}\`\nVV Flagged: \`${vvStore.size}\`\nUptime: \`${Math.floor(process.uptime()/60)}m ${Math.floor(process.uptime()%60)}s\`` });
                        break;
                    case '.logs':
                        const ids = Array.from(vvStore.keys()).slice(-10);
                        await sock.sendMessage(from, { text: `🧪 *Last 10 VV IDs:*\n\`\`${ids.join('\n') || 'None'}\`\`` });
                        break;

                    // AUTO TOGGLES
                    case '.arec on': autoRecording = true; await sock.sendMessage(from, { text: '🎤 Auto Recording: `ON ✅`' }); break;
                    case '.arec off': autoRecording = false; await sock.sendMessage(from, { text: '🎤 Auto Recording: `OFF ❌`' }); break;
                    case '.atype on': autoTyping = true; await sock.sendMessage(from, { text: '⌨️ Auto Typing: `ON ✅`' }); break;
                    case '.atype off': autoTyping = false; await sock.sendMessage(from, { text: '⌨️ Auto Typing: `OFF ❌`' }); break;
                    case '.aview on': autoViewStatus = true; await sock.sendMessage(from, { text: '👀 Auto View Status: `ON ✅`' }); break;
                    case '.aview off': autoViewStatus = false; await sock.sendMessage(from, { text: '👀 Auto View Status: `OFF ❌`' }); break;
                    case '.alike on': autoLikeStatus = true; await sock.sendMessage(from, { text: '❤️ Auto Like Status: `ON ✅`' }); break;
                    case '.alike off': autoLikeStatus = false; await sock.sendMessage(from, { text: '❤️ Auto Like Status: `OFF ❌`' }); break;
                    case '.aread on': autoReadMessages = true; await sock.sendMessage(from, { text: '📖 Auto Read DMs: `ON ✅`' }); break;
                    case '.aread off': autoReadMessages = false; await sock.sendMessage(from, { text: '📖 Auto Read DMs: `OFF ❌`' }); break;
                    case '.areact on': autoReactDM = true; await sock.sendMessage(from, { text: '😈 Auto React DMs: `ON ✅`' }); break;
                    case '.areact off': autoReactDM = false; await sock.sendMessage(from, { text: '😈 Auto React DMs: `OFF ❌`' }); break;
                    case '.antidelete on': antiDelete = true; await sock.sendMessage(from, { text: '🛡️ AntiDelete: `ON ✅`' }); break;
                    case '.antidelete off': antiDelete = false; await sock.sendMessage(from, { text: '🛡️ AntiDelete: `OFF ❌`' }); break;
                }
                setTimeout(() => sock.sendPresenceUpdate('available', from), 3000);
            }
        } catch(e) { console.log('Main error:', e.message); }
    });

    // ANTI-DELETE EXPOSER
    sock.ev.on('messages.update', async (updates) => {
        try {
            for (const { key, update } of updates) {
                if (antiDelete && update.message === null &&!key.remoteJid?.endsWith('@g.us')) {
                    const stored = msgStore.get(key.id);
                    if (stored) {
                        const name = await sock.getName(stored.sender) || stored.sender.split('@')[0];
                        const time = new Date(stored.timestamp * 1000).toLocaleTimeString('en-KE');
                        const type = getContentType(stored.msg.message);

                        await sock.sendMessage(OWNER_NUMBER, { 
                            text: `🗑️ *DELETED MESSAGE EXPOSED*\n\n*From:* ${name}\n*Type:* ${type}\n*Time:* ${time}\n*Status:* ${stored.msg.key.fromMe? 'You deleted' : 'They deleted'}\n\n*Content below:*` 
                        }).catch(()=>{});
                        
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
                        } catch (e) {
                            await sock.sendMessage(OWNER_NUMBER, { text: `❌ Couldn't download deleted media: ${e.message}` });
                        }
                        msgStore.delete(key.id);
                    }
                }
            }
        } catch(e) { console.log('AntiDelete error:', e.message); }
    });
}

startBot();
