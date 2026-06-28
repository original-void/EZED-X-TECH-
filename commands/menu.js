module.exports = {
    name: 'menu',
    async execute(sock, msg, { from, MENU_TEXT, MENU_IMAGE_URL }) {
        await sock.sendMessage(from, { image: { url: MENU_IMAGE_URL }, caption: MENU_TEXT });
    }
}
