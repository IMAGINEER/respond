// netlify/functions/zalo-webhook.js - Zalo inbound webhook handler
require('dotenv').config();
const { sendInboundMessage } = require('../utils/respondio');
const logger = require('../utils/logger');

// Supported event types
const SUPPORTED_EVENTS = ['user_send_text'];

// Unsupported event types to ignore (only log)
const IGNORED_EVENTS = [
  'user_send_image',
  'user_send_video',
  'user_send_audio',
  'user_send_link',
  'user_send_sticker',
  'user_send_location',
  'user_send_file'
];

exports.handler = async (event, context) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    logger.warn('Invalid HTTP method', {
      type: 'zalo_inbound',
      action: 'reject',
      method: event.httpMethod,
      path: event.path
    });
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST'
      },
      body: ''
    };
  }

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  logger.info('Inbound request received', {
    type: 'zalo_inbound',
    action: 'received',
    requestId,
    contentType: event.headers?.['content-type'],
    userAgent: event.headers?.['user-agent']
  });

  try {
    // Handle empty body
    if (!event.body) {
      logger.warn('Empty request body', {
        type: 'zalo_inbound',
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
        type: 'zalo_inbound',
        action: 'reject',
        requestId,
        error: 'JSON parse error',
        body: event.body?.substring(0, 200)
      });
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }

    const { sender, event_name: eventName, message } = body;

    // Validate required fields
    if (!sender?.id) {
      logger.warn('Missing sender.id', {
        type: 'zalo_inbound',
        action: 'reject',
        requestId,
        bodyKeys: Object.keys(body)
      });
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing sender.id' }) };
    }

    if (!eventName) {
      logger.warn('Missing event_name', {
        type: 'zalo_inbound',
        action: 'reject',
        requestId,
        senderId: sender.id
      });
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing event_name' }) };
    }

    const senderId = sender.id;

    // Handle unsupported event types
    if (!SUPPORTED_EVENTS.includes(eventName)) {
      if (IGNORED_EVENTS.includes(eventName)) {
        logger.info('Event ignored', {
          type: 'zalo_inbound',
          action: 'ignored',
          requestId,
          eventName,
          senderId
        });
      } else {
        logger.warn('Unknown event type', {
          type: 'zalo_inbound',
          action: 'unknown',
          requestId,
          eventName,
          senderId
        });
      }
      // Always return 200 to Zalo
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ok' })
      };
    }

    // Handle text messages
    const messageText = message?.text;

    if (!messageText) {
      logger.warn('Missing message.text for text event', {
        type: 'zalo_inbound',
        action: 'reject',
        requestId,
        eventName,
        senderId,
        hasMessage: !!message
      });
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ok' })
      };
    }

    // Check for empty message
    if (messageText.trim().length === 0) {
      logger.warn('Empty message text', {
        type: 'zalo_inbound',
        action: 'reject',
        requestId,
        senderId
      });
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ok' })
      };
    }

    // Generate unique message ID
    const messageId = `zalo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info('Processing text message', {
      type: 'zalo_inbound',
      action: 'process',
      requestId,
      senderId,
      eventName,
      messageId,
      textLength: messageText.length,
      textPreview: messageText.substring(0, 50)
    });

    // Send to Respond.io with timeout protection
    try {
      await sendInboundMessage(senderId, messageText, messageId);
    } catch (respondError) {
      logger.error('Failed to forward to Respond.io', {
        type: 'zalo_inbound',
        action: 'forward_failed',
        requestId,
        senderId,
        messageId,
        error: respondError.message,
        retryable: true
      });
      // Return 200 to prevent Zalo retry storm
      // Error is logged, can be retried later
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ok' })
      };
    }

    logger.info('Message forwarded successfully', {
      type: 'zalo_inbound',
      action: 'success',
      requestId,
      senderId,
      messageId
    });

    // Respond to Zalo
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ok' })
    };
  } catch (error) {
    logger.error('Unexpected error processing webhook', {
      type: 'zalo_inbound',
      action: 'error',
      requestId,
      error: error.message,
      stack: error.stack?.substring(0, 500)
    });

    // Return 200 to prevent Zalo retry
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ok' })
    };
  }
};