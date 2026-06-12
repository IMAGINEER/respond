// oauth-callback.js - OAuth callback handler for Zalo OA
require('dotenv').config();

exports.handler = async (event, context) => {
  // TODO: Implement OAuth callback logic
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'OAuth callback placeholder' })
  };
};