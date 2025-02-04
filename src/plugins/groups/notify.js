export default {
    name: 'notify',
    params: ['on', 'off'],
    description: 'Activa o desactiva las notificaciones en el grupo',
    comand: ['notify'],
    exec: async (m, { sock, db }) => {
        if (m.args[0] === 'on') {
            if (db.data.chats[m.from].notify) return m.reply('➤ Comando: notify ⧉ Estado: ya está habilitado.')
            db.data.chats[m.from].notify = true
            await m.reply('➤ Comando: notify ⧉ Estado: habilitado.' )
        } else if (m.args[0] === 'off') {
            if (!db.data.chats[m.from].notify) return m.reply('➤ Comando: notify ⧉ Estado: ya está deshabilitado.')
            db.data.chats[m.from].notify = false
            await m.reply('➤ Comando: notify ⧉ Estado: deshabilitado.')
        } else {
            const status = db.data.chats[m.from].notify ? 'habilitado' : 'deshabilitado'
            await m.reply(`➤ Comando: notify ⧉ Estado: ${status}`)
        }
    },
    isGroup: true
}
