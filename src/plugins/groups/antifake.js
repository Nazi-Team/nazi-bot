export default {
    name: 'antifake',
    params: ['on/off'],
    description: 'Habilitar o deshabilitar antifake',
    comand: ['antifake'],
    exec: async (m, { sock, db }) => {
        if (m.args[0] === 'on') {
            if (db.data.chats[m.from].antifake) return m.reply('➤ Comando: antifake ⧉ Estado: ya está habilitado.')
            db.data.chats[m.from].antifake = true
            await m.reply('➤ Comando: antifake ⧉ Estado: habilitado.')
        } else if (m.args[0] === 'off') {
            if (!db.data.chats[m.from].antifake) return m.reply('➤ Comando: antifake ⧉ Estado: ya está deshabilitado.')
            db.data.chats[m.from].antifake = false
            await m.reply('➤ Comando: antifake ⧉ Estado: deshabilitado.')
        } else {
            const status = db.data.chats[m.from].antifake ? 'habilitado' : 'deshabilitado';
            await m.reply(`➤ Comando: antifake ⧉ Estado: ${status}\nPara modificar usa antifake <on/off>`)
        }
    },
    isAdmin: true,
    isBotAdmin: true,
    isGroup: true
}
