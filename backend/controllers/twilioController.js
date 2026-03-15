const twilio = require('twilio');
const OpenAI = require('openai');
const { Pool } = require('pg');

const VoiceResponse = twilio.twiml.VoiceResponse;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// In-memory conversation storage (use Redis in production)
const conversations = new Map();

async function getBusinessByPhoneNumber(phoneNumber) {
  const result = await pool.query(
    'SELECT b.*, ac.* FROM businesses b LEFT JOIN ai_configs ac ON b.id = ac.business_id WHERE b.phone_number = $1',
    [phoneNumber]
  );
  return result.rows[0];
}

async function logCall(callData) {
  const result = await pool.query(
    `INSERT INTO calls (business_id, twilio_call_sid, caller_number, direction, status, started_at)
     VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id`,
    [callData.businessId, callData.callSid, callData.from, 'inbound', 'in-progress']
  );
  return result.rows[0].id;
}

async function updateCall(callSid, updates) {
  const fields = [];
  const values = [];
  let paramCount = 1;

  Object.entries(updates).forEach(([key, value]) => {
    fields.push(`${key} = $${paramCount}`);
    values.push(value);
    paramCount++;
  });

  values.push(callSid);
  
  await pool.query(
    `UPDATE calls SET ${fields.join(', ')}, updated_at = NOW() WHERE twilio_call_sid = $${paramCount}`,
    values
  );
}

async function saveConversationTurn(callId, speaker, message, turnNumber) {
  await pool.query(
    'INSERT INTO conversation_turns (call_id, turn_number, speaker, message) VALUES ($1, $2, $3, $4)',
    [callId, turnNumber, speaker, message]
  );
}

async function handleIncomingCall(req) {
  const response = new VoiceResponse();
  const calledNumber = req.body.To;
  const callerNumber = req.body.From;
  const callSid = req.body.CallSid;

  // Get business configuration
  const business = await getBusinessByPhoneNumber(calledNumber);
  
  if (!business) {
    response.say('We apologize, but this number is not configured. Goodbye.');
    response.hangup();
    return response;
  }

  // Log the call
  const callId = await logCall({
    businessId: business.id,
    callSid: callSid,
    from: callerNumber
  });

  // Initialize conversation context
  const conversationContext = {
    callId,
    businessId: business.id,
    businessName: business.business_name,
    industry: business.industry,
    turns: [],
    intent: null,
    customerInfo: {}
  };
  conversations.set(callSid, conversationContext);

  // Greeting message
  const greeting = business.greeting_message || 
    `Thank you for calling ${business.business_name}. I'm your AI assistant. How can I help you today?`;

  response.say({
    voice: 'Polly.Joanna',
    language: business.language || 'en-US'
  }, greeting);

  // Gather speech input
  response.gather({
    input: 'speech',
    action: `/twilio/voice/process-speech?callSid=${callSid}`,
    speechTimeout: 'auto',
    language: business.language || 'en-US',
    speechModel: 'experimental_conversations'
  });

  // If no input, prompt again
  response.say('Are you still there? How can I assist you?');
  response.redirect(`/twilio/voice/incoming?callSid=${callSid}`);

  return response;
}

async function processUserSpeech(req) {
  const response = new VoiceResponse();
  const userSpeech = req.body.SpeechResult;
  const callSid = req.body.CallSid || req.query.callSid;
  const confidence = parseFloat(req.body.Confidence || 0);

  // Get conversation context
  let context = conversations.get(callSid);
  
  if (!context) {
    response.say('I apologize, but I lost track of our conversation. Let me transfer you to a representative.');
    response.dial(process.env.BUSINESS_MAIN_NUMBER || '+1234567890');
    return response;
  }

  // Low confidence handling
  if (confidence < 0.6) {
    response.say("I'm sorry, I didn't quite catch that. Could you please repeat?");
    response.gather({
      input: 'speech',
      action: `/twilio/voice/process-speech?callSid=${callSid}`,
      speechTimeout: 'auto'
    });
    return response;
  }

  // Add user message to context
  context.turns.push({ role: 'user', content: userSpeech });
  await saveConversationTurn(context.callId, 'caller', userSpeech, context.turns.length);

  // Generate AI response
  const aiResponse = await generateAIResponse(context, userSpeech);

  // Add AI response to context
  context.turns.push({ role: 'assistant', content: aiResponse.text });
  await saveConversationTurn(context.callId, 'ai', aiResponse.text, context.turns.length);

  // Update conversation context
  if (aiResponse.intent) context.intent = aiResponse.intent;
  if (aiResponse.customerInfo) {
    context.customerInfo = { ...context.customerInfo, ...aiResponse.customerInfo };
  }
  conversations.set(callSid, context);

  // Handle different actions
  switch (aiResponse.action) {
    case 'continue':
      response.say({ voice: 'Polly.Joanna' }, aiResponse.text);
      response.gather({
        input: 'speech',
        action: `/twilio/voice/process-speech?callSid=${callSid}`,
        speechTimeout: 'auto'
      });
      break;

    case 'transfer':
      response.say({ voice: 'Polly.Joanna' }, aiResponse.text);
      response.dial(aiResponse.transferNumber || process.env.BUSINESS_MAIN_NUMBER);
      break;

    case 'schedule_appointment':
      await scheduleAppointment(context, aiResponse.appointmentData);
      response.say({ voice: 'Polly.Joanna' }, aiResponse.text);
      response.say('Is there anything else I can help you with?');
      response.gather({
        input: 'speech',
        action: `/twilio/voice/process-speech?callSid=${callSid}`,
        speechTimeout: 'auto'
      });
      break;

    case 'take_message':
      await saveMessage(context, aiResponse.messageData);
      response.say({ voice: 'Polly.Joanna' }, aiResponse.text);
      response.hangup();
      break;

    case 'end_call':
      response.say({ voice: 'Polly.Joanna' }, aiResponse.text);
      response.hangup();
      await updateCall(callSid, { 
        status: 'completed', 
        ended_at: new Date(),
        outcome: context.intent || 'completed'
      });
      break;

    default:
      response.say({ voice: 'Polly.Joanna' }, aiResponse.text);
      response.gather({
        input: 'speech',
        action: `/twilio/voice/process-speech?callSid=${callSid}`,
        speechTimeout: 'auto'
      });
  }

  return response;
}

async function generateAIResponse(context, userMessage) {
  // Get business-specific knowledge
  const business = await pool.query(
    'SELECT * FROM businesses WHERE id = $1',
    [context.businessId]
  );
  const businessInfo = business.rows[0];

  // Get FAQ knowledge base
  const faqs = await pool.query(
    'SELECT question, answer FROM knowledge_base WHERE business_id = $1 AND is_active = true',
    [context.businessId]
  );

  // Build system prompt
  const systemPrompt = `You are an AI receptionist for ${businessInfo.business_name}, a ${businessInfo.industry} business.

Business Information:
- Address: ${businessInfo.address || 'Not specified'}
- Phone: ${businessInfo.phone_number}
- Email: ${businessInfo.email || 'Not specified'}

Your responsibilities:
1. Answer questions about the business (hours, location, services)
2. Schedule appointments when requested
3. Take messages for urgent matters
4. Transfer calls to staff when necessary
5. Be professional, friendly, and helpful

Knowledge Base:
${faqs.rows.map(faq => `Q: ${faq.question}\nA: ${faq.answer}`).join('\n\n')}

Guidelines:
- Keep responses concise (under 50 words)
- Be empathetic and professional
- If you don't know something, admit it and offer to transfer or take a message
- For appointment scheduling, collect: name, phone, preferred date/time, reason for visit
- For emergencies, immediately offer to transfer

Respond with a JSON object:
{
  "text": "what to say to the caller",
  "action": "continue|transfer|schedule_appointment|take_message|end_call",
  "intent": "appointment|question|complaint|emergency|other",
  "customerInfo": {"name": "...", "phone": "..."}, // if collected
  "appointmentData": {...}, // if scheduling
  "messageData": {...}, // if taking message
  "transferNumber": "+1..." // if transferring
}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...context.turns.slice(-10), // Last 10 turns for context
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: messages,
      temperature: 0.7,
      max_tokens: 200,
      response_format: { type: 'json_object' }
    });

    const response = JSON.parse(completion.choices[0].message.content);
    return response;
  } catch (error) {
    console.error('OpenAI API error:', error);
    return {
      text: "I apologize, but I'm having trouble processing your request. Let me transfer you to someone who can help.",
      action: 'transfer',
      intent: 'error'
    };
  }
}

async function scheduleAppointment(context, appointmentData) {
  try {
    await pool.query(
      `INSERT INTO appointments (business_id, call_id, customer_name, customer_phone, 
       appointment_date, appointment_time, service_type, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        context.businessId,
        context.callId,
        appointmentData.name,
        appointmentData.phone || context.customerInfo.phone,
        appointmentData.date,
        appointmentData.time,
        appointmentData.serviceType,
        appointmentData.notes
      ]
    );
    
    // TODO: Send confirmation email/SMS
    // TODO: Add to Google Calendar if integrated
  } catch (error) {
    console.error('Error scheduling appointment:', error);
  }
}

async function saveMessage(context, messageData) {
  try {
    await pool.query(
      `INSERT INTO messages (business_id, call_id, caller_name, caller_phone, message_text, urgency)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        context.businessId,
        context.callId,
        messageData.name || context.customerInfo.name,
        messageData.phone || context.customerInfo.phone,
        messageData.message,
        messageData.urgency || 'normal'
      ]
    );
    
    // TODO: Send email notification to business owner
  } catch (error) {
    console.error('Error saving message:', error);
  }
}

async function handleCallStatus(req, res) {
  const callSid = req.body.CallSid;
  const callStatus = req.body.CallStatus;
  const duration = req.body.CallDuration;

  await updateCall(callSid, {
    status: callStatus,
    duration: duration,
    ended_at: new Date()
  });

  // Clean up conversation context
  if (callStatus === 'completed' || callStatus === 'failed') {
    conversations.delete(callSid);
  }

  res.sendStatus(200);
}

module.exports = {
  handleIncomingCall,
  processUserSpeech,
  handleCallStatus
};
