const http = require("http");
const querystring = require('querystring')
const { Client, Intents } = require('discord.js');

// Glitch起動用サーバー
http.createServer(function (request, response) {
  if (request.method == "POST") {
    var data = "";
    request.on("data", function (chunk) {
      data += chunk;
    });
    request.on("end", function () {
      if (!data) {
        response.end("No post data");
        return;
      }
      var dataObject = querystring.parse(data);
      console.log("post:" + dataObject.type);
      if (dataObject.type == "wake") {
        console.log("Woke up in post");
        response.end();
        return;
      }
      response.end();
    });
  } else if (request.method == "GET") {
    response.writeHead(200, { "Content-Type": "text/plain" });
    response.end("Discord Bot is active now\n");
  }
}).listen(3000);

// ここからBOTの処理
const client = new Client({ intents: Object.values(Intents.FLAGS) });
client.once('ready', () => {
  console.log('BOT is ready.');
});
client.login(process.env.DISCORD_BOT_TOKEN);

// ステータス変更
client.on("ready", (message) => {
  console.log("Bot ready.");
  client.user.setActivity("夜勤", { type: "PLAYING" });
});

// メンションに対してアクション
client.on('messageCreate', async (message) => {
  if (message.author.id === client.user.id || message.author.bot) {
    return;
  }
  if (message.mentions.has(client.user.id)) {
    message.reply("少々お待ち下さい")
    return;
  }
  if (message.content === "ねこ！") {
    message.reply("にゃん")
  }
});

// {id, date}
let dateList = [];

client.on('voiceStateUpdate', (oldState, newState) => {
  const date = Date.now();
  console.log("通話イベント検知");
  if (oldState.channelId === null && newState.channelId !== null) {
    console.log("通話開始記録");

    const userId = oldState.member.user.id;
    if (dateList.find(v => v === userId) === undefined) {
      dateList.push({
        id: userId,
        date
      })
    }
    return oldState.member.guild.channels.cache
      .get(process.env.TEXT_CHANNEL_ID)
      .send(`**参加** ${oldState.member.user.username}が入室しました。`);
  }

  if (oldState.channelId !== null && newState.channelId === null) {
    console.log("通話終了記録");
    let text = `**退出** ${newState.member.user.username}が退出しました。`;
    const userId = newState.member.user.id;
    const dateItem = dateList.find(v => v.id === userId);
    if (dateItem === undefined) {
      // 通常あり得ないがサーバーダウンなどを考慮してログ出力しておく
      console.log("ERROR 退室者の入室時間が記録されていない")
    } else {
      const enterDate = dateItem.date;
      const srcSec = Math.floor((date - enterDate) / 1000);
      const hours = Math.floor(srcSec / 3600);
      const minutes = Math.floor(srcSec % 3600 / 60);
      text += ` 通話時間：${hours}時間${minutes}分`
    }
    return oldState.member.guild.channels.cache
      .get(process.env.TEXT_CHANNEL_ID)
      .send(text);
  }
});
