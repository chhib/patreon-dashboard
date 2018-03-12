const fetch = require('node-fetch')
const fs = require('fs')
require('dotenv').config();
const json2csv = require('json2csv')
const moment = require('moment')
const sniff = require('supersniff')

const clientId = process.env.PATREON_CLIENT_ID
const clientSecret = process.env.PATREON_CLIENT_SECRET
let accessToken = process.env.PATREON_ACCESS_TOKEN
let refreshToken = process.env.PATREON_REFRESH_TOKEN
let expires = process.env.PATREON_EXPIRES
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

const refreshTokensAndGetExpiration = () => {
    const url = `https://www.patreon.com/api/oauth2/token` +
      `?grant_type=refresh_token` + 
      `&refresh_token=${refreshToken}` +
      `&client_id=${clientId}` +
      `&clientSecret=${clientSecret}`
    return sniff.memo('api-output.json', () =>
        fetch(url, {method: 'POST'})
          .then(response => response.json()))
        .then(sniff)
        .then(body => {
        console.log(body)
        accessToken = body.access_token
        refreshToken = body.refresh_token
        expires = body.expires_in*1000 + Date.now()
        const file = `PATREON_CLIENT_ID=${clientId}\n` +
          `PATREON_CLIENT_SECRET=${clientSecret}\n` +
          `PATREON_ACCESS_TOKEN=${accessToken}\n` +
          `PATREON_REFRESH_TOKEN=${refreshToken}\n` +
          `PATREON_EXPIRES=${expires}`
        console.log(file)
        return new Promise((resolve, reject) => {
          fs.writeFile('.env', file, (err) => {
             if (err) reject(err);
             else resolve(expires);
          })
        })
      })

}

// Check if auth is valid
getTokensExpiration()
  .catch((error) => {
    console.log(`Got error: ${error}. Attempting to refresh tokens.`)
    return refreshTokensAndGetExpiration()
  })
  .then(sniff)
  .then(result => {
    console.log(`Got expires is at ${new Date(parseInt(result,10))}, should now do the actual fetch`)
    return getPatreonData(url)
  })
  .then(sniff)
  .then(pledges => {
    if (pledges.length > 0) {
      const filename = `pledges-${moment().format('YYYY-MM-DD')}-(${pledges.length})`
      const filenameJson = `${filename}.json`
      const csv = json2csv({ data: pledges, fields: csvFields })
      const filenameCsv = `${filename}.csv`
      fs.writeFile(filenameJson, JSON.stringify(pledges, null, 2), 'utf8', () => console.log(`We're done folks! Saved date in ${filenameJson}.`))
      fs.writeFile(filenameCsv, csv, 'utf8', () => console.log(`We're done folks! Saved date in ${filenameCsv}.`))
    } else {
      console.log(`Did not fetch any pledges.`)
    }
  })
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
