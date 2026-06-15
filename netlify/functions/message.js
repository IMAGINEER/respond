// netlify/functions/message.js - Respond.io outbound message handler
// Follows official respond-io/custom-channel-integration-example exactly
require('dotenv').config();
const { sendMessage } = require('./utils/zalo');
const { verifyToken } = require('./utils/respondio');
const logger = require('./utils/logger');

exports.handler = async (event, context) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  // Authenticate - match official example exactly
  const bearerToken = event.headers?.authorization;
  if (!bearerToken || bearerToken.substring(7, bearerToken.length) !== process.env.RESPONDIO_API_TOKEN) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const contactId = event.body?.contactId;
  const messageText = event.body?.message?.text;

  try {
    const result = await sendMessage(contactId, messageText);

    logger.info('Message sent', {
      type: 'message_outbound',
      contactId,
      messageId: result?.message_id
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mId: result?.message_id || Date.now().toString() })
    };
  } catch (error) {
    logger.error('Send failed', {
      type: 'message_outbound',
      contactId,
      error: error.message
    });

    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { message: 'Failed to send message' } })
    };
  }
};