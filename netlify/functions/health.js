// health.js - Health check function
require('dotenv').config();

exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status: 'ok' })
  };
};