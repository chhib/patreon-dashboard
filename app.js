const fetch = require('node-fetch')
const fs = require('fs')
require('dotenv').config();

const accessToken = process.env.PATREON_ACCESS_TOKEN
const pageCount = 100
const url = `https://www.patreon.com/api/oauth2/api/campaigns/1137737/pledges?access_token=${accessToken}&type=pledge&page%5Bcount%5D=${pageCount}`
let pledges = []

const getPatreonData = function (url, callback) {
  console.log(`Fetching: ${url}`)
  fetch(url)
    .then(function(response){
      return response.json()
    })
    .then(function(json){
      if (json.data && json.data.length) {
        json.data.forEach(itm => pledges.push(itm))
      }
      if (json.links && json.links.next) { // if set, this is the next URL to query
        getPatreonData(`${json.links.next}&type=pledge&access_token=${accessToken}`, callback);
      } else {
        callback(); //Call when we are finished
      }
    })
    .catch(function(error) {
      console.error(error);
    })
}

getPatreonData(url, () => {
  const filename = `pledges-${pledges.length}.json`
  fs.writeFile(filename, JSON.stringify(pledges, null, 2), 'utf8', () => console.log(`We're done folks! Saved date in ${filename}.`));
})  
