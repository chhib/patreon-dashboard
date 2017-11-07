const fetch = require('node-fetch')
const fs = require('fs')
require('dotenv').config();

const accessToken = process.env.PATREON_ACCESS_TOKEN
const pageCount = 100
const url = `https://www.patreon.com/api/oauth2/api/campaigns/1137737/pledges` +
  `?type=pledge&sort=created&page%5Bcount%5D=${pageCount}&access_token=${accessToken}`

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
    const filename = `pledges-${pledges.length}.json`
    fs.writeFile(filename, JSON.stringify(pledges, null, 2), 'utf8', () => console.log(`We're done folks! Saved date in ${filename}.`))
  })
  .catch(error => console.log(error))