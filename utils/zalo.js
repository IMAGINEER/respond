// utils/zalo.js - Zalo API client
const axios = require('axios');
const logger = require('./logger');

const ZALO_API_URL = 'https://openapi.zalo.me/v3.0/oa/message/cs';

/**
 * Send text message to Zalo user
 * @param {string} userId - Zalo user ID
 * @param {string} text - Message text
 * @returns {Promise<Object>} - API response
 */
async function sendMessage(userId, text) {
  const accessToken = process.env.ZALO_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error('ZALO_ACCESS_TOKEN is not configured');
  }

  const payload = {
    recipient: {
      user_id: String(userId)
    },
    message: {
      text: String(text)
    }
  };

  try {
    const response = await axios.post(ZALO_API_URL, payload, {
      headers: {
        'access_token': accessToken,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    logger.info('Zalo message sent successfully', {
      type: 'zalo_outbound',
      userId,
      messageLength: text.length
    });

    return response.data;
  } catch (error) {
    const errorInfo = {
      type: 'zalo_error',
      userId,
      status: error.response?.status,
      message: error.message
    };

    if (error.response?.data) {
      errorInfo.details = error.response.data;
    }

    logger.error('Failed to send Zalo message', errorInfo);
    throw error;
  }
}

module.exports = {
  sendMessage
};