const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const express = require('express'); // 1. FOR RENDER TO STAY ALIVE

// 2. EXPRESS SERVER - REQUIRED FOR RENDER
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Ezed-X-Tech Bot is running'));
app.listen(PORT, () => console.log(`✅ Server on ${PORT}`));

const prefix = '.';
const commands = new Map();
const commandsPath = path.join(__dirname, 'commands');

fs.readdirSync(commandsPath).forEach(file => {
    const command = require(path.join(commandsPath, file));
    commands.set(command.name, command);
});

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth');
    const sock = makeWASocket({ auth: state, printQRInTerminal: true });

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode!== DisconnectReason.loggedOut;
            console.log('Connection closed. Reconnecting:', shouldReconnect);
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
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
            try { await command.execute(sock, msg, { from, args: args.join(' ') }); } 
            catch (e) { console.log(e); sock.sendMessage(from, { text: `❌ Error: ${e.message}` }); }
        }
    });
}
startBot();
