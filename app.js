const fetch = require('node-fetch')
const fs = require('fs')
require('dotenv').config();
const json2csv = require('json2csv')
const moment = require('moment')

const clientId = process.env.PATREON_CLIENT_ID
const clientSecret = process.env.PATREON_CLIENT_SECRET
let accessToken = process.env.PATREON_ACCESS_TOKEN
let refreshToken = process.env.PATREON_REFRESH_TOKEN

// TODO: get new accessToken if expisred, save to .env

const pageCount = 100
const url = `https://www.patreon.com/api/oauth2/api/campaigns/1137737/pledges` +
  `?type=pledge&sort=created&page%5Bcount%5D=${pageCount}&access_token=${accessToken}`
const csvFields = [
  'attributes.amount_cents', 
  'attributes.created_at', 
  'attributes.declined_since'
];

const getPatreonData = function (url, pledges = []) {
  console.log(`Fetching: ${url}`)
  return fetch(url)
    .then(response => response.json())
    .then(function(body) {
      if (Array.isArray(body.data)) {
        pledges = pledges.concat(body.data)
      } else {
        console.log(body)
      }
      return body.links && body.links.next 
        ? getPatreonData(`${body.links.next}&type=pledge&access_token=${accessToken}`, pledges) 
        : pledges
      })
}

const getTokensExpiration = () => {
  return new Promise ((resolve, reject) => {
    let expiredTimeStamp = 0
    fs.readFile('./.expires', 'utf8', (err, data) => {
      if (err) {
        reject('No file')
        return;
      }
      expiredTimeStamp = parseInt(data, 10)
      if (expiredTimeStamp < Date.now()) {
        reject('Time has expired')
        return;
      }
      resolve(expiredTimeStamp)
    })
  })
}

// const saveTokens = (options) => {
//   // Save tokens to .env and in memory

//   console.log(options)
//   accessToken = options.access_token
//   refreshToken = options.refresh_token
//   const file = `PATREON_CLIENT_ID=${clientId}\n` +
//     `PATREON_CLIENT_SECRET=${clientSecret}\n` +
//     `PATREON_ACCESS_TOKEN=${accessToken}\n` +
//     `PATREON_REFRESH_TOKEN=${refreshToken}`
//   console.log(file)

//   return new Promise ((resolve, reject) => {
//      'utf8', (error) => {
//       if (error) {
//         reject(error)
//         return;
//       }
//       console.log('Updated tokens have been saved to .env!');
//       resolve()
//     })
//   })
// }


const wait = (ms) => {
  return new Promise((resolve) => {
    console.log('starting to wait')
    return setTimeout(resolve, ms)
  })
}

const refreshTokensAndGetExpiration = () => {
    const url = `https://www.patreon.com/api/oauth2/token` +
      `?grant_type=refresh_token` + 
      `&refresh_token=${refreshToken}` +
      `&client_id=${clientId}` +
      `&clientSecret=${clientSecret}`
    return fetch(url, {method: 'POST'})
      .then(response => response.json())
      .then(body => {
        console.log(body)
        accessToken = body.access_token
        refreshToken = body.refresh_token
        let expiration = body.expires_in + Date.now()
        const file = `PATREON_CLIENT_ID=${clientId}\n` +
          `PATREON_CLIENT_SECRET=${clientSecret}\n` +
          `PATREON_ACCESS_TOKEN=${accessToken}\n` +
          `PATREON_REFRESH_TOKEN=${refreshToken}\n` +
          `PATREON_EXPIRES=${expiration}`
        console.log(file)
        return new Promise((resolve, reject) => {
          fs.writeFile('.env', file, (err) => {
             if (err) reject(err);
             else resolve(expiration);
          })
        })
      })
}

process.on('unhandledRejection', (reason) => {
  console.log('Reason: ' + reason);
});

// Check if auth is valid
getTokensExpiration()
  .catch((error) => {
    console.log(`Got error: ${error}. Attempting to refresh tokens.`)
    //wait(2000)
    refreshTokensAndGetExpiration()
  })
  .then(result => console.log(`Got ${result}, should now do the actual fetch`))
  .then(something => console.log(`SOMETHING: ${something}`))
  .catch(error => console.log(error))

// getPatreonData(url)
//   .then(pledges => {
//     if (pledges.length > 0) {
//       const filename = `pledges-${moment().format('YYYY-MM-DD')}-(${pledges.length})`
//       const filenameJson = `${filename}.json`
//       const csv = json2csv({ data: pledges, fields: csvFields })
//       const filenameCsv = `${filename}.csv`
//       fs.writeFile(filenameJson, JSON.stringify(pledges, null, 2), 'utf8', () => console.log(`We're done folks! Saved date in ${filenameJson}.`))
//       fs.writeFile(filenameCsv, csv, 'utf8', () => console.log(`We're done folks! Saved date in ${filenameCsv}.`))
//     } else {
//       console.log(`Did not fetch any pledges.`)
//     }
//   })
//   .catch(error => console.log(error))
