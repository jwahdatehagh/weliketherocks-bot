require('dotenv').config()

const fs = require('fs')
const ethers = require('ethers')
const { formatUnits } = require('ethers/lib/utils')
const EtherscanAPI = require('etherscan-api')
const { MessageEmbed } = require('discord.js')
const ABI = require('./../abis/WeLikeTheRocks.json')
const { sendMessage } = require('./discord')
const shortAddress = require('./helpers/short-address')
const Rock = require('./Rock')
const { sendTweet } = require('./twitter')
const Env = require('./helpers/environment')

// Config
const CONTRACT = '0x37504ae0282f5f334ed29b4548646f887977b7cc'
const FETCH_INTERVAL = process.env.FETCH_INTERVAL || 60000
const UPDATE_PRICE_INTERVAL = process.env.UPDATE_PRICE_INTERVAL || 600000
const MIN_PRICE = process.env.MIN_PRICE || 50000000000000000
const FROM_BLOCK = process.env.FROM_BLOCK

// Libraries
const api = EtherscanAPI.init(process.env.ETHERSCAN_API_KEY)
const interface = new ethers.utils.Interface(ABI)

// Data
let salesLog = []
let usdPrice = 3200

// Fetches sales from Etherscan
const getSales = async fromBlock => {
  console.log(`Parsing from block ${fromBlock}`)
  try {
    const transactions = (await api.account.txlist(
      CONTRACT,
      fromBlock,
      'latest', // toBlock
      0,
      'desc'
    )).result

    return transactions
      .filter(t => ethers.BigNumber.from(t.value).gt(ethers.BigNumber.from(MIN_PRICE)))
      .map(p => {
        try {
          const rockId = interface.decodeFunctionData('buyRock', p.input).map(i => i.toString())[0]
          const price = formatUnits(p.value)

          return {
            rockId,
            price: `${price}Ξ`,
            usdPrice: `$${(price * usdPrice).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD`,
            buyer: p.from,
            tx: p.hash,
            timeStamp: p.timeStamp,
            block: parseInt(p.blockNumber),
          }
        } catch (e) {
          console.error(e)
          return false
        }
      })
      .filter(p => !!p)
  } catch (e) {
    console.error(`Block #${fromBlock}`, e)
    return []
  }
}

// Notifies about new sales
const notifySales = async block => {
  const sales = await getSales(block)

  if (! sales.length) {
    console.info(`No sales in blocks since #${block}`)
    return
  }

  sales.forEach(async sale => {
    console.log('new sale!', sale)

    const buyer = shortAddress(sale.buyer)
    const id = parseInt(sale.rockId)
    const url = `https://etherscan.io/tx/${sale.tx}`
    const price = `${sale.price} (${sale.usdPrice})`

    // Send Discord message
    await sendMessage({
      embeds: [
        new MessageEmbed({
          title: `New Rock Sale #${id}`,
          image: Rock.discordImageFor(id),
          description: `Rock #${sale.rockId} was just purchased by ${buyer} for ${price}`,
          fields: [
            {
              name: 'ID',
              value: sale.rockId,
            },
            {
              name: 'price',
              value: price,
            },
            {
              name: 'buyer',
              value: `[${buyer}](https://etherscan.io/address/${sale.buyer})`,
            },
          ],
          url,
          color: '#99918A',
        }),
      ]
    })

    // Send Tweet
    await sendTweet(`Rock #${id} was just snagged by ${buyer} for ${price}\n\n@weliketherocks\n\n${url}`)

    // Save log
    salesLog.unshift(sale)
  })

  return sales
}

// Saves the latest log
const saveLog = () => {
  console.log('Saving log...')
  fs.writeFileSync(
    './sales-log.json',
    JSON.stringify(
      salesLog,
      undefined,
      4
    )
  )

  // Don't store more than the last 1k sales
  salesLog = salesLog.slice(0, 1000)
}

const updateEthPrice = async () => {
  const prices = (await api.stats.ethprice()).result
  usdPrice = parseInt(prices.ethusd)
  console.info(`Updated ETH - USD price to ${usdPrice}`)
}

const execute = async () => {
  console.info(Env.isProduction() ? `Staring bot in PRODUCTION` : `DEV Mode`)

  let fromBlock = FROM_BLOCK || parseInt((await api.proxy.eth_blockNumber()).result)
  updateEthPrice()

  try {
    await notifySales(fromBlock)
  } catch (e) {}

  setInterval(async () => {
    fromBlock = salesLog.length ? salesLog[0].block + 1 : fromBlock
    await notifySales(fromBlock)
    saveLog()
  }, FETCH_INTERVAL)

  setInterval(async () => updateEthPrice(), UPDATE_PRICE_INTERVAL)
}

execute()
