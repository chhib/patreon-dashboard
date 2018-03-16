const fetch = require('node-fetch')
const fs = require('fs')
require('dotenv').config();
const json2csv = require('json2csv')
const moment = require('moment')

const clientId = process.env.PATREON_CLIENT_ID
const clientSecret = process.env.PATREON_CLIENT_SECRET
let accessToken = process.env.PATREON_ACCESS_TOKEN
let refreshToken = process.env.PATREON_REFRESH_TOKEN
let expires = process.env.PATREON_EXPIRES

const getTokensExpiration = () => {
  return new Promise ((resolve, reject) => {
    if (!expires) {
      reject('No expires in environment variable')
      return;
    }
    if (expires < Date.now()) {
      reject('Time has expired')
      return;
    }
    resolve(expires)
  })
}

const refreshTokensAndGetExpiration = (error) => {
  (process.env.NODE_ENV !== 'production') && console.log(`Got error: ${error}. Attempting to refresh tokens.`)
  const url = `https://www.patreon.com/api/oauth2/token` +
    `?grant_type=refresh_token` + 
    `&refresh_token=${refreshToken}` +
    `&client_id=${clientId}` +
    `&clientSecret=${clientSecret}`
  return fetch(url, {method: 'POST'})
      .then(response => response.json())
      .then(body => {
        accessToken = body.access_token
        refreshToken = body.refresh_token
        expires = body.expires_in*1000 + Date.now()
        return new Promise((resolve, reject) => {
          if (process.env.NODE_ENV !== 'production') {
            const file = `PATREON_CLIENT_ID=${clientId}\n` +
              `PATREON_CLIENT_SECRET=${clientSecret}\n` +
              `PATREON_ACCESS_TOKEN=${accessToken}\n` +
              `PATREON_REFRESH_TOKEN=${refreshToken}\n` +
              `PATREON_EXPIRES=${expires}`
              
            fs.writeFile('.env', file, (err) => {
              if (err) reject(err);
              else resolve(expires);
            })
          } else {
            resolve(expires)
          }
        })})
}

const getPatreonData = function (url, pledges = []) {
  (process.env.NODE_ENV !== 'production') && console.log(`Fetching: ${url}`)
  return fetch(url)
    .then(response => response.json())
    .then(function(body) {
      if (Array.isArray(body.data)) {
        pledges = pledges.concat(body.data)
      } else {
        console.log(body.data)
      }
      return body.links && body.links.next 
        ? getPatreonData(`${body.links.next}&type=pledge&access_token=${accessToken}`, pledges) 
        : pledges
      })
}

const writeFilePromisified = (filename, data, options) => new Promise((resolve, reject) => {
  fs.writeFile(filename, data, options, (err) => err === null ? resolve(filename) : reject(err))
})

const saveToCsv = async (pledges) => {
  let message = 'Did not fetch any pledges.'
  if (pledges.length > 0) {
    const filename = `pledges-${moment().format('YYYY-MM-DD')}-(${pledges.length})`
    const filenameJson = `${filename}.json`
    const csvFields = [
      'attributes.amount_cents', 
      'attributes.created_at', 
      'attributes.declined_since'
    ];
    const csv = json2csv({ data: pledges, fields: csvFields })
    const filenameCsv = `${filename}.csv`
    const messageJson = await writeFilePromisified(filenameJson, JSON.stringify(pledges, null, 2))
    const messageCsv = await writeFilePromisified(filenameCsv, csv)
    message = `Wrote to ${messageJson} and ${messageCsv}`
  } 
  console.log(message)
  return pledges
}      

getTokensExpiration()
  .catch(refreshTokensAndGetExpiration)
  .then(() => getPatreonData(`https://www.patreon.com/api/oauth2/api/campaigns/1137737/pledges` +
  `?type=pledge&sort=created&page%5Bcount%5D=100&access_token=${accessToken}`))
  .then(saveToCsv)
  .catch(console.log)