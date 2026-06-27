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
const fs = require('fs'); // For dump

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

const msgStore = new Map();
const vvStore = new Map(); 
const REACT_EMOJIS = ['❤️', '🔥', '😍', '💯', '👀', '😂', '🫡', '✨', '💀', '🥶'];

let currentQR = null;
let sock;

setInterval(() => { axios.get(RENDER_URL).catch(()=>{}); }, 3 * 60 * 1000);

const MENU_TEXT = `
*╭━━━━━━━━━━━━━━╮*
*┃ 👑 ${BOT_NAME} V7.2 👑 ┃*
*╰━━━━━━━━━━━━━━╯*
*┃ Mode:* \`RAW DUMP ON\`
*┃ 🗂️ AD:* \`${msgStore.size}\` | 👻 VV: \`${vvStore.size}\`
*┃ 1.* \`.menu\` 2.* \`.ping\` 3.* \`.time\` 4.* \`.jid\` 5.* \`.owner\`
*┃ 6.* \`.cache\` 7.* \`.logs\` 8.* \`.dump\` > Get last RAW msg
*┃ 9-14.* All auto toggles:.arec.atype.aview.alike.aread.areact.antidelete
`;

app.get('/', async (req, res) => {
    if (!currentQR) return res.send(`<h1>🤖 ${BOT_NAME} V7.2 Debug</h1>`);
    const qrImage = await QRCode.toDataURL(currentQR);
    res.send(`<div style="text-align:center;padding:40px;"><h1>🤖 Scan QR</h1><img src="${qrImage}" style="width:320px;" /></div>`);
});
app.listen(PORT, () => console.log('Server:', RENDER_URL));

let LAST_RAW_MSG = null; // Store last msg for.dump

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
            const qrBuffer = await QRCode.toBuffer(qr);
            await sock.sendMessage(OWNER_NUMBER, { image: qrBuffer, caption: `*${BOT_NAME} V7.2 QR*` }).catch(()=>{});
        }
        if (connection === 'open') {
            currentQR = null;
            await sock.sendMessage(OWNER_NUMBER, { text: `✅ ${BOT_NAME} V7.2 Debug Online\nSend 1 View Once now. Then type.dump` });
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

                const mtype = getContentType(msg.message);
                LAST_RAW_MSG = msg; // SAVE LAST MSG FOR.dump
                
                console.log('[RAW V7.2]', msg.key.id, mtype); // LOG TYPE ONLY
                console.log('[RAW JSON V7.2]', JSON.stringify(msg.message, null, 2)); // LOG FULL JSON

                if (antiDelete &&!isGroup &&!isFromMe) {
                    msgStore.set(msg.key.id, { msg, from, sender: jidNormalizedUser(msg.key.participant || from), timestamp: msg.messageTimestamp });
                }

                // V7.2: GRAB ALL MEDIA + ALL WRAPPERS
                if (!isGroup &&!isFromMe) {
                    let mediaMsg = null;
                    let isVV = false;
                    let realType = mtype;

                    // Case 1: Direct image/video
                    if (mtype === 'imageMessage' || mtype === 'videoMessage') {
                        mediaMsg = msg.message;
                        isVV = msg.message[mtype]?.viewOnce === true;
                    } 
                    // Case 2: viewOnceMessageV2 / V2Extension / V2Extension3 etc
                    else if (mtype && mtype.includes('viewOnceMessage')) {
                        const inner = msg.message[mtype]?.message;
                        realType = Object.keys(inner)[0]; // imageMessage or videoMessage
                        mediaMsg = inner;
                        isVV = true;
                        console.log('[VV WRAPPER HIT]', mtype, realType);
                    }
                    // Case 3: ephemeralMessage wrapper
                    else if (mtype === 'ephemeralMessage') {
                        const inner = msg.message.ephemeralMessage.message;
                        const innerType = getContentType(inner);
                        if(innerType === 'imageMessage' || innerType === 'videoMessage') {
                            mediaMsg = inner;
                            realType = innerType;
                            isVV = inner[innerType]?.viewOnce === true;
                        }
                    }

                    if (mediaMsg) {
                        const fromName = await sock.getName(from) || from.split('@')[0];
                        await sock.sendMessage(OWNER_NUMBER, { text: `📸 *MEDIA CAPTURED V7.2*\nFrom: ${fromName}\nType: ${realType}\nViewOnce: ${isVV}\nWrapper: ${mtype}` });
                        
                        const fakeMsg = { key: msg.key, message: mediaMsg };
                        const buffer = await downloadMediaMessage(fakeMsg, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
                        const sendObj = {};
                        sendObj[realType.replace('Message','')] = buffer;
                        sendObj.mimetype = mediaMsg[realType].mimetype;
                        if(realType === 'imageMessage') sendObj.caption = mediaMsg[realType].caption || '';
                        await sock.sendMessage(OWNER_NUMBER, sendObj);

                        if(isVV) vvStore.set(msg.key.id, msg.key.id);
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
                    case '.ping': const start = Date.now(); await sock.sendMessage(from, { text: '🏓 Pinging...' }); await sock.sendMessage(from, { text: `🏓 *Pong!* \n⚡ *Speed:* \`${Date.now() - start}ms\`` }); break;
                    case '.time': await sock.sendMessage(from, { text: `🕒 *Kenya Time:* \`${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}\`` }); break;
                    case '.jid': await sock.sendMessage(from, { text: `🆔 *Chat JID:* \`${from}\`` }); break;
                    case '.owner': await sock.sendMessage(from, { text: '👑 *Owner:* `254769532338`' }); break;
                    case '.cache': await sock.sendMessage(from, { text: `🗂️ *Cache*\nAD: \`${msgStore.size}\`\nVV: \`${vvStore.size}\`\nUptime: \`${Math.floor(process.uptime()/60)}m\`` }); break;
                    case '.logs': await sock.sendMessage(from, { text: `🧪 *Last 10 VV IDs:*\n\`\`${Array.from(vvStore.keys()).slice(-10).join('\n') || 'None'}\`\`` }); break;
                    case '.dump':
                        if(!LAST_RAW_MSG) return await sock.sendMessage(from, { text: '❌ No message received yet' });
                        const dump = JSON.stringify(LAST_RAW_MSG.message, null, 2);
                        fs.writeFileSync('./last_msg.json', dump);
                        await sock.sendMessage(from, { document: fs.readFileSync('./last_msg.json'), fileName: 'last_msg.json', mimetype: 'application/json', caption: `🧪 *RAW MESSAGE DUMP*\nType: ${getContentType(LAST_RAW_MSG.message)}\nID: ${LAST_RAW_MSG.key.id}` });
                        break;

                    case '.arec on': autoRecording = true; await sock.sendMessage(from, { text: '🎤 ON' }); break;
                    case '.arec off': autoRecording = false; await sock.sendMessage(from, { text: '🎤 OFF' }); break;
                    case '.atype on': autoTyping = true; await sock.sendMessage(from, { text: '⌨️ ON' }); break;
                    case '.atype off': autoTyping = false; await sock.sendMessage(from, { text: '⌨️ OFF' }); break;
                    case '.aview on': autoViewStatus = true; await sock.sendMessage(from, { text: '👀 ON' }); break;
                    case '.aview off': autoViewStatus = false; await sock.sendMessage(from, { text: '👀 OFF' }); break;
                    case '.alike on': autoLikeStatus = true; await sock.sendMessage(from, { text: '❤️ ON' }); break;
                    case '.alike off': autoLikeStatus = false; await sock.sendMessage(from, { text: '❤️ OFF' }); break;
                    case '.aread on': autoReadMessages = true; await sock.sendMessage(from, { text: '📖 ON' }); break;
                    case '.aread off': autoReadMessages = false; await sock.sendMessage(from, { text: '📖 OFF' }); break;
                    case '.areact on': autoReactDM = true; await sock.sendMessage(from, { text: '😈 ON' }); break;
                    case '.areact off': autoReactDM = false; await sock.sendMessage(from, { text: '😈 OFF' }); break;
                    case '.antidelete on': antiDelete = true; await sock.sendMessage(from, { text: '🛡️ ON' }); break;
                    case '.antidelete off': antiDelete = false; await sock.sendMessage(from, { text: '🛡️ OFF' }); break;
                }
                setTimeout(() => sock.sendPresenceUpdate('available', from), 3000);
            }
        } catch(e) { console.log('Main error:', e); }
    });

    sock.ev.on('messages.update', async (updates) => {
        for (const { key, update } of updates) {
            if (antiDelete && update.message === null &&!key.remoteJid?.endsWith('@g.us')) {
                const stored = msgStore.get(key.id);
                if (stored) {
                    const name = await sock.getName(stored.sender) || stored.sender.split('@')[0];
                    await sock.sendMessage(OWNER_NUMBER, { text: `🗑️ *DELETED: ${name}*\n*Type:* ${getContentType(stored.msg.message)}` }).catch(()=>{});
                    const type = getContentType(stored.msg.message);
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
    });
}

startBot();
