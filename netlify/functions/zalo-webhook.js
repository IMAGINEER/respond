// zalo-webhook.js - Zalo Webhook handler
require('dotenv').config();

exports.handler = async (event, context) => {
  // TODO: Implement Zalo webhook handling
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Zalo webhook placeholder' })
  };
};