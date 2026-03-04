const REQUESTS_KEY = "trip_join_requests";
const NOTIFICATIONS_KEY = "trip_profile_notifications";
const COLLAB_POSTS_KEY = "trip_collaboration_posts";

const normalizeEmail = (email) => (email || "").trim().toLowerCase();

const readJson = (key, fallback) => {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const getJoinRequestsForHost = (hostEmail) => {
  const normalizedHostEmail = normalizeEmail(hostEmail);
  const requests = readJson(REQUESTS_KEY, []);
  return requests
    .filter((req) => {
      const requestHostEmail = req.hostEmail || req.email || req.toEmail || "";
      return normalizeEmail(requestHostEmail) === normalizedHostEmail;
    })
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
  const duplicate = requests.find(
    (req) =>
      req.status === "PENDING" &&
      normalizeEmail(req.hostEmail) === normalizedHostEmail &&
      normalizeEmail(req.requesterEmail) === normalizedRequesterEmail &&
      String(req.postId) === String(post.id)
  );

  if (duplicate) {
    return { created: false, request: duplicate, reason: "DUPLICATE_PENDING" };
  }

  const request = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    postId: post.id,
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
    updatedRequest = {
      ...req,
      status,
      updatedAt: new Date().toISOString(),
    };
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
  const next = [
    {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      ...notification,
    },
    ...list,
  ];
  byUser[normalizedEmail] = next;
  writeJson(NOTIFICATIONS_KEY, byUser);
};

export const decrementLocalCollaborationSeat = (postId) => {
  const posts = readJson(COLLAB_POSTS_KEY, []);
  if (!Array.isArray(posts) || posts.length === 0) return;
  const updated = posts
    .map((post) => {
      if (String(post.id) !== String(postId)) return post;
      const seats = Math.max(0, Number(post.seatsAvailable) || 0);
      return { ...post, seatsAvailable: Math.max(0, seats - 1) };
    })
    .filter((post) => Math.max(0, Number(post.seatsAvailable) || 0) > 0);
  writeJson(COLLAB_POSTS_KEY, updated);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("trip-collaboration-posts-updated"));
  }
};
