export default {
    name: 'hidetag',
    params: ['message'],
    description: 'Reenvía un mensaje citado a todos los participantes del grupo',
    comand: ['hidetag', 'tagall', 'todos'],
    isMedia: ['image', 'video', 'audio', 'document', 'sticker'],
    exec: async (m, { sock }) => {
        await sock.sendMessage(m.from, {
            forward: m.quoted,
            contextInfo: { mentionedJid: m.metadata.participants.map((p) => p.id), remoteJid: m.from }
        })
    },
    isAdmin: true,
    isGroup: true
}
