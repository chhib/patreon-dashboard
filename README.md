Use environment variables or keep a `.env` file and put your `PATREON_ACCESS_TOKEN`, `PATREON_REFRESH_TOKEN`, `PATREON_CLIENT_ID`, `PATREON_CLIENT_SECRET` in it.

Run the file to fetch all pledges, together with all related data and save to a `pledges-YYYY-MM-DD-(ZZZ).json` and `pledges-YYYY-MM-DD-(ZZZ).csv`

#TODO

- Cache the api calls
- Have an endpoint for external services to fetch the data (with auth)