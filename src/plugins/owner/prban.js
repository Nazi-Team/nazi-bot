import axios from 'axios';

export default {
    name: "Fraud Ip",
    description: "Banear una IP fraudulenta",
    params: ["ip"],
    commands: ["prban"],
    async execute(client, message, args) {
        const ip = args[0];
        const loadingMessages = [
            "「  ✦ 𝐂𝐇𝐄𝐂𝐊𝐄𝐑 𝐃𝐄 𝐁𝐀𝐍 ✦  」\n⟨░░░░░░░░░░░░░░░░░░░░⟩ \n…. Cargando\n↻ 0%",
            "「  ✦ 𝐂𝐇𝐄𝐂𝐊𝐄𝐑 𝐃𝐄 𝐁𝐀𝐍 ✦  」\n⟨██░░░░░░░░░░░░░░░░░░⟩ \n…. Cargando\n⟳ 10%",
            "「  ✦ 𝐂𝐇𝐄𝐂𝐊𝐄𝐑 𝐃𝐄 𝐁𝐀𝐍 ✦  」\n⟨████░░░░░░░░░░░░░░░░⟩ \n…. Cargando\n◌ 20%",
            "「  ✦ 𝐂𝐇𝐄𝐂𝐊𝐄𝐑 𝐃𝐄 𝐁𝐀𝐍 ✦  」\n⟨██████░░░░░░░░░░░░░░⟩ \n…. Cargando\n↻ 30%",
            "「  ✦ 𝐂𝐇𝐄𝐂𝐊𝐄𝐑 𝐃𝐄 𝐁𝐀𝐍 ✦  」\n⟨████████░░░░░░░░░░░░⟩ \n…. Cargando\n⟳ 40%",
            "「  ✦ 𝐂𝐇𝐄𝐂𝐊𝐄𝐑 𝐃𝐄 𝐁𝐀𝐍 ✦  」\n⟨██████████░░░░░░░░░░⟩ \n…. Cargando\n◌ 50%",
            "「  ✦ 𝐂𝐇𝐄𝐂𝐊𝐄𝐑 𝐃𝐄 𝐁𝐀𝐍 ✦  」\n⟨████████████░░░░░░░░⟩ \n…. Cargando\n↻ 60%",
            "「  ✦ 𝐂𝐇𝐄𝐂𝐊𝐄𝐑 𝐃𝐄 𝐁𝐀𝐍 ✦  」\n⟨██████████████░░░░░░⟩ \n…. Cargando\n⟳ 70%",
            "「  ✦ 𝐂𝐇𝐄𝐂𝐊𝐄𝐑 𝐃𝐄 𝐁𝐀𝐍 ✦  」\n⟨████████████████░░░░⟩ \n…. Cargando\n◌ 80%",
            "「  ✦ 𝐂𝐇𝐄𝐂𝐊𝐄𝐑 𝐃𝐄 𝐁𝐀𝐍 ✦  」\n⟨██████████████████░░⟩ \n…. Cargando\n↻ 90%",
            "「  ✦ 𝐂𝐇𝐄𝐂𝐊𝐄𝐑 𝐃𝐄 𝐁𝐀𝐍 ✦  」\n⟨████████████████████⟩ \n…. Cargando\n⟳ 100%"
        ];

        let sentMessage;
        for (const msg of loadingMessages) {
            if (!sentMessage) {
                sentMessage = await client.sendMessage(message.from, { text: msg });
            } else {
                await client.sendMessage(message.from, { text: msg, edit: sentMessage.key });
            }
            await new Promise(resolve => setTimeout(resolve, 60000)); // Esperar 1 minuto entre mensajes
        }

        const { data } = await axios.get(`https://api11.scamalytics.com/alessandrovillogas/?key=df8d714f6807d3c5512914caed1302f17fb41728efa01d695a9db72734854f34&ip=${ip}`);

        const resultMessage = `
「  ✦ 𝐂𝐇𝐄𝐂𝐊𝐄𝐑 𝐃𝐄 𝐁𝐀𝐍 ✦  」
Estado: ${data.status}
Modo: ${data.mode}
IP: ${data.ip}
Puntuación: ${data.score}
Riesgo: ${data.risk}
ISP: ${data['ISP Name']}
Organización: ${data['Organization Name']}
País: ${data.ip_country_name}
Ciudad: ${data.ip_city}
Código Postal: ${data.ip_postcode}
Geolocalización: ${data.ip_geolocation}
Tipo de Proxy: ${data.proxy_type}
ASN: ${data.as_number}`

        await client.sendMessage(message.from, { text: resultMessage, edit: sentMessage.key })
    }
}