import Tiktok from "../../scraper/tiktok.js"

export default {
    name: 'tiktok',
    params: ['url'],
    description: 'Descarga o busca videos de TikTok',
    comand: ['tiktok', 'tt'],
    exec: async (m, { sock }) => {
        Tiktok.download(m.text)
            .then(async ({ data }) => {
                if (data.media.type === 'video') {
                    await sock.sendMessage(m.from, {
                        caption: data.title,
                        footer: _config.owner.name,
                        video: { url: data.media.nowatermark.play },
                        buttons: [
                            {
                                buttonId: "audio",
                                buttonText: {
                                    displayText: 'Audio'
                                }
                            }
                        ],
                        headerType: 6,
                        viewOnce: true
                    }, { quoted: m })

                    sock.ev.on('messages.upsert', async ({ messages }) => {
                        for (let msg of messages) {
                            if (msg.message?.buttonsResponseMessage?.selectedButtonId === 'audio') {
                                await sock.sendMessage(m.from, {
                                    audio: { url: data.music.play },
                                    mimetype: 'audio/mp4'
                                }, { quoted: m })
                                continue
                            }
                        }
                    })

                } else if (data.media.type === 'image') {
                    for (let i of data.media.image) {
                        await sock.sendMessage(m.from, {
                            image: { url: i },
                            caption: data.title
                        }, { quoted: m })
                    }
                    await sock.sendMessage(m.from, {
                        audio: { url: data.music.play },
                        mimetype: 'audio/mp4'
                    }, { quoted: m })
                }
            })
            .catch(error => console.error('Error capturado:', error))
    }
}