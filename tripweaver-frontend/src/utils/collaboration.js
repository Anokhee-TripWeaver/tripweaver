import axios from "axios";
import API_BASE from "../config";

const REQUESTS_KEY = "trip_join_requests";
const NOTIFICATIONS_KEY = "trip_profile_notifications";
const COLLAB_POSTS_KEY = "trip_collaboration_posts";

const normalizeEmail = (email) => (email || "").trim().toLowerCase();

const readJson = (key, fallback) => {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
};

const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));

const normalizeText = (value) => (value || "").toString().trim().toLowerCase();

const normalizeDateKey = (value) => {
  const raw = (value || "").toString().trim();
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw.toLowerCase();
  return d.toISOString().slice(0, 10);
};

const getSharedThreadOwnerId = (threadId) => {
  const normalized = (threadId || "").toString().trim().toLowerCase();
  if (!normalized) return "";
  const parts = normalized.split("::");
  if (parts.length >= 3 && parts[1]) return parts[1];
  return "";
};

const getSharedThreadPostKey = (prefix, threadId) =>
  `${prefix}-${(threadId || "").toString().trim().toLowerCase()}`;

const getSharedThreadMessages = async (threadId, prefix) => {
  if (!threadId) return [];
  const ownerId = getSharedThreadOwnerId(threadId);
  const postKey = getSharedThreadPostKey(prefix, threadId);
  if (!ownerId || !postKey) return [];
  try {
    const res = await axios.get(`${API_BASE}/open-trip-splits`, {
      params: { ownerId },
      withCredentials: true,
    });
    const entries = Array.isArray(res?.data?.entries) ? res.data.entries : [];
    const entry = entries.find((item) => item?.postKey === postKey);
    const messages = Array.isArray(entry?.data?.messages) ? entry.data.messages : [];
    return [...messages].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  } catch (err) {
    console.warn("Shared chat fetch failed", threadId, err?.message || err);
    return [];
  }
};

const addSharedThreadMessage = async (threadId, message, prefix) => {
  if (!threadId) return null;
  const text = (message?.text || "").toString().trim();
  if (!text) return null;
  const ownerId = getSharedThreadOwnerId(threadId);
  const postKey = getSharedThreadPostKey(prefix, threadId);
  if (!ownerId || !postKey) return null;
  try {
    const current = await getSharedThreadMessages(threadId, prefix);
    const saved = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      senderName: message?.senderName || "Trip Member",
      senderEmail: message?.senderEmail || "",
      text,
      createdAt: new Date().toISOString(),
    };
    await axios.post(`${API_BASE}/open-trip-splits`, {
      ownerId,
      postKey,
      data: { messages: [...current, saved] },
      form: {},
      memberForm: {},
    }, { withCredentials: true });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("trip-collaboration-chat-updated"));
    }
    return saved;
  } catch (err) {
    console.warn("Shared chat send failed", threadId, err?.message || err);
    return null;
  }
};

export const getTripChatThreadId = (item) => {
  if (!item) return "";
  const postId = (item.postId || item.tripId || item.id || "").toString().trim();
  const host = normalizeEmail(item.hostEmail || item.email || item.toEmail || item.hostName);
  if (postId && host) return `trip::${host}::${postId}`;
  if (postId) return `trip::${postId}`;
  const destination = normalizeText(item.destination);
  const startDate = normalizeDateKey(item.startDate);
  const endDate = normalizeDateKey(item.endDate);
  if (!host && !destination && !startDate && !endDate) return "";
  return `trip::${host}::${destination}::${startDate}::${endDate}`;
};

export const getTripChatTripId = (item) => {
  const raw = (item?.postId || item?.tripId || item?.id || "").toString().trim();
  return raw || "";
};

export const getTripChatMessages = async (threadId) =>
  getSharedThreadMessages(threadId, "trip-chat");

export const addTripChatMessage = async (threadId, message) =>
  addSharedThreadMessage(threadId, message, "trip-chat");

export const getBookingChatThreadId = (item) => {
  if (!item) return "";
  const owner = normalizeEmail(
    item._ownerEmail || item.hostEmail || item.username || item.email
  ) || (item._ownerEmail || item.hostEmail || item.username || item.email || "").toString().trim().toLowerCase();
  const bookingId = (item.bookingChatId || item.bookingKey || item.postId || item.id || "")
    .toString().trim().toLowerCase();
  if (!owner || !bookingId) return "";
  return `booking::${owner}::${bookingId}`;
};

export const getBookingChatMessages = async (threadId) =>
  getSharedThreadMessages(threadId, "booking-chat");

export const addBookingChatMessage = async (threadId, message) =>
  addSharedThreadMessage(threadId, message, "booking-chat");

export const getJoinRequestsForHost = (hostEmail) => {
  const normalizedHostEmail = normalizeEmail(hostEmail);
  const requests = readJson(REQUESTS_KEY, []);
  return requests
    .filter((req) => normalizeEmail(req.hostEmail || req.email || req.toEmail || "") === normalizedHostEmail)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
};

export const getJoinRequestsForRequester = (requesterEmail) => {
  const normalizedRequesterEmail = normalizeEmail(requesterEmail);
  const requests = readJson(REQUESTS_KEY, []);
  return requests
    .filter((req) => normalizeEmail(req.requesterEmail) === normalizedRequesterEmail)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
};

export const createJoinRequest = ({ post, requesterName, requesterEmail }) => {
  const requests = readJson(REQUESTS_KEY, []);
  const normalizedHostEmail = normalizeEmail(post.hostEmail || post.email);
  const normalizedRequesterEmail = normalizeEmail(requesterEmail);
  const duplicate = requests.find((req) =>
    req.status === "PENDING" &&
    normalizeEmail(req.hostEmail) === normalizedHostEmail &&
    normalizeEmail(req.requesterEmail) === normalizedRequesterEmail &&
    String(req.postId) === String(post.id)
  );
  if (duplicate) return { created: false, request: duplicate, reason: "DUPLICATE_PENDING" };

  const request = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    postId: post.id,
    source: post.source || post.origin || "",
    origin: post.origin || post.source || "",
    destination: post.destination,
    startDate: post.startDate,
    endDate: post.endDate,
    hostName: post.hostName || post.username || "Trip Host",
    hostEmail: post.hostEmail || post.email || "",
    email: post.hostEmail || post.email || "",
    toEmail: post.hostEmail || post.email || "",
    requesterName: requesterName || "TripWeaver User",
    requesterEmail: requesterEmail || "",
    status: "PENDING",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  writeJson(REQUESTS_KEY, [request, ...requests]);
  return { created: true, request };
};

export const updateJoinRequestStatus = (requestId, status) => {
  const requests = readJson(REQUESTS_KEY, []);
  let updatedRequest = null;
  const updated = requests.map((req) => {
    if (req.id !== requestId) return req;
    updatedRequest = { ...req, status, updatedAt: new Date().toISOString() };
    return updatedRequest;
  });
  writeJson(REQUESTS_KEY, updated);
  return updatedRequest;
};

export const getNotificationsForUser = (email) => {
  const normalizedEmail = normalizeEmail(email);
  const byUser = readJson(NOTIFICATIONS_KEY, {});
  const list = byUser[normalizedEmail] || [];
  return [...list].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
};

export const addNotificationForUser = (email, notification) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return;
  const byUser = readJson(NOTIFICATIONS_KEY, {});
  const list = byUser[normalizedEmail] || [];
  byUser[normalizedEmail] = [
    { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date().toISOString(), ...notification },
    ...list,
  ];
  writeJson(NOTIFICATIONS_KEY, byUser);
};

export const decrementLocalCollaborationSeat = (postId) => {
  const posts = readJson(COLLAB_POSTS_KEY, []);
  if (!Array.isArray(posts) || posts.length === 0) return;
  const updated = posts
    .map((post) => {
      if (String(post.id) !== String(postId)) return post;
      return { ...post, seatsAvailable: Math.max(0, (Number(post.seatsAvailable) || 0) - 1) };
    })
    .filter((post) => (Number(post.seatsAvailable) || 0) > 0);
  writeJson(COLLAB_POSTS_KEY, updated);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("trip-collaboration-posts-updated"));
  }
};
