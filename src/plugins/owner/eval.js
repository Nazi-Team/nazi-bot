import { format } from "util"
import axios  from 'axios'
import baileys, {
    generateWAMessageFromContent
} from '@al-e-dev/baileys'
import YouTube from "../../scraper/youtube.js"

const { proto } = baileys

export default {
    name: 'eval',
    comand:  /^[_]/i,
    exec: async (m, { sock }) => {
        let evan
        let text = /await|return/gi.test(m.body) ? `(async () => { ${m.body.slice(1)} })()` : `${m.body.slice(1)}`
        try {   
            evan = await eval(text)
        } catch (e) {
            evan = e
        } finally {
            sock.sendMessage(m.from, { text: format(evan) }, { quoted: m })
        }
    },
    isOwner: true
}