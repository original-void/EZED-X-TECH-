module.exports = {
    name: 'time',
    async execute(sock, msg, { from }) {
        const time = new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });
        await sock.sendMessage(from, { text: `🕒 *Kenya Time*\n${time}` });
    }
}
