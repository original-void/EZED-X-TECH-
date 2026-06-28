const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, Browsers } = require('@whiskeysockets/baileys');
const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
let qrCodeData = null;

// HOMEPAGE WITH QR
app.get('/', (req, res) => {
    if (!qrCodeData) {
        return res.send(`<h1>🤖 Ezed-X-Tech Bot</h1><h2>Status: Waiting for QR...</h2><p>Refresh in 10s</p>`);
    }
    res.send(`<h1>🤖 Ezed-X-Tech Bot</h1><h2>Scan QR to Connect</h2><img src="${qrCodeData}" style="width:350px;border:2px solid #000"/><p>WhatsApp > 3 dots > Linked Devices > Link a device</p>`);
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
    const { state, saveCreds } = await useMultiFileAuthState('auth');
    
    const sock = makeWASocket({ 
        auth: state, 
        browser: Browsers.macOS('Desktop'),
        printQRInTerminal: false 
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrCodeData = await QRCode.toDataURL(qr);
            console.log(`✅ QR Ready on Homepage`);
        }

        if (connection === 'close') {
            qrCodeData = null;
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode!== DisconnectReason.loggedOut;
            console.log('Connection closed. Reconnecting:', shouldReconnect);
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            qrCodeData = null;
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
