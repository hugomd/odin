require('dotenv').config();

module.exports = {
  "development": {
    "dbConnectionUrl": "postgres://127.0.0.1/odin_local",
    "dialect": "postgres"
  },
  "test": {
    "dbConnectionUrl": "postgres://127.0.0.1/odin_test",
    "dialect": "postgres"
  },
  "production": {
    "dbConnectionUrl": process.env.DB_CONNECTION_URL,
    "dialect": "postgres"
  }
};
