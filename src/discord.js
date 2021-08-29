require('dotenv').config()
const { Client, Intents } = require('discord.js')

// Create a new client instance
const client = new Client({ intents: [Intents.FLAGS.GUILD_MESSAGES] })

// When the client is ready, run this code (only once)
client.once('ready', () => {
	console.log('Discord client ready!')
})

// Login to Discord
client.login(process.env.SALES_BOT_DISCORD_API_TOKEN)

const sendMessage = async (message) => {
  try {
    const channel = await client.channels.fetch(`${process.env.SALES_BOT_DISCORD_CHANNEL}`)
    await channel.send(message)
  } catch (e) {
    console.error(e)
  }
}

module.exports = {
  sendMessage,
}
