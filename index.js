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

const msgStore = new Map(); // No size limit now
const vvStore = new Map(); // No size limit now
const REACT_EMOJIS = ['❤️', '🔥', '😍', '💯', '👀', '😂', '🫡', '✨', '💀', '🥶'];

let currentQR = null;
let sock;

// NO MORE AUTO CLEANUP. Cache stays forever until restart.

const MENU_TEXT = `
*╭━━━━━━━━━━━━━━╮*
*┃ 👑 ${BOT_NAME} V6.8 👑 ┃*
*╰━━━━━━━━━━━━━━╯*

*╭───〔 𝗜𝗡𝗙𝗢 〕───╮*
*┃ 📛 Bot:* ${BOT_NAME}
*┃ ⚡ Status:* \`Online ✅\`
*┃ 🛡️ AntiDelete:* \`${antiDelete? 'ON' : 'OFF'}\`
*┃ 🗂️ AD Cache:* \`${msgStore.size}\`
*┃ 👻 VV Cache:* \`${vvStore.size}\` *No Limit*
*┃ Mode:* \`Auto Extract ON\`
*╰━━━━━━━━━━━━╯*

*╭───〔 𝗚𝗘𝗡𝗘𝗥𝗔𝗟 〕───╮*
*┃ 1.* \`.menu\` > Show this panel
*┃ 2.* \`.ping\` > Check bot speed ⚡
*┃ 3.* \`.time\` > Kenya time 🕒 
*┃ 4.* \`.jid\` > Get chat ID 🆔
*┃ 5.* \`.owner\` > Show owner 👑
*┃ 6.* \`.cache\` > Check cache size 🗂️
*┃ 7.* \`.vv\` > Manual Extract 👻 *Reply to VV*
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

*${BOT_NAME} | Cache Limit OFF*
`;

app.get('/', async (req, res) => {
    if (!currentQR) return res.send(`<div style="text-align:center;padding:40px;font-family:sans-serif;"><h1>🤖 ${BOT_NAME} V6.8</h1><h2>Waiting for QR... Refresh</h2></div>`);
    const qrImage = await QRCode.toDataURL(currentQR);
    res.send(`<div style="text-align:center;padding:40px;font-family:sans-serif;"><h1>🤖 Scan ${BOT_NAME} QR</h1><img src="${qrImage}" style="width:320px;border:5px solid #25D366;border-radius:20px;" /><p>${RENDER_URL}</p></div>`);
});
app.listen(PORT, () => console.log('Server:', RENDER_URL));

// V6.8: BRUTE FORCE VIEW ONCE CATCHER
function findViewOnce(msg) {
    const str = JSON.stringify(msg);
    if (str.includes('"viewOnce":true')) {
        if (msg.viewOnceMessageV2 || msg.viewOnceMessageV2Extension) {
            const real = msg.viewOnceMessageV2 || msg.viewOnceMessageV2Extension;
            return { isVV: true, realMsg: real.message, type: Object.keys(real.message)[0] };
        }
        if (msg.imageMessage?.viewOnce) return { isVV: true, realMsg: msg, type: 'imageMessage' };
        if (msg.videoMessage?.viewOnce) return { isVV: true, realMsg: msg, type: 'videoMessage' };
        if (msg.ephemeralMessage) return findViewOnce(msg.ephemeralMessage.message);
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
        syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, qr } = update;
        if (qr) {
            currentQR = qr;
            try {
                const qrBuffer = await QRCode.toBuffer(qr);
                await sock.sendMessage(OWNER_NUMBER, { image: qrBuffer, caption: `*${BOT_NAME} V6.8 QR*\nScan at: ${RENDER_URL}` });
            } catch(e){}
        }
        if (connection === 'open') {
            currentQR = null;
            await sock.sendMessage(OWNER_NUMBER, { text: `✅ ${BOT_NAME} V6.8 Online\nMode: Auto Extract View Once` });
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

                // V6.8: CATCH + AUTO EXTRACT VIEW ONCE IMMEDIATELY
                const vvCheck = findViewOnce(msg.message);
                if (vvCheck.isVV &&!isGroup) { 
                    vvStore.set(msg.key.id, { msg, from, sender: jidNormalizedUser(msg.key.participant || from), realMsg: vvCheck.realMsg });
                    console.log('[VV SAVED V6.8]', msg.key.id, vvCheck.type, 'Cache:', vvStore.size);
                    
                    // AUTO SEND TO OWNER NOW. NO.vv NEEDED
                    await sock.sendMessage(OWNER_NUMBER, { text: `👻 *VIEW ONCE CAPTURED V6.8*\nFrom: ${(await sock.getName(from)) || from.split('@')[0]}\nType: ${vvCheck.type}\nSending now...` });
                    
                    const fakeMsg = { key: msg.key, message: vvCheck.realMsg };
                    const buffer = await downloadMediaMessage(fakeMsg, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
                    const sendObj = {};
                    sendObj[vvCheck.type.replace('Message','')] = buffer;
                    sendObj.mimetype = vvCheck.realMsg[vvCheck.type].mimetype;
                    if(vvCheck.type === 'imageMessage') sendObj.caption = vvCheck.realMsg[vvCheck.type].caption || '';
                    await sock.sendMessage(OWNER_NUMBER, sendObj);
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
                        await sock.sendMessage(from, { text: `🗂️ *Cache Status*\nAntiDelete: \`${msgStore.size}\`\nVV: \`${vvStore.size}\` *No Limit*\nBot Uptime: \`${Math.floor(process.uptime())}s\`` });
                        break;
                    
                    case '.vv': // Backup manual method
                        if (!quotedId) return await sock.sendMessage(from, { text: '❌ Reply to the *View Once* message with.vv' });
                        const vv = vvStore.get(quotedId);
                        if (!vv) return await sock.sendMessage(from, { text: `❌ View Once not in cache\nID: \`${quotedId}\`\nCache size: ${vvStore.size}` });
                        
                        const vvType = Object.keys(vv.realMsg)[0];
                        await sock.sendMessage(OWNER_NUMBER, { text: `👻 *MANUAL VV EXTRACT V6.8*\nType: ${vvType}` });
                        
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
