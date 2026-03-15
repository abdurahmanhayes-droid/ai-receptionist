const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const { handleIncomingCall, processUserSpeech, handleCallStatus } = require('../controllers/twilioController');

const VoiceResponse = twilio.twiml.VoiceResponse;

// Webhook for incoming calls
router.post('/voice/incoming', async (req, res) => {
  try {
    const twiml = await handleIncomingCall(req);
    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    console.error('Error handling incoming call:', error);
    const response = new VoiceResponse();
    response.say('We apologize, but we are experiencing technical difficulties. Please try again later.');
    res.type('text/xml');
    res.send(response.toString());
  }
});

// Process speech from caller
router.post('/voice/process-speech', async (req, res) => {
  try {
    const twiml = await processUserSpeech(req);
    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    console.error('Error processing speech:', error);
    const response = new VoiceResponse();
    response.say('I apologize, I did not understand that. Could you please repeat?');
    response.gather({
      input: 'speech',
      action: '/twilio/voice/process-speech',
      speechTimeout: 'auto',
      language: 'en-US'
    });
    res.type('text/xml');
    res.send(response.toString());
  }
});

// Handle call status updates
router.post('/voice/status', handleCallStatus);

// Gather action for menu options (DTMF)
router.post('/voice/gather', async (req, res) => {
  const digits = req.body.Digits;
  const response = new VoiceResponse();

  switch(digits) {
    case '1':
      response.say('Transferring you to our main office. Please hold.');
      response.dial(process.env.BUSINESS_MAIN_NUMBER || '+1234567890');
      break;
    case '2':
      response.say('Let me help you schedule an appointment.');
      response.redirect('/twilio/voice/appointment');
      break;
    case '3':
      response.say('Please leave your message after the tone.');
      response.record({
        maxLength: 120,
        action: '/twilio/voice/recording'
      });
      break;
    default:
      response.say('Invalid option. Please try again.');
      response.redirect('/twilio/voice/incoming');
  }

  res.type('text/xml');
  res.send(response.toString());
});

// Handle voicemail recording
router.post('/voice/recording', async (req, res) => {
  const recordingUrl = req.body.RecordingUrl;
  const callSid = req.body.CallSid;
  
  // Store recording in database
  // await saveRecording(callSid, recordingUrl);
  
  const response = new VoiceResponse();
  response.say('Thank you for your message. We will get back to you shortly. Goodbye!');
  response.hangup();
  
  res.type('text/xml');
  res.send(response.toString());
});

module.exports = router;
