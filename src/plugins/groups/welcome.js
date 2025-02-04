export default {
    name: 'welcome',
    params: ['on', 'off'],
    description: 'Activa o desactiva la bienvenida en el grupo',
    comand: ['welcome'],
    exec: async (m, { sock, db }) => {
        if (m.args[0] === 'on') {
            if (db.data.chats[m.from].welcome) return m.reply('➤ Comando: welcome ⧉ Estado: ya está habilitado.')
            db.data.chats[m.from].welcome = true
            await m.reply('➤ Comando: welcome ⧉ Estado: habilitado.' )
        } else if (m.args[0] === 'off') {
            if (!db.data.chats[m.from].welcome) return m.reply('➤ Comando: welcome ⧉ Estado: ya está deshabilitado.')
            db.data.chats[m.from].welcome = false
            await m.reply('➤ Comando: welcome ⧉ Estado: deshabilitado.')
        } else {
            const status = db.data.chats[m.from].welcome ? 'habilitado' : 'deshabilitado'
            await m.reply(`➤ Comando: welcome ⧉ Estado: ${status}`)
        }
    },
    isGroup: true
}
