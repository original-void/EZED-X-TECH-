const ytSearch = require('yt-search');
const ytDlpExec = require('yt-dlp-exec');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'song',
    async execute(sock, msg, { from, args }) {
        if(!args) return sock.sendMessage(from, { text: '🎵 Usage: `.song juju on that beat`' });
        const sentMsg = await sock.sendMessage(from, { text: `🎵 Searching: ${args}...` });
        try {
            const video = (await ytSearch(args)).videos[0];
            if(!video) return sock.sendMessage(from, { text: '❌ No song found' });

            const filePath = path.join(__dirname, `../temp_${Date.now()}.mp3`);
            await ytDlpExec(video.url, {
                output: filePath,
                extractAudio: true,
                audioFormat: 'mp3',
                noPlaylist: true,
                noCheckCertificates: true,
                preferInsecure: true,
            });

            const buffer = fs.readFileSync(filePath);
            await sock.sendMessage(from, { audio: buffer, mimetype: 'audio/mpeg', fileName: `${video.title}.mp3`, caption: `🎵 *${video.title}*` });
            fs.unlinkSync(filePath); // delete after send
        } catch(e) {
            await sock.sendMessage(from, { text: `❌ Failed: ${e.message}`, edit: sentMsg.key });
        }
    }
}
