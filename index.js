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
const fs = require('fs'); // 1. KEEP FS

const app = express();
const PORT = process.env.PORT || 3000;

const BOT_NAME = 'EZED X TECH';
const OWNER_NUMBER = '87433337143370@s.whatsapp.net';
const MENU_IMAGE_URL = 'https://files.catbox.moe/poo7ky.png';
const RENDER_URL = 'https://ezed-x-tech-2.onrender.com';
const MISTRAL_KEY = 'PASTE_MISTRAL_KEY_HERE';
const AUTH_PATH = 'auth_info_baileys'; // 2. NAMED PATH

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

// 3. DELETE AUTH ON BOOT = FORCE QR ON RENDER
if (fs.existsSync(AUTH_PATH)) {
    fs.rmSync(AUTH_PATH, { recursive: true, force: true });
    console.log(`🗑️ Deleted ${AUTH_PATH} to force QR`);
}

const commands = new Map();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.set(command.name, command);
}

let currentQR = null; let sock;
setInterval(() => { axios.get(RENDER_URL).catch(()=>{}); }, 3 * 60 * 1000);

app.get('/', async (req, res) => {
    if (!currentQR) return res.send(`<h1>🤖 ${BOT_NAME} V10.10.7 Online</h1><h2>Waiting for QR... Refresh 10s</h2><meta http-equiv="refresh" content="5">`);
    const qrImage = await QRCode.toDataURL(currentQR);
    res.send(`<div style="text-align:center;padding:40px;"><h1>🤖 Scan QR</h1><img src="${qrImage}" style="width:320px;" /></div>`);
});
app.listen(PORT, () => console.log(`✅ Server: ${RENDER_URL}`));

//... KEEP ALL YOUR FUNCTIONS THE SAME...

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_PATH);
    const { version } = await fetchLatestBaileysVersion();
    console.log('WA Version:', version.join('.'));

    sock = makeWASocket({
        logger: pino({ level: 'debug' }), // 4. DEBUG = SEE ERRORS
        auth: state, version,
        browser: [BOT_NAME, 'Chrome', '1.0.0'],
        qrTimeout: 60000, // 5. WAIT 60s FOR RENDER
        markOnlineOnConnect: true, syncFullHistory: false,
        getMessage: async key => msgStore.get(key.id)?.msg?.message || { conversation: '' }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update; // 6. ADDED lastDisconnect
        console.log('UPDATE:', update); // 7. LOG EVERYTHING

        if (qr) {
            currentQR = qr;
            console.log('✅ QR RECEIVED:', qr.substring(0,40)); // 8. LOG QR TEXT
            // 9. DELETED: NO sock.sendMessage QR HERE. THIS WAS THE HANG
        }
        if (connection === 'open') {
            currentQR = null;
            console.log(BOT_NAME + ' Connected');
            await sock.sendMessage(OWNER_NUMBER, { text: `✅ ${BOT_NAME} V10.10.7 HANDLER Online` });
        } else if (connection === 'close') {
            currentQR = null;
            console.log('Closed:', lastDisconnect?.error?.output?.statusCode);
            if (lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut) {
                startBot();
            } else {
                fs.rmSync(AUTH_PATH, { recursive: true, force: true }); // 10. DELETE ON LOGOUT
                startBot();
            }
        }
    });

    //... PASTE ALL YOUR OTHER CODE BELOW. ONLY FIX THIS 1 LINE...

    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            for (const msg of messages) {
                if (!msg.message || msg.key.remoteJid === 'status@broadcast') continue;
                const from = msg.key.remoteJid; const isGroup = from.endsWith('@g.us');
                const isFromMe = msg.key.fromMe; const isOwner = from === OWNER_NUMBER || isFromMe;
                const sender = jidNormalizedUser(msg.key.participant || from);
                const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

                const command = text.toLowerCase().trim().replace(/^\//, '.');
                const args = text.slice(text.split(' ')[0].length).trim();
                const mentions = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];

                //... KEEP ALL YOUR CODE...

                if (command.startsWith('.')) {
                    await reactToCommand(from, msg.key);
                    const cmdName = command.slice(1).split(' ')[0];

                    if(['1','2','3','4','5','6','7','8','9'].includes(cmdName)) {
                        const game = tttGames.get(from);
                        if(game && game.player === sender) {
                            const idx = parseInt(cmdName)-1;
                            if(game.board[idx] === ' ') {
                                game.board[idx] = 'X';
                                if(checkWin(game.board, 'X')) { tttGames.delete(from); return sock.sendMessage(from, { text: `❌⭕ You Win!\n${tttBoard(game.board)}` }); }
                                const botIdx = game.board.findIndex(c => c === '); // 11. FIXED SYNTAX ERROR HERE
                                if(botIdx!== -1) game.board[botIdx] = 'O';
                                if(checkWin(game.board, 'O')) { tttGames.delete(from); return sock.sendMessage(from, { text: `❌⭕ Bot Wins!\n${tttBoard(game.board)}` }); }
                                await sock.sendMessage(from, { text: tttBoard(game.board) });
                            }
                        }
                        continue;
                    }
                    //... REST OF CODE UNCHANGED...
                }
            }
        } catch(e) { console.log('Error:', e); }
    });

    //... KEEP messages.update UNCHANGED...
}
startBot();
