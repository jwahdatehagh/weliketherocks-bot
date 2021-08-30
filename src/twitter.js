require('dotenv').config()
const {TwitterApi} = require('twitter-api-v2');
const Env = require('./helpers/environment');

// Instanciate with desired auth type (here's Bearer v2 auth)
const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_KEY,
  appSecret: process.env.TWITTER_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
})

const uploadMedia = async (url) => {
  try {
    return await twitterClient.v1.uploadMedia(url, {
      target: 'tweet',
      shared: true,
    });
  } catch (e) {
    console.error(e)
  }
}

const sendTweet = async (tweet = 'Hello Twitter!', params = {}) => {
  if (Env.isDevelopment()) {
    console.info('Send Tweet', tweet, params)
    return
  }

  try {
    await twitterClient.v1.tweet(tweet, params)
  } catch (e) {
    console.error(e)
  }
}

module.exports = {
  sendTweet,
  uploadMedia,
}
