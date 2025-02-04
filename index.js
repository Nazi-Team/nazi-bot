import "./config.js"
import baileys, {
	DisconnectReason,
	useMultiFileAuthState,
	fetchLatestBaileysVersion,
	makeCacheableSignalKeyStore,
	generateWAMessageFromContent,
	generateWAMessageContent,
	Browsers,
	getContentType,
	extractMessageContent,
	jidNormalizedUser,
	delay,
	convertTimeOut
} from "@al-e-dev/baileys"

import { Boom } from "@hapi/boom"
import { exec } from "child_process"
import { format } from 'util'

import pino from "pino"
import chalk from "chalk"
import readline from 'readline'
import NodeCache from '@cacheable/node-cache'

import { _prototype } from "./lib/_prototype.js"

import Tiktok from './scrapper/tiktok.js'
import Facebook from './scrapper/facebook.js'
import Pinterest from './scrapper/pinterest.js'
import YouTube from "./scrapper/youtube.js"
import Spotify from './src/scraper/spotify.js'

import fs, { unwatchFile, watchFile, readFileSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { resolve } from 'path'
import { filesize } from 'filesize'
import { format as formatDate } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'

import { database } from "./lib/_db.js"
import { Lang } from "./lib/lang.js";
import { write } from './lib/sticker.js';

const { proto } = baileys
const { state, saveCreds } = await useMultiFileAuthState("./auth/session")

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = text => new Promise(resolve => rl.question(text, resolve))

const start = async () => {
	const { version } = await fetchLatestBaileysVersion()

	let client = _prototype({
		version,
		logger: pino({ level: "silent" }),
		printQRInTerminal: false,
		mobile: false,
		browser: Browsers.ubuntu('Chrome'),
		auth: {
			creds: state.creds,
			keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
		},
		msgRetryCounterCache: new NodeCache(),
		patchMessageBeforeSending: (message) => {
			const requiresPatch = !!(message?.buttonsMessage || message?.templateMessage || message?.listMessage);
			if (requiresPatch) {
				message = {
					viewOnceMessage: {
						message: {
							messageContextInfo: {
								deviceListMetadataVersion: 2,
								deviceListMetadata: {},
							},
							...message,
						},
					},
				};
			}
			return message;
		},
	});

	store?.bind(client.ev)

	client.ev.on("creds.update", saveCreds)

	if (!client.authState.creds.registered) {
		const phoneNumber = await question(chalk.bold("Ingresa tu número de WhatsApp activo: "));
		const code = await client.requestPairingCode(phoneNumber);
		console.log(chalk.bold(`Emparejamiento con este código: ${code}`));
	}

	client.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
		if (connection === "close") {
			const reconect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut
			console.log('Error en la conexión ', lastDisconnect.error, 'Reconectando', reconect)
			if (reconect) {
				start()
			} else {
				exec("rm -rf session", (err, stdout, stderr) => {
					if (err) {
						console.error("Error al eliminar el archivo de sesión:", err)
					} else {
						console.error("Conexión con WhatsApp cerrada. Escanee nuevamente el código QR!")
						start()
					}
				})
			}
		} else if (connection === "open") {
			console.log('Conexión con WhatsApp establecida')
		}
	})

	client.ev.on("group-participants.update", async (change) => {
		const { id, author, participants, action } = change
		if (!action || author.endsWith("@lid")) return

		const chat = db.data.chats[id]
		if (!chat?.welcome) return

		const actions = {
			add: () => author ? `Fuiste añadido por @${author.split('@')[0]}.` : `Te has unido mediante el enlace de invitación.`,
			remove: (p) => author === p ? `Ha salido del grupo.` : `Ha sido eliminado por @${author.split('@')[0]}.`,
			promote: () => `Fuiste promovido a administrador por @${author.split('@')[0]}.`,
			demote: () => `Fuiste degradado a miembro por @${author.split('@')[0]}.`,
			modify: () => `Ha modificado la configuración del grupo.`,
		}
		const { subject, desc } = await client.groupMetadata(id)

		for (const p of participants) {
			const date = actions[action]?.(p)
			const message = chat.messages[action]
				.replace("@group", `@${id}`)
				.replace("@action", date)
				.replace("@user", `@${p.split("@")[0]}`)
				.replace("@time", new Date().toLocaleString())
				.replace("@desc", desc)
			const image = await client.profilePictureUrl(p, 'image')
				.catch(async () => await sock.profilePictureUrl(id, image))
				.catch(() => "./nazi.jpg")
			if (date) client.sendMessage(id, { image: { url: image }, caption: message, contextInfo: { mentionedJid: [p, author], groupMentions: [{ groupJid: id, groupSubject: subject }] } })
		}
	})


	client.ev.on("groups.update", async (changes) => {
		for (const { id, author, ...props } of changes) {
			const chat = db.data.chats[id]
			if (!chat?.notify) continue

			const messages = {
				restrict: v => v ? "ha restringido los permisos del grupo. Ahora solo los administradores pueden editar la información." : "ha permitido que todos los miembros editen la información del grupo.",
				announce: v => v ? "ha cerrado el grupo. Solo los administradores pueden enviar mensajes." : "ha abierto el grupo. Ahora todos los miembros pueden enviar mensajes.",
				memberAddMode: v => v ? "ha habilitado que todos los miembros puedan añadir nuevos participantes al grupo." : "ha deshabilitado que los miembros puedan añadir participantes al grupo.",
				joinApprovalMode: v => v ? "ha activado la aprobación de solicitudes para unirse al grupo. Ahora los administradores deben aprobar las solicitudes de nuevos miembros." : "ha desactivado la aprobación de solicitudes. Ahora cualquiera puede unirse al grupo sin aprobación.",
				desc: v => `ha actualizado la descripción del grupo: "${v}"`,
				subject: v => `ha cambiado el nombre del grupo a: "${v}"`,
			};

			for (const [key, value] of Object.entries(props)) {
				if (!messages[key] || value === undefined) continue
				const { subject } = await client.groupMetadata(id)
				const image = await client.profilePictureUrl(author, "image").catch(() => "./nazi.jpg")

				client.sendMessage(id, { image: { url: image }, caption: `@${author.split("@")[0]} ${messages[key](value)}`, contextInfo: { mentionedJid: [author], groupMentions: [{ groupJid: id, groupSubject: subject }] } })
			}
		}
	})


	client.ev.on("messages.upsert", async m => {
		if (!m) return

		const v = m.messages[m.messages.length - 1]
		// console.log(JSON.stringify(v, null, 2))

		if (v.key.id.startsWith("ALE-DEV")) return
		const from = v.key.remoteJid.startsWith('52') && v.key.remoteJid.charAt(2) !== '1' ? '52' + '1' + v.key.remoteJid.slice(2) : v.key.remoteJid
		const participant = from.endsWith("@g.us") ? (v.key.participant.startsWith('52') && v.key.participant.charAt(2) !== '1' ? '52' + '1' + v.key.participant.slice(2) : v.key.participant) : false

		const botNumber = client.user.id.split(':')[0]
		const type = getContentType(v.message)
		const msg = extractMessageContent(v.message?.[type])
		const body = client.getMessageBody(type, msg) || ''
		const quoted = (msg?.contextInfo && Object.keys(msg.contextInfo).some(i => i == "quotedMessage")) ? proto.WebMessageInfo.fromObject({ key: { remoteJid: from || v.key.remoteJid, fromMe: (msg.contextInfo.participant == client.user.jid), id: msg.contextInfo.stanzaId, participant: msg.contextInfo.participant }, message: msg.contextInfo.quotedMessage }) : false
		const sender = jidNormalizedUser(v.key.participant || v.key.remoteJid)
		const cmd = typeof body === 'string' && prefix.some(i => body.toLowerCase().startsWith(i.toLowerCase()))
		const command = cmd ? body.slice(prefix.find(prefix => body.toLowerCase().startsWith(prefix.toLowerCase())).length).trim().split(' ')[0].toLowerCase() : typeof body === 'string' ? body.trim().split(' ')[0].toLowerCase() : false
		const args = body ? body.slice(cmd ? prefix.find(prefix => body.toLowerCase().startsWith(prefix.toLowerCase())).length + command.length : command.length).trim().split(/ +/) : ""

		const metadata = from.endsWith("@g.us") ? await client.groupMetadata(from) : false
		const admins = metadata ? metadata.participants.filter(i => i.admin == "admin" || i.admin == "superadmin").map(i => i.id) : false
		const isAdmin = metadata ? admins.includes(sender) : false
		const isBotAdmin = metadata ? admins.includes(client.user.jid) : false

		const expiration = msg?.extendedTextMessage?.contextInfo?.expiration ?? msg?.contextInfo?.expiration ?? null

		await database(client, db, from, sender, isBotAdmin, metadata, v)

		const Number = from.endsWith("@g.us") ? v.key.participant : from
		const isOwner = v.key.fromMe || (sender.replace("@s.whatsapp.net", "") === owner.number) || mods.some(i => i === sender.replace("@s.whatsapp.net", ""))

		let quotedMention = msg?.contextInfo != null ? msg.contextInfo?.participant : ''
		let tagMention = msg?.contextInfo != undefined ? msg.contextInfo?.mentionedJid : []
		let mention = typeof (tagMention) == 'string' ? [tagMention] : tagMention
		mention != undefined ? mention.push(quotedMention) : []
		const mentionedJid = mention != undefined ? mention.filter(x => x) : []

		let ulink = {
			key: {
				participant: "13135550002@s.whatsapp.net",
				...(from ? { remoteJid: sender } : {}),
			},
			message: {
				extendedTextMessage: {
					text: bot.name,
				}
			}
		}

		let vCard = {
			key: {
				participant: "13135550002@s.whatsapp.net",
				...(from ? { remoteJid: sender } : {}),
			},
			message: {
				contactMessage: {
					displayName: bot.name,
					vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;Meta AI;;;\nFN:Meta AI\nitem1.TEL;waid=13135550002:13135550002\nitem1.X-ABLabel:Celular\nEND:VCARD`,
					contextInfo: {
						forwardingScore: 1,
						isForwarded: true
					}
				}
			}
		}

		const lang = db.data.users[sender] ? Lang[db.data.users[sender]?.language] : Lang[db.data.settings[client.user.jid]?.language]

		let isAntilink = db.data.chats[from]?.antilink
		let isAntifake = db.data.chats[from]?.antifake
		let isWelcome = db.data.chats[from]?.welcome
		let isBye = db.data.chats[from]?.bye
		let isBadWord = db.data.chats[from]?.badword
		let isMute = db.data.chats[from]?.mute

		if (isAntilink) {
			let exec = /(?:^|\s)((?:https?|ftp):\/\/[\n\S]+)|(?:^|\s)(www\.[\S]+)|(?:^|\s)([\w]+\.[\S]+)|(?:^|\s)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d{1,5})?\/?\S*)|(?:^|\s)((?:https?|ftp):\/\/(?:www\.)?[\w-]+\.[\w]{2,20}(?:\.[\w]{2,20})+(?:\/[\w-]+)*\/?)/gi;
			let isLink = exec.test(body.trim());
			if (isLink && !isOwner) {
				let execYt = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/|(?:https?:\/\/)?(?:www\.)?youtu\.be\//gi;
				let isLinkYt = execYt.test(body.trim())
				if (isLinkYt) return
				if (v.fromMe) return
				await client.groupParticipantsUpdate(from, [sender], "remove")
				await client.sendMessage(from, { delete: v.key });
				await client.sendMessage(from, { text: lang.antilink_removed.replace("{user}",) }, { mentions: [sender] });
			};
		}

		/** TODO */
		switch (command) {
			case "tiktok":
			case "tk":
			case "tik": {
				if (!args.join(" ")) return client.sendMessage(from, { text: lang.nourl })

				const tiktok = new Tiktok()
				const data = await tiktok.download(args.join(" "))
				if (data.media.type === 'image') {
					for (const imageUrl of data.media.images) {
						await client.sendMessage(from, { image: { url: imageUrl }, caption: data.title })
					}
				} else if (data.media.type === 'video') {
					await client.sendMessage(from, { video: { url: data.media.nowatermark.play }, caption: data.title })
					await client.sendMessage(from, { audio: { url: data.music.play }, mimetype: 'audio/mp4' })
				}
				break
			}
			case "spotify": {
				if (!args.join(" ")) return client.sendMessage(from, { text: lang.nosearch })

				const spotify = new Spotify()
				const results = await spotify.search(args.join(" "))

				if (results.length === 0) return client.sendMessage(from, { text: lang.noresults })

				const track = results[0]
				await spotify.download(track.url).then(async ({ download }) => {
					await client.sendMessage(from, {
						image: { url: track.thumbnail },
						caption: `*Title:* ${track.title}\n*Artist:* ${track.artist.map(a => a.name).join(', ')}\n*Duration:* ${track.duration}\n*Popularity:* ${track.popularity}\n*Release Date:* ${track.date}`
					});

					await client.sendMessage(from, {
						audio: { url: download },
						mimetype: 'audio/mp4',
						fileName: `${track.title}.mp3`
					});

				}).catch(err => client.sendMessage(from, { text: "Hubo un error al obtener los datos." }))

				break;
			}

			case "play": {
				if (!args.join(" ")) return client.sendMessage(from, { text: lang.nosearch })

				const youtube = new YouTube()
				const video = await youtube.search(args.join(" "))

				client.sendMessage(from, {
					caption: `*Título:* ${video.title}\n*Duración:* ${video.durationH}\n*Canal:* ${video.channelName}\n*Vistas:* ${video.viewH}\n*Subido:* ${video.publishedTime}\n\n_Tiempo limite para responder 5 minutos_\n_Solo el remitente puede responder._`,
					footer: bot.name,
					image: { url: video.thumbnail },
					buttons: [
						{ buttonId: 'audio', buttonText: { displayText: 'Audio' }, type: 1 },
						{ buttonId: 'video', buttonText: { displayText: 'Video' }, type: 1 }
					],
					headerType: 6,
					viewOnce: true
				})

				const filter = m => m.key.remoteJid === from && m.key.participant === sender;
				const timeout = setTimeout(() => {
					client.ev.off('messages.upsert', response)
				}, 5 * 60 * 1000)

				const response = async m => {
					if (m.messages[0].message && m.messages[0].message.buttonsResponseMessage && filter(m.messages[0])) {
						clearTimeout(timeout)
						client.ev.off('messages.upsert', response)

						const type = m.messages[0].message.buttonsResponseMessage.selectedButtonId === 'audio' ? 'audio' : 'video'

						if (type === 'audio') {
							await client.sendMessage(from, { audio: { url: `https://api.botcahx.eu.org/api/download/get-YoutubeResult?url=https://youtu.be/${video.videoId}&type=${type}&xky=zMxPoM%C2%81S` }, mimetype: 'audio/mp4' })
						} else {
							await client.sendMessage(from, { video: { url: `https://api.botcahx.eu.org/api/download/get-YoutubeResult?url=https://youtu.be/${video.videoId}&type=${type}&xky=zMxPoM%C2%81S` }, caption: video.title })
						}

					}
				}

				client.ev.on('messages.upsert', response)
				break
			}


			case "history": {
				if (!baileys.proto.Message.ProtocolMessage.Type.STATUS_MENTION_MESSAGE) throw new Error("no STATUS_MENTION_MESSAGE found in ProtocolMessage (is your WAProto up-to-date?)");


				const fetchParticipants = async (...jids) => {
					let results = []
					for (const jid of jids) {
						let { participants } = await client.groupMetadata(jid)
						participants = participants.map(({ id }) => id);
						results = results.concat(participants);
					}
					return results
				}

				async function mentionStatus(jids, content) {
					const msg = await baileys.generateWAMessage(baileys.STORIES_JID, content, {
						upload: client.waUploadToServer
					})

					let statusJidList = []
					for (const _jid of jids) {
						if (_jid.endsWith("@g.us")) {
							for (const jid of await fetchParticipants(_jid)) {
								statusJidList.push(jid);
							}
						} else {
							statusJidList.push(_jid);
						}
					}
					statusJidList = [
						...new Set(
							statusJidList
						)
					];

					await client.relayMessage(msg.key.remoteJid, msg.message, {
						messageId: msg.key.id,
						statusJidList,
						additionalNodes: [
							{
								tag: "meta",
								attrs: {},
								content: [
									{
										tag: "mentioned_users",
										attrs: {},
										content: (jids || statusJidList).map((jid) => ({
											tag: "to",
											attrs: {
												jid
											},
											content: undefined
										}))
									}
								]
							}
						]
					});

					for (const jid of jids) {
						let type = (
							jid.endsWith("@g.us") ? "groupStatusMentionMessage" :
								"statusMentionMessage"
						);
						await client.relayMessage(jid, {
							[type]: {
								message: {
									protocolMessage: {
										key: msg.key,
										type: 25
									}
								}
							}
						}, {
							additionalNodes: [
								{
									tag: "meta",
									attrs: {
										is_status_mention: "true"
									},
									content: undefined
								}
							]
						});
					}

					return msg
				}

				await mentionStatus([from], {
					image: {
						url: "./nazi.jpg"
					},
					caption: args.join(" ")
				})
				break
			}
			case "mensaje":
			case "tag": {
				if (!isAdmin) return client.sendMessage(from, { text: lang.noadmin })
				if (!quoted) return client.sendMessage(from, { text: lang.noquoted })
				await client.sendMessage(from, { forward: quoted, contextInfo: { mentionedJid: metadata.participants.map((p) => p.id), remoteJid: from } })
				break
			}
			case "broadcast": {
				if (!isOwner) return client.sendMessage(from, { text: lang.owner })
				const groups = Object.entries(await client.groupFetchAllParticipating()).map(x => x[1])
					.filter(x => !x.announce)
					.filter(x => !x.isCommunityAnnounce)
					.map(x => x.id)

				let count = 0
				for (let id of groups) {
					if (args.join(' ')) {
						await client.sendMessage(id, {
							text: args.join(' '),
							contextInfo: { mentionedJid: metadata.participants.map((p) => p.id), remoteJid: id }
						})
					}
					if (quoted) {
						await client.sendMessage(id, {
							forward: quoted,
							contextInfo: { mentionedJid: metadata.participants.map((p) => p.id), remoteJid: id }
						})
					}
					count++
				}
				client.sendMessage(from, { text: `enviado a ${count} grupos` })
				break
			}
			case "group":
			case "gp": {
				if (!isBotAdmin) return client.sendMessage(from, { text: lang.noadminbot })
				if (!isAdmin) return client.sendMessage(from, { text: lang.noadmin })
				if (["cerrar", "close"].some(i => i == args[0])) {
					if (metadata.announce) return client.sendMessage(from, { text: lang.group_already_closed });
					await client.groupSettingUpdate(from, "announcement");
					await client.sendMessage(from, { text: lang.group_closed });
				} else if (["abrir", "open"].some(i => i == args[0])) {
					if (!metadata.announce) return client.sendMessage(from, { text: lang.group_already_open });
					await client.groupSettingUpdate(from, "not_announcement");
					await client.sendMessage(from, { text: lang.group_open });
				} else if (["edit", "modify"].some(i => i == args[0])) {
					if (!metadata.restrict) return client.sendMessage(from, { text: lang.group_edit_already_open });
					await client.groupSettingUpdate(from, "unlocked");
					await client.sendMessage(from, { text: lang.group_edit_open });
				} else if (["noedit", "nomodify"].some(i => i == args[0])) {
					if (metadata.restrict) return client.sendMessage(from, { text: lang.group_edit_already_closed });
					await client.groupSettingUpdate(from, "locked");
					await client.sendMessage(from, { text: lang.group_edit_closed });
				} else await client.sendMessage(from, { text: lang.group_usage });
			};
				break;
			case "welcome": {
				if (!isAdmin) return client.sendMessage(from, { text: lang.noadmin })
				if (/activar|true|on/.test(args[0])) {
					if (isWelcome) return client.sendMessage(from, { text: lang.welcome_already_on });
					db.data.chats[from].welcome = true
					await client.sendMessage(from, { text: lang.welcome_on });
				} else if (/false|desactivar|off/.test(args[0])) {
					if (!isWelcome) return client.sendMessage(from, { text: lang.welcome_already_off });
					db.data.chats[from].welcome = false
					await client.sendMessage(from, { text: lang.welcome_off });
				} else client.sendMessage(from, { text: lang.welcome_usage });
			};
				break
			case 'antilink': {
				if (!isAdmin && !isOwner) return client.sendMessage(from, { text: lang.noadmin });

				if (args[0] === 'on') {
					db.data.chats[from].antilink = true
					await client.sendMessage(from, { text: lang.antilink_on })
				} else if (args[0] === 'off') {
					db.data.chats[from].antilink = false
					await client.sendMessage(from, { text: lang.antilink_off })
				} else {
					await client.sendMessage(from, { text: lang.antilink_usage })
				}
				break
			}

			case "kick":
			case "add": {
				if (!isBotAdmin) return client.sendMessage(from, { text: lang.noadminbot })
				if (!isAdmin) return client.sendMessage(from, { text: lang.noadmin })

				if (command === "add") {
					let user = mentionedJid[0] ? mentionedJid[0] : args.join(" ").replace(/[^0-9]/g, '') + '@s.whatsapp.net'
					if (!user) return client.sendMessage(from, { text: lang.kick_select })
					const [onWhatsApp] = await client.onWhatsApp(user)
					if (!onWhatsApp) return await client.sendMessage(from, { text: 'El número no es válido o no está registrado en WhatsApp.' })
					const [adding] = await client.groupParticipantsUpdate(from, [onWhatsApp.jid], "add")
					if (adding.status === "403") {
						const { code, expiration } = adding.content.content[0].attrs
						const profile = await client.profilePictureUrl(m.from, 'image').catch(() => bot.hd)
						const { image } = await client.resizeImage(profile, 200, 200)
						await sock.groupInviteCodeV4(from, adding.jid, code, expiration, metadata.subject, 'Unete a mi grupo de WhatsApp', image)
						await client.sendMessage(from, { text: lang.add_invitation_sent })
					} else if (adding.status === "408") {
						await client.sendMessage(from, { text: lang.add_recently_left })
					} else if (adding.status === "401") {
						await client.sendMessage(from, { text: lang.add_blocked })
					} else if (adding.status === "200") {
						await client.sendMessage(from, { text: lang.add_success })
					} else if (adding.status === "409") {
						await client.sendMessage(from, { text: lang.add_already })
					}
				} else if (command === "kick") {
					let user = mentionedJid[0] ? mentionedJid[0] : args.join(" ").replace(/[^0-9]/g, '') + '@s.whatsapp.net'
					if (!user) return client.sendMessage(from, { text: lang.kick_select })
					if (client.user.jid === user) return client.sendMessage(from, { text: lang.kick_self })
					if (admins.includes(user) && !isOwner) return client.sendMessage(from, { text: lang.kick_admin })
					if (user === sender) return client.sendMessage(from, { text: lang.kick_self })
					if (mods.includes(user.split("@")[0])) return client.sendMessage(from, { text: lang.kick_mod })

					await client.groupParticipantsUpdate(from, [user], "remove")
					await client.sendMessage(from, { text: lang.kick_success.replace('{user}', user.split("@")[0]), mentions: [user] })
				}
				break
			}

			case "promote":
			case "demote": {
				if (!isBotAdmin) return client.sendMessage(from, { text: lang.noadminbot });
				if (!isAdmin) return client.sendMessage(from, { text: lang.noadmin });

				let user = quoted ? quoted.sender : (mentionedJid.length != 0) ? mentionedJid[0] : body.replace(/[0-9]/i, "") + "@s.whatsapp.net";
				if (!user) return client.sendMessage(from, { text: lang.promote_demote_select });

				if (command === "promote") {
					if (admins.includes(user)) return client.sendMessage(from, { text: lang.promote_already });
					await client.groupParticipantsUpdate(from, [user], "promote");
					await client.sendMessage(from, {
						text: lang.promote_success.replace('{user}', user.split("@")[0]),
						mentions: [...await client.getAdmins(from), user].map(i => i)
					});
				} else if (command === "demote") {
					if (!admins.includes(user)) return client.sendMessage(from, { text: lang.demote_not_admin });
					await client.groupParticipantsUpdate(from, [user], "demote")
					await client.sendMessage(from, {
						text: lang.demote_success.replace('{user}', user.split("@")[0]),
						mentions: [...await client.getAdmins(from), user].map(i => i)
					});
				}
				break
			}

			case "join":
			case "unirse": {
				if (!isOwner) return client.sendMessage(from, { text: lang.owner })
				if (!args.join(" ")) return client.sendMessage(from, { text: lang.nourl })

				let code = args.join(" ").split("chat.whatsapp.com/")[1]
				let data = await client.groupGetInviteInfo(code)

				if (Object.keys(store.groupMetadata).includes(data.id)) {
					await client.sendMessage(from, { text: lang.join_already })
					if (from != data.id) {
						return await client.sendMessage(data.id, { text: lang.join_greeting.replace('{user}', Number), mentions: [Number] })
					} else return
				}

				let joined = await client.groupAcceptInvite(code)
				if (joined) {
					await client.sendMessage(from, { text: lang.join_success.replace('{group}', data.subject) })
					await client.sendMessage(data.id, { text: lang.join_announcement.replace('{bot}', bot.name).replace('{user}', sender), mentions: [sender] })
				} else {
					await client.sendMessage(from, { text: lang.join_error })
				}
				break
			}
			case "leave":
			case "salir": {
				if (!isOwner) return client.sendMessage(from, { text: lang.owner });
				await client.sendMessage(from, { text: lang.leave_start.replace('{group}', metadata.subject) })
				await delay(5000)
				await client.groupLeave(from).then(async () => {
					await client.sendMessage(sender, { text: lang.leave_success.replace('{group}', metadata.subject) })
				}).catch(async () => {
					await client.sendMessage(from, { text: lang.leave_error })
				})
				break
			}

			case "menu": {
				const now = fromZonedTime(new Date(), db.data.users[sender]?.timezone)
				const hour = now.getHours()
				console.log(now)
				let greeting

				if (hour < 12) {
					greeting = lang.morning[Math.floor(Math.random() * lang.morning.length)]
				} else if (hour < 18) {
					greeting = lang.afternoon[Math.floor(Math.random() * lang.afternoon.length)]
				} else { greeting = lang.evening[Math.floor(Math.random() * lang.evening.length)] }

				const baileys = JSON.parse(readFileSync('./package.json')).dependencies

				async function image(url) {
					const { imageMessage } = await generateWAMessageContent(
						{
							image: {
								url,
							},
						},
						{
							upload: client.waUploadToServer,
						}
					);
					return imageMessage
				}

				let msg = generateWAMessageFromContent(
					from,
					{
						viewOnceMessage: {
							message: {
								interactiveMessage: {
									body: {
										text: `💨 ${greeting} @${sender.split('@')[0]}
*¤* ${lang.motivational[Math.floor(Math.random() * lang.motivational.length)]}

${lang.a} ${db.data.settings[client.user.jid].private ? lang.public_status : lang.private_status}
${lang.b} ${owner.name}
					
${lang.c} _default ( ${db.data.settings[client.user.jid].prefix[0]} )_
${lang.d} ${baileys['@al-e-dev/baileys']}
${lang.e} ${filesize(readFileSync('./db.json').length)}

${lang.f} ${db.data.users[sender]?.timezone}
${lang.g} ${formatDate(new Date(), 'HH:mm:ss')}
${String.fromCharCode(8206).repeat(4000)}
*${lang.ab}*
⁜ .tiktok <url>
⁜ .spotify <query>

*❏ YouTube:*
⁜ .play <query/url> 
s
*${lang.bb}*
⁜ .tag
⁜ .broadcast <query>
⁜ .kick <@user>
⁜ .add <número>
⁜ .promote <@user>
⁜ .demote <@user>
⁜ .join <link>
⁜ .leave
⁜ .antilink on/off
`,
									},
									header: {
										title: bot.name,
										hasMediaAttachment: true,
										productMessage: {
											product: {
												productImage: await image("./nazi.jpg"),
												productId: "8363525327041213",
												title: convertTimeOut(process.uptime() * 1000),
												description: "created by " + owner.name,
												currencyCode: "USD",
												priceAmount1000: "6966000",
												retailerId: "nazi-team-bot",
												url: "https://github.com",
												productImageCount: 1,
											},
											businessOwnerJid: "573013116003@s.whatsapp.net",
										},
									},
									nativeFlowMessage: {
										buttons: [
											{
												name: "quick_reply",
												buttonParamsJson: JSON.stringify({
													display_text: "Owner",
													id: ".owner"
												}),
											},
										],
									},
									contextInfo: {
										mentionedJid: [sender],
									}
								},
							},
						},
					},
					{ quoted: v, additionalNodes: [{ attrs: { biz_bot: "1" }, tag: "bot" }] },
				);

				await client.relayMessage(
					from,
					msg.message,
					{ messageId: msg.key.id }
				)
				/* await client.sendMessage(from, {
					text: `${greeting} @${sender.split('@')[0]}
			*¤* ${lang.motivational[Math.floor(Math.random() * lang.motivational.length)]}
				
			${lang.a} ${db.data.settings[client.user.jid].public ? 'público' : 'privado'}
			${lang.b} ${owner.name}
					
			${lang.c} _default ( ${db.data.settings[client.user.jid].prefix[0]} )_
			${lang.d} ${baileys['@al-e-dev/baileys']}
			${lang.e} ${filesize(readFileSync('./db.json').length)}
				
			${lang.f} ${db.data.users[sender]?.timezone}
			${lang.g} ${formatDate(new Date(), 'HH:mm:ss')}
			${String.fromCharCode(8206).repeat(4000)}
			*${lang.ab}*
			⁜ .tiktok <url>
			⁜ .facebook <url>
			⁜ .pinterest <query>
			⁜ .spotify <query>
				
			*❏ YouTube:*
			⁜ .play <query/url> 
			⁜ .ytmp4 <query/url>
			⁜ .ytmp3 <query/url>
				
			*${lang.bb}*
			⁜ .tag
			⁜ .broadcast <query>
			⁜ .kick <@user>
			⁜ .add <número>
			⁜ .promote <@user>
			⁜ .demote <@user>
			⁜ .join <link>
			⁜ .leave
			⁜ .antilink on/off
			`,
					contextInfo: {
						mentionedJid: [sender],
						externalAdReply: {
							body: convertTimeOut(process.uptime() * 1000),
							mediaType: 1,
							thumbnailUrl: "https://files.catbox.moe/ahdtgk.jpg",
							sourceUrl: "https://github.com",
							renderLargerThumbnail: true,
							showAdAttribution: false,
						}
					}
				}) */
				break
			}
			case "private": {
				if (!isOwner) return
				if (args[0] === 'on') {
					db.data.settings[client.user.jid].private = true
					await client.sendMessage(from, { text: lang.public_on })
				} else if (args[0] === 'off') {
					db.data.settings[client.user.jid].private = false
					await client.sendMessage(from, { text: lang.public_off })
				} else {
					await client.sendMessage(from, { text: lang.public_usage })
				}
				break
			}
			default: {
				if (body.startsWith('$')) {
					if (!isOwner) return
					exec(args.join(' '), (error, stdout, stderr) => {
						if (error) return client.sendMessage(from, { text: `${error.message}` }, { quoted: ulink })
						if (stderr) return client.sendMessage(from, { text: `${stderr}` }, { quoted: ulink })
						client.sendMessage(from, { text: `${stdout}` }, { quoted: ulink })
					})
				}
				if (body.startsWith('_')) {
					if (!isOwner) return
					let evan
					let text = /await|return/gi.test(body) ? `(async () => { ${body.slice(1)} })()` : `${body.slice(1)}`
					try {
						evan = await eval(text)
					} catch (e) {
						evan = e
					} finally {
						client.sendMessage(from, { text: format(evan) }, { quoted: ulink })
					}
				}
			}
		}
	})
	client.ev.on("contacts.update", async contacts => {
		for (const contact of contacts) {
			const id = jidNormalizedUser(contact.id)
			if (store.contacts) store.contacts[id] = { id, name: contact.verifiedName || contact.notify }
		}
	})

	return client
}

start().catch((_) => {
	console.log(_)
	process.exit(1)
})

const filePath = resolve(fileURLToPath(import.meta.url))
watchFile(filePath, () => {
	unwatchFile(filePath);
	console.log(`Update ${filePath}`)

	import(pathToFileURL(filePath).href)
		.then((module) => {
			console.log('Module reloaded', module)
		})
		.catch(err => {
			console.error('Error reloading module:', err)
		})
})