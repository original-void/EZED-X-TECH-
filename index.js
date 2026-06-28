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
const MISTRAL_KEY = 'leekOeO7HJToWQZ9jXlHXj596KAaEet8';

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
const warningsDB = new Map(); 
const groupSettings = new Map(); 
const REACT_EMOJIS = ['❤️', '🔥', '😍', '💯', '👀', '😂', '🫡', '✨', '💀', '🥶', '⚡', '✅', '🚀'];
const repliedTo = new Set();

const tttGames = new Map();
const guessGames = new Map();

let currentQR = null;
let sock;

setInterval(() => { axios.get(RENDER_URL).catch(()=>{}); }, 3 * 60 * 1000);

// V8.3.5 CEO MENU - FIXED BACKTICKS
const MENU_TEXT = `
╭━━━━━━━━━━━╮
┃ 👑 *${BOT_NAME} V8.3.5* 👑 ┃
┃ *𝗣𝗨𝗕𝗟𝗜𝗖 + 𝗔𝗗𝗠𝗜𝗡 𝗕𝗢𝗧* ┃
╰━━━━━━━━━━━╯

╭──────╮
┃ 🤖 *Bot* : ${BOT_NAME}
┃ 🟢 *Online* : \`${autoOnline? 'ON ✅' : 'OFF ❌'}\`
┃ 🤖 *AutoReply* : \`${autoReply? 'ON ✅' : 'OFF ❌'}\`
┃ 👀 *ViewStatus* : \`${autoViewStatus? 'ON ✅' : 'OFF ❌'}\`
┃ ❤️ *AutoLike* : \`${autoLikeStatus? 'ON ✅' : 'OFF ❌'}\`
┃ 🛡️ *AntiDelete* : \`${antiDelete? 'ON ✅' : 'OFF ❌'}\`
╰───────────────────╯

╭──────╮
┃ *Owner + Group Admin Only*
┃ 
┃ 𝟭. \`.kick @user\` / \`/kick @user\`
┃ 𝟮. \`.add 2547...\` > Add member
┃ 𝟯. \`.promote @user\` > Make admin
┃ 𝟰. \`.demote @user\` > Remove admin
┃ 𝟱. \`.mute\` / \`.unmute\` > Lock chat
┃ 𝟲. \`.warn @user\` > 3 warns = Kick
┃ 𝟳. \`.warnings @user\` > Check warns
┃ 𝟴. \`.tagall\` > Mention all members
┃ 𝟵. \`.hidetag text\` > Hidden tag
┃ 🔟 \`.antilink on/off\` > Block links
┃ 𝟭. \`.welcome on/off\` > Welcome msg
╰─────────────────────────╯

╭──────╮
┃ *Public - DM or Group*
┃
┃ ✨ \`.summarize\` > Reply long text
┃ 🌍 \`.translate sw/en/fr\` 
┃ ✅ \`.grammar\` > Fix your text
┃ 🧮 \`.calc 2+2*5\` > Calculator
┃ ⬇️ \`.video [url]\` > TikTok/YT
┃ 🗒️ \`.notes save/list/del\`
╰─────────────────────╯

╭──────╮
┃ 🎯 \`.tictactoe\` > X vs O
┃ 🔢 \`.guess\` > 1-100 game
┃ ✊ \`.rps\` > Rock Paper Scissors
╰───────────────────╯

╭──────╮
┃ 📜 \`.menu\` > Show this menu
┃ 🏓 \`.ping\` > Check speed
┃ 🕒 \`.time\` > KE Time
┃ 🆔 \`.jid\` > Get chat ID
┃ 👑 \`.owner\` > Contact owner
╰───────────────────╯

╭──────╮
┃ \`.aonline.on/off\` \`.autoreply.on/off\`
┃ \`.setreply text\` \`.aview.on/off\`
┃ \`.alike.on/off\` \`.aread.on/off\`
┃ \`.areact.on/off\` \`.atype.on/off\`
┃ \`.arec.on/off\` \`.antidelete.on/off\`
┃ \`.cache\` \`.logs\`
╰─────────────────────────╯

> *Tip:* Use. or / for all commands
> *Owner:* 254769532338
`;

app.get('/', async (req, res) => {
    if (!currentQR) return res.send(`<h1>🤖 ${BOT_NAME} V8.3.5 Online</h1>`);
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
            await sock.sendMessage(OWNER_NUMBER, { image: qrBuffer, caption: `*${BOT_NAME} V8.3.5 QR*` }).catch(()=>{});
        }
        if (connection === 'open') {
            currentQR = null;
            await sock.sendMessage(OWNER_NUMBER, { text: `✅ ${BOT_NAME} V8.3.5 Public Edition Online` });
        } else if (connection === 'close' && update.lastDisconnect.error?.output?.statusCode!== DisconnectReason.loggedOut) {
            startBot();
        }
    });

    // WELCOME NEW MEMBERS - FIXED
    sock.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update;
        const settings = groupSettings.get(id) || {};
        if (action === 'add' && settings.welcome) {
            for (const user of participants) {
                await sock.sendMessage(id, { 
                    text: `👋 Welcome @${user.split('@')[0]} to the group!\nEnjoy your stay ✅`, 
                    mentions: 
                });
            }
        }
    });

    // AUTO VIEW + AUTO LIKE STATUS
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
                            const isAdmin = groupMeta.participants.find(p => jidNormalizedUser(p.id) === sender)?.admin;
                            if (!isAdmin) {
                                await sock.sendMessage(from, { delete: msg.key }).catch(()=>{});
                                await sock.sendMessage(from, { text: `🚫 @${sender.split('@')[0]} Links are not allowed here`, mentions: [sender] });
                            }
                        }
                    }
                }

                if (antiDelete &&!isGroup &&!isFromMe) {
                    msgStore.set(msg.key.id, { 
                        msg, from, sender, timestamp: msg.messageTimestamp
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
                        await sock.sendMessage(OWNER_NUMBER, { text: `👻 *VIEW ONCE V8.3.5*\nFrom: ${fromName}` });
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

                const isAllowedUser = isOwner ||!isGroup; 
                if (!isAllowedUser) continue;

                if (autoOnline) await sock.sendPresenceUpdate('available', from);
                if (autoTyping) await sock.sendPresenceUpdate('composing', from);
                if (autoRecording) await sock.sendPresenceUpdate('recording', from);

                if (command.startsWith('.')) {
                    await reactToCommand(from, msg.key);
                }

                // ===== GROUP ADMIN COMMANDS - OWNER ONLY =====
                if (isGroup && isOwner) {
                    const groupMeta = await sock.groupMetadata(from).catch(()=>null);
                    if(!groupMeta) continue;

                    const isAdmin = groupMeta.participants.find(p => jidNormalizedUser(p.id) === sender)?.admin;
                    const botJid = jidNormalizedUser(sock.user.id);
                    const botIsAdmin = groupMeta.participants.find(p => jidNormalizedUser(p.id) === botJid)?.admin;
                    
                    if(!botIsAdmin && ['.kick','.add','.promote','.demote','.mute','.unmute'].includes(command.split(' ')[0])){
                        return sock.sendMessage(from, { text: '❌ Bot must be Admin to use this command 👑' });
                    }

                    if (command.startsWith('.kick') && isAdmin) {
                        const target = mentions[0];
                        if (!target) return sock.sendMessage(from, { text: '👑 Usage: `.kick @user`' });
                        await sock.groupParticipantsUpdate(from, [target], 'remove');
                        await sock.sendMessage(from, { text: `👢 Kicked @${target.split('@')[0]}`, mentions: [target] });
                        continue;
                    }

                    if (command.startsWith('.add') && isAdmin) {
                        const num = args.replace(/[^0-9]/g, '');
                        if (!num) return sock.sendMessage(from, { text: '👑 Usage: `.add 2547...`' });
                        await sock.groupParticipantsUpdate(from, [`${num}@s.whatsapp.net`], 'add');
                        await sock.sendMessage(from, { text: `✅ Added ${num}` });
                        continue;
                    }

                    if (command.startsWith('.promote') && isAdmin) {
                        const target = mentions[0];
                        if (!target) return sock.sendMessage(from, { text: '👑 Usage: `.promote @user`' });
                        await sock.groupParticipantsUpdate(from, [target], 'promote');
                        await sock.sendMessage(from, { text: `⬆️ Promoted @${target.split('@')[0]}`, mentions: [target] });
                        continue;
                    }

                    if (command.startsWith('.demote') && isAdmin) {
                        const target = mentions[0];
                        if (!target) return sock.sendMessage(from, { text: '👑 Usage: `.demote @user`' });
                        await sock.groupParticipantsUpdate(from, [target], 'demote');
                        await sock.sendMessage(from, { text: `⬇️ Demoted @${target.split('@')[0]}`, mentions: [target] });
                        continue;
                    }

                    if (command === '.mute' && isAdmin) {
                        await sock.groupSettingUpdate(from, 'announcement');
                        await sock.sendMessage(from, { text: '🔒 Group muted. Only admins can chat.' });
                        continue;
                    }

                    if (command === '.unmute' && isAdmin) {
                        await sock.groupSettingUpdate(from, 'not_announcement');
                        await sock.sendMessage(from, { text: '🔓 Group unmuted. Everyone can chat.' });
                        continue;
                    }

                    if (command.startsWith('.warn') && isAdmin) {
                        const target = mentions[0];
                        if (!target) return sock.sendMessage(from, { text: '👑 Usage: `.warn @user`' });
                        if (!warningsDB.has(from)) warningsDB.set(from, {});
                        const warns = warningsDB.get(from);
                        warns[target] = (warns[target] || 0) + 1;
                        await sock.sendMessage(from, { text: `⚠️ @${target.split('@')[0]} warned. Total: ${warns[target]}/3`, mentions: [target] });
                        if (warns[target] >= 3 && botIsAdmin) {
                            await sock.groupParticipantsUpdate(from, [target], 'remove');
                            await sock.sendMessage(from, { text: `👢 @${target.split('@')[0]} kicked after 3 warnings`, mentions: [target] });
                            delete warns[target];
                        }
                        continue;
                    }

                    if (command.startsWith('.warnings') && isAdmin) {
                        const target = mentions[0];
                        if (!target) return sock.sendMessage(from, { text: '👑 Usage: `.warnings @user`' });
                        const count = warningsDB.get(from)?.[target] || 0;
                        await sock.sendMessage(from, { text: `⚠️ @${target.split('@')[0]} has ${count}/3 warnings`, mentions: [target] });
                        continue;
                    }

                    if (command === '.tagall' && isAdmin) {
                        const members = groupMeta.participants.map(p => p.id);
                        let txt = `📢 *Tag All ${members.length}*\n\n`;
                        members.forEach(m => txt += `@${m.split('@')[0]} `);
                        await sock.sendMessage(from, { text: txt, mentions: members });
                        continue;
                    }

                    if (command.startsWith('.hidetag') && isAdmin) {
                        const msgTxt = args || '👀';
                        const members = groupMeta.participants.map(p => p.id);
                        await sock.sendMessage(from, { text: msgTxt, mentions: members });
                        continue;
                    }

                    if (command.startsWith('.antilink') && isAdmin) {
                        const state = args;
                        if (!groupSettings.has(from)) groupSettings.set(from, {});
                        groupSettings.get(from).antilink = state === 'on';
                        await sock.sendMessage(from, { text: `🚫 Antilink: ${state === 'on'? 'ON ✅' : 'OFF ❌'}` });
                        continue;
                    }

                    if (command.startsWith('.welcome') && isAdmin) {
                        const state = args;
                        if (!groupSettings.has(from)) groupSettings.set(from, {});
                        groupSettings.get(from).welcome = state === 'on';
                        await sock.sendMessage(from, { text: `👋 Welcome: ${state === 'on'? 'ON ✅' : 'OFF ❌'}` });
                        continue;
                    }
                }
                // ===== END GROUP COMMANDS =====

                // ===== PUBLIC COMMANDS =====
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

                if (command.startsWith('.video')) {
                    const url = args;
                    if (!url ||!url.includes('http')) return sock.sendMessage(from, { text: '⬇️ Usage: `.video https://tiktok.com/...`' });
                    await sock.sendMessage(from, { text: '⏳ Downloading video...' });
                    const data = await downloadVideo(url);
                    await sock.sendMessage(from, { text: `⬇️ *${data.title}*\nLink: ${data.url}` });
                    continue;
                }

                if (command.startsWith('.notes')) {
                    const subCmd = args.split(' ')[0];
                    const content = args.slice(subCmd.length).trim();
                    if (subCmd === 'save') {
                        if (!content) return sock.sendMessage(from, { text: '🗒️ Usage: `.notes save my password is 123`' });
                        notesDB.set(sender, content);
                        await sock.sendMessage(from, { text: '🗒️ Note saved ✅' });
                    } else if (subCmd === 'list') {
                        const note = notesDB.get(sender);
                        await sock.sendMessage(from, { text: note? `🗒️ *Your Note:*\n${note}` : '🗒️ No note found.' });
                    } else if (subCmd === 'del') {
                        notesDB.delete(sender);
                        await sock.sendMessage(from, { text: '🗒️ Note deleted ✅' });
                    } else {
                        await sock.sendMessage(from, { text: '🗒️ Usage: `.notes save/list/del`' });
                    }
                    continue;
                }

                // GAMES
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
                if (command === '.guess') {
                    guessGames.set(from, { number: Math.floor(Math.random()*100)+1, tries: 0 });
                    await sock.sendMessage(from, { text: `🔢 *Guess 1-100*\nSend a number.` });
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

                // SYSTEM COMMANDS
                switch (command) {
                    case '.menu': await sock.sendMessage(from, { image: { url: MENU_IMAGE_URL }, caption: MENU_TEXT }); break;
                    case '.ping': const s = Date.now(); await sock.sendMessage(from, { text: `🏓 Pong \`${Date.now() - s}ms\`` }); break;
                    case '.time': await sock.sendMessage(from, { text: `🕒 \`${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}\`` }); break;
                    case '.jid': await sock.sendMessage(from, { text: `🆔 \`${from}\`` }); break;
                    case '.owner': await sock.sendMessage(from, { text: '👑 254769532338' }); break;
                }

                // OWNER ONLY TOGGLES
                if(isOwner){
                    switch (command) {
                        case '.cache': await sock.sendMessage(from, { text: `🗂️ Cache: \`${msgStore.size}\`\n👻 VV: \`${vvStore.size}\`` }); break;
                        case '.logs': await sock.sendMessage(from, { text: `🧪 VV Count: \`${vvStore.size}\`` }); break;
                        case '.aonline on': autoOnline = true; await sock.sendMessage(from, { text: '🟢 Auto Online: `ON ✅`' }); break;
                        case '.aonline off': autoOnline = false; await sock.sendMessage(from, { text: '🟢 Auto Online: `OFF ❌`' }); break;
                        case '.autoreply on': autoReply = true; repliedTo.clear(); await sock.sendMessage(from, { text: `🤖 Auto Reply: \`ON ✅\`` }); break;
                        case '.autoreply off': autoReply = false; await sock.sendMessage(from, { text: '🤖 Auto Reply: `OFF ❌`' }); break;
                        case '.aview on': autoViewStatus = true; await sock.sendMessage(from, { text: '👀 Auto View: `ON ✅`' }); break;
                        case '.aview off': autoViewStatus = false; await sock.sendMessage(from, { text: '👀 Auto View: `OFF ❌`' }); break;
                        case '.alike on': autoLikeStatus = true; await sock.sendMessage(from, { text: '❤️ Auto Like: `ON ✅`' }); break;
                        case '.alike off': autoLikeStatus = false; await sock.sendMessage(from, { text: '❤️ Auto Like: `OFF ❌`' }); break;
                        case '.arec on': autoRecording = true; await sock.sendMessage(from, { text: '🎤 Recording: `ON`' }); break;
                        case '.arec off': autoRecording = false; await sock.sendMessage(from, { text: '🎤 Recording: `OFF`' }); break;
                        case '.atype on': autoTyping = true; await sock.sendMessage(from, { text: '⌨️ Typing: `ON`' }); break;
                        case '.atype off': autoTyping = false; await sock.sendMessage(from, { text: '⌨️ Typing: `OFF`' }); break;
                        case '.aread on': autoReadMessages = true; await sock.sendMessage(from, { text: '📖 Auto Read: `ON`' }); break;
                        case '.aread off': autoReadMessages = false; await sock.sendMessage(from, { text: '📖 Auto Read: `OFF`' }); break;
                        case '.areact on': autoReactDM = true; await sock.sendMessage(from, { text: '😈 Auto React: `ON`' }); break;
                        case '.areact off': autoReactDM = false; await sock.sendMessage(from, { text: '😈 Auto React: `OFF`' }); break;
                        case '.antidelete on': antiDelete = true; await sock.sendMessage(from, { text: '🛡️ AntiDelete: `ON`' }); break;
                        case '.antidelete off': antiDelete = false; await sock.sendMessage(from, { text: '🛡️ AntiDelete: `OFF`' }); break;
                    }
                    if (command.startsWith('.setreply ')) {
                        autoReplyText = text.slice(10).trim();
                        await sock.sendMessage(from, { text: `✍️ Auto Reply updated:\n\`\`${autoReplyText}\`\`` });
                        continue;
                    }
                }

                setTimeout(() => sock.sendPresenceUpdate('available', from), 3000);
            }
        } catch(e) { console.log('Error:', e); }
    });

    // ANTIDELETE
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
