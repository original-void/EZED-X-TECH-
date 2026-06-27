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

const MAX_CACHE = 200;
const MAX_VV_CACHE = 300; 
const msgStore = new Map(); 
const vvStore = new Map(); 
const REACT_EMOJIS = ['❤️', '🔥', '😍', '💯', '👀', '😂', '🫡', '✨', '💀', '🥶'];

let currentQR = null;
let sock;

setInterval(() => {
    if (msgStore.size > MAX_CACHE) {
        const keysToDelete = Array.from(msgStore.keys()).slice(0, msgStore.size - MAX_CACHE);
        keysToDelete.forEach(k => msgStore.delete(k));
    }
    if (vvStore.size > MAX_VV_CACHE) {
        const keysToDelete = Array.from(vvStore.keys()).slice(0, vvStore.size - MAX_VV_CACHE);
        keysToDelete.forEach(k => vvStore.delete(k));
    }
}, 5 * 60 * 1000);

const MENU_TEXT = `
*╭━━━━━━━━━━━━━━╮*
*┃ 👑 ${BOT_NAME} V6.6 👑 ┃*
*╰━━━━━━━━━━━━━━╯*

*╭───〔 𝗜𝗡𝗙𝗢 〕───╮*
*┃ 📛 Bot:* ${BOT_NAME}
*┃ ⚡ Status:* \`Online ✅\`
*┃ 🛡️ AntiDelete:* \`${antiDelete? 'ON' : 'OFF'}\`
*┃ 🗂️ AD Cache:* \`${msgStore.size}/${MAX_CACHE}\`
*┃ 👻 VV Cache:* \`${vvStore.size}/${MAX_VV_CACHE}\`
*╰━━━━━━━━━━━━╯*

*╭───〔 𝗚𝗘𝗡𝗘𝗥𝗔𝗟 〕───╮*
*┃ 1.* \`.menu\` > Show this panel
*┃ 2.* \`.ping\` > Check bot speed ⚡
*┃ 3.* \`.time\` > Kenya time 🕒 
*┃ 4.* \`.jid\` > Get chat ID 🆔
*┃ 5.* \`.owner\` > Show owner 👑
*┃ 6.* \`.cache\` > Check cache size 🗂️
*┃ 7.* \`.vv\` > Expose View Once 👻 *Reply to VV*
*╰━━━━━━━━━━━━╯*

*╭───〔 𝗔𝗨𝗧𝗢 𝗙𝗘𝗔𝗧𝗨𝗥𝗘𝗦 〕───╮*
*┃ 8.* \`.arec on/off\` > Auto Recording 🎤
*┃ 9.* \`.atype on/off\` > Auto Typing ⌨️
*┃ 10.* \`.aview on/off\` > Auto View Status 👀
*┃ 11.* \`.alike on/off\` > Auto DM Status ❤️
*┃ 12.* \`.aread on/off\` > Auto Read All DMs 📖
*┃ 13.* \`.areact on/off\` > Auto React DMs 😈
*┃ 14.* \`.antidelete on/off\` > Anti Delete 🗑️
*╰━━━━━━━━━━━━━━━╯*

*${BOT_NAME} | Ghost Mode ON*
`;

app.get('/', async (req, res) => {
    if (!currentQR) return res.send(`<div style="text-align:center;padding:40px;font-family:sans-serif;"><h1>🤖 ${BOT_NAME} V6.6</h1><h2>Waiting for QR... Refresh</h2></div>`);
    const qrImage = await QRCode.toDataURL(currentQR);
    res.send(`<div style="text-align:center;padding:40px;font-family:sans-serif;"><h1>🤖 Scan ${BOT_NAME} QR</h1><img src="${qrImage}" style="width:320px;border:5px solid #25D366;border-radius:20px;" /><p>${RENDER_URL}</p></div>`);
});
app.listen(PORT, () => console.log('Server:', RENDER_URL));

// V6.6: Deep ViewOnce Finder + FULL DEBUG LOGS
function findViewOnce(msg) {
    console.log('[MSG DUMP]', JSON.stringify(Object.keys(msg), null, 2)); // LOG TOP KEYS
    let current = msg;
    let depth = 0;
    while (depth < 6) { // Max 6 layers deep
        const mtype = getContentType(current);
        console.log('[CHECK LAYER]', depth, mtype); // LOG LAYER TYPE
        if (!mtype) break;
        
        const content = current[mtype];
        // Case 1: Old imageMessage.viewOnce
        if ((mtype === 'imageMessage' || mtype === 'videoMessage') && content.viewOnce) {
            console.log('[VV FOUND] Case 1:', mtype);
            return { isVV: true, realMsg: current, type: mtype };
        }
        // Case 2: ALL viewOnceMessage versions
        if (mtype.includes('viewOnceMessage')) { 
            console.log('[VV FOUND] Case 2:', mtype, Object.keys(content.message)[0]);
            return { isVV: true, realMsg: content.message, type: Object.keys(content.message)[0] };
        }
        // Case 3: ephemeralMessage wrapper
        if (mtype === 'ephemeralMessage') {
            current = content.message;
            depth++;
            continue;
        }
        break;
    }
    console.log('[NOT VV]');
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
        syncFullHistory: true
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, qr } = update;
        if (qr) {
            currentQR = qr;
            try {
                const qrBuffer = await QRCode.toBuffer(qr);
                await sock.sendMessage(OWNER_NUMBER, { image: qrBuffer, caption: `*${BOT_NAME} V6.6 QR*\nScan at: ${RENDER_URL}` });
            } catch(e){}
        }
        if (connection === 'open') {
            currentQR = null;
            await sock.sendMessage(OWNER_NUMBER, { text: `✅ ${BOT_NAME} V6.6 Online\nType.menu |.vv to expose View Once\nCheck Render Logs for [MSG DUMP]` });
        } else if (connection === 'close' && update.lastDisconnect.error?.output?.statusCode!== DisconnectReason.loggedOut) {
            startBot();
        }
    });

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

    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            for (const msg of messages) {
                if (!msg.message || msg.key.remoteJid === 'status@broadcast') continue;
                const from = msg.key.remoteJid;
                const isGroup = from.endsWith('@g.us');
                const isFromMe = msg.key.fromMe;
                const isOwner = from === OWNER_NUMBER || isFromMe;

                if (antiDelete &&!isGroup) {
                    msgStore.set(msg.key.id, { 
                        msg, from, 
                        sender: jidNormalizedUser(msg.key.participant || from),
                        timestamp: msg.messageTimestamp
                    });
                }

                // V6.6: DEEP SCAN FOR VIEW ONCE - REMOVED isFromMe check for testing
                const vvCheck = findViewOnce(msg.message);
                if (vvCheck.isVV &&!isGroup) { 
                    vvStore.set(msg.key.id, { msg, from, sender: jidNormalizedUser(msg.key.participant || from), realMsg: vvCheck.realMsg });
                    console.log('[VV SAVED V6.6]', msg.key.id, vvCheck.type, from);
                    await sock.sendMessage(OWNER_NUMBER, { 
                        text: `👻 *View Once Saved V6.6*\nFrom: ${(await sock.getName(from)) || from.split('@')[0]}\nType: ${vvCheck.type}\nID: \`${msg.key.id}\`\nReply to this with.vv` 
                    }).catch(()=>{});
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
                const quotedId = msg.message.extendedTextMessage?.contextInfo?.stanzaId;

                switch (command) {
                    case '.menu': case 'menu': case '.help':
                        await sock.sendMessage(from, { image: { url: MENU_IMAGE_URL }, caption: MENU_TEXT });
                        break;
                    case '.ping':
                        const start = Date.now();
                        await sock.sendMessage(from, { text: '🏓 Pinging...' });
                        const speed = Date.now() - start;
                        await sock.sendMessage(from, { text: `🏓 *Pong!* \n⚡ *Speed:* \`${speed}ms\`` });
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
                        await sock.sendMessage(from, { text: `🗂️ *Cache Status*\nAntiDelete: \`${msgStore.size}/${MAX_CACHE}\`\nVV: \`${vvStore.size}/${MAX_VV_CACHE}\`` });
                        break;
                    
                    case '.vv':
                        if (!quotedId) return await sock.sendMessage(from, { text: '❌ Reply to the *View Once* message with.vv' });
                        console.log('[VV REQUEST V6.6]', quotedId, 'Cache:', vvStore.has(quotedId));
                        
                        const vv = vvStore.get(quotedId);
                        if (!vv) return await sock.sendMessage(from, { text: `❌ View Once not found or expired from cache\nID: \`${quotedId}\`\nCache size: ${vvStore.size}` });
                        
                        const vvType = Object.keys(vv.realMsg)[0];
                        await sock.sendMessage(OWNER_NUMBER, { text: `👻 *VIEW ONCE EXPOSED V6.6*\nFrom: ${(await sock.getName(vv.sender)) || vv.sender.split('@')[0]}\nType: ${vvType}` });
                        
                        const fakeMsg = { key: vv.msg.key, message: vv.realMsg };
                        const buffer = await downloadMediaMessage(fakeMsg, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
                        const sendObj = {};
                        sendObj[vvType.replace('Message','')] = buffer;
                        sendObj.mimetype = vv.realMsg[vvType].mimetype;
                        if(vvType === 'imageMessage') sendObj.caption = vv.realMsg[vvType].caption || '';
                        await sock.sendMessage(OWNER_NUMBER, sendObj);
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
        } catch(e) { console.log('Main error:', e.message); }
    });

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
                        
                        if (type === 'imageMessage' || type === 'videoMessage' || type === 'audioMessage' || type === 'documentMessage' || type === 'stickerMessage') {
                            const buffer = await downloadMediaMessage(stored.msg, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
                            const sendObj = {};
                            sendObj[type.replace('Message','')] = buffer;
                            sendObj.mimetype = stored.msg.message[type].mimetype;
                            if(type === 'imageMessage') sendObj.caption = stored.msg.message[type].caption || '';
                            await sock.sendMessage(OWNER_NUMBER, sendObj).catch(()=>{});
                        } else {
                            await sock.sendMessage(OWNER_NUMBER, stored.msg.message).catch(()=>{});
                        }
                        msgStore.delete(key.id);
                    }
                }
            }
        } catch(e) { console.log('AntiDelete error:', e.message); }
    });
}

startBot();
