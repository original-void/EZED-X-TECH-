const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, Browsers } = require('@whiskeysockets/baileys');
const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
let qrCodeData = null; // STORE QR IMAGE HERE

// 1. HOMEPAGE = QR CODE PAGE
app.get('/', (req, res) => {
    if (!qrCodeData) {
        return res.send(`
            <h1>🤖 Ezed-X-Tech Bot</h1>
            <h2>Status: Waiting for QR...</h2>
            <p>Refresh this page in 10 seconds if QR doesn't show.</p>
        `);
    }
    res.send(`
        <h1>🤖 Ezed-X-Tech Bot</h1>
        <h2>Scan QR to Connect</h2>
        <img src="${qrCodeData}" style="width:350px;border:2px solid #000"/>
        <p>WhatsApp > 3 dots > Linked Devices > Link a device</p>
        <p><b>Note:</b> QR expires in 20s. Restart Render if it disappears.</p>
    `);
});

app.listen(PORT, () => console.log(`✅ Web on ${PORT}`));

const prefix = '.';
const commands = new Map();
fs.readdirSync('./commands').forEach(file => commands.set(require(`./commands/${file}`).name, require(`./commands/${file}`)));

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

        if (qr) { // 2. WHEN QR COMES, CONVERT IT TO IMAGE
            qrCodeData = await QRCode.toDataURL(qr);
            console.log(`✅ QR Ready on Homepage`);
        }

        if (connection === 'close') {
            qrCodeData = null; // Clear QR if bot dies
            if ((lastDisconnect.error)?.output?.statusCode!== DisconnectReason.loggedOut) startBot();
        } else if (connection === 'open') {
            qrCodeData = null; // Hide QR once connected
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
        if (command) { try { await command.execute(sock, msg, { from, args: args.join(' ') }); } catch (e) { sock.sendMessage(from, { text: `❌ Error: ${e.message}` }); }
    });
}
startBot();
