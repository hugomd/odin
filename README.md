# Odin

### Environment variables
#### Postgres
* `DB_USERNAME`
* `DB_PASSWORD`
* `DB_DATABASE`
* `DB_HOST`

#### Lightning
* `LND_IP`
* `LND_PORT`
* `MACAROON_BASE64`

### Database migrations
To create the database and run migrations:
```bash
npx sequelize-cli db:create
npx sequelize-cli db:migrate
```

### Generate a new macaroon
```bash
lncli bakemacaroon invoices:read invoices:write message:read message:write offchain:read offchain:write --save_to odin.macaroon
```

Convert it to base64:
```bash
 xxd -ps -u -c 1000 odin.macaroon
```
