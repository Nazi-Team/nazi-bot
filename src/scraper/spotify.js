import axios from "axios";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";

export default class Spotify {
    constructor() {
        this.baseUrl = 'https://api.fabdl.com'
        this.client = wrapper(axios.create({ jar: new CookieJar() }))
        
        process.env['SPOTIFY_CLIENT_ID'] = '4c4fc8c3496243cbba99b39826e2841f'
        process.env['SPOTIFY_CLIENT_SECRET'] = 'd598f89aba0946e2b85fb8aefa9ae4c8'
    }

    async spotifyCreds() {
        return new Promise(async resolve => {
            await this.client.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
                headers: { Authorization: 'Basic ' + Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64') }
            }).then(({ data }) => resolve(data)).catch(resolve)
        });
    }

    async getInfo(url) {
        return new Promise(async (resolve, reject) => {
            const creds = await this.spotifyCreds()
            if (!creds.access_token) return reject(creds)
            await this.client.get('https://api.spotify.com/v1/tracks/' + url.split('track/')[1], {
                headers: { Authorization: 'Bearer ' + creds.access_token }
            }).then(async ({ data }) => {
                console.log(data)
                resolve({
                    id: data.id,
                    title: data.name,
                    duration: data.duration_ms,
                    popularity: data.popularity + '%',
                    thumbnail: data.album.images.filter(({ height }) => height === 640).map(({ url }) => url)[0],
                    date: data.album.release_date,
                    artist: data.artists.map(({ name, type, id }) => ({ name, type, id })),
                    url: data.external_urls.spotify
                })
            }).catch(err => reject({ status: false, error: err }))
        })
    }
    async search(query, type = 'track', limit = 20) {
        return new Promise(async (resolve, reject) => {
            const creds = await this.spotifyCreds()
            if (!creds.access_token) return reject(creds)
            await this.client.get('https://api.spotify.com/v1/search?query=' + query + '&type=' + type + '&offset=0&limit=' + limit, {
                headers: { Authorization: 'Bearer ' + creds.access_token }
            }).then(async ({ data: { tracks: { items } } }) => {
                let result = []
                items.map(async (data) => result.push({
                    id: data.id,
                    title: data.name,
                    duration: data.duration_ms,
                    popularity: data.popularity + '%',
                    thumbnail: data.album.images.filter(({ height }) => height === 640).map(({ url }) => url)[0],
                    date: data.album.release_date,
                    artist: data.artists.map(({ name, type, id }) => ({ name, type, id })),
                    url: data.external_urls.spotify
                }))
                resolve(result)
            }).catch(err => reject({ status: false, error: err }))
        })
    }
    async download(url) {
        return new Promise((resolve, reject) => {
            this.client.get(this.baseUrl + `/spotify/get?url=${encodeURIComponent(url)}`).then(async ({ data: { result: get } }) => {
                this.client.get(this.baseUrl + `/spotify/mp3-convert-task/${get.gid}/${get.id}`).then(({ data: { result: download } }) => {
                    if (!download) return reject({ status: false })
                    resolve({
                        id: get.id,
                        type: get.type,
                        name: get.name,
                        image: get.image,
                        artists: get.artists,
                        duration: get.duration_ms,
                        download: `https://api.fabdl.com${download.download_url}`
                    })
                }).catch(err => reject({ status: false, error: err }))
            }).catch(err => reject({ status: false, error: err }))
        })
    }
}

// spotify.download("https://open.spotify.com/track/3zNcn4BaVfKORyx3uDfruW?si=Yb0zN8S9QwaSTyhk1Rk8jA ").then(console.log).catch(console.log)
// spotify.search("morat date la vuelta").then(console.log).catch(console.log)
// spotify.getInfo("https://open.spotify.com/track/3ZkUgtNi45G8qdmya5UTgV").then(console.log).catch(console.log)
// spotify.spotifyCreds().then(console.log).catch(console.log)