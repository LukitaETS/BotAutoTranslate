const mongoose = require('mongoose');
const appConfig = require('../config/app');

let connectionPromise;

async function connectDatabase() {
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(appConfig.mongoUri, {
      serverSelectionTimeoutMS: 10000
    });
  }

  return connectionPromise;
}

module.exports = {
  connectDatabase
};
