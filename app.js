const fetch = require('node-fetch')
const fs = require('fs')
require('dotenv').config();
const json2csv = require('json2csv')

const accessToken = process.env.PATREON_ACCESS_TOKEN
const refreshToken = process.env.PATREON_REFRESH_TOKEN

// TODO: get new accessToken if expired, save to .env

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
      }
      return body.links && body.links.next 
        ? getPatreonData(`${body.links.next}&type=pledge&access_token=${accessToken}`, pledges) 
        : pledges
    })
}

getPatreonData(url)
  .then(pledges => {
    const jsonFilename = `pledges-${pledges.length}.json`
    const csv = json2csv({ data: pledges, fields: csvFields })
    const csvFilename = `pledges-${pledges.length}.csv`
    fs.writeFile(jsonFilename, JSON.stringify(pledges, null, 2), 'utf8', () => console.log(`We're done folks! Saved date in ${jsonFilename}.`))
    fs.writeFile(csvFilename, csv, 'utf8', () => console.log(`We're done folks! Saved date in ${csvFilename}.`))
  })
  .catch(error => console.log(error))
