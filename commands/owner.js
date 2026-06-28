module.exports = {
    name: 'owner',
    async execute(sock, msg, { from }) {
        const vcard = 'BEGIN:VCARD\nVERSION:3.0\nFN:EZED X TECH OWNER\nTEL;type=CELL;type=VOICE;waid=87433337143370:+254 743 337 143\nEND:VCARD';
        await sock.sendMessage(from, {
            contacts: { displayName: 'EZED X TECH OWNER', contacts: [{ vcard }] }
        });
    }
}
