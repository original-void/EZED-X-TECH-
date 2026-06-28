const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, Browsers } = require('@whiskeysockets/baileys');
const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const AUTH_PATH = 'auth';
let qrCodeData = null;
let rawQrText = null;

// 1. DELETE AUTH EVERY BOOT. RENDER FREE KEEPS IT
if (fs.existsSync(AUTH_PATH)) {
    fs.rmSync(AUTH_PATH, { recursive: true, force: true });
    console.log(`🗑️ Deleted ${AUTH_PATH}`);
}

app.get('/', (req, res) => {
    if (rawQrText && !qrCodeData) {
        return res.send(`<h1>🤖 Ezed-X-Tech Bot</h1><h2>QR Image Failed. Use this text:</h2><textarea style="width:90%;height:80px">${rawQrText}</textarea><p>Paste this text into https://www.qrcode-monkey.com/</p><meta http-equiv="refresh" content="5">`);
    }
    if (!qrCodeData) {
        return res.send(`<h1>🤖 Ezed-X-Tech Bot</h1><h2>Status: Waiting for QR... 60s timeout</h2><meta http-equiv="refresh" content="5">`);
    }
    res.send(`<h1>🤖 Ezed-X-Tech Bot</h1><h2>Scan QR Now</h2><img src="${qrCodeData}" style="width:350px;border:2px solid #000"/><p>WhatsApp > 3 dots > Linked Devices > Link a device</p>`);
});

app.listen(PORT, () => console.log(`✅ Web on ${PORT}`));

const prefix = '.';
const commands = new Map();
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    fs.readdirSync(commandsPath).forEach(file => {
        const command = require(path.join(commandsPath, file));
        commands.set(command.name, command);
    });
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_PATH);
    
    const sock = makeWASocket({ 
        auth: state, 
        browser: Browsers.macOS('Desktop'),
        printQRInTerminal: false,
        qrTimeout: 60000 // 2. WAIT 60s FOR QR INSTEAD OF 20s
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        console.log('UPDATE:', update);

        if (qr) {
            rawQrText = qr; // 3. SAVE RAW TEXT TOO
            qrCodeData = await QRCode.toDataURL(qr).catch(e => {
                console.log('QR IMG FAIL:', e);
                return null;
            });
            console.log(`✅ QR RECEIVED. RAW: ${qr}`);
        }

        if (connection === 'close') {
            qrCodeData = null;
            rawQrText = null;
            console.log('Closed:', lastDisconnect.error);
            if ((lastDisconnect.error)?.output?.statusCode!== DisconnectReason.loggedOut) startBot();
        } else if (connection === 'open') {
            qrCodeData = null;
            rawQrText = null;
            console.log('✅ Bot Connected!');
        }
    });

    sock.ev.on('messages.upsert', async m => {
        if (!m.messages[0].message || m.messages[0].key.fromMe) return;
        const msg = m.messages[0];
        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        if (!text.startsWith(prefix)) return;
        
        const args = text.slice(prefix.length).trim().split(/ +/);
        const cmdName = args.shift().toLowerCase();
        const command = commands.get(cmdName);
        
        if (command) { 
            try { 
                await command.execute(sock, msg, { from, args: args.join(' ') }); 
            } catch (e) { 
                console.log(e);
                sock.sendMessage(from, { text: `❌ Error: ${e.message}` }); 
            }
        }
    });
}
startBot();
