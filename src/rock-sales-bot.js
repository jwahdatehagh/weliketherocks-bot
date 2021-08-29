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

// Config
const CONTRACT = '0x37504ae0282f5f334ed29b4548646f887977b7cc'
const MIN_PRICE = '50000000000000000' // All greater than 0.05 ETH
const FETCH_INTERVAL = 60000 // Once per minute

// Libraries
const api = EtherscanAPI.init(process.env.ETHERSCAN_API_KEY)
const interface = new ethers.utils.Interface(ABI)

// Data
const salesLog = []

// Fetches sales from Etherscan
const getSales = async block => {
  console.log(`Parsing from block ${block}`)
  try {
    const transactions = (await api.account.txlist(
      CONTRACT, // Contract
      block, // fromBlock
      'latest', // toBlock
      0,
      'desc'
    )).result

    return transactions
      .filter(t => ethers.BigNumber.from(t.value).gt(ethers.BigNumber.from(MIN_PRICE)))
      .map(p => ({
        rockId: interface.decodeFunctionData('buyRock', p.input).map(i => i.toString())[0],
        price: `${formatUnits(p.value)} Ξ`,
        buyer: p.from,
        tx: p.hash,
        timeStamp: p.timeStamp,
        block: parseInt(p.blockNumber),
      }))
  } catch (e) {
    console.error(`Block #${block}`, e)
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

  sales.forEach(sale => {
    console.log('new sale!', sale)

    const buyer = shortAddress(sale.buyer)
    const id = parseInt(sale.rockId)

    // Send Discord message
    sendMessage({
      embeds: [
        new MessageEmbed({
          title: `New Rock Sale #${id}`,
          image: Rock.discordImageFor(id),
          description: `Rock #${sale.rockId} was just purchased by ${buyer} for ${sale.price}`,
          fields: [
            {
              name: 'ID',
              value: sale.rockId,
            },
            {
              name: 'price',
              value: sale.price,
            },
            {
              name: 'buyer',
              value: `[${buyer}](https://etherscan.io/address/${sale.buyer})`,
            },
          ],
          url: `https://etherscan.io/tx/${sale.tx}`,
          color: '#99918A',
        }),
      ]
    })

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
}

const execute = async () => {
  let fromBlock = parseInt((await api.proxy.eth_blockNumber()).result)

  try {
    await notifySales(fromBlock)
  } catch (e) {}

  setInterval(async () => {
    fromBlock = salesLog.length ? salesLog[0].block + 1 : fromBlock
    await notifySales(fromBlock)
    saveLog()
  }, FETCH_INTERVAL)
}

execute()
