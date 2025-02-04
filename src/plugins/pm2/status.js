import { convertTimeOut } from "@al-e-dev/baileys";
import { exec } from "child_process";

export default {
    name: 'status',
    desc: 'Obtiene el estado de los scripts activos con PM2',
    comand: ['status'],
    exec: async (m, { sock }) => {
        exec(`pm2 jlist`, (err, stdout) => {
            if (err) {
                return sock.sendMessage(m.from, { text: `Error al obtener el estado: ${err.message}` }, { quoted: m })
            }

            const processes = JSON.parse(stdout);
            const detailedOutput = processes.map(({ name, pm_id, pid, pm2_env, monit }) => {
                const { status, node_version, version, pm_uptime, axm_monitor } = pm2_env
                const cpu = monit.cpu
                const memory = (monit.memory / 1024 / 1024).toFixed(2)
                const uptime = ((Date.now() - pm_uptime) / 1000).toFixed(0)
                const eventLoopLatencyP50 = axm_monitor['Event Loop Latency']?.value
                const eventLoopLatencyP95 = axm_monitor['Event Loop Latency p95']?.value

                return `Name: ${name}\nID: ${pm_id}\nPID: ${pid}\nStatus: ${status}\nCPU: ${cpu}%\nMemory: ${memory} MB\nActivity: ${convertTimeOut(uptime * 1000)}\nNode.js: ${node_version}\nVersion: ${version}\nLatencia (p50): ${eventLoopLatencyP50} ms\nLatencia (p95): ${eventLoopLatencyP95} ms`
            }).join('\n\n')

            sock.sendMessage(m.from, { text: `Estado:\n${detailedOutput}` }, { quoted: m })
        })
    },
    isOwner: true
}