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
const math = require('mathjs');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const BOT_NAME = 'EZED X TECH';
const OWNER_NUMBER = '87433337143370@s.whatsapp.net'; // V9.7: Your LID from.jid
const MENU_IMAGE_URL = 'https://files.catbox.moe/poo7ky.png';
const RENDER_URL = 'https://ezed-x-tech-2.onrender.com';
const MISTRAL_KEY = 'PASTE_MISTRAL_KEY_HERE';

let autoRecording = true; let autoTyping = true; let autoViewStatus = true;
let autoLikeStatus = true; let autoReadMessages = false; let autoReactDM = false;
let antiDelete = true; let autoOnline = true; let autoReply = false;
let autoReplyText = `👋 *${BOT_NAME}* is Auto Replying.\n\nI'm currently busy. I'll get back to you soon. ✅`;

const msgStore = new Map(); const vvStore = new Map(); 
const notesDB = new Map(); const warningsDB = new Map(); 
const groupSettings = new Map(); 
const REACT_EMOJIS = ['❤️', '🔥', '😍', '💯', '👀', '😂', '🫡', '✨', '💀', '🥶', '⚡', '✅', '🚀'];
const repliedTo = new Set();
const tttGames = new Map(); const guessGames = new Map();
const getNumber = (jid) => jidNormalizedUser(jid).replace(/[^0-9]/g, '');

// V10.0 COMMAND HANDLER
const commands = new Map();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.set(command.name, command);
}

let currentQR = null; let sock;
setInterval(() => { axios.get(RENDER_URL).catch(()=>{}); }, 3 * 60 * 1000);

// V10.2 DECORATED MENU
const MENU_TEXT = `
╭━━━❖〔 👑 *EZED X TECH V10.2* 〕❖━━━╮
┃ ✨ *𝗧𝗛𝗘 𝗠𝗢𝗦𝗧 𝗣𝗢𝗪𝗘𝗥𝗙𝗨𝗟 𝗪𝗔 𝗕𝗢𝗧* ✨ ┃
╰━━━━━━━━╯

╭━━━❖〔 👑 *GROUP ADMIN* 〕❖━━━╮
┃ 🥾 \`.kick @user\` ➜ Remove member
┃ ➕ \`.add 2547...\` ➜ Add by number 
┃ ⬆️ \`.promote @user\` ➜ Make admin
┃ ⬇️ \`.demote @user\` ➜ Remove admin
┃ 🔇 \`.mute\` ➜ Lock group
┃ 🔓 \`.unmute\` ➜ Unlock group
┃ ⚠️ \`.warn @user\` ➜ 3 warns = kick
┃ 📊 \`.warnings @user\` ➜ Check warns
┃ 📢 \`.tagall\` ➜ Tag everyone
┃ 👻 \`.hidetag text\` ➜ Hidden tag
┃ 🚫 \`.antilink on/off\`➜ Block links
┃ 👋 \`.welcome on/off\` ➜ Auto welcome
┃ 🚪 \`.leave\` ➜ Bot exits group
╰━━━━━━━━━━━━━━━╯

╭━━━❖〔 ✨ *AI + TOOLS* 〕❖━━━╮
┃ 📄 \`.summarize\` ➜ Summarize text
┃ 🌍 \`.translate sw\` ➜ Translate lang
┃ ✅ \`.grammar\` ➜ Fix grammar
┃ 🧮 \`.calc 2+2*5\` ➜ Calculator
┃ ⬇️ \`.video url\` ➜ Download video
┃ 🗒️ \`.notes save/list/del\` ➜ Notepad
╰━━━━━━━━━━━━━╯

╭━━━❖〔 🎮 *GAMES* 〕❖━━━╮
┃ ❌⭕ \`.tictactoe\` ➜ Play X vs Bot
┃ 🔢 \`.guess\` ➜ Guess 1-100
┃ ✊ \`.rps\` ➜ Rock Paper Scissors
╰━━━━━━━━━╯

╭━━━❖〔 ⚙️ *SYSTEM* 〕❖━━━╮
┃ 📜 \`.menu\` ➜ Show this menu
┃ 🏓 \`.ping\` ➜ Check speed
┃ 🕒 \`.time\` ➜ KE Time
┃ 🆔 \`.jid\` ➜ Get JID
┃ 👑 \`.owner\` ➜ Owner number
┃ 🗂️ \`.cache\` ➜ Bot cache
┃ 🔄 \`.logout\` ➜ Re-login bot [OWNER]
╰━━━━━━━━━╯

╭━━━❖〔 🔧 *OWNER PANEL* 〕❖━━━╮
┃ 🟢 \`.aonline.on/off\` ➜ Auto Online
┃ 🤖 \`.autoreply.on/off\`➜ Auto Reply DM
┃ 👀 \`.aview.on/off\` ➜ View Status
┃ ❤️ \`.alike.on/off\` ➜ Like Status
┃ 📖 \`.aread.on/off\` ➜ Auto Read
┃ 😈 \`.areact.on/off\` ➜ Auto React DM
┃ 🛡️ \`.antidelete.on/off\` ➜ Anti Delete
┃ 🎤 \`.arec.on/off\` ➜ Recording
┃ ⌨️ \`.atype.on/off\` ➜ Typing
┃ ✍️ \`.setreply text\` ➜ Set DM Reply
╰━━━━━━━━╯
`;

app.get('/', async (req, res) => {
    if (!currentQR) return res.send(`<h1>🤖 ${BOT_NAME} V10.2 Online</h1>`);
    const qrImage = await QRCode.toDataURL(currentQR);
    res.send(`<div style="text-align:center;padding:40px;"><h1>🤖 Scan QR</h1><img src="${qrImage}" style="width:320px;" /></div>`);
});
app.listen(PORT, () => console.log(`✅ Server: ${RENDER_URL}`));

function unwrapViewOnce(msg) {
    let m = msg.message; let depth = 0;
    while (m && depth < 3) {
        const type = getContentType(m);
        if (type === 'imageMessage' || type === 'videoMessage') {
            if (m[type]?.viewOnce === true) return { isVV: true, realType: type, realMsg: m };
        }
        if (type === 'ephemeralMessage' || type.includes('viewOnceMessage')) {
            m = m[type]?.message; depth++; continue;
        }
        break;
    }
    return { isVV: false };
}

function newTTT() { return { board: Array(9).fill(' ') }; }
function tttBoard(b) {
    return `\`\`
 ${b[0]} | ${b[1]} | ${b[2]}
---+---
 ${b[3]} | ${b[4]} | ${b[5]}
---+---
 ${b[6]} | ${b[7]} | ${b[8]}
\`\`
Send \`.1\` to \`.9\``;
}
function checkWin(b, p) {
    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    return wins.some(w => w.every(i => b[i] === p));
}

async function reactToCommand(from, key) {
    const emoji = REACT_EMOJIS[Math.floor(Math.random() * REACT_EMOJIS.length)];
    await sock.sendMessage(from, { react: { text: emoji, key: key } }).catch(()=>{});
}

async function callAI(prompt) {
    if (!MISTRAL_KEY || MISTRAL_KEY === 'PASTE_MISTRAL_KEY_HERE') {
        return "❌ Add your Mistral API key in code first.";
    }
    try {
        const res = await axios.post('https://api.mistral.ai/v1/chat/completions', {
            model: "mistral-tiny", messages: [{ role: "user", content: prompt }], max_tokens: 500
        }, { headers: { 'Authorization': `Bearer ${MISTRAL_KEY}` } });
        return res.data.choices[0].message.content;
    } catch (e) { return "❌ AI Error. Check key or quota."; }
}

async function downloadVideo(url) { return { title: 'Video Download', url: url }; }

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        logger: pino({ level: 'silent' }), auth: state, version,
        browser: [BOT_NAME, 'Chrome', '1.0.0'],
        markOnlineOnConnect: true, syncFullHistory: false,
        getMessage: async key => msgStore.get(key.id)?.msg?.message || { conversation: '' }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, qr } = update;
        if (qr) {
            currentQR = qr;
            const qrBuffer = await QRCode.toBuffer(qr);
            await sock.sendMessage(OWNER_NUMBER, { image: qrBuffer, caption: `*${BOT_NAME} V10.2 QR*` }).catch(()=>{});
        }
        if (connection === 'open') {
            currentQR = null;
            await sock.sendMessage(OWNER_NUMBER, { text: `✅ ${BOT_NAME} V10.2 HANDLER Online` });
        } else if (connection === 'close' && update.lastDisconnect.error?.output?.statusCode!== DisconnectReason.loggedOut) {
            startBot();
        }
    });

    sock.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update;
        const settings = groupSettings.get(id) || {};
        if (action === 'add' && settings.welcome) {
            for (const user of participants) {
                await sock.sendMessage(id, { text: `👋 Welcome @${user.split('@')[0]} to the group!\nEnjoy your stay ✅` });
            }
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
            if (msg.key.remoteJid === 'status@broadcast' && msg.key.participant &&!msg.key.fromMe) {
                try {
                    if (autoViewStatus) { await new Promise(r => setTimeout(r, 1000)); await sock.readMessages([msg.key]); }
                    if (autoLikeStatus) { await new Promise(r => setTimeout(r, 1500)); const randomEmoji = REACT_EMOJIS[Math.floor(Math.random() * REACT_EMOJIS.length)]; await sock.sendMessage(msg.key.participant, { react: { text: randomEmoji, key: msg.key } }); }
                } catch (e) {}
            }
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            for (const msg of messages) {
                if (!msg.message || msg.key.remoteJid === 'status@broadcast') continue;
                const from = msg.key.remoteJid; const isGroup = from.endsWith('@g.us');
                const isFromMe = msg.key.fromMe; const isOwner = from === OWNER_NUMBER || isFromMe;
                const sender = jidNormalizedUser(msg.key.participant || from);
                const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
                const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
                const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || '';
                
                const command = text.toLowerCase().trim().replace(/^\//, '.'); 
                const args = text.slice(text.split(' ')[0].length).trim();
                const mentions = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];

                if (isGroup) {
                    const settings = groupSettings.get(from) || {};
                    if (settings.antilink &&!isFromMe && (text.includes('http://') || text.includes('https://'))) {
                        const groupMeta = await sock.groupMetadata(from).catch(()=>null);
                        if(groupMeta) {
                            const isAdmin = groupMeta.participants.find(p => getNumber(p.id) === getNumber(sender))?.admin;
                            if (!isAdmin) {
                                await sock.sendMessage(from, { delete: msg.key }).catch(()=>{});
                                await sock.sendMessage(from, { text: `🚫 @${sender.split('@')[0]} Links not allowed`, mentions: [sender] });
                            }
                        }
                    }
                }

                if (antiDelete &&!isGroup &&!isFromMe) { msgStore.set(msg.key.id, { msg, from, sender, timestamp: msg.messageTimestamp }); }
                if (autoReply &&!isGroup &&!isFromMe &&!isOwner &&!repliedTo.has(from)) {
                    await sock.sendPresenceUpdate('composing', from); await new Promise(r => setTimeout(r, 800));
                    await sock.sendMessage(from, { text: autoReplyText });
                    repliedTo.add(from); setTimeout(() => repliedTo.delete(from), 1000 * 60 * 30);
                }
                if (!isGroup &&!isFromMe) {
                    const { isVV, realType, realMsg } = unwrapViewOnce(msg);
                    if (isVV) {
                        const fromName = await sock.getName(from) || from.split('@')[0];
                        await sock.sendMessage(OWNER_NUMBER, { text: `👻 *VIEW ONCE V10.2*\nFrom: ${fromName}` });
                        try {
                            const buffer = await downloadMediaMessage({ key: msg.key, message: realMsg }, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
                            const sendObj = {}; sendObj[realType.replace('Message','')] = buffer;
                            sendObj.mimetype = realMsg[realType].mimetype;
                            if(realType === 'imageMessage') sendObj.caption = realMsg[realType].caption || '';
                            await sock.sendMessage(OWNER_NUMBER, sendObj); vvStore.set(msg.key.id, 1);
                        } catch (err) {}
                    }
                }

                if (autoReadMessages) await sock.readMessages([msg.key]);
                if (autoReactDM &&!isFromMe &&!isGroup) {
                    await sock.sendMessage(from, { react: { text: REACT_EMOJIS[Math.floor(Math.random() * REACT_EMOJIS.length)], key: msg.key } }).catch(()=>{});
                }

                const isAllowedUser = isOwner ||!isGroup; 
                if (!isAllowedUser) continue;

                if (autoOnline) await sock.sendPresenceUpdate('available', from);
                if (autoTyping) await sock.sendPresenceUpdate('composing', from);
                if (autoRecording) await sock.sendPresenceUpdate('recording', from);

                if (command.startsWith('.')) {
                    await reactToCommand(from, msg.key);
                    const cmdName = command.slice(1).split(' ')[0];
                    const cmd = commands.get(cmdName);
                    
                    if (cmd) {
                        try {
                            const ctx = { from, sender, args, mentions, isGroup, isOwner, groupSettings, getNumber, groupMeta: null, botIsAdmin: false, senderIsAdmin: false, tttGames, guessGames, notesDB, warningsDB, callAI, downloadVideo, MENU_TEXT, MENU_IMAGE_URL };
                            if(isGroup) {
                                ctx.groupMeta = await sock.groupMetadata(from).catch(()=>null);
                                const senderNum = getNumber(sender);
                                const botNum = getNumber(sock.user.id);
                                ctx.senderIsAdmin = ctx.groupMeta?.participants.find(p => getNumber(p.id) === senderNum)?.admin;
                                ctx.botIsAdmin = ctx.groupMeta?.participants.find(p => getNumber(p.id) === botNum)?.admin;
                            }
                            await cmd.execute(sock, msg, ctx);
                        } catch (err) { await sock.sendMessage(from, { text: `❌ Command error: ${err.message}` }); }
                    }
                }
                
                if(isOwner){
                    switch (command) {
                        case '.aonline on': autoOnline = true; await sock.sendMessage(from, { text: '🟢 Online: ON' }); break;
                        case '.aonline off': autoOnline = false; await sock.sendMessage(from, { text: '🟢 Online: OFF' }); break;
                        case '.autoreply on': autoReply = true; repliedTo.clear(); await sock.sendMessage(from, { text: `🤖 AutoReply: ON` }); break;
                        case '.autoreply off': autoReply = false; await sock.sendMessage(from, { text: '🤖 AutoReply: OFF' }); break;
                        case '.aview on': autoViewStatus = true; await sock.sendMessage(from, { text: '👀 View: ON' }); break;
                        case '.aview off': autoViewStatus = false; await sock.sendMessage(from, { text: '👀 View: OFF' }); break;
                        case '.alike on': autoLikeStatus = true; await sock.sendMessage(from, { text: '❤️ Like: ON' }); break;
                        case '.alike off': autoLikeStatus = false; await sock.sendMessage(from, { text: '❤️ Like: OFF' }); break;
                        case '.arec on': autoRecording = true; await sock.sendMessage(from, { text: '🎤 Recording: ON' }); break;
                        case '.arec off': autoRecording = false; await sock.sendMessage(from, { text: '🎤 Recording: OFF' }); break;
                        case '.atype on': autoTyping = true; await sock.sendMessage(from, { text: '⌨️ Typing: ON' }); break;
                        case '.atype off': autoTyping = false; await sock.sendMessage(from, { text: '⌨️ Typing: OFF' }); break;
                        case '.aread on': autoReadMessages = true; await sock.sendMessage(from, { text: '📖 Read: ON' }); break;
                        case '.aread off': autoReadMessages = false; await sock.sendMessage(from, { text: '📖 Read: OFF' }); break;
                        case '.areact on': autoReactDM = true; await sock.sendMessage(from, { text: '😈 React: ON' }); break;
                        case '.areact off': autoReactDM = false; await sock.sendMessage(from, { text: '😈 React: OFF' }); break;
                        case '.antidelete on': antiDelete = true; await sock.sendMessage(from, { text: '🛡️ AntiDelete: ON' }); break;
                        case '.antidelete off': antiDelete = false; await sock.sendMessage(from, { text: '🛡️ AntiDelete: OFF' }); break;
                        case '.logout': await sock.logout(); await sock.end(); await sock.sendMessage(OWNER_NUMBER, { text: '✅ Logged out. Rescan QR now.' }); process.exit(1); break;
                    }
                    if (command.startsWith('.setreply ')) { autoReplyText = text.slice(10).trim(); await sock.sendMessage(from, { text: `✍️ Reply updated:\n\`\`${autoReplyText}\`\`` }); continue; }
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
                        if (['imageMessage','videoMessage','audioMessage','documentMessage','stickerMessage'].includes(type)) {
                            const buffer = await downloadMediaMessage(stored.msg, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
                            const sendObj = {}; sendObj[type.replace('Message','')] = buffer;
                            sendObj.mimetype = stored.msg.message[type].mimetype;
                            if(type === 'imageMessage') sendObj.caption = stored.msg.message[type].caption || '';
                            await sock.sendMessage(OWNER_NUMBER, sendObj);
                        } else { await sock.sendMessage(OWNER_NUMBER, stored.msg.message); }
                    } catch (e) {}
                    msgStore.delete(key.id);
                }
            }
        }
    });
}
startBot();
