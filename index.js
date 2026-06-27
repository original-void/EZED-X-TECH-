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

const app = express();
const PORT = process.env.PORT || 3000;

const BOT_NAME = 'EZED X TECH';
const OWNER_NUMBER = '254769532338@s.whatsapp.net';
const MENU_IMAGE_URL = 'https://files.catbox.moe/poo7ky.png';
const RENDER_URL = 'https://ezed-x-tech-2.onrender.com';
const MISTRAL_KEY = 'leekOeO7HJToWQZ9jXlHXj596KAaEet8'; // <<<< PUT NEW KEY HERE, NOT IN CHAT

let autoRecording = true;
let autoTyping = true;
let autoViewStatus = true;
let autoLikeStatus = true;
let autoReadMessages = false;
let autoReactDM = false;
let antiDelete = true;
let autoOnline = true;
let autoReply = false;
let autoReplyText = `👋 *${BOT_NAME}* is Auto Replying.\n\nI'm currently busy. I'll get back to you soon. ✅`;

const msgStore = new Map();
const vvStore = new Map(); 
const notesDB = new Map();
const REACT_EMOJIS = ['❤️', '🔥', '😍', '💯', '👀', '😂', '🫡', '✨', '💀', '🥶'];
const repliedTo = new Set();

const tttGames = new Map();
const guessGames = new Map();

let currentQR = null;
let sock;

setInterval(() => { axios.get(RENDER_URL).catch(()=>{}); }, 3 * 60 * 1000);

const MENU_TEXT = `
╭══════════════╮
║ 👑 ${BOT_NAME} V8.3 👑 ║
║ 𝗠𝗜𝗦𝗧𝗥𝗔𝗟 𝗔𝗜 𝗣𝗔𝗖𝗞 ║
╰══════════════╯
`;

app.get('/', async (req, res) => {
    if (!currentQR) return res.send(`<h1>🤖 ${BOT_NAME} V8.3 Online</h1>`);
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

async function callAI(prompt) {
    if (!MISTRAL_KEY || MISTRAL_KEY === 'PASTE_MISTRAL_KEY_HERE') {
        return "❌ Add your Mistral API key in code first.";
    }
    try {
        const res = await axios.post('https://api.mistral.ai/v1/chat/completions', {
            model: "mistral-tiny",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 500
        }, {
            headers: { 'Authorization': `Bearer ${MISTRAL_KEY}` }
        });
        return res.data.choices[0].message.content;
    } catch (e) {
        console.log('AI Error:', e.response?.data || e.message);
        return "❌ AI Error. Check key or quota.";
    }
}

async function downloadVideo(url) {
    return { title: 'Video Download', url: url };
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
            await sock.sendMessage(OWNER_NUMBER, { image: qrBuffer, caption: `*${BOT_NAME} V8.3 QR*` }).catch(()=>{});
        }
        if (connection === 'open') {
            currentQR = null;
            await sock.sendMessage(OWNER_NUMBER, { text: `✅ ${BOT_NAME} V8.3 Online\n🧠 Mistral AI Connected` });
        } else if (connection === 'close' && update.lastDisconnect.error?.output?.statusCode!== DisconnectReason.loggedOut) {
            startBot();
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
            if (msg.key.remoteJid === 'status@broadcast' && msg.key.participant &&!msg.key.fromMe) {
                try {
                    if (autoViewStatus) {
                        await new Promise(r => setTimeout(r, 1000));
                        await sock.readMessages([msg.key]);
                    }
                    if (autoLikeStatus) {
                        await new Promise(r => setTimeout(r, 1500));
                        const randomEmoji = REACT_EMOJIS[Math.floor(Math.random() * REACT_EMOJIS.length)];
                        await sock.sendMessage(msg.key.participant, { react: { text: randomEmoji, key: msg.key } });
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
                const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
                const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || '';
                const command = text.toLowerCase().trim();
                const args = text.slice(command.split(' ')[0].length).trim();

                if (antiDelete &&!isGroup &&!isFromMe) {
                    msgStore.set(msg.key.id, { 
                        msg, from, 
                        sender: jidNormalizedUser(msg.key.participant || from),
                        timestamp: msg.messageTimestamp
                    });
                }

                if (autoReply &&!isGroup &&!isFromMe &&!isOwner &&!repliedTo.has(from)) {
                    await sock.sendPresenceUpdate('composing', from);
                    await new Promise(r => setTimeout(r, 800));
                    await sock.sendMessage(from, { text: autoReplyText });
                    repliedTo.add(from);
                    setTimeout(() => repliedTo.delete(from), 1000 * 60 * 30);
                }

                if (!isGroup &&!isFromMe) {
                    const { isVV, realType, realMsg } = unwrapViewOnce(msg);
                    if (isVV) {
                        const fromName = await sock.getName(from) || from.split('@')[0];
                        await sock.sendMessage(OWNER_NUMBER, { text: `👻 *VIEW ONCE V8.3*\nFrom: ${fromName}` });
                        try {
                            const buffer = await downloadMediaMessage({ key: msg.key, message: realMsg }, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
                            const sendObj = {};
                            sendObj[realType.replace('Message','')] = buffer;
                            sendObj.mimetype = realMsg[realType].mimetype;
                            if(realType === 'imageMessage') sendObj.caption = realMsg[realType].caption || '';
                            await sock.sendMessage(OWNER_NUMBER, sendObj);
                            vvStore.set(msg.key.id, 1);
                        } catch (err) {}
                    }
                }

                if (autoReadMessages) await sock.readMessages([msg.key]);
                if (autoReactDM &&!isFromMe &&!isGroup) {
                    await sock.sendMessage(from, { react: { text: REACT_EMOJIS[Math.floor(Math.random() * REACT_EMOJIS.length)], key: msg.key } }).catch(()=>{});
                }

                if (!isOwner) continue;
                if (autoOnline) await sock.sendPresenceUpdate('available', from);
                if (autoTyping) await sock.sendPresenceUpdate('composing', from);
                if (autoRecording) await sock.sendPresenceUpdate('recording', from);

                if (command.startsWith('.summarize')) {
                    const targetText = quotedText || args;
                    if (!targetText) return sock.sendMessage(from, { text: '📄 Reply to a long text with `.summarize`' });
                    await sock.sendMessage(from, { text: '⏳ Summarizing...' });
                    const res = await callAI(`Summarize this in 5 bullet points: ${targetText}`);
                    await sock.sendMessage(from, { text: `📄 *Summary:*\n${res}` });
                    continue;
                }

                if (command.startsWith('.translate')) {
                    const lang = args.split(' ')[0] || 'en';
                    const targetText = quotedText || args.slice(lang.length).trim();
                    if (!targetText) return sock.sendMessage(from, { text: '🌍 Usage: `.translate sw` then reply text' });
                    await sock.sendMessage(from, { text: '⏳ Translating...' });
                    const res = await callAI(`Translate this to ${lang} language only: ${targetText}`);
                    await sock.sendMessage(from, { text: `🌍 *Translated to ${lang}:*\n${res}` });
                    continue;
                }

                if (command.startsWith('.grammar')) {
                    const targetText = quotedText || args;
                    if (!targetText) return sock.sendMessage(from, { text: '✅ Reply to text with `.grammar`' });
                    await sock.sendMessage(from, { text: '⏳ Correcting...' });
                    const res = await callAI(`Correct grammar and spelling only: ${targetText}`);
                    await sock.sendMessage(from, { text: `✅ *Corrected:*\n${res}` });
                    continue;
                }

                if (command.startsWith('.calc')) {
                    const equation = args;
                    if (!equation) return sock.sendMessage(from, { text: '😂 Usage: `.calc 2+2*5`' });
                    try {
                        const result = math.evaluate(equation);
                        await sock.sendMessage(from, { text: `🧮 \`${equation} = ${result}\`` });
                    } catch {
                        await sock.sendMessage(from, { text: '❌ Invalid equation boss 😂' });
                    }
                    continue;
                }

                if (command === '.tictactoe') {
                    tttGames.set(from, newTTT());
                    await sock.sendMessage(from, { text: `❌⭕ *TicTacToe*\nYou = X | Bot = O\n${tttBoard(Array(9).fill(' '))}` });
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

                switch (command) {
                    case '.menu': await sock.sendMessage(from, { image: { url: MENU_IMAGE_URL }, caption: MENU_TEXT }); break;
                    case '.ping': const s = Date.now(); await sock.sendMessage(from, { text: `🏓 Pong \`${Date.now() - s}ms\`` }); break;
                    case '.time': await sock.sendMessage(from, { text: `🕒 \`${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}\`` }); break;
                    case '.aonline on': autoOnline = true; await sock.sendMessage(from, { text: '🟢 ON' }); break;
                    case '.aonline off': autoOnline = false; await sock.sendMessage(from, { text: '🟢 OFF' }); break;
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
                    msgStore.delete(key.id);
                }
            }
        }
    });

}

startBot();
