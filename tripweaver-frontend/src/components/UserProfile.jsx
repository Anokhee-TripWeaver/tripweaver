import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./UserProfile.css";
import Navbar from "./navbar";
import API_BASE from "../config";
import { persistIdentity, resolveProfileEmail, resolveProfileName } from "../utils/userIdentity";
import {
  addTripChatMessage,
  addBookingChatMessage,
  decrementLocalCollaborationSeat,
  getBookingChatMessages,
  getBookingChatThreadId,
  getJoinRequestsForHost,
  getJoinRequestsForRequester,
  getTripChatMessages,
  getTripChatTripId,
  getTripChatThreadId,
  updateJoinRequestStatus,
} from "../utils/collaboration";

axios.defaults.withCredentials = true;

export default function UserProfile() {
  const BOOKING_SPLIT_KEY = "profile_booking_splitwise_v1";
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasServerProfile, setHasServerProfile] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [requestActivity, setRequestActivity] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [collaborationTrips, setCollaborationTrips] = useState([]);
  const [sectionOpen, setSectionOpen] = useState({ bookings: true, history: true, incoming: true, accepted: true, requested: true });
  const toggleSection = (key) => setSectionOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  const [toast, setToast] = useState(null);
  const toastTimer = React.useRef(null);
  const showToast = (message, type = "info", duration = 2800) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), duration);
  };
  const [splitOpenByBooking, setSplitOpenByBooking] = useState({});
  const [bookingSplitDataByBooking, setBookingSplitDataByBooking] = useState({});
  const [bookingSplitFormByBooking, setBookingSplitFormByBooking] = useState({});
  const [actionRequestId, setActionRequestId] = useState("");
  // Ongoing trips state (Manage Split + Book Ticket)
  const [activeSplitId, setActiveSplitId] = useState(null);
  const [expenseForm, setExpenseForm] = useState({ description: "", amount: "", splitType: "EQUAL", allocations: {} });
  const [tripMembers, setTripMembers] = useState({});
  const [settlements, setSettlements] = useState({});
  const [tripBookings, setTripBookings] = useState({});
  const [showBookingModal, setShowBookingModal] = useState(null);
  const [tripDetails, setTripDetails] = useState({});
  const [selectedTravellers, setSelectedTravellers] = useState([]);
  const [bookingCost, setBookingCost] = useState("");
  const [resolvedPricePerPerson, setResolvedPricePerPerson] = useState({});
  const [tripChatMessagesByThread, setTripChatMessagesByThread] = useState({});
  const [tripChatInputByThread, setTripChatInputByThread] = useState({});
  const [openTripChatRequestId, setOpenTripChatRequestId] = useState("");
  const [openBookingChatId, setOpenBookingChatId] = useState("");
  const chatScrollRefs = React.useRef({});
  const navigate = useNavigate();

  const bookingSplitKey = (booking) => {
    const owner = normalizeEmail(booking?._ownerEmail || booking?.username || "");
    const destination = (booking?.destination || "trip").toString().trim().toLowerCase();
    const start = (booking?.startDate || "").toString().trim();
    const end = (booking?.endDate || "").toString().trim();
    return `${owner || "unknown"}-${destination}-${start}-${end}`;
  };

  const getBookingMergeKey = (booking) => {
    const owner = normalizeEmail(booking?._ownerEmail || booking?.hostEmail || booking?.username || "");
    const destination = normalizeText(booking?.destination);
    const start = normalizeDateKey(booking?.startDate);
    const end = normalizeDateKey(booking?.endDate);
    const explicitId = (booking?.id || booking?.postId || "").toString().trim();
    if (owner || destination || start || end) return `${owner || "unknown"}::${destination}::${start}::${end}`;
    return explicitId ? `id::${explicitId}` : "";
  };

  const persistBookingSplit = (data, form) => {
    try { localStorage.setItem(BOOKING_SPLIT_KEY, JSON.stringify({ data, form })); } catch {}
  };

  const normalizeEmail = (value) => (value || "").toString().trim().toLowerCase();
  const normalizeIdentity = (value) => (value || "").toString().trim().toLowerCase();
  const normalizeText = (value) => (value || "").toString().trim().toLowerCase();
  const normalizeDateKey = (value) => {
    const raw = (value || "").toString().trim();
    if (!raw) return "";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toISOString().slice(0, 10);
  };
  const identityMatches = (left, right) => {
    const a = normalizeIdentity(left); const b = normalizeIdentity(right);
    return Boolean(a && b && a === b);
  };
  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || "").trim());
  const parseAmount = (value) => {
    if (value == null) return 0;
    const num = Number(String(value).replace(/[^0-9.]/g, ""));
    return Number.isFinite(num) ? num : 0;
  };
  const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  const isAcceptedStatus = (value) => ["ACCEPTED", "APPROVED", "CONFIRMED"].includes((value || "").toString().trim().toUpperCase());
  const isNonRejectedStatus = (value) => !["REJECTED", "DECLINED"].includes((value || "").toString().trim().toUpperCase());
  const isPendingStatus = (status) => ["PENDING", "REQUESTED"].includes((status || "").toString().trim().toUpperCase());
  const pickEmailIdentity = (...values) => values.map((v) => (v || "").toString().trim().toLowerCase()).find((v) => isValidEmail(v)) || "";
  const normalizeRequest = (req) => ({
    ...req,
    id: req?.id != null ? String(req.id) : "",
    hostEmail: req?.hostEmail || req?.email || req?.toEmail || "",
    requesterEmail: req?.requesterEmail || "",
    status: (req?.status || "PENDING").toString().toUpperCase(),
  });
  const parseMaybeJson = (value) => {
    if (!value) return null;
    if (typeof value === "object") return value;
    try { return JSON.parse(value); } catch { return null; }
  };
  const getBalanceLabel = (value) => {
    const n = Number(value) || 0;
    if (n > 0) return `Will receive Rs.${Math.abs(n)}`;
    if (n < 0) return `Will pay Rs.${Math.abs(n)}`;
    return "Settled up";
  };
  const formatMemberLabel = (member) => {
    const name = (member?.name || "").toString().trim();
    const emailRaw = (member?.email || "").toString().trim();
    const primary = name || emailRaw || "Trip Member";
    if (!emailRaw || !isValidEmail(emailRaw) || normalizeText(primary) === normalizeText(emailRaw)) return primary;
    return `${primary} (${emailRaw})`;
  };
  const resolveBookingTotalCost = (booking, fallback) => {
    const candidates = [booking?.totalCost, booking?.total_cost, booking?.grandTotal, fallback?.totalCost, fallback?.price, fallback?.cost];
    const found = candidates.find((v) => parseAmount(v) > 0);
    return found ?? 0;
  };
  const mergeUniqueMembers = (members) => {
    const byEmail = new Map();
    (Array.isArray(members) ? members : []).forEach((m) => {
      const email = normalizeEmail(m?.email);
      if (!email) return;
      const name = (m?.name || "").toString().trim() || "Trip Member";
      if (!byEmail.has(email)) { byEmail.set(email, { name, email }); }
      else {
        const existing = byEmail.get(email);
        if ((!existing.name || existing.name === "Trip Member") && name !== "Trip Member") byEmail.set(email, { name, email });
      }
    });
    return [...byEmail.values()];
  };
  const looksLikeCollabPost = (item) => {
    const seats = Number(item?.seatsAvailable);
    const isOpenTrip = item?.openTrip === true || seats > 0 || Boolean(item?.note);
    const hasBookingDate = Boolean(item?.bookingDate);
    const status = (item?.status || "").toString().trim().toUpperCase();
    const bookingStatuses = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"];
    const hasBookingSignal = hasBookingDate || bookingStatuses.includes(status);
    return isOpenTrip && !hasBookingSignal;
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profileRes = await axios.get(`${API_BASE}/profile`, { withCredentials: true });
        let nextProfile = profileRes.data || {};
        let profileEmail = resolveProfileEmail(nextProfile);
        let profileName = resolveProfileName(nextProfile);
        persistIdentity({ name: profileName, email: profileEmail });
        nextProfile = { ...nextProfile, name: profileName || nextProfile.name, email: profileEmail || nextProfile.email };
        setProfile(nextProfile);
        setHasServerProfile(true);
      } catch {
        const fallbackName = sessionStorage.getItem("username") || localStorage.getItem("username") || "";
        const fallbackEmail = sessionStorage.getItem("email") || localStorage.getItem("email") || "";
        if (fallbackName || fallbackEmail) {
          setProfile({ name: fallbackName || "Traveler", email: fallbackEmail, loggedIn: true, history: [] });
        } else { setProfile(null); }
        setHasServerProfile(false);
      } finally { setLoading(false); }
    };
    loadProfile();
  }, []);

  const sessionEmail = sessionStorage.getItem("email");
  const sessionUsername = sessionStorage.getItem("username");
  const localEmail = localStorage.getItem("email");
  const localUsername = localStorage.getItem("username");
  const hasSessionIdentity = Boolean((sessionEmail || "").trim() || (sessionUsername || "").trim());
  const profileEmail = resolveProfileEmail(profile);
  const fallbackEmailFromUsername = [sessionUsername, localUsername, resolveProfileName(profile)].find((v) => isValidEmail(v));
  const emailCandidates = [profileEmail, profile?.email, sessionEmail, sessionUsername, fallbackEmailFromUsername, localEmail, localUsername]
    .map((v) => (v || "").toString().trim().toLowerCase()).filter(Boolean);
  const currentEmail = emailCandidates.find((v) => isValidEmail(v)) || "";
  const displayName = resolveProfileName(profile) || sessionStorage.getItem("username") || "Traveler";
  const displayEmail = currentEmail || profileEmail || sessionStorage.getItem("email") || localStorage.getItem("email") || fallbackEmailFromUsername || "";

  const ensureBookingComputedSplit = (data) => {
    if (!data || typeof data !== "object") return { members: [], expenses: [], balances: [], settlements: [], totalExpenses: 0, messages: [] };
    const hasComputed = Array.isArray(data.balances) && Array.isArray(data.settlements) && Number.isFinite(Number(data.totalExpenses));
    if (hasComputed) return { ...data, messages: Array.isArray(data.messages) ? data.messages : [] };
    return { ...recomputeBookingSplit(data.members || [], data.expenses || []), messages: Array.isArray(data.messages) ? data.messages : [] };
  };

  const recomputeBookingSplit = (members, expenses) => {
    const normalizedMembers = (Array.isArray(members) ? members : [])
      .map((m) => ({ name: (m?.name || "Trip Member").toString().trim() || "Trip Member", email: normalizeEmail(m?.email) }))
      .filter((m) => m.email);
    const memberEmails = normalizedMembers.map((m) => m.email);
    const nameByEmail = normalizedMembers.reduce((acc, m) => { acc[m.email] = m.name; return acc; }, {});
    const ledger = {};
    memberEmails.forEach((email) => { ledger[email] = 0; });
    let totalExpenses = 0;
    (Array.isArray(expenses) ? expenses : []).forEach((exp) => {
      const amount = parseAmount(exp?.amount);
      if (amount <= 0) return;
      totalExpenses += amount;
      const payer = normalizeEmail(exp?.paidByEmail);
      if (payer) { if (ledger[payer] == null) ledger[payer] = 0; ledger[payer] += amount; }
      const splitBetween = (Array.isArray(exp?.splitBetweenEmails) ? exp.splitBetweenEmails : memberEmails).map((x) => normalizeEmail(x)).filter(Boolean);
      if (splitBetween.length === 0) return;
      const share = amount / splitBetween.length;
      splitBetween.forEach((email) => { if (ledger[email] == null) ledger[email] = 0; ledger[email] -= share; });
    });
    const balances = Object.entries(ledger).map(([email, bal]) => ({ email, name: nameByEmail[email] || email, balance: round2(bal) }));
    const creditors = [], debtors = [];
    balances.forEach((b) => {
      const cents = Math.round(b.balance * 100);
      if (cents > 0) creditors.push({ email: b.email, cents });
      if (cents < 0) debtors.push({ email: b.email, cents: -cents });
    });
    const settlements = [];
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const pay = Math.min(debtors[i].cents, creditors[j].cents);
      if (pay > 0) settlements.push({ fromEmail: debtors[i].email, fromName: nameByEmail[debtors[i].email] || debtors[i].email, toEmail: creditors[j].email, toName: nameByEmail[creditors[j].email] || creditors[j].email, amount: round2(pay / 100) });
      debtors[i].cents -= pay; creditors[j].cents -= pay;
      if (debtors[i].cents === 0) i++;
      if (creditors[j].cents === 0) j++;
    }
    return { members: normalizedMembers, expenses: Array.isArray(expenses) ? expenses : [], balances, settlements, totalExpenses: round2(totalExpenses) };
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BOOKING_SPLIT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        const rawData = parsed.data && typeof parsed.data === "object" ? parsed.data : {};
        const computedData = Object.fromEntries(Object.entries(rawData).map(([k, v]) => [k, ensureBookingComputedSplit(v)]));
        setBookingSplitDataByBooking(computedData);
        setBookingSplitFormByBooking(parsed.form && typeof parsed.form === "object" ? parsed.form : {});
      }
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(BOOKING_SPLIT_KEY, JSON.stringify({ data: bookingSplitDataByBooking, form: bookingSplitFormByBooking })); } catch {}
  }, [bookingSplitDataByBooking, bookingSplitFormByBooking]);

  const syncBookingSplitToServer = async (booking, dataByBooking = bookingSplitDataByBooking, formByBooking = bookingSplitFormByBooking) => {
    const key = bookingSplitKey(booking);
    const ownerId = normalizeIdentity(booking?._ownerEmail || booking?.username || currentEmail || displayEmail || displayName || "local-user");
    if (!key || !ownerId) return;
    try {
      await axios.post(`${API_BASE}/open-trip-splits`, { ownerId, postKey: `booking-${key}`, data: dataByBooking[key] || {}, form: formByBooking[key] || {}, memberForm: {} }, { withCredentials: true });
    } catch (err) { console.warn("Failed to sync booking split", err?.message || err); }
  };

  const isReceivedRequest = (req) => {
    const requesterIdentity = normalizeIdentity(req?.requesterEmail || req?.requesterName);
    const hostIdentity = normalizeIdentity(req?.hostEmail || req?.email || req?.toEmail || req?.hostName);
    const currentIdentity = normalizeIdentity(currentEmail || displayName || sessionUsername || localUsername);
    if (!currentIdentity) return false;
    if (identityMatches(requesterIdentity, currentIdentity)) return false;
    if (identityMatches(hostIdentity, currentIdentity)) return true;
    return false;
  };

  const findLinkedTripIdForBooking = (booking) => {
    const destination = (booking?.destination || "").toString().trim().toLowerCase();
    const startDate = (booking?.startDate || "").toString().trim();
    const endDate = (booking?.endDate || "").toString().trim();
    if (!destination || !startDate || !endDate) return null;
    const exact = (collaborationTrips || []).filter((t) =>
      (t?.destination || "").toString().trim().toLowerCase() === destination &&
      (t?.startDate || "").toString().trim() === startDate &&
      (t?.endDate || "").toString().trim() === endDate
    );
    if (exact.length === 0) return null;
    const mine = exact.find((t) => normalizeEmail(t?.hostEmail) === normalizeEmail(currentEmail));
    return mine?.id || exact[0]?.id || null;
  };

  const getAcceptedTripRequestsForBooking = (booking) => {
    const hostCandidates = [booking?._ownerEmail, booking?.username, currentEmail, displayEmail, profileEmail, sessionEmail, localEmail].map((x) => normalizeIdentity(x)).filter(Boolean);
    const destination = normalizeText(booking?.destination);
    const startDate = normalizeDateKey(booking?.startDate);
    const endDate = normalizeDateKey(booking?.endDate);
    const linkedTripId = findLinkedTripIdForBooking(booking);
    if (hostCandidates.length === 0 || !destination || !startDate || !endDate) return [];
    return (requestActivity || []).filter((req) =>
      (req?.status || "").toString().trim().toUpperCase() === "ACCEPTED" &&
      ((linkedTripId && String(req?.postId || "") === String(linkedTripId)) ||
        (hostCandidates.includes(normalizeIdentity(req?.hostEmail || req?.email || req?.toEmail || req?.hostName)) &&
          normalizeText(req?.destination) === destination &&
          normalizeDateKey(req?.startDate) === startDate &&
          normalizeDateKey(req?.endDate) === endDate))
    );
  };

  const getTripMembersForBooking = (booking, extraMembers = []) => {
    const hostRaw = booking?._ownerEmail || booking?.username;
    const hostEmail = normalizeEmail(hostRaw) || (hostRaw || "").toString().trim().toLowerCase();
    const hostName = (booking?.hostName || booking?.username || booking?._ownerEmail || "Trip Host").toString().trim();
    const accepted = getAcceptedTripRequestsForBooking(booking);
    const requesterMembers = accepted.map((req) => {
      const rawEmail = (req?.requesterEmail || req?.email || req?.toEmail || req?.requesterName || "").toString().trim();
      const normalized = normalizeEmail(rawEmail);
      const safeEmail = normalized || rawEmail.toLowerCase() || `guest-${req?.id || Date.now()}`;
      return { name: (req?.requesterName || rawEmail || "Trip Member").toString().trim() || "Trip Member", email: safeEmail };
    });
    const base = hostEmail ? [{ name: hostName || "Trip Host", email: hostEmail }] : [];
    return mergeUniqueMembers([...base, ...requesterMembers, ...(Array.isArray(extraMembers) ? extraMembers : [])]);
  };

  const isCollabBooking = (booking) => {
    const accepted = getAcceptedTripRequestsForBooking(booking);
    return Boolean((accepted && accepted.length > 0) || booking?._shared || booking?._fromAcceptedRequest || findLinkedTripIdForBooking(booking));
  };

  const getParticipantCountForBooking = (booking) => {
    const bookingId = bookingSplitKey(booking);
    const splitMembers = bookingSplitDataByBooking[bookingId]?.members || [];
    const computed = getTripMembersForBooking(booking, splitMembers);
    return Math.max(1, computed.length);
  };

  const getSplitAmountForBooking = (booking) => {
    const total = parseAmount(booking?.totalCost);
    const participants = getParticipantCountForBooking(booking);
    return Math.ceil(total / Math.max(1, participants));
  };

  const getJoinedTravelerNamesForBooking = (booking) => {
    const accepted = getAcceptedTripRequestsForBooking(booking);
    return [...new Set(accepted.map((req) => (req?.requesterName || req?.requesterEmail || "").toString().trim()).filter(Boolean))];
  };

  const ensureBookingSplitInitialized = (booking) => {
    const bookingId = bookingSplitKey(booking);
    if (bookingSplitDataByBooking[bookingId]) return bookingId;
    const defaultEmail = normalizeEmail(currentEmail) || "me@tripweaver.local";
    const defaultMembers = [{ name: displayName || "You", email: defaultEmail }];
    const initial = recomputeBookingSplit(defaultMembers, []);
    setBookingSplitDataByBooking((prev) => ({ ...prev, [bookingId]: initial }));
    setBookingSplitFormByBooking((prev) => ({ ...prev, [bookingId]: { description: "", amount: "", paidByEmail: defaultEmail, splitBetweenEmails: defaultMembers.map((m) => m.email), splitType: "EQUAL", allocations: {} } }));
    return bookingId;
  };

  const setBookingSplitFormField = (bookingId, field, value) => {
    setBookingSplitFormByBooking((prev) => ({ ...prev, [bookingId]: { ...(prev[bookingId] || {}), [field]: value } }));
  };

  const toggleBookingSplitMember = (bookingId, memberEmail) => {
    const email = normalizeEmail(memberEmail);
    setBookingSplitFormByBooking((prev) => {
      const current = prev[bookingId] || {};
      const currentList = Array.isArray(current.splitBetweenEmails) ? current.splitBetweenEmails : [];
      const exists = currentList.includes(email);
      return { ...prev, [bookingId]: { ...current, splitBetweenEmails: exists ? currentList.filter((x) => x !== email) : [...currentList, email] } };
    });
  };

  const findBookingById = (id) => (bookings || []).find((b) => String(bookingSplitKey(b)) === String(id));

  const hasBookingChat = (booking) => Boolean(bookingSplitKey(booking) && getTripMembersForBooking(booking).length > 1);

  const getBookingChatThreadForBooking = (booking) => {
    const bookingKey = bookingSplitKey(booking);
    if (!bookingKey) return "";
    return getBookingChatThreadId({ ...booking, bookingKey, bookingChatId: bookingKey });
  };

  const getBookingChatSenderIdentity = () => ({
    senderEmail: (currentEmail || displayEmail || "").toString().trim(),
    senderName: (displayName || "Trip Member").toString().trim() || "Trip Member",
  });

  const loadBookingSplitFromTrip = async (booking) => {
    const bookingId = bookingSplitKey(booking);
    const tripId = findLinkedTripIdForBooking(booking);
    if (!tripId) { ensureBookingSplitInitialized(booking); return; }
    try {
      const [membersRes, expensesRes, settlementsRes] = await Promise.all([
        axios.get(`${API_BASE}/collaboration-trips/${tripId}/members`, { withCredentials: true }),
        axios.get(`${API_BASE}/collaboration-trips/${tripId}/expenses`, { withCredentials: true }),
        axios.get(`${API_BASE}/collaboration-trips/${tripId}/settlements`, { withCredentials: true }),
      ]);
      const apiMembers = (Array.isArray(membersRes?.data) ? membersRes.data : []).map((m) => ({ name: m?.name || "Trip Member", email: normalizeEmail(m?.email) })).filter((m) => m.email);
      const members = getTripMembersForBooking(booking, apiMembers);
      const apiExpenses = (Array.isArray(expensesRes?.data) ? expensesRes.data : []).map((e) => ({
        id: e?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        description: e?.description || "Trip expense",
        amount: round2(parseAmount(e?.amount)),
        paidByEmail: normalizeEmail(e?.paidByEmail),
        paidByName: e?.paidByName || "Trip Member",
        splitBetweenEmails: Array.isArray(e?.splitBetweenEmails) ? e.splitBetweenEmails.map((x) => normalizeEmail(x)).filter(Boolean) : [],
        splitType: (e?.splitType || "EQUAL").toString().toUpperCase(),
        allocations: e?.allocations && typeof e.allocations === "object" ? e.allocations : {},
        createdAt: e?.createdAt || new Date().toISOString(),
      }));
      const settlements = settlementsRes?.data || {};
      const recomputed = recomputeBookingSplit(members, apiExpenses);
      const merged = {
        members, expenses: apiExpenses, messages: [],
        balances: Array.isArray(settlements?.balances) && settlements.balances.length > 0 ? settlements.balances : recomputed.balances,
        settlements: Array.isArray(settlements?.settlements) && settlements.settlements.length > 0 ? settlements.settlements : recomputed.settlements,
        totalExpenses: parseAmount(settlements?.totalExpenses) > 0 ? round2(parseAmount(settlements.totalExpenses)) : recomputed.totalExpenses,
      };
      const hydratedForm = { description: "", amount: "", paidByEmail: members[0]?.email || normalizeEmail(currentEmail) || "", paidByName: members[0]?.name || displayName || "You", splitBetweenEmails: members.map((m) => m.email), splitType: "EQUAL", allocations: {} };
      const nextDataByBooking = { ...bookingSplitDataByBooking, [bookingId]: merged };
      const nextFormByBooking = { ...bookingSplitFormByBooking, [bookingId]: hydratedForm };
      setBookingSplitDataByBooking(nextDataByBooking);
      setBookingSplitFormByBooking(nextFormByBooking);
      persistBookingSplit(nextDataByBooking, nextFormByBooking);
      syncBookingSplitToServer(booking, nextDataByBooking, nextFormByBooking);
    } catch { ensureBookingSplitInitialized(booking); }
  };

  const handleAddBookingExpense = async (bookingId) => {
    const data = bookingSplitDataByBooking[bookingId] || { members: [], expenses: [] };
    const form = bookingSplitFormByBooking[bookingId] || {};
    const description = (form.description || "").toString().trim();
    const amount = parseAmount(form.amount);
    const paidByEmail = normalizeEmail(form.paidByEmail);
    const splitBetweenEmails = (Array.isArray(form.splitBetweenEmails) ? form.splitBetweenEmails : []).map((x) => normalizeEmail(x)).filter(Boolean);
    if (!description) { showToast("Enter an expense description.", "warning"); return; }
    if (amount <= 0) { showToast("Enter a valid amount.", "warning"); return; }
    if (!paidByEmail) { showToast("Choose who paid.", "warning"); return; }
    if (splitBetweenEmails.length === 0) { showToast("Select at least one member to split.", "warning"); return; }
    const booking = findBookingById(bookingId);
    const linkedTripId = booking ? findLinkedTripIdForBooking(booking) : null;
    const payerMember = (data.members || []).find((m) => normalizeEmail(m.email) === paidByEmail);
    const paidByName = payerMember?.name || displayName || "Trip Member";
    const addLocally = () => {
      const expense = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, description, amount: round2(amount), paidByEmail, paidByName, splitBetweenEmails, splitType: "EQUAL", allocations: {}, createdAt: new Date().toISOString() };
      const nextExpenses = [expense, ...(data.expenses || [])];
      const nextData = recomputeBookingSplit(data.members || [], nextExpenses);
      const nextDataByBooking = { ...bookingSplitDataByBooking, [bookingId]: nextData };
      const nextFormByBooking = { ...bookingSplitFormByBooking, [bookingId]: { ...(bookingSplitFormByBooking[bookingId] || {}), description: "", amount: "" } };
      setBookingSplitDataByBooking(nextDataByBooking);
      setBookingSplitFormByBooking(nextFormByBooking);
      persistBookingSplit(nextDataByBooking, nextFormByBooking);
      syncBookingSplitToServer(booking, nextDataByBooking, nextFormByBooking);
      showToast("Expense saved", "success");
    };
    if (linkedTripId) {
      try {
        await axios.post(`${API_BASE}/collaboration-trips/${linkedTripId}/expenses`, { description, amount: round2(amount), paidByEmail, paidByName, splitBetweenEmails, splitType: "EQUAL", allocations: {} }, { withCredentials: true });
        await loadBookingSplitFromTrip(booking);
        setBookingSplitFormByBooking((prev) => ({ ...prev, [bookingId]: { ...(prev[bookingId] || {}), description: "", amount: "" } }));
        return;
      } catch { addLocally(); return; }
    }
    addLocally();
  };

  const handleSettleUp = (bookingId) => {
    const settlements = bookingSplitDataByBooking[bookingId]?.settlements || [];
    if (settlements.length === 0) { showToast("Nothing to settle for this booking.", "info"); return; }
    showToast("Use the settlement list to transfer amounts.", "success");
  };

  const handleToggleBookingSplit = async (booking) => {
    const bookingId = bookingSplitKey(booking);
    const nextOpen = !splitOpenByBooking[bookingId];
    if (nextOpen && !bookingSplitDataByBooking[bookingId]) await loadBookingSplitFromTrip(booking);
    setSplitOpenByBooking((prev) => ({ ...prev, [bookingId]: nextOpen }));
  };

  // ── Chat helpers ──────────────────────────────────────────────
  const scrollChatToBottom = useCallback((threadId) => {
    if (!threadId) return;
    const node = chatScrollRefs.current[threadId];
    if (!node) return;
    window.requestAnimationFrame(() => { node.scrollTop = node.scrollHeight; });
  }, []);

  const setChatScrollRef = useCallback((threadId, node) => {
    if (!threadId) return;
    if (node) { chatScrollRefs.current[threadId] = node; return; }
    delete chatScrollRefs.current[threadId];
  }, []);

  const toggleTripChat = (requestId) => {
    const nextId = requestId != null ? String(requestId) : "";
    setOpenTripChatRequestId((prev) => (prev === nextId ? "" : nextId));
  };

  const toggleBookingChat = (bookingId) => {
    const nextId = bookingId != null ? String(bookingId) : "";
    setOpenBookingChatId((prev) => (prev === nextId ? "" : nextId));
  };

  const handleTripChatInputChange = (threadId, value) => {
    setTripChatInputByThread((prev) => ({ ...prev, [threadId]: value }));
  };

  const resolveBackendTripChatRequest = (request) => {
    const directTripId = getTripChatTripId(request);
    if (directTripId && /^\d+$/.test(String(directTripId)) && (collaborationTrips || []).some((trip) => String(trip?.id) === String(directTripId))) {
      return { ...request, tripId: String(directTripId) };
    }
    const hostIdentity = normalizeIdentity(request?.hostEmail || request?.email || request?.toEmail || request?.hostName);
    const destination = normalizeText(request?.destination);
    const startDate = normalizeDateKey(request?.startDate);
    const endDate = normalizeDateKey(request?.endDate);
    const matchedTrip = (collaborationTrips || []).find((trip) => {
      const tripHostIdentity = normalizeIdentity(trip?.hostEmail || trip?.hostName);
      return tripHostIdentity === hostIdentity && normalizeText(trip?.destination) === destination && normalizeDateKey(trip?.startDate) === startDate && normalizeDateKey(trip?.endDate) === endDate;
    });
    return matchedTrip?.id != null ? { ...request, tripId: String(matchedTrip.id) } : request;
  };

  const hasBackendTripChat = (request) => {
    const resolvedTripId = getTripChatTripId(resolveBackendTripChatRequest(request));
    return Boolean(resolvedTripId && /^\d+$/.test(String(resolvedTripId)));
  };

  const getTripChatSenderIdentity = (request) => {
    const received = isReceivedRequest(request);
    if (received) return { senderEmail: (request?.hostEmail || request?.email || currentEmail || displayEmail || "").toString().trim(), senderName: (request?.hostName || displayName || "Trip Host").toString().trim() || "Trip Host" };
    return { senderEmail: (request?.requesterEmail || currentEmail || displayEmail || "").toString().trim(), senderName: (request?.requesterName || displayName || "Trip Member").toString().trim() || "Trip Member" };
  };

  const getTripChatViewerIdentity = (request) => {
    const received = isReceivedRequest(request);
    return received ? normalizeIdentity(request?.hostEmail || request?.email || request?.toEmail || request?.hostName) : normalizeIdentity(request?.requesterEmail || request?.requesterName);
  };

  const getTripChatOtherName = (request) => {
    const received = isReceivedRequest(request);
    return received ? (request?.requesterName || request?.requesterEmail || "Trip Member").toString().trim() || "Trip Member" : (request?.hostName || request?.hostEmail || "Trip Host").toString().trim() || "Trip Host";
  };

  const getRequestTripLabel = (request) => {
    const resolvedRequest = resolveBackendTripChatRequest(request);
    const resolvedTripId = getTripChatTripId(resolvedRequest);
    const linkedTrip = (collaborationTrips || []).find((trip) => String(trip?.id || "") === String(resolvedTripId || "")) ||
      (collaborationTrips || []).find((trip) => normalizeIdentity(trip?.hostEmail || trip?.hostName) === normalizeIdentity(request?.hostEmail || request?.email || request?.toEmail || request?.hostName) && normalizeText(trip?.destination) === normalizeText(request?.destination));
    const linkedFlight = parseMaybeJson(linkedTrip?.flightDetails);
    const startPlace = (request?.origin || linkedTrip?.origin || linkedFlight?.departureAirport || "").toString().trim();
    const endPlace = (request?.destination || linkedTrip?.destination || "Trip").toString().trim();
    const start = (request?.startDate || linkedTrip?.startDate || "").toString().trim();
    const end = (request?.endDate || linkedTrip?.endDate || "").toString().trim();
    const route = startPlace ? `${startPlace} - ${endPlace}` : endPlace;
    const dates = start && end ? `${start} - ${end}` : (start || end);
    return dates ? `${route} | ${dates}` : route;
  };

  const handleTripChatSend = async (request) => {
    if (!hasBackendTripChat(request)) { showToast("Trip chat is not available for this request yet.", "warning"); return; }
    const threadId = getTripChatThreadId(resolveBackendTripChatRequest(request));
    const text = (tripChatInputByThread[threadId] || "").toString().trim();
    if (!threadId || !text) return;
    const { senderEmail, senderName } = getTripChatSenderIdentity(request);
    const saved = await addTripChatMessage(threadId, { text, senderName, senderEmail });
    if (!saved) { showToast("Trip chat could not sync. Please try again.", "error"); return; }
    setTripChatMessagesByThread((prev) => ({ ...prev, [threadId]: [...(prev[threadId] || []), saved] }));
    setTripChatInputByThread((prev) => ({ ...prev, [threadId]: "" }));
    showToast("Message sent.", "success");
  };

  const handleBookingChatSend = async (booking) => {
    if (!hasBookingChat(booking)) { showToast("Booking chat is available only when multiple travelers are part of this booking.", "warning"); return; }
    const bookingId = bookingSplitKey(booking);
    const threadId = getBookingChatThreadForBooking(booking);
    const text = (tripChatInputByThread[threadId] || "").toString().trim();
    if (!bookingId || !threadId || !text) return;
    const { senderEmail, senderName } = getBookingChatSenderIdentity();
    const saved = await addBookingChatMessage(threadId, { text, senderName, senderEmail });
    if (!saved) { showToast("Booking chat could not sync. Please try again.", "error"); return; }
    setTripChatMessagesByThread((prev) => ({ ...prev, [threadId]: [...(prev[threadId] || []), saved] }));
    setTripChatInputByThread((prev) => ({ ...prev, [threadId]: "" }));
    showToast("Message sent.", "success");
  };

  // Poll trip chats
  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      const accepted = (requestActivity || []).filter((req) => isAcceptedStatus(req?.status) && hasBackendTripChat(req));
      const next = {};
      for (const req of accepted) {
        const threadId = getTripChatThreadId(resolveBackendTripChatRequest(req));
        if (!threadId) continue;
        const msgs = await getTripChatMessages(threadId);
        next[threadId] = msgs;
      }
      if (!cancelled) setTripChatMessagesByThread((prev) => ({ ...prev, ...next }));
    };
    sync();
    const id = setInterval(sync, 5000);
    window.addEventListener("trip-collaboration-chat-updated", sync);
    return () => { cancelled = true; clearInterval(id); window.removeEventListener("trip-collaboration-chat-updated", sync); };
  }, [requestActivity, collaborationTrips]);

  // Poll booking chats
  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      const eligible = (bookings || []).filter((b) => hasBookingChat(b));
      const next = {};
      for (const booking of eligible) {
        const threadId = getBookingChatThreadForBooking(booking);
        if (!threadId) continue;
        const msgs = await getBookingChatMessages(threadId);
        next[threadId] = msgs;
      }
      if (!cancelled) setTripChatMessagesByThread((prev) => ({ ...prev, ...next }));
    };
    sync();
    const id = setInterval(sync, 5000);
    window.addEventListener("trip-collaboration-chat-updated", sync);
    return () => { cancelled = true; clearInterval(id); window.removeEventListener("trip-collaboration-chat-updated", sync); };
  }, [bookings, currentEmail, displayEmail, displayName]);

  useEffect(() => {
    if (!openTripChatRequestId) return;
    const openRequest = (requestActivity || []).find((req) => isAcceptedStatus(req?.status) && String(req?.id || "") === String(openTripChatRequestId));
    if (!openRequest) return;
    const threadId = getTripChatThreadId(resolveBackendTripChatRequest(openRequest));
    scrollChatToBottom(threadId);
  }, [openTripChatRequestId, requestActivity, collaborationTrips, tripChatMessagesByThread, scrollChatToBottom]);

  useEffect(() => {
    if (!openBookingChatId) return;
    const openBooking = (bookings || []).find((booking) => String(bookingSplitKey(booking)) === String(openBookingChatId));
    if (!openBooking) return;
    const threadId = getBookingChatThreadForBooking(openBooking);
    scrollChatToBottom(threadId);
  }, [openBookingChatId, bookings, tripChatMessagesByThread, scrollChatToBottom]);

  // Group accepted requests into ongoing trips
  const groupedOngoing = React.useMemo(() => {
    const allAccepted = [
      ...requestActivity.filter(r => r.status === "ACCEPTED"),
    ];
    const groups = {};
    allAccepted.forEach(req => {
      const key = req.postId || `${req.hostEmail}-${req.destination}-${req.startDate}`;
      if (!groups[key]) {
        groups[key] = { postId: key, destination: req.destination, startDate: req.startDate, endDate: req.endDate, hostEmail: req.hostEmail, hostName: req.hostName, pricePerPerson: req.pricePerPerson, members: [] };
      }
      const memberEmail = isReceivedRequest(req) ? req.requesterEmail : req.hostEmail;
      const memberName = isReceivedRequest(req) ? req.requesterName : req.hostName;
      if (memberEmail && !groups[key].members.find(m => normalizeEmail(m.email) === normalizeEmail(memberEmail))) {
        groups[key].members.push({ name: memberName || memberEmail, email: memberEmail });
      }
    });
    return Object.values(groups);
  }, [requestActivity]);

  const loadSettlements = async (tripId) => {
    if (!tripId) return;
    try {
      const [settlementsRes, membersRes, bookingsRes, tripRes] = await Promise.all([
        axios.get(`${API_BASE}/collaboration-trips/${tripId}/settlements`),
        axios.get(`${API_BASE}/collaboration-trips/${tripId}/members`),
        axios.get(`${API_BASE}/collaboration-trips/${tripId}/bookings`),
        axios.get(`${API_BASE}/collaboration-trips/${tripId}`),
      ]);
      // Also fetch individual expenses
      let expensesList = [];
      try { const expRes = await axios.get(`${API_BASE}/collaboration-trips/${tripId}/expenses`); expensesList = expRes.data || []; } catch {}
      setSettlements(prev => ({ ...prev, [tripId]: { ...settlementsRes.data, expenses: expensesList } }));
      setTripMembers(prev => ({ ...prev, [tripId]: membersRes.data || [] }));
      setTripBookings(prev => ({ ...prev, [tripId]: bookingsRes.data || [] }));
      setTripDetails(prev => ({ ...prev, [tripId]: tripRes.data }));
      return tripRes.data;
    } catch (e) {
      const trip = groupedOngoing.find(t => t.postId === tripId);
      if (trip) {
        const fallbackMembers = [{ name: trip.hostName || "Host", email: trip.hostEmail }, ...trip.members];
        const unique = Array.from(new Set(fallbackMembers.map(m => m.email))).map(email => fallbackMembers.find(m => m.email === email));
        setTripMembers(prev => ({ ...prev, [tripId]: unique }));
      }
    }
  };

  const handleAddExpense = async (tripId) => {
    if (!tripId) { showToast("Trip ID is missing.", "error"); return; }
    if (!expenseForm.description || !expenseForm.amount) { showToast("Please enter both description and amount.", "warning"); return; }
    try {
      const members = tripMembers[tripId] || [];
      await axios.post(`${API_BASE}/collaboration-trips/${tripId}/expenses`, {
        description: expenseForm.description,
        amount: parseFloat(expenseForm.amount),
        paidByEmail: currentEmail || displayEmail,
        paidByName: displayName,
        splitBetweenEmails: members.map(m => m.email),
        splitType: expenseForm.splitType,
        allocations: expenseForm.allocations,
      }, { withCredentials: true });
      setExpenseForm({ description: "", amount: "", splitType: "EQUAL", allocations: {} });
      await loadSettlements(tripId);
      showToast("Expense added!", "success");
    } catch (e) { showToast("Failed to add expense.", "error"); }
  };

  const handleCreateBooking = async (tripId) => {
    if (selectedTravellers.length === 0) { showToast("Please select at least one traveller.", "warning"); return; }
    if (!bookingCost || parseFloat(bookingCost) <= 0) { showToast("Please enter a valid total cost.", "warning"); return; }
    const travellers = (tripMembers[tripId] || []).filter(m => selectedTravellers.includes(m.email));
    const payload = {
      tripId, bookedByEmail: currentEmail || displayEmail, bookedByName: displayName,
      travellerEmails: travellers.map(t => t.email), travellerNames: travellers.map(t => t.name),
      totalTravellers: travellers.length, totalCost: parseFloat(bookingCost), isCollab: true,
      items: [{ destination: groupedOngoing.find(t => t.postId === tripId)?.destination || "Trip" }],
    };
    navigate("/payment", { state: { bookingData: payload } });
  };

  const toggleTraveller = (email) => {
    setSelectedTravellers(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]);
  };

  useEffect(() => {
    if (showBookingModal) {
      const trip = groupedOngoing.find(t => t.postId === showBookingModal);
      const details = tripDetails[showBookingModal];
      const ppp = resolvedPricePerPerson[showBookingModal] || (details?.pricePerPerson && details.pricePerPerson > 0 ? details.pricePerPerson : 0) || (trip?.pricePerPerson && trip.pricePerPerson > 0 ? trip.pricePerPerson : 0);
      if (ppp > 0) setBookingCost((ppp * selectedTravellers.length).toFixed(2));
    } else { setBookingCost(""); }
  }, [selectedTravellers, showBookingModal, groupedOngoing, tripDetails, resolvedPricePerPerson]);

  const refreshCollaborationState = useCallback(() => {
    const load = async () => {
      const identityCandidates = [currentEmail, profileEmail, displayEmail, displayName, sessionEmail, sessionUsername, localEmail, localUsername].map((x) => (x || "").toString().trim()).filter(Boolean);
      const uniqueIdentityCandidates = [...new Set(identityCandidates)];
      let remoteHostRequests = [], remoteRequesterRequests = [], remoteLoaded = false;
      for (const id of uniqueIdentityCandidates) {
        if (!id) continue;
        try {
          const [hostRes, requesterRes] = await Promise.all([
            axios.get(`${API_BASE}/collaboration-trips/join-requests/host`, { params: { email: id }, withCredentials: true }),
            axios.get(`${API_BASE}/collaboration-trips/join-requests/requester`, { params: { email: id }, withCredentials: true }),
          ]);
          remoteHostRequests.push(...(Array.isArray(hostRes?.data) ? hostRes.data : []).map(normalizeRequest));
          remoteRequesterRequests.push(...(Array.isArray(requesterRes?.data) ? requesterRes.data : []).map(normalizeRequest));
          remoteLoaded = remoteLoaded || (hostRes?.data?.length > 0 || requesterRes?.data?.length > 0);
        } catch (err) { console.warn("join-requests fetch failed for", id, err?.message || err); }
      }
      if (!remoteLoaded && uniqueIdentityCandidates.length > 0) remoteLoaded = true;
      const mergedById = new Map();
      const localHostRequests = uniqueIdentityCandidates.flatMap((id) => getJoinRequestsForHost(id).map(normalizeRequest)).filter(Boolean);
      const localRequesterRequests = uniqueIdentityCandidates.flatMap((id) => getJoinRequestsForRequester(id).map(normalizeRequest)).filter(Boolean);
      const sourceRequests = remoteLoaded ? [...remoteHostRequests, ...remoteRequesterRequests] : [...localHostRequests, ...localRequesterRequests];
      sourceRequests.forEach((req) => { if (!req?.id) return; mergedById.set(req.id, req); });
      const merged = [...mergedById.values()].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
      const viewerIdentity = normalizeIdentity(currentEmail || displayName || sessionUsername || localUsername);
      const incomingPending = viewerIdentity ? merged.filter((req) => isPendingStatus(req.status) && isReceivedRequest(req)) : [];
      setJoinRequests(incomingPending);
      setRequestActivity(merged);
      let tripsList = [];
      try {
        const tripsRes = await axios.get(`${API_BASE}/collaboration-trips`, { withCredentials: true });
        tripsList = Array.isArray(tripsRes?.data) ? tripsRes.data : [];
        setCollaborationTrips(tripsList);
      } catch { setCollaborationTrips([]); }
      try {
        const bookingLists = await Promise.all(uniqueIdentityCandidates.map(async (candidate) => {
          try {
            const r = await axios.get(`${API_BASE}/bookings/my-bookings`, { params: { username: candidate }, withCredentials: true });
            return Array.isArray(r?.data) ? r.data : [];
          } catch { return []; }
        }));
        const myBookings = bookingLists.flat().filter((b) => !looksLikeCollabPost(b)).map((b) => ({
          ...b, totalCost: resolveBookingTotalCost(b),
          _ownerEmail: pickEmailIdentity(b?._ownerEmail, b?.hostEmail, currentEmail, displayEmail, profileEmail, sessionEmail, localEmail, b?.username),
          _shared: false,
        }));
        const acceptedAsRequester = merged.filter((req) => {
          const isAccepted = isAcceptedStatus(req?.status) || isNonRejectedStatus(req?.status);
          const requestedByViewer = identityMatches(req?.requesterEmail, currentEmail || viewerIdentity) || identityMatches(req?.requesterName, displayName || viewerIdentity);
          return isAccepted && requestedByViewer;
        });
        const sharedTripKeys = acceptedAsRequester.map((req) => ({ hostEmail: normalizeEmail(req?.hostEmail), destination: normalizeText(req?.destination), startDate: normalizeDateKey(req?.startDate), endDate: normalizeDateKey(req?.endDate) }));
        const hostEmails = [...new Set(sharedTripKeys.map((k) => k.hostEmail).filter(Boolean))];
        const sharedHostBookingsLists = await Promise.all(hostEmails.map(async (host) => {
          try {
            const hostRes = await axios.get(`${API_BASE}/bookings/my-bookings`, { params: { username: host }, withCredentials: true });
            return (Array.isArray(hostRes?.data) ? hostRes.data : []).filter((b) => !looksLikeCollabPost(b));
          } catch { return []; }
        }));
        const sharedBookings = sharedHostBookingsLists.flat().map((b) => {
          const matchedKey = sharedTripKeys.find((k) => normalizeEmail(b?.username) === k.hostEmail && normalizeText(b?.destination) === k.destination && normalizeDateKey(b?.startDate) === k.startDate && normalizeDateKey(b?.endDate) === k.endDate);
          return matchedKey ? { ...b, totalCost: resolveBookingTotalCost(b), _ownerEmail: pickEmailIdentity(matchedKey?.hostEmail, b?._ownerEmail, b?.hostEmail, b?.username), _shared: !identityMatches(matchedKey?.hostEmail || b?.username, currentEmail || viewerIdentity) } : null;
        }).filter(Boolean);
        const syntheticSharedBookings = acceptedAsRequester.map((req) => {
          const matchTrip = (tripsList || []).find((t) => normalizeEmail(t?.hostEmail) === normalizeEmail(req?.hostEmail) && normalizeText(t?.destination) === normalizeText(req?.destination) && normalizeDateKey(t?.startDate) === normalizeDateKey(req?.startDate) && normalizeDateKey(t?.endDate) === normalizeDateKey(req?.endDate));
          return { id: req?.postId || `${req?.hostEmail || "host"}-${req?.destination}-${req?.startDate}`, destination: req?.destination || matchTrip?.destination || "Trip", startDate: req?.startDate || matchTrip?.startDate, endDate: req?.endDate || matchTrip?.endDate, totalCost: resolveBookingTotalCost(matchTrip, req), bookingDate: req?.updatedAt || req?.createdAt || new Date().toISOString(), username: req?.hostEmail || matchTrip?.hostEmail || "Trip Host", hostName: req?.hostName || matchTrip?.hostName || "Trip Host", _ownerEmail: normalizeEmail(req?.hostEmail || matchTrip?.hostEmail), _shared: true, _fromAcceptedRequest: true };
        });
        const mergedBookingsMap = new Map();
        [...myBookings, ...sharedBookings, ...syntheticSharedBookings].forEach((b) => {
          const key = getBookingMergeKey(b);
          if (!key) return;
          const existing = mergedBookingsMap.get(key);
          if (!existing) { mergedBookingsMap.set(key, b); return; }
          const pickNext = parseAmount(b?.totalCost) > parseAmount(existing?.totalCost) || (parseAmount(b?.totalCost) === parseAmount(existing?.totalCost) && new Date(b?.bookingDate || 0) > new Date(existing?.bookingDate || 0));
          mergedBookingsMap.set(key, pickNext ? b : existing);
        });
        setBookings([...mergedBookingsMap.values()].sort((a, b) => new Date(b.bookingDate || 0) - new Date(a.bookingDate || 0)));
      } catch { setBookings([]); }
    };
    load();
  }, [currentEmail, displayName, displayEmail, profileEmail, sessionEmail, sessionUsername, localEmail, localUsername, hasSessionIdentity]);

  useEffect(() => {
    refreshCollaborationState();
    const onStorage = () => refreshCollaborationState();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refreshCollaborationState]);

  useEffect(() => {
    const loadHistory = async () => {
      const profileHistory = Array.isArray(profile?.history) ? profile.history : [];
      if (profileHistory.length > 0) { setHistoryItems(profileHistory); return; }
      try {
        const candidates = [currentEmail, displayEmail, sessionStorage.getItem("email"), sessionStorage.getItem("username"), localStorage.getItem("email"), localStorage.getItem("username")].map((v) => (v || "").toString().trim()).filter(Boolean);
        const uniqueCandidates = [...new Set(candidates)];
        const historyLists = await Promise.all(uniqueCandidates.map(async (id) => {
          try { const res = await axios.get(`${API_BASE}/search-history`, { withCredentials: true, params: { email: id } }); return Array.isArray(res?.data) ? res.data : []; } catch { return []; }
        }));
        let list = historyLists.flat();
        if (list.length === 0) { try { const r = await axios.get(`${API_BASE}/search-history`, { withCredentials: true }); list = Array.isArray(r?.data) ? r.data : []; } catch {} }
        const seen = new Set();
        const normalized = [];
        list.forEach((item) => { const key = `${item.searchedAt || ""}|${item.query || item.destination || ""}`; if (seen.has(key)) return; seen.add(key); normalized.push(item); });
        if (normalized.length > 0) { setHistoryItems(normalized); return; }
      } catch {}
      try { const cached = JSON.parse(localStorage.getItem("tripweaver_search_history_cache") || "[]"); if (Array.isArray(cached) && cached.length > 0) { setHistoryItems(cached); return; } } catch {}
      setHistoryItems([]);
    };
    loadHistory();
  }, [profile, hasServerProfile]);

  useEffect(() => { return () => { if (toastTimer.current) clearTimeout(toastTimer.current); }; }, []);

  const handleHistoryClick = (h) => {
    if (h.type === "DESTINATION") navigate(`/search?query=${encodeURIComponent(h.destination || h.query)}`);
    else if (h.type === "TRIP") navigate("/trips", { state: { restore: h } });
    else if (h.type === "ITINERARY") navigate("/planner", { state: { restore: h } });
  };

  const handleJoinDecision = async (request, status) => {
    const requestId = request?.id != null ? String(request.id) : "";
    setActionRequestId(requestId);
    let updated = { ...request, status, updatedAt: new Date().toISOString() };
    const hasNumericId = /^\d+$/.test(requestId);
    if (hasNumericId) {
      try {
        const res = await axios.patch(`${API_BASE}/collaboration-trips/join-requests/${requestId}/status`, null, { params: { status }, withCredentials: true });
        if (res?.data) updated = normalizeRequest(res.data);
      } catch (err) { console.error("Failed to update request status on server", err); }
    }
    const localUpdated = updateJoinRequestStatus(requestId, status);
    if (localUpdated) updated = normalizeRequest(localUpdated);
    if (status === "ACCEPTED") {
      try {
        if (updated.postId) {
          try { await axios.post(`${API_BASE}/collaboration-trips/${updated.postId}/accept-seat`, {}, { withCredentials: true }); decrementLocalCollaborationSeat(updated.postId); } catch {}
        }
        if (isValidEmail(updated.requesterEmail)) {
          await axios.post(`${API_BASE}/collaboration-trips/send-join-accepted-email`, { toEmail: updated.requesterEmail, requesterName: updated.requesterName, hostName: updated.hostName, destination: updated.destination, startDate: updated.startDate, endDate: updated.endDate }, { withCredentials: true });
          showToast("Accepted. Requester notified.", "success");
        } else { showToast("Accepted. Email skipped (no requester email).", "info"); }
      } catch (err) {
        console.error("Acceptance email failed", err);
        updateJoinRequestStatus(requestId, "PENDING");
        showToast("Accept failed. Request restored to pending.", "error");
      }
    } else { showToast("Request declined.", "info"); }
    refreshCollaborationState();
    setActionRequestId("");
  };

  if (loading) {
    return (
      <>
        <p style={{ color: "black", textAlign: "center", marginTop: "100px" }}>Loading profile...</p>
        {toast ? (<div style={{ position: "fixed", right: "16px", bottom: "16px", minWidth: "240px", maxWidth: "340px", padding: "12px 14px", borderRadius: "10px", color: "#fff", background: toast.type === "success" ? "#16a34a" : toast.type === "error" ? "#dc2626" : toast.type === "warning" ? "#d97706" : "#2563eb", boxShadow: "0 12px 30px rgba(15,23,42,0.18)", zIndex: 9999, fontWeight: 600 }}>{toast.message}</div>) : null}
      </>
    );
  }

  const hasLocalIdentity = Boolean((sessionStorage.getItem("username") || localStorage.getItem("username") || "").trim()) || Boolean((sessionStorage.getItem("email") || localStorage.getItem("email") || "").trim());
  if ((!profile || profile.loggedIn === false) && !hasLocalIdentity) {
    return (
      <div style={{ color: "black", textAlign: "center", marginTop: "150px" }}>
        <h2>Please login to view your profile</h2>
        <button onClick={() => navigate("/signup")} style={{ marginTop: "20px", padding: "10px 20px", background: "#007bff", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>Go to Login</button>
      </div>
    );
  }

  const history = [...(historyItems || [])].sort((a, b) => new Date(b.searchedAt || 0) - new Date(a.searchedAt || 0));
  const statusText = (status) => (status === "PENDING" ? "REQUESTED" : status);
  const acceptedRequests = requestActivity.filter((req) => (req.status || "").toString().trim().toUpperCase() === "ACCEPTED");
  const requestedRequests = requestActivity.filter((req) => !isReceivedRequest(req) && isPendingStatus(req.status));

  const SectionToggle = ({ sectionKey, label }) => (
    <button type="button" className="section-toggle" onClick={() => toggleSection(sectionKey)} aria-label={label || (sectionOpen[sectionKey] ? `Collapse ${sectionKey}` : `Expand ${sectionKey}`)} aria-expanded={Boolean(sectionOpen[sectionKey])}>·</button>
  );

  return (
    <>
      <div className="profile-page">
        <Navbar />
        <div className="profile-container">
          <div className="profile-hero">
            <div>
              <p className="eyebrow">Your space</p>
              <h1 className="hero-title">Hi, {displayName}</h1>
              <p className="hero-subtitle">Keep bookings, collaboration requests, and searches grouped neatly.</p>
              <div className="chip-row"><span className="chip">{displayEmail || "No email saved"}</span></div>
            </div>
            <div className="stat-grid hero-stats">
              <div className="stat-card"><p>Bookings</p><strong>{bookings.length}</strong></div>
              <div className="stat-card"><p>Searches</p><strong>{history.length}</strong></div>
              <div className="stat-card"><p>Requests</p><strong>{requestActivity.length}</strong></div>
            </div>
          </div>

          <div className="profile-content">
            <div className="profile-card">
              <div className="avatar"><img src={profile.picture || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} alt="profile" referrerPolicy="no-referrer" /></div>
              <h3>{displayName}</h3>
              <p className="muted-text">{displayEmail || displayName || "Email not available"}</p>
              <span className="role-badge">Explorer</span>
              <div className="mini-stats">
                <div className="mini-stat"><span>Bookings</span><strong>{bookings.length}</strong></div>
                <div className="mini-stat"><span>Open requests</span><strong>{joinRequests.length}</strong></div>
                <div className="mini-stat"><span>History</span><strong>{history.length}</strong></div>
              </div>
            </div>

            <div className="profile-main">
              {/* BOOKINGS */}
              <section className="section-card">
                <div className="section-header">
                  <div><p className="eyebrow">Trips</p><h2 className="section-title">My Bookings</h2><p className="section-note">Split costs and see who has joined.</p></div>
                  <SectionToggle sectionKey="bookings" label="Toggle bookings" />
                </div>
                {sectionOpen.bookings ? (bookings.length === 0 ? (<p className="empty-state">No bookings found.</p>) : (
                  <div className="history-list">
                    {bookings.map((b) => {
                      const bookingKey = bookingSplitKey(b);
                      const reactKey = `${bookingKey}-${b?.id != null ? b.id : "synthetic"}`;
                      const rawSplitData = bookingSplitDataByBooking[bookingKey] || { members: [], expenses: [], balances: [], settlements: [], totalExpenses: 0, messages: [] };
                      const mergedMembers = mergeUniqueMembers([...(rawSplitData.members || []), ...getTripMembersForBooking(b)]);
                      const recomputed = recomputeBookingSplit(mergedMembers, rawSplitData.expenses || []);
                      const splitData = { ...recomputed, messages: Array.isArray(rawSplitData.messages) ? rawSplitData.messages : [], settlements: Array.isArray(rawSplitData.settlements) && rawSplitData.settlements.length > 0 ? rawSplitData.settlements : recomputed.settlements };
                      const splitForm = bookingSplitFormByBooking[bookingKey] || { description: "", amount: "", paidByEmail: mergedMembers[0]?.email || normalizeEmail(currentEmail) || "", splitBetweenEmails: mergedMembers.map((m) => m.email) };
                      const collab = isCollabBooking(b);
                      const open = Boolean(splitOpenByBooking[bookingKey]);
                      const hasExpenses = Array.isArray(splitData.expenses) && splitData.expenses.length > 0;
                      const showSplitToggle = collab || Boolean(hasExpenses);
                      const bookingChatOpen = openBookingChatId === String(bookingKey);
                      const bookingChatAvailable = hasBookingChat(b);
                      const bookingThreadId = getBookingChatThreadForBooking(b);
                      const sharedBookingMessages = tripChatMessagesByThread[bookingThreadId] || [];
                      const bookingChatMessages = sharedBookingMessages.length > 0 ? sharedBookingMessages : (Array.isArray(splitData.messages) ? splitData.messages : []);
                      const latestBookingMessage = bookingChatMessages[bookingChatMessages.length - 1];
                      const latestBookingSender = latestBookingMessage ? (identityMatches(latestBookingMessage?.senderEmail, currentEmail || displayEmail || displayName) ? "You" : (latestBookingMessage?.senderName || latestBookingMessage?.senderEmail || "Trip Member")) : "";
                      return (
                        <div key={`booking-${reactKey}`} className="history-item">
                          <div className="history-details">
                            <h4>{b.destination || "Trip Booking"}</h4>
                            <p>{b.startDate} to {b.endDate}</p>
                            <p>Total Cost: Rs.{parseAmount(b.totalCost)}</p>
                            <p>Split Amount (per person): Rs.{getSplitAmountForBooking(b)} ({getParticipantCountForBooking(b)} travelers)</p>
                            <p>Joined Travelers: {getJoinedTravelerNamesForBooking(b).length > 0 ? getJoinedTravelerNamesForBooking(b).join(", ") : "No one joined yet"}</p>
                            <p>{b._shared ? `Shared booking from host: ${b._ownerEmail || b.username || "Host"}` : `Booked by: ${b._ownerEmail || b.username || "You"}`}</p>
                            <small>{b.bookingDate ? new Date(b.bookingDate).toLocaleString() : "Booking date unavailable"}</small>
                            {latestBookingMessage ? (<div className="trip-chat-preview"><strong>{latestBookingSender}:</strong> {latestBookingMessage.text}</div>) : null}
                            {bookingChatOpen ? (bookingChatAvailable ? (
                              <div className="trip-chat-panel">
                                <div className="trip-chat-header-row"><div><strong>Booking chat</strong><span className="trip-chat-note">Everyone included in this booking can coordinate here.</span></div></div>
                                <div className="trip-chat-messages" ref={(node) => setChatScrollRef(bookingThreadId, node)}>
                                  {bookingChatMessages.length === 0 ? (<p className="trip-chat-empty">No messages yet. Start the booking conversation here.</p>) : (
                                    bookingChatMessages.map((msg) => {
                                      const mine = identityMatches(msg?.senderEmail, currentEmail || displayEmail || displayName);
                                      return (<div key={msg.id} className={`trip-chat-message ${mine ? "mine" : ""}`}><div className="trip-chat-meta"><strong>{mine ? "You" : (msg?.senderName || msg?.senderEmail || "Trip Member")}</strong><span>{msg.createdAt ? new Date(msg.createdAt).toLocaleString() : "Just now"}</span></div><p>{msg.text}</p></div>);
                                    })
                                  )}
                                </div>
                                <div className="trip-chat-compose">
                                  <textarea className="trip-chat-input" rows={3} value={tripChatInputByThread[bookingThreadId] || ""} onChange={(e) => handleTripChatInputChange(bookingThreadId, e.target.value)} placeholder="Message everyone in this booking..." />
                                  <button className="trip-chat-send-btn" type="button" onClick={() => handleBookingChatSend(b)}>Send Message</button>
                                </div>
                              </div>
                            ) : (
                              <div className="trip-chat-panel trip-chat-panel-disabled"><div className="trip-chat-header-row"><div><strong>Booking chat</strong><span className="trip-chat-note">Chat appears once this booking has multiple travelers.</span></div></div></div>
                            )) : null}
                            {open ? (
                              <div className="booking-split-panel">
                                <p className="booking-split-result">Total Expenses: <strong>Rs.{splitData.totalExpenses || 0}</strong></p>
                                <div className="booking-split-members">
                                  {(splitData.members || []).map((member) => {
                                    const email = normalizeEmail(member.email);
                                    const checked = (splitForm.splitBetweenEmails || []).includes(email);
                                    return (<label key={`${bookingKey}-${email}`} className="booking-split-check"><input type="checkbox" checked={Boolean(checked)} onChange={() => toggleBookingSplitMember(bookingKey, email)} />{formatMemberLabel(member)}</label>);
                                  })}
                                </div>
                                <label className="booking-split-label">Expense Description<input type="text" value={splitForm.description || ""} onChange={(e) => setBookingSplitFormField(bookingKey, "description", e.target.value)} /></label>
                                <label className="booking-split-label">Amount<input type="number" min="0" step="0.01" value={splitForm.amount || ""} onChange={(e) => setBookingSplitFormField(bookingKey, "amount", e.target.value)} /></label>
                                <label className="booking-split-label">Paid By
                                  <select value={splitForm.paidByEmail || ""} onChange={(e) => setBookingSplitFormField(bookingKey, "paidByEmail", e.target.value)}>
                                    {(splitData.members || []).map((member) => (<option key={`payer-${bookingKey}-${member.email}`} value={normalizeEmail(member.email)}>{formatMemberLabel(member)}</option>))}
                                  </select>
                                </label>
                                <div className="booking-split-actions">
                                  <button className="join-btn join-yes" type="button" onClick={() => handleAddBookingExpense(bookingKey)}>Save Expense</button>
                                  <button className="join-btn join-no" type="button" onClick={() => handleSettleUp(bookingKey)}>Settle Up</button>
                                </div>
                                <div className="booking-split-list">
                                  <h4>Expenses</h4>
                                  {(splitData.expenses || []).length === 0 ? (<p>No expenses added yet.</p>) : (
                                    <ul style={{ paddingLeft: "18px", margin: "6px 0" }}>
                                      {(splitData.expenses || []).map((exp) => (<li key={exp.id || exp.createdAt}><strong>{exp.description}</strong> · Rs.{exp.amount} | Paid by {exp.paidByName || exp.paidByEmail || "Unknown"} | {exp.createdAt ? new Date(exp.createdAt).toLocaleString() : "Now"}</li>))}
                                    </ul>
                                  )}
                                </div>
                                <div className="booking-split-summary">
                                  <div><h4>Balances</h4><ul>{(splitData.balances || []).map((balance, idx) => (<li key={`balance-${bookingKey}-${idx}`}>{balance.name || balance.email}: {getBalanceLabel(balance.balance)}</li>))}</ul></div>
                                  <div><h4>Settlements</h4><ul>{(splitData.settlements || []).map((settlement, idx) => (<li key={`settlement-${bookingKey}-${idx}`}>{(settlement.fromName || settlement.fromEmail || "Traveler")} pays {(settlement.toName || settlement.toEmail || "Traveler")}: Rs.{settlement.amount}</li>))}</ul></div>
                                </div>
                              </div>
                            ) : null}
                          </div>
                          {showSplitToggle ? (
                            <div className="join-actions">
                              <button className="join-btn join-yes" type="button" onClick={() => handleToggleBookingSplit(b)}>{open ? "Hide Split" : "Split Expenses"}</button>
                              <button className={`trip-chat-toggle-btn ${bookingChatOpen ? "active" : ""}`} type="button" onClick={() => toggleBookingChat(bookingKey)}>{bookingChatOpen ? "Close Chat" : "Chat"}</button>
                            </div>
                          ) : bookingChatAvailable ? (
                            <div className="join-actions"><button className={`trip-chat-toggle-btn ${bookingChatOpen ? "active" : ""}`} type="button" onClick={() => toggleBookingChat(bookingKey)}>{bookingChatOpen ? "Close Chat" : "Chat"}</button></div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )) : null}
              </section>

              {/* HISTORY */}
              <section className="section-card">
                <div className="section-header">
                  <div><p className="eyebrow">Recent</p><h2 className="section-title">Travel Search History</h2><p className="section-note">Tap any item to reopen details.</p></div>
                  <SectionToggle sectionKey="history" label="Toggle search history" />
                </div>
                {sectionOpen.history ? (history.length === 0 ? (<p className="empty-state">No journeys yet.</p>) : (
                  <div className="history-list">
                    {history.map((h, i) => (
                      <div key={i} className="history-item" onClick={() => handleHistoryClick(h)} style={{ cursor: "pointer" }} title="Click to view details">
                        <div className="history-details"><h4>{h.query}</h4><p>{h.type === "DESTINATION" && "Destination"}{h.type === "TRIP" && "Trip"}{h.type === "ITINERARY" && "Itinerary"}{" - "}{h.category}</p><small>{new Date(h.searchedAt).toLocaleString()}</small></div>
                      </div>
                    ))}
                  </div>
                )) : null}
              </section>

              {/* ONGOING TRIPS */}
              {groupedOngoing.length > 0 && (
                <section className="section-card">
                  <div className="section-header">
                    <div><p className="eyebrow">Collaboration</p><h2 className="section-title">Ongoing Trips</h2><p className="section-note">Manage expenses and book tickets for your group trips.</p></div>
                  </div>
                  <div className="history-list">
                    {groupedOngoing.map((trip) => (
                      <div key={trip.postId} className="history-item" style={{ flexDirection: "column", alignItems: "stretch" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div className="history-details">
                            <h4>Trip to {trip.destination}</h4>
                            <p>Host: {trip.hostName} · {trip.members.length + 1} Members</p>
                            <p>{trip.startDate} - {trip.endDate}</p>
                            <span className="status-badge status-accepted">ONGOING</span>
                          </div>
                          <div className="join-actions">
                            {(() => {
                              const bookedEmails = (tripBookings[trip.postId] || []).flatMap(b => b.travellerEmails || []);
                              const tripMems = tripMembers[trip.postId] || [];
                              const isEveryoneBooked = tripMems.length > 0 && tripMems.every(m => bookedEmails.includes(m.email));
                              return (
                                <button className="join-btn join-yes" type="button"
                                  disabled={!isEveryoneBooked}
                                  title={!isEveryoneBooked ? "Booking for all members required before splitting" : ""}
                                  onClick={() => { setActiveSplitId(activeSplitId === trip.postId ? null : trip.postId); if (activeSplitId !== trip.postId) loadSettlements(trip.postId); }}>
                                  {activeSplitId === trip.postId ? "Hide Split" : "Manage Split"}
                                </button>
                              );
                            })()}
                            <button className="join-btn join-yes" type="button"
                              onClick={async () => {
                                setShowBookingModal(trip.postId);
                                const bookedEmails = (tripBookings[trip.postId] || []).flatMap(b => b.travellerEmails || []);
                                const initialTravellers = currentEmail && !bookedEmails.includes(currentEmail) ? [currentEmail] : [];
                                setSelectedTravellers(initialTravellers);
                                const fetchedTrip = await loadSettlements(trip.postId);
                                const ppp = fetchedTrip?.pricePerPerson || trip?.pricePerPerson || 0;
                                setResolvedPricePerPerson(prev => ({ ...prev, [trip.postId]: ppp }));
                                if (ppp > 0 && initialTravellers.length > 0) setBookingCost((ppp * initialTravellers.length).toFixed(2));
                              }}>
                              Book Ticket
                            </button>
                          </div>
                        </div>

                        {/* Book Ticket Modal */}
                        {showBookingModal === trip.postId && (
                          <div className="booking-split-panel" style={{ marginTop: 12 }}>
                            <h5 style={{ margin: "0 0 10px" }}>Book Tickets for {trip.destination}</h5>
                            <label className="booking-split-label">Select Travellers:
                              <div className="booking-split-members" style={{ marginTop: 6 }}>
                                {(() => {
                                  const bookedEmails = (tripBookings[trip.postId] || []).flatMap(b => b.travellerEmails || []);
                                  const available = (tripMembers[trip.postId] || []).filter(m => !bookedEmails.includes(m.email));
                                  if (available.length === 0) return <p style={{ fontSize: "0.85rem", color: "#64748b" }}>All members are already booked!</p>;
                                  return available.map(member => (
                                    <label key={member.email} className="booking-split-check">
                                      <input type="checkbox" checked={selectedTravellers.includes(member.email)} onChange={() => toggleTraveller(member.email)} />
                                      {member.name || member.email}
                                    </label>
                                  ));
                                })()}
                              </div>
                            </label>
                            <label className="booking-split-label">Total Cost (₹)
                              <input type="number" min="0" value={bookingCost} onChange={(e) => setBookingCost(e.target.value)} />
                            </label>
                            <div className="booking-split-actions">
                              <button className="join-btn join-yes" type="button" onClick={() => handleCreateBooking(trip.postId)}>Confirm Booking</button>
                              <button className="join-btn join-no" type="button" onClick={() => setShowBookingModal(null)}>Cancel</button>
                            </div>
                          </div>
                        )}

                        {/* Manage Split */}
                        {activeSplitId === trip.postId && (
                          <div className="booking-split-panel" style={{ marginTop: 12 }}>
                            <h5 style={{ margin: "0 0 10px" }}>Shared Expenses for {trip.destination}</h5>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, marginBottom: 10 }}>
                              <input type="text" placeholder="What was it for?" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                              <input type="number" placeholder="Amount (₹)" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                              <button className="join-btn join-yes" type="button" onClick={() => handleAddExpense(activeSplitId)}>Add</button>
                            </div>
                            {settlements[trip.postId] && (
                              <div className="booking-split-list">
                                {settlements[trip.postId].expenses?.length > 0 && (
                                  <>
                                    <h5 style={{ fontSize: "0.9rem", marginBottom: 8, color: "#475569" }}>Expense Transactions:</h5>
                                    {settlements[trip.postId].expenses.map((exp, idx) => (
                                      <div key={idx} style={{ background: "#fff", padding: "10px 15px", borderRadius: 10, marginBottom: 8, border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between" }}>
                                        <div><strong style={{ fontSize: "0.9rem" }}>{exp.description}</strong><span style={{ display: "block", fontSize: "0.78rem", color: "#64748b" }}>Paid by {exp.paidByName || exp.paidByEmail}</span></div>
                                        <span style={{ color: "#6366f1", fontWeight: 700 }}>₹{exp.amount}</span>
                                      </div>
                                    ))}
                                    <div style={{ textAlign: "right", fontSize: "0.85rem", color: "#475569" }}>Total: <strong>₹{settlements[trip.postId].totalExpenses || 0}</strong></div>
                                  </>
                                )}
                                <h5 style={{ fontSize: "0.9rem", margin: "12px 0 8px", color: "#475569" }}>Who Owes What:</h5>
                                {(settlements[trip.postId].settlements?.length === 0) ? (<p style={{ fontSize: "0.85rem" }}>All settled up!</p>) : (
                                  (settlements[trip.postId].settlements || []).map((s, idx) => (
                                    <div key={idx} style={{ background: "#fff", padding: "10px 15px", borderRadius: 10, marginBottom: 8, border: "1px solid #e2e8f0", fontSize: "0.9rem" }}>
                                      <strong>{s.fromName || s.fromEmail}</strong> owes <strong>{s.toName || s.toEmail}</strong>: <span style={{ color: "#6366f1", fontWeight: 700 }}>₹{s.amount}</span>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* INCOMING REQUESTS */}
              <section className="section-card">
                <div className="section-header">
                  <div><p className="eyebrow">Collaboration</p><h2 className="section-title">Incoming Requests</h2><p className="section-note">Approve or decline travelers who want to join.</p></div>
                  <SectionToggle sectionKey="incoming" label="Toggle incoming requests" />
                </div>
                {sectionOpen.incoming ? (joinRequests.length === 0 ? (<p className="empty-state">No pending requests.{(currentEmail || displayName) ? ` (Signed in as: ${[currentEmail, displayName].filter(Boolean).join(" / ")})` : ""}</p>) : (
                  <div className="history-list">
                    {joinRequests.map((req) => (
                      <div key={req.id} className="history-item">
                        <div className="history-details"><h4>{req.requesterName} wants to join</h4><p>{req.destination} - {req.startDate} to {req.endDate}</p><p>Requester email: {req.requesterEmail || "Not provided"}</p></div>
                        <div className="join-actions">
                          <button className="join-btn join-yes" onClick={() => handleJoinDecision(req, "ACCEPTED")} disabled={actionRequestId === req.id}>Accept Request</button>
                          <button className="join-btn join-no" onClick={() => handleJoinDecision(req, "REJECTED")} disabled={actionRequestId === req.id}>Decline</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )) : null}
              </section>

              {/* ACCEPTED */}
              <section className="section-card">
                <div className="section-header">
                  <div><p className="eyebrow">Collaboration</p><h2 className="section-title">Accepted</h2><p className="section-note">Trips you or others approved.</p></div>
                  <SectionToggle sectionKey="accepted" label="Toggle accepted requests" />
                </div>
                {sectionOpen.accepted ? (acceptedRequests.length === 0 ? (<p className="empty-state">No accepted requests yet.</p>) : (
                  <div className="history-list">
                    {acceptedRequests.map((req) => {
                      const resolvedRequest = resolveBackendTripChatRequest(req);
                      const threadId = getTripChatThreadId(resolvedRequest);
                      const chatOpen = openTripChatRequestId === String(req.id);
                      const chatAvailable = hasBackendTripChat(req);
                      const threadMessages = tripChatMessagesByThread[threadId] || [];
                      const latestThreadMessage = threadMessages[threadMessages.length - 1];
                      const latestThreadSender = latestThreadMessage ? (identityMatches(latestThreadMessage?.senderEmail, getTripChatViewerIdentity(req)) ? "You" : (latestThreadMessage?.senderName || getTripChatOtherName(req) || "Trip Member")) : "";
                      return (
                        <div key={`accepted-${req.id}`} className={`history-item accepted-history-item ${chatOpen ? "chat-open" : ""}`}>
                          <div className="history-details">
                            <h4>{getRequestTripLabel(req)}</h4>
                            <small>{new Date(req.updatedAt || req.createdAt).toLocaleString()}</small>
                            {latestThreadMessage ? (<div className="trip-chat-preview"><strong>{latestThreadSender}:</strong> {latestThreadMessage.text}</div>) : null}
                            <div className="accepted-actions">
                              <button className={`trip-chat-toggle-btn ${chatOpen ? "active" : ""}`} type="button" onClick={() => toggleTripChat(req.id)}>{chatOpen ? "Close Chat" : "Chat"}</button>
                            </div>
                            {chatOpen ? (chatAvailable ? (
                              <div className="trip-chat-panel">
                                <div className="trip-chat-header-row"><div><strong>Trip chat</strong><span className="trip-chat-note">Visible only after request acceptance for this trip's collaborators.</span></div></div>
                                <div className="trip-chat-messages" ref={(node) => setChatScrollRef(threadId, node)}>
                                  {threadMessages.length === 0 ? (<p className="trip-chat-empty">No messages yet. Start the collaboration here.</p>) : (
                                    threadMessages.map((msg) => {
                                      const mine = identityMatches(msg?.senderEmail, getTripChatViewerIdentity(req));
                                      return (<div key={msg.id} className={`trip-chat-message ${mine ? "mine" : ""}`}><div className="trip-chat-meta"><strong>{mine ? "You" : (msg?.senderName || getTripChatOtherName(req) || "Trip Member")}</strong><span>{msg.createdAt ? new Date(msg.createdAt).toLocaleString() : "Just now"}</span></div><p>{msg.text}</p></div>);
                                    })
                                  )}
                                </div>
                                <div className="trip-chat-compose">
                                  <textarea className="trip-chat-input" rows={3} value={tripChatInputByThread[threadId] || ""} onChange={(e) => handleTripChatInputChange(threadId, e.target.value)} placeholder="Message your accepted trip group here..." />
                                  <button className="trip-chat-send-btn" type="button" onClick={() => handleTripChatSend(req)}>Send Message</button>
                                </div>
                              </div>
                            ) : (
                              <div className="trip-chat-panel trip-chat-panel-disabled"><div className="trip-chat-header-row"><div><strong>Trip chat</strong><span className="trip-chat-note">Chat will appear when this accepted request is linked to a collaboration trip.</span></div></div></div>
                            )) : null}
                          </div>
                          <div className="status-badge status-accepted">{statusText(req.status)}</div>
                        </div>
                      );
                    })}
                  </div>
                )) : null}
              </section>

              {/* REQUESTED */}
              <section className="section-card">
                <div className="section-header">
                  <div><p className="eyebrow">Collaboration</p><h2 className="section-title">Requested</h2><p className="section-note">Trips you have asked to join.</p></div>
                  <SectionToggle sectionKey="requested" label="Toggle requested trips" />
                </div>
                {sectionOpen.requested ? (requestedRequests.length === 0 ? (<p className="empty-state">No requested trips yet.</p>) : (
                  <div className="history-list">
                    {requestedRequests.map((req) => (
                      <div key={`sent-${req.id}`} className="history-item">
                        <div className="history-details"><h4>{getRequestTripLabel(req)}</h4><small>{new Date(req.updatedAt || req.createdAt).toLocaleString()}</small></div>
                        <div className={`status-badge status-${(req.status || "PENDING").toLowerCase()}`}>{statusText(req.status)}</div>
                      </div>
                    ))}
                  </div>
                )) : null}
              </section>
            </div>
          </div>
        </div>
      </div>
      {toast ? (<div style={{ position: "fixed", right: "16px", bottom: "16px", minWidth: "240px", maxWidth: "340px", padding: "12px 14px", borderRadius: "10px", color: "#fff", background: toast.type === "success" ? "#16a34a" : toast.type === "error" ? "#dc2626" : toast.type === "warning" ? "#d97706" : "#2563eb", boxShadow: "0 12px 30px rgba(15,23,42,0.18)", zIndex: 9999, fontWeight: 600 }}>{toast.message}</div>) : null}
    </>
  );
}
