module.exports = {
    name: 'menu',
    async execute(sock, msg, { from, MENU_IMAGE_URL }) {
        const MENU_TEXT = `
╭─❖─❖─❖─❖─❖─❖─❖─❖─❖─❖─❖─❖─╮
│ 👑 𝗘𝗭𝗘𝗗 𝗫 𝗧𝗘𝗖𝗛 𝗩10.9 👑 │
│ ✨ THE ULTIMATE WA BOT ✨ │
╰─❖─❖─❖─❖─❖─❖─❖─❖─❖─❖─❖─❖─╯

╔═══❖ 「 🛡️ 𝗔𝗗𝗠𝗜𝗡 𝗖𝗢𝗡𝗧𝗥𝗢𝗟 」 ❖═══╗
║ 🥾.kick.add.promote.demote
║ 🔇.mute.unmute.🚫.antilink
║ ⚠️.warn.📊.warnings.📢.tagall
║ 👻.hidetag.👋.welcome.🚪.leave
╚═══════════════╝

╔═══❖ 「 🎵 𝗠𝗘𝗗𝗜𝗔 」 ❖═══╗
║ 🎵.song.play ➤ MP3 Audio
║ 🎥.video ➤ MP4 <10min
║ 📝.lyrics ➤ Song lyrics
╚═══════════╝

╔═══❖ 「 🧠 𝗔𝗜 」 ❖═══╗
║ 🧠.gpt.📄.summarize.🌍.translate
║ ✅.grammar
╚═══════════╝

╔═══❖ 「 🎮 𝗚𝗔𝗠𝗘𝗦 」 ❖═══╗
║ ❌⭕.tictactoe.1-.9
║ 🔢.guess.g 50
║ ✊.rps rock/paper/scissors
╚═══════════╝

╔═══❖ 「 ⚙️ 𝗨𝗧𝗜𝗟𝗜𝗧𝗜𝗘𝗦 」 ❖═══╗
║ 🧮.calc.🕒.time.🆔.jid
║ 👑.owner.🗒️.notes.🧹.cache
╚═══════════╝

╔═══❖ 「 👑 𝗢𝗪𝗡𝗘𝗥 𝗣𝗔𝗡𝗘𝗟 」 ❖═══╗
║ 🟢.aonline on/off ➤ Auto Online
║ 🤖.autoreply on/off ➤ Auto Reply
║ 👀.aview on/off ➤ Auto View Status
║ ❤️.alike on/off ➤ Auto Like Status
║ 🎤.arec on/off ➤ Auto Recording <-
║ ⌨️.atype on/off ➤ Auto Typing <-
║ 📖.aread on/off ➤ Auto Read
║ 😈.areact on/off ➤ Auto React DM
║ 🛡️.antidelete on/off ➤ Anti Delete
║ ✍️.setreply text ➤ Set reply msg
║ 🔄.logout ➤ Logout Bot
╚═══════════════╝

> .arec off = No more "recording..." 
> .atype off = No more "typing..."
`;
        await sock.sendMessage(from, { image: { url: MENU_IMAGE_URL }, caption: MENU_TEXT });
    }
}
