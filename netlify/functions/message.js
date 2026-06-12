// netlify/functions/message.js - Respond.io outbound message handler
require('dotenv').config();
const { sendMessage } = require('../utils/zalo');
const { verifyToken } = require('../utils/respondio');
const logger = require('../utils/logger');

exports.handler = async (event, context) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    logger.warn('Invalid HTTP method for message handler', {
      type: 'message_outbound',
      method: event.httpMethod
    });
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  // Authenticate using bearer token
  const bearerToken = event.headers?.authorization;
  if (!verifyToken(bearerToken)) {
    logger.warn('Unauthorized message request', {
      type: 'message_outbound',
      type_auth: 'unauthorized'
    });
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { contactId, message } = body;

    // Validate required fields
    if (!contactId) {
      logger.warn('Missing contactId in message request', {
        type: 'message_outbound',
        body
      });
      return { statusCode: 400, body: JSON.stringify({ error: 'Bad Request' }) };
    }

    if (!message?.text) {
      logger.warn('Missing message.text in message request', {
        type: 'message_outbound',
        contactId
      });
      return { statusCode: 400, body: JSON.stringify({ error: 'Bad Request' }) };
    }

    logger.info('Processing outbound message', {
      type: 'message_outbound',
      contactId,
      messageLength: message.text.length
    });

    // Send message via Zalo API
    const result = await sendMessage(contactId, message.text);

    logger.info('Outbound message sent successfully', {
      type: 'message_outbound_success',
      contactId,
      result
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mId: result?.message_id || Date.now().toString() })
    };
  } catch (error) {
    logger.error('Failed to send outbound message', {
      type: 'message_outbound_error',
      error: error.message
    });

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal Server Error' })
    };
  }
};