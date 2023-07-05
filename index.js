const http = require('http')
const querystring = require('querystring')
const { Client, Intents } = require('discord.js')
const dayjs = require('dayjs')
require('dotenv').config()

// Glitch起動用サーバー
http
  .createServer(function (request, response) {
    if (request.method === 'POST') {
      var data = ''
      request.on('data', function (chunk) {
        data += chunk
      })
      request.on('end', function () {
        if (!data) {
          response.end('No post data')
          return
        }
        var dataObject = querystring.parse(data)
        if (dataObject.type === 'wake') {
          console.log('Woke up in post')
          response.end()
          return
        }
        response.end()
      })
    } else if (request.method === 'GET') {
      response.writeHead(200, { 'Content-Type': 'text/plain' })
      response.end('Discord Bot is active now\n')
    }
  })
  .listen(3000)

// ここからBOTの処理
const client = new Client({ intents: Object.values(Intents.FLAGS) })
client.once('ready', () => {
  console.log('BOT is ready.')
})
client.login(process.env.DISCORD_BOT_TOKEN)

// ステータス変更
client.on('ready', () => {
  console.log('Bot ready.')
  client.user.setActivity('夜勤', { type: 'PLAYING' })
})

client.on('messageCreate', async (message) => {
  if (message.author.id === client.user.id || message.author.bot) {
    return
  }

  // メインチャンネルへのファイルの投稿を画像保管チャンネルに転送する
  if (message.channelId === process.env.MAIN_CHANNEL_ID && message.attachments.size !== 0) {
    const urls = message.attachments.map((attachment) => {
      return attachment.url
    })
    const time = dayjs().format('YYYY/MM/DD HH:mm')
    const content = `${time}   ${message.author.username} の投稿`
    const channel = message.guild.channels.cache.find(
      (c) => c.id === process.env.TRANSFER_IMAGE_CHANNEL_ID && c.isText()
    )
    channel.send({
      content,
      files: urls,
    })
    return
  }

  //  特定のチャンネルにはBOT以外メッセージを送信できないように
  if (
    message.channelId === process.env.NOTICE_MTG_TIME_CHANNEL_ID &&
    message.channelId === process.env.TRANSFER_IMAGE_CHANNEL_ID
  ) {
    message.delete()
    return
  }

  if (message.mentions.has(client.user.id)) {
    message.reply('少々お待ち下さい')
    return
  }
  if (message.content === 'ねこ！') {
    message.reply('にゃん')
  }
})

// {userId: Date}
let dateMap = {}

client.on('voiceStateUpdate', (oldState, newState) => {
  const date = Date.now()
  if (oldState.channelId === null && newState.channelId !== null) {
    console.log('通話開始記録')

    const userId = oldState.member.user.id
    dateMap[userId] = date
    console.log(dateMap)
    return oldState.member.guild.channels.cache
      .get(process.env.NOTICE_MTG_TIME_CHANNEL_ID)
      .send(`**参加** ${oldState.member.user.username} が入室しました。`)
  }

  if (oldState.channelId !== null && newState.channelId === null) {
    console.log('通話終了記録')
    let text = `**退出** ${newState.member.user.username} が退出しました。`
    const userId = newState.member.user.id
    if (dateMap[userId] === undefined) {
      // 通常あり得ないがサーバーダウンなどを考慮してログ出力しておく
      console.log('ERROR 退室者の入室時間が記録されていない')
    } else {
      const dateItem = dateMap[userId]
      console.log(dateItem)
      const enterDate = dateItem
      console.log(enterDate)
      const srcSec = Math.floor((date - enterDate) / 1000)
      console.log(srcSec)
      const hours = Math.floor(srcSec / 3600)
      console.log(hours)
      const minutes = Math.floor((srcSec % 3600) / 60)
      console.log(minutes)
      text += ` 通話時間：${hours}時間${minutes}分`

      dateMap[userId] = undefined
      console.log(dateMap)
    }
    return oldState.member.guild.channels.cache
      .get(process.env.NOTICE_MTG_TIME_CHANNEL_ID)
      .send(text)
  }
})
