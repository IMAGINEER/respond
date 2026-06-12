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
    logger.warn('Invalid HTTP method for zalo-webhook', {
      type: 'zalo_inbound',
      method: event.httpMethod
    });
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { sender, event_name: eventName, message } = body;

    // Validate required fields
    if (!sender?.id || !eventName) {
      logger.warn('Missing required fields in Zalo webhook', {
        type: 'zalo_inbound',
        body
      });
      return { statusCode: 400, body: JSON.stringify({ error: 'Bad Request' }) };
    }

    const senderId = sender.id;

    // Handle unsupported event types
    if (!SUPPORTED_EVENTS.includes(eventName)) {
      if (IGNORED_EVENTS.includes(eventName)) {
        logger.info('Ignored unsupported Zalo event', {
          type: 'zalo_inbound_ignored',
          eventName,
          senderId
        });
      } else {
        logger.warn('Unknown Zalo event type', {
          type: 'zalo_inbound_unknown',
          eventName,
          senderId
        });
      }
      // Always return 200 to Zalo
      return { statusCode: 200, body: JSON.stringify({ status: 'ok' }) };
    }

    // Handle text messages
    const messageText = message?.text;

    if (!messageText) {
      logger.warn('Missing message text in Zalo webhook', {
        type: 'zalo_inbound',
        eventName,
        senderId
      });
      return { statusCode: 200, body: JSON.stringify({ status: 'ok' }) };
    }

    // Generate unique message ID
    const messageId = `zalo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info('Processing Zalo inbound message', {
      type: 'zalo_inbound',
      senderId,
      eventName,
      messageId
    });

    // Send to Respond.io
    await sendInboundMessage(senderId, messageText, messageId);

    logger.info('Zalo inbound message processed successfully', {
      type: 'zalo_inbound_success',
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
    logger.error('Error processing Zalo webhook', {
      type: 'zalo_inbound_error',
      error: error.message
    });

    // Still return 200 to prevent Zalo from retrying
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ok' })
    };
  }
};