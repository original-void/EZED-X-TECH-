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
let autoViewStatus = true; // CHANGED: ON by default now
let autoReadMessages = false;
let autoReactDM = false;
let antiDelete = true;

const msgStore = new Map();
const vvStore = new Map(); 
const REACT_EMOJIS = ['❤️', '🔥', '😍', '💯', '👀', '😂', '🫡', '✨', '💀', '🥶'];

// GAME STORAGE
const tttGames = new Map();
const guessGames = new Map();

let currentQR = null;
let sock;

setInterval(() => { axios.get(RENDER_URL).catch(()=>{}); }, 3 * 60 * 1000);

// V7.9 MENU
const MENU_TEXT = `
╭══════════════╮
║ 👑 ${BOT_NAME} V7.9 👑 ║
║ 𝗚𝗔𝗠𝗘𝗦 + 𝗔𝗨𝗧𝗢 𝗩𝗜𝗘𝗪 ║
╰══════════════╯

┏━━━━━━━━━━〔 𝗦𝗬𝗦𝗧𝗘𝗠 〕━━━━━━━━━━┓
┃ 📛 𝗕𝗼𝘁 : ${BOT_NAME} V7.9
┃ 👀 𝗔𝘂𝘁𝗼𝗩𝗶𝗲𝘄 : \`${autoViewStatus? 'ON ✅' : 'OFF ❌'}\`
┃ 🛡️ 𝗔𝗻𝘁𝗶𝗗𝗲𝗹𝗲𝘁𝗲 : \`${antiDelete? 'ON ✅' : 'OFF ❌'}\`
┃ 🗂️ 𝗖𝗮𝗰𝗵𝗲 : \`${msgStore.size}\` | 👻 𝗩𝗩 : \`${vvStore.size}\`
┗━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━〔 𝗚𝗔𝗠𝗘𝗦 🎮 〕━━━━━━━━━━┓
┃ 𝟭. \`.tictactoe\` > X vs O ❌⭕
┃ \`.1\` to \`.9\` > Place move
┃ 𝟮. \`.guess\` > Guess 1-100 🔢
┃ 𝟯. \`.rps\` > Rock Paper Scissors ✊
┗━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━〔 𝗔𝗨𝗧𝗢 〕━━━━━━━━━━┓
┃ 𝟰. \`.aview on/off\` > Auto View Status
┃ 𝟱. \`.arec on/off\` > Recording 🎤
┃ 𝟲. \`.atype on/off\` > Typing ⌨️
┃ 𝟳. \`.aread on/off\` > Read DMs 📖
┃ 𝟴. \`.areact on/off\` > React DMs 😈
┃ 𝟵. \`.antidelete on/off\` > AntiDelete 🗑️
┗━━━━━━━━━━━━━━━┛
*No status spam DMs. Silent view only*
`;

app.get('/', async (req, res) => {
    if (!currentQR) return res.send(`<h1>🤖 ${BOT_NAME} V7.9 Online</h1>`);
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

// TIC TAC TOE FUNCTIONS
function newTTT() { return { board: Array(9).fill(' ') }; }
function tttBoard(b) {
    return `\`\`
 ${b[0]} | ${b[1]} | ${b[2]}
---+
 ${b[3]} | ${b[4]} | ${b[5]}
---+
 ${b[6]} | ${b[7]} | ${b[8]}
\`\nSend \`.1\` to \`.9\``;
}
function checkWin(b, p) {
    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    return wins.some(w => w.every(i => b[i] === p));
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
        getMessage: async key => msgStore.get(key.id)?.msg?.message || { conversation: '' }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, qr } = update;
        if (qr) {
            currentQR = qr;
            const qrBuffer = await QRCode.toBuffer(qr);
            await sock.sendMessage(OWNER_NUMBER, { image: qrBuffer, caption: `*${BOT_NAME} V7.9 QR*` }).catch(()=>{});
        }
        if (connection === 'open') {
            currentQR = null;
            await sock.sendMessage(OWNER_NUMBER, { text: `✅ ${BOT_NAME} V7.9 Online\n👀 Auto View Status: ON` });
        } else if (connection === 'close' && update.lastDisconnect.error?.output?.statusCode!== DisconnectReason.loggedOut) {
            startBot();
        }
    });

    // V7.9: AUTO VIEW STATUS - SILENT, NO DM SPAM
    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
            if (msg.key.remoteJid === 'status@broadcast' && msg.key.participant &&!msg.key.fromMe) {
                try {
                    if (autoViewStatus) {
                        await sock.readMessages([msg.key]); // Only marks as seen. No reply.
                        console.log('[STATUS VIEWED]', msg.key.participant);
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
                const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
                const command = text.toLowerCase().trim();

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
                        await sock.sendMessage(OWNER_NUMBER, { text: `👻 *VIEW ONCE V7.9*\nFrom: ${fromName}` });
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

                // GAMES LOGIC
                if (command === '.tictactoe') {
                    tttGames.set(from, newTTT());
                    await sock.sendMessage(from, { text: `❌⭕ *TicTacToe Started!*\nYou = X | Bot = O\n${tttBoard(Array(9).fill(' '))}` });
                    continue;
                }
                if (/^\.[1-9]$/.test(command) && tttGames.has(from)) {
                    const game = tttGames.get(from);
                    const pos = parseInt(command[1]) - 1;
                    if (game.board[pos]!== ' ') return sock.sendMessage(from, { text: '❌ Spot taken.' });
                    game.board[pos] = 'X';
                    if (checkWin(game.board, 'X')) {
                        tttGames.delete(from);
                        return sock.sendMessage(from, { text: `You Win! 🎉\n${tttBoard(game.board)}` });
                    }
                    if (!game.board.includes(' ')) {
                        tttGames.delete(from);
                        return sock.sendMessage(from, { text: `Draw! 🤝\n${tttBoard(game.board)}` });
                    }
                    const empty = game.board.map((v,i)=>v===' '?i:null).filter(v=>v!==null);
                    const botPos = empty[Math.floor(Math.random()*empty.length)];
                    game.board[botPos] = 'O';
                    if (checkWin(game.board, 'O')) {
                        tttGames.delete(from);
                        return sock.sendMessage(from, { text: `Bot Wins! 🤖\n${tttBoard(game.board)}` });
                    }
                    await sock.sendMessage(from, { text: `Your move:\n${tttBoard(game.board)}` });
                    continue;
                }
                if (command === '.guess') {
                    guessGames.set(from, { number: Math.floor(Math.random()*100)+1, tries: 0 });
                    await sock.sendMessage(from, { text: `🔢 *Guess 1-100 Started!*\nSend a number.` });
                    continue;
                }
                if (/^\d+$/.test(command) && guessGames.has(from)) {
                    const game = guessGames.get(from);
                    const num = parseInt(command);
                    game.tries++;
                    if (num === game.number) {
                        guessGames.delete(from);
                        return sock.sendMessage(from, { text: `🎉 Correct! ${num} in ${game.tries} tries` });
                    }
                    await sock.sendMessage(from, { text: num < game.number? `📈 Higher!` : `📉 Lower!` });
                    continue;
                }
                if (command === '.rps') {
                    await sock.sendMessage(from, { text: `✊📄✂️ *RPS*\nReply: \`rock\` \`paper\` \`scissors\`` });
                    continue;
                }
                if (['rock','paper','scissors'].includes(command)) {
                    const choices = ['rock','paper','scissors'];
                    const bot = choices[Math.floor(Math.random()*3)];
                    let result = 'Draw 🤝';
                    if ((command==='rock'&&bot==='scissors')||(command==='paper'&&bot==='rock')||(command==='scissors'&&bot==='paper')) result = 'You Win! 🎉';
                    if ((bot==='rock'&&command==='scissors')||(bot==='paper'&&command==='rock')||(bot==='scissors'&&command==='paper')) result = 'Bot Wins! 🤖';
                    await sock.sendMessage(from, { text: `You: ${command} vs Bot: ${bot}\n${result}` });
                    continue;
                }

                // CMDS
                switch (command) {
                    case '.menu': await sock.sendMessage(from, { image: { url: MENU_IMAGE_URL }, caption: MENU_TEXT }); break;
                    case '.ping': const s = Date.now(); await sock.sendMessage(from, { text: `🏓 Pong \`${Date.now() - s}ms\`` }); break;
                    case '.time': await sock.sendMessage(from, { text: `🕒 \`${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}\`` }); break;
                    case '.jid': await sock.sendMessage(from, { text: `🆔 \`${from}\`` }); break;
                    case '.owner': await sock.sendMessage(from, { text: '👑 `254769532338`' }); break;
                    case '.cache': await sock.sendMessage(from, { text: `🗂️ Cache: \`${msgStore.size}\`\n👻 VV: \`${vvStore.size}\`` }); break;
                    case '.logs': await sock.sendMessage(from, { text: `🧪 VV Count: \`${vvStore.size}\`` }); break;
                    
                    case '.aview on': autoViewStatus = true; await sock.sendMessage(from, { text: '👀 Auto View Status: `ON ✅`' }); break;
                    case '.aview off': autoViewStatus = false; await sock.sendMessage(from, { text: '👀 Auto View Status: `OFF ❌`' }); break;
                    case '.arec on': autoRecording = true; await sock.sendMessage(from, { text: '🎤 ON' }); break;
                    case '.arec off': autoRecording = false; await sock.sendMessage(from, { text: '🎤 OFF' }); break;
                    case '.atype on': autoTyping = true; await sock.sendMessage(from, { text: '⌨️ ON' }); break;
                    case '.atype off': autoTyping = false; await sock.sendMessage(from, { text: '⌨️ OFF' }); break;
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
                        if (['imageMessage','videoMessage','audioMessage','documentMessage','stickerMessage'].includes(type)) {
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
