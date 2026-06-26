const { 
    default: makeWASocket, 
    DisconnectReason, 
    useMultiFileAuthState 
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');

const BOT_NAME = 'EZED Bot';

// Button Menu that shows when user types .menu
const MENU = {
    text: `*🤖 ${BOT_NAME} MENU*\n\nWelcome! Tap a button below 👇`,
    footer: 'Reply with .menu anytime',
    templateButtons: [
        { index: 1, quickReplyButton: { displayText: '1. Ping 🏓', id: '.ping' } },
        { index: 2, quickReplyButton: { displayText: '2. Time 🕒', id: '.time' } },
        { index: 3, quickReplyButton: { displayText: '3. Help ❓', id: '.help' } },
    ]
};

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
        browser: ['EZED Bot', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log('Scan this QR with WhatsApp > Linked Devices');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed. Reconnecting:', shouldReconnect);
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('✅ Bot Connected Successfully');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const text = msg.message.conversation 
                  || msg.message.extendedTextMessage?.text 
                  || msg.message.buttonsResponseMessage?.selectedButtonId 
                  || '';

        const command = text.toLowerCase().trim();

        // COMMAND HANDLER
        switch (command) {
            case '.menu':
            case 'menu':
                await sock.sendMessage(from, MENU);
                break;

            case '.ping':
                await sock.sendMessage(from, { text: '🏓 Pong! Bot is alive' });
                break;

            case '.time':
                const now = new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });
                await sock.sendMessage(from, { text: `🕒 Kenya Time: ${now}` });
                break;

            case '.help':
                await sock.sendMessage(from, { text: `Send .menu to see all commands\n${BOT_NAME} by You` });
                break;

            default:
                // Only reply if it's not a command, to avoid spam
                if (!command.startsWith('.') && command.length > 0) {
                    await sock.sendMessage(from, { text: 'Unknown command. Tap .menu' });
                }
                break;
        }
    });
}

startBot();
