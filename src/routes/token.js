
const express = require('express');
const axios = require('axios');
const { RtcTokenBuilder, RtcRole, RtmTokenBuilder, RtmRole } = require('agora-access-token');
const auth = require('../middleware/auth');

const router = express.Router();

const APP_ID = process.env.AGORA_APP_ID;
const APP_CERT = process.env.AGORA_APP_CERTIFICATE;
const EXPIRE = parseInt(process.env.TOKEN_EXPIRE_SECONDS || "3600", 10);
const AGORA_APP_KEY = process.env.AGORA_APP_KEY; 
const AGORA_APP_SECRET = process.env.AGORA_APP_SECRET; 
const CHAT_API_BASE_URL = `https://a41.chat.agora.io/${AGORA_APP_KEY.replace('#', '/')}`;
console.log('Chat API Base URL:', CHAT_API_BASE_URL);

// generate RTC token (for audio/video calls)
router.post('/rtc', auth, (req, res) => {
  console.log('RTC Token Request:', { body: req.body });
  const { channelName, uid } = req.body;
  if (!channelName || (uid === undefined || uid === null)) {
    console.log('RTC Token Error: Missing parameters', { channelName, uid });
    return res.status(400).json({ error: 'channelName and uid are required' });
  }

  try {
    const role = RtcRole.PUBLISHER;
    const currentTs = Math.floor(Date.now() / 1000);
    const privilegeExpireTs = currentTs + EXPIRE;
    console.log('RTC Token Generation:', { channelName, uid, role, expireAt: privilegeExpireTs });

    let token;
    if (!isNaN(Number(uid))) {
      console.log('Generating RTC token with UID');
      token = RtcTokenBuilder.buildTokenWithUid(APP_ID, APP_CERT, channelName, Number(uid), role, privilegeExpireTs);
    } else {
      console.log('Generating RTC token with UserAccount');
      token = RtcTokenBuilder.buildTokenWithUserAccount(APP_ID, APP_CERT, channelName, uid, role, privilegeExpireTs);
    }

    console.log('RTC Token Generated:', { token, expireAt: privilegeExpireTs });
    return res.json({ token, expireAt: privilegeExpireTs });
  } catch (err) {
    console.error('RTC Token Generation Error:', err.message);
    return res.status(500).json({ error: 'Could not generate RTC token' });
  }
});

router.post('/chat', auth, async (req, res) => {
  console.log('Chat Token Request:', { body: req.body });
  const { username } = req.body;
  if (!username) {
    console.log('Chat Token Error: Missing username', { username });
    return res.status(400).json({ error: 'username is required' });
  }

  try {
    const requestBody = {
      userUuid: username, // Agora Chat API typically uses userUuid
      expire: EXPIRE // Match the expiration time with other tokens
    };
    console.log('Attempting Chat Token Request:', {
      url: `${CHAT_API_BASE_URL}/token`,
      requestBody
    });

    const chatTokenResponse = await axios.post(
      `${CHAT_API_BASE_URL}/token`,
      requestBody, // Send plain object, let axios handle JSON.stringify
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${AGORA_APP_KEY}:${AGORA_APP_SECRET}`).toString('base64')}`,
        },
      }
    );

    console.log('Chat Token Response:', chatTokenResponse.data);
    return res.json(chatTokenResponse.data);
  } catch (err) {
    console.error('Chat Token Error:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
      headers: err.response?.headers
    });
    return res.status(err.response?.status || 500).json({ error: 'Could not generate Agora Chat token' });
  }
});

router.post('/rtm', auth, (req, res) => {
  console.log('RTM Token Request:', { body: req.body });
  const { account } = req.body;
  if (!account) {
    console.log('RTM Token Error: Missing account', { account });
    return res.status(400).json({ error: 'account is required' });
  }

  try {
    const currentTs = Math.floor(Date.now() / 1000);
    const privilegeExpireTs = currentTs + EXPIRE;
    console.log('RTM Token Generation:', { account, expireAt: privilegeExpireTs });

    const token = RtmTokenBuilder.buildToken(APP_ID, APP_CERT, account, RtmRole.Rtm_User, privilegeExpireTs);
    console.log('RTM Token Generated:', { token, expireAt: privilegeExpireTs });
    return res.json({ token, expireAt: privilegeExpireTs });
  } catch (err) {
    console.error('RTM Token Generation Error:', err.message);
    return res.status(500).json({ error: 'Could not generate RTM token' });
  }
});

module.exports = router;
