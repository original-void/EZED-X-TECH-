const ytSearch = require('yt-search');
const YTDlpWrap = require('yt-dlp-wrap').default;
const fs = require('fs');
const path = require('path');
const ytDlp = new YTDlpWrap('/usr/local/bin/yt-dlp');

module.exports = {
    name: 'song',
    async execute(sock, msg, { from, args }) {
        if(!args) return sock.sendMessage(from, { text: '🎵 Usage: `.song juju on that beat`' });
        const sentMsg = await sock.sendMessage(from, { text: `🎵 Searching: ${args}...` });
        try {
            const video = (await ytSearch(args)).videos[0];
            if(!video) return sock.sendMessage(from, { text: '❌ No song found' });

            const filePath = path.join(__dirname, `../temp_${Date.now()}.mp3`);
            await ytDlp.execPromise([video.url, '-x', '--audio-format', 'mp3', '-o', filePath]);

            const buffer = fs.readFileSync(filePath);
            await sock.sendMessage(from, { audio: buffer, mimetype: 'audio/mpeg', fileName: `${video.title}.mp3`, caption: `🎵 *${video.title}*` });
            fs.unlinkSync(filePath);
        } catch(e) {
            await sock.sendMessage(from, { text: `❌ Failed: ${e.message}`, edit: sentMsg.key });
        }
    }
}
