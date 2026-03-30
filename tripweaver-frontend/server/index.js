require('dotenv').config();
const express = require('express');
const axios = require('axios');
const qs = require('qs');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;
const AMADEUS_ID = process.env.AMADEUS_CLIENT_ID;
const AMADEUS_SECRET = process.env.AMADEUS_CLIENT_SECRET;
const SPLITS_PATH = path.join(__dirname, 'data', 'open-trip-splits.json');
const TRIP_CHAT_PATH = path.join(__dirname, 'data', 'trip-collaboration-chats.json');

let cachedToken = null;
let tokenExpiry = 0;

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  if (!AMADEUS_ID || !AMADEUS_SECRET) throw new Error('Missing Amadeus credentials on server');

  const body = qs.stringify({ grant_type: 'client_credentials', client_id: AMADEUS_ID, client_secret: AMADEUS_SECRET });
  const res = await axios.post('https://test.api.amadeus.com/v1/security/oauth2/token', body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  cachedToken = res.data.access_token;
  tokenExpiry = Date.now() + (res.data.expires_in - 60) * 1000;
  return cachedToken;
}

function readSplits() {
  try {
    const raw = fs.readFileSync(SPLITS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : { entries: [] };
  } catch {
    return { entries: [] };
  }
}

function writeSplits(data) {
  const dir = path.dirname(SPLITS_PATH);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SPLITS_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function readTripChats() {
  try {
    const raw = fs.readFileSync(TRIP_CHAT_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : { threads: {} };
  } catch {
    return { threads: {} };
  }
}

function writeTripChats(data) {
  const dir = path.dirname(TRIP_CHAT_PATH);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(TRIP_CHAT_PATH, JSON.stringify(data, null, 2), 'utf8');
}

app.get('/api/flights', async (req, res) => {
  try {
    const token = await getToken();
    const amRes = await axios.get('https://test.api.amadeus.com/v2/shopping/flight-offers', {
      headers: { Authorization: `Bearer ${token}` },
      params: req.query,
    });
    res.json(amRes.data);
  } catch (err) {
    console.error('Proxy error:', err?.response?.data || err.message || err);
    const status = err.response?.status || 500;
    const body = err.response?.data || { message: err.message };
    res.status(status).json(body);
  }
});

app.get('/api/open-trip-splits', (req, res) => {
  const ownerId = (req.query.ownerId || req.query.email || '').toString().trim().toLowerCase();
  if (!ownerId) return res.status(400).json({ message: 'ownerId is required' });
  const store = readSplits();
  const entries = (store.entries || []).filter((entry) => entry.ownerId === ownerId);
  res.json({ entries });
});

app.post('/api/open-trip-splits', (req, res) => {
  const ownerId = (req.body.ownerId || req.body.email || '').toString().trim().toLowerCase();
  const postKey = (req.body.postKey || '').toString().trim();
  if (!ownerId || !postKey) return res.status(400).json({ message: 'ownerId and postKey are required' });

  const entry = {
    ownerId,
    postKey,
    data: req.body.data || {},
    form: req.body.form || {},
    memberForm: req.body.memberForm || {},
    updatedAt: new Date().toISOString(),
  };

  const store = readSplits();
  const idx = (store.entries || []).findIndex((e) => e.ownerId === ownerId && e.postKey === postKey);
  if (idx >= 0) {
    store.entries[idx] = entry;
  } else {
    store.entries = [entry, ...(store.entries || [])];
  }
  writeSplits(store);
  res.json({ entry });
});

app.get('/api/trip-chats/:threadId', (req, res) => {
  const threadId = (req.params.threadId || '').toString().trim();
  if (!threadId) return res.status(400).json({ message: 'threadId is required' });
  const store = readTripChats();
  const messages = Array.isArray(store.threads?.[threadId]) ? store.threads[threadId] : [];
  res.json({ threadId, messages });
});

app.post('/api/trip-chats/:threadId/messages', (req, res) => {
  const threadId = (req.params.threadId || '').toString().trim();
  const text = (req.body.text || '').toString().trim();
  if (!threadId) return res.status(400).json({ message: 'threadId is required' });
  if (!text) return res.status(400).json({ message: 'text is required' });

  const message = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    senderName: (req.body.senderName || 'Trip Member').toString().trim() || 'Trip Member',
    senderEmail: (req.body.senderEmail || '').toString().trim().toLowerCase(),
    text,
    createdAt: new Date().toISOString(),
  };

  const store = readTripChats();
  const existing = Array.isArray(store.threads?.[threadId]) ? store.threads[threadId] : [];
  store.threads = store.threads || {};
  store.threads[threadId] = [...existing, message];
  writeTripChats(store);
  res.json({ threadId, message });
});

app.listen(PORT, () => console.log(`Proxy listening on http://localhost:${PORT}`));
