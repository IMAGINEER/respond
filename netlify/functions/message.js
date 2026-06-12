// netlify/functions/message.js - Respond.io outbound message handler
require('dotenv').config();
const { sendMessage } = require('./utils/zalo');
const { verifyToken } = require('./utils/respondio');
const logger = require('./utils/logger');

exports.handler = async (event, context) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    logger.warn('Invalid HTTP method', {
      type: 'message_outbound',
      action: 'reject',
      requestId,
      method: event.httpMethod
    });
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST'
      },
      body: ''
    };
  }

  logger.info('Outbound request received', {
    type: 'message_outbound',
    action: 'received',
    requestId,
    contentType: event.headers?.['content-type']
  });

  // Authenticate using bearer token
  const bearerToken = event.headers?.authorization;
  if (!bearerToken) {
    logger.warn('Missing authorization header', {
      type: 'message_outbound',
      action: 'reject',
      requestId,
      reason: 'missing_token'
    });
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  if (!verifyToken(bearerToken)) {
    logger.warn('Invalid bearer token', {
      type: 'message_outbound',
      action: 'reject',
      requestId,
      reason: 'invalid_token'
    });
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    // Handle empty body
    if (!event.body) {
      logger.warn('Empty request body', {
        type: 'message_outbound',
        action: 'reject',
        requestId
      });
      return { statusCode: 400, body: JSON.stringify({ error: 'Empty body' }) };
    }

    let body;
    try {
      body = JSON.parse(event.body);
    } catch (parseError) {
      logger.error('Invalid JSON body', {
        type: 'message_outbound',
        action: 'reject',
        requestId,
        error: 'JSON parse error'
      });
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }

    const { contactId, message } = body;

    // Validate required fields
    if (!contactId) {
      logger.warn('Missing contactId', {
        type: 'message_outbound',
        action: 'reject',
        requestId,
        bodyKeys: Object.keys(body)
      });
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing contactId' }) };
    }

    if (!message) {
      logger.warn('Missing message object', {
        type: 'message_outbound',
        action: 'reject',
        requestId,
        contactId
      });
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing message' }) };
    }

    if (!message.text) {
      logger.warn('Missing message.text', {
        type: 'message_outbound',
        action: 'reject',
        requestId,
        contactId
      });
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing message.text' }) };
    }

    // Check for empty message
    if (message.text.trim().length === 0) {
      logger.warn('Empty message text', {
        type: 'message_outbound',
        action: 'reject',
        requestId,
        contactId
      });
      return { statusCode: 400, body: JSON.stringify({ error: 'Empty message' }) };
    }

    logger.info('Processing outbound message', {
      type: 'message_outbound',
      action: 'process',
      requestId,
      contactId,
      textLength: message.text.length,
      textPreview: message.text.substring(0, 50)
    });

    // Send message via Zalo API
    let result;
    try {
      result = await sendMessage(contactId, message.text);
    } catch (zaloError) {
      logger.error('Zalo API call failed', {
        type: 'message_outbound',
        action: 'zalo_failed',
        requestId,
        contactId,
        error: zaloError.message,
        status: zaloError.response?.status,
        details: zaloError.response?.data
      });

      // Return 500 for Zalo errors
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to send message' })
      };
    }

    const responseMid = result?.message_id || Date.now().toString();

    logger.info('Message sent successfully', {
      type: 'message_outbound',
      action: 'success',
      requestId,
      contactId,
      messageId: responseMid
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mId: responseMid })
    };
  } catch (error) {
    logger.error('Unexpected error processing message', {
      type: 'message_outbound',
      action: 'error',
      requestId,
      error: error.message,
      stack: error.stack?.substring(0, 500)
    });

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal Server Error' })
    };
  }
};