// utils/respondio.js - Respond.io API client
const axios = require('axios');
const logger = require('./logger');

/**
 * Send inbound message to Respond.io
 * @param {string} contactId - Contact identifier (Zalo user ID)
 * @param {string} text - Message text
 * @param {string} messageId - Unique message ID
 * @returns {Promise<Object>} - API response
 */
async function sendInboundMessage(contactId, text, messageId) {
  const webhookUrl = process.env.RESPONDIO_INCOMING_WEBHOOK;
  const apiToken = process.env.RESPONDIO_API_TOKEN;
  const channelId = process.env.RESPONDIO_CHANNEL_ID;

  if (!webhookUrl) {
    throw new Error('RESPONDIO_INCOMING_WEBHOOK is not configured');
  }

  if (!apiToken) {
    throw new Error('RESPONDIO_API_TOKEN is not configured');
  }

  if (!channelId) {
    throw new Error('RESPONDIO_CHANNEL_ID is not configured');
  }

  const payload = {
    channelId: channelId,
    contactId: String(contactId),
    events: [
      {
        type: 'message',
        mId: String(messageId),
        timestamp: Date.now(),
        message: {
          type: 'text',
          text: String(text)
        }
      }
    ]
  };

  try {
    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        'cache-control': 'no-cache'
      },
      timeout: 10000
    });

    logger.info('Inbound message sent to Respond.io', {
      type: 'respondio_outbound',
      contactId,
      messageId
    });

    return response.data;
  } catch (error) {
    logger.error('Failed to send message to Respond.io', {
      type: 'respondio_error',
      contactId,
      status: error.response?.status,
      message: error.message
    });

    throw error;
  }
}

/**
 * Verify bearer token from Respond.io outbound webhook
 * @param {string} bearerToken - Authorization header value
 * @returns {boolean} - True if valid
 */
function verifyToken(bearerToken) {
  const apiToken = process.env.RESPONDIO_API_TOKEN;

  if (!bearerToken || !apiToken) {
    return false;
  }

  const token = bearerToken.substring(7, bearerToken.length);
  return token === apiToken;
}

module.exports = {
  sendInboundMessage,
  verifyToken
};