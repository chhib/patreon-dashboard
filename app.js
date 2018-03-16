const patreonApi = require('./src/patreon-api.js')

patreonApi.fetch(`https://www.patreon.com/api/oauth2/api/campaigns/1137737/pledges` +
`?type=pledge&sort=created&page%5Bcount%5D=100`).then(json => console.log(json)).catch(error => console.log('hej'))
