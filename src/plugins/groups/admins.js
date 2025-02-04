export default {
    name: 'admins',
    params: ['message'],
    description: 'Etiqueta a todos los administradores del grupo',
    comand: ['admins'],
    isMedia: ['image', 'video', 'audio', 'document', 'sticker'],
    exec: async (m, { sock }) => {
        await sock.sendMessage(m.from, {
            text: m.args.join(' '),
            contextInfo: { mentionedJid: m.admins, remoteJid: m.from }
        });
    },
    isAdmin: true,
    isGroup: true
}
