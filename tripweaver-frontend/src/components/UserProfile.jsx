import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./UserProfile.css";
import Navbar from "./navbar";
import API_BASE from "../config";
import { persistIdentity, resolveProfileEmail, resolveProfileName } from "../utils/userIdentity";
import {
  addTripChatMessage,
  decrementLocalCollaborationSeat,
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
  const [sectionOpen, setSectionOpen] = useState({
    bookings: true,
    history: true,
    incoming: true,
    accepted: true,
    requested: true,
  });
  const toggleSection = (key) =>
    setSectionOpen((prev) => ({ ...prev, [key]: !prev[key] }));
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
  const [tripChatMessagesByThread, setTripChatMessagesByThread] = useState({});
  const [tripChatInputByThread, setTripChatInputByThread] = useState({});
  const [openTripChatRequestId, setOpenTripChatRequestId] = useState("");
  const navigate = useNavigate();
  const bookingSplitKey = (booking) => {
    const owner = normalizeEmail(booking?._ownerEmail || booking?.username || "");
    const destination = (booking?.destination || "trip").toString().trim().toLowerCase();
    const start = (booking?.startDate || "").toString().trim();
    const end = (booking?.endDate || "").toString().trim();
    return `${owner || "unknown"}-${destination}-${start}-${end}`;
  };
  const persistBookingSplit = (data, form) => {
    try {
      localStorage.setItem(BOOKING_SPLIT_KEY, JSON.stringify({ data, form }));
    } catch {}
  };

  useEffect(() => {
    const loadProfile = async () => {
    try {
      const profileRes = await axios.get(`${API_BASE}/profile`, { withCredentials: true });
        let nextProfile = profileRes.data || {};
        let profileEmail = resolveProfileEmail(nextProfile);
        let profileName = resolveProfileName(nextProfile);

        if (!profileEmail) {
          try {
            const statusRes = await axios.get(`${API_BASE}/profile/status`, { withCredentials: true });
            const statusData = statusRes.data || {};
            const statusName = resolveProfileName(statusData);
            const statusEmail = resolveProfileEmail(statusData);
            if (statusName && !profileName) profileName = statusName;
            if (statusEmail && !profileEmail) profileEmail = statusEmail;
          } catch {}
        }

        if (!profileEmail && profileName) {
          try {
            const userRes = await axios.get(
              `${API_BASE}/user/${encodeURIComponent(profileName)}`,
              { withCredentials: true }
            );
            const userData = userRes.data || {};
            const userEmail = resolveProfileEmail(userData);
            if (userEmail) profileEmail = userEmail;
            if (!profileName) profileName = resolveProfileName(userData);
          } catch {}
        }

        persistIdentity({ name: profileName, email: profileEmail });
        nextProfile = {
          ...nextProfile,
          name: profileName || nextProfile.name,
          email: profileEmail || nextProfile.email,
        };
        setProfile(nextProfile);
        setHasServerProfile(true);
      } catch {
        const fallbackName =
          sessionStorage.getItem("username") || localStorage.getItem("username") || "";
        const fallbackEmail =
          sessionStorage.getItem("email") || localStorage.getItem("email") || "";
        if (fallbackName || fallbackEmail) {
          setProfile({
            name: fallbackName || "Traveler",
            email: fallbackEmail,
            loggedIn: true,
            history: [],
          });
        } else {
          setProfile(null);
        }
        setHasServerProfile(false);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const profileEmail = resolveProfileEmail(profile);
  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || "").trim());
  const sessionEmail = sessionStorage.getItem("email");
  const sessionUsername = sessionStorage.getItem("username");
  const localEmail = localStorage.getItem("email");
  const localUsername = localStorage.getItem("username");
  const hasSessionIdentity = Boolean((sessionEmail || "").trim() || (sessionUsername || "").trim());
  const fallbackEmailFromUsername = [sessionUsername, localUsername, resolveProfileName(profile)]
    .find((v) => isValidEmail(v));
  const emailCandidates = [
    profileEmail,
    profile?.email,
    profile?.userEmail,
    profile?.mail,
    profile?.user?.email,
    profile?.principal?.email,
    profile?.attributes?.email,
    profile?.attributes?.mail,
    sessionEmail,
    sessionUsername,
    fallbackEmailFromUsername,
    localEmail,
    localUsername,
  ]
    .map((value) => (value || "").toString().trim().toLowerCase())
    .filter(Boolean);
  const currentEmail = emailCandidates.find((value) => isValidEmail(value)) || "";
  const displayName = resolveProfileName(profile) || sessionStorage.getItem("username") || "Traveler";
  const displayEmail =
    currentEmail ||
    profileEmail ||
    sessionStorage.getItem("email") ||
    localStorage.getItem("email") ||
    fallbackEmailFromUsername ||
    "";
  const normalizeEmail = (value) => (value || "").toString().trim().toLowerCase();
  const normalizeIdentity = (value) => (value || "").toString().trim().toLowerCase();
  const identityMatches = (left, right) => {
    const a = normalizeIdentity(left);
    const b = normalizeIdentity(right);
    return Boolean(a && b && a === b);
  };
  const normalizeRequest = (req) => ({
    ...req,
    id: req?.id != null ? String(req.id) : "",
    hostEmail: req?.hostEmail || req?.email || req?.toEmail || "",
    requesterEmail: req?.requesterEmail || "",
    status: (req?.status || "PENDING").toString().toUpperCase(),
  });
  const normalizeText = (value) => (value || "").toString().trim().toLowerCase();
  const normalizeDateKey = (value) => {
    const raw = (value || "").toString().trim();
    if (!raw) return "";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toISOString().slice(0, 10);
  };
  const isAcceptedStatus = (value) => {
    const s = (value || "").toString().trim().toUpperCase();
    return ["ACCEPTED", "APPROVED", "CONFIRMED"].includes(s);
  };
  const isNonRejectedStatus = (value) => {
    const s = (value || "").toString().trim().toUpperCase();
    return s !== "REJECTED" && s !== "DECLINED";
  };
  const formatMemberLabel = (member) => {
    const name = (member?.name || "").toString().trim();
    const emailRaw = (member?.email || "").toString().trim();
    const primary = name || emailRaw || "Trip Member";
    // If email is missing, not valid, or identical to name, just show the primary text.
    if (!emailRaw || !isValidEmail(emailRaw) || normalizeText(primary) === normalizeText(emailRaw)) {
      return primary;
    }
    return `${primary} (${emailRaw})`;
  };
  const parseAmount = (value) => {
    if (value == null) return 0;
    const num = Number(String(value).replace(/[^0-9.]/g, ""));
    return Number.isFinite(num) ? num : 0;
  };
  const getBalanceLabel = (value) => {
    const n = Number(value) || 0;
    if (n > 0) return `Will receive Rs.${Math.abs(n)}`;
    if (n < 0) return `Will pay Rs.${Math.abs(n)}`;
    return "Settled up";
  };
  const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  const mergeUniqueMembers = (members) => {
    const byEmail = new Map();
    (Array.isArray(members) ? members : []).forEach((m) => {
      const email = normalizeEmail(m?.email);
      if (!email) return;
      const name = (m?.name || "").toString().trim() || "Trip Member";
      if (!byEmail.has(email)) {
        byEmail.set(email, { name, email });
      } else {
        const existing = byEmail.get(email);
        if ((!existing.name || existing.name === "Trip Member") && name !== "Trip Member") {
          byEmail.set(email, { name, email });
        }
      }
    });
    return [...byEmail.values()];
  };
  const ensureBookingComputedSplit = (data) => {
    if (!data || typeof data !== "object") return { members: [], expenses: [], balances: [], settlements: [], totalExpenses: 0 };
    const hasComputed =
      Array.isArray(data.balances) &&
      Array.isArray(data.settlements) &&
      Number.isFinite(Number(data.totalExpenses));
    if (hasComputed) return data;
    return recomputeBookingSplit(data.members || [], data.expenses || []);
  };

  const looksLikeCollabPost = (item) => {
    // Published open-trip cards sometimes come back via bookings API; exclude them from real bookings.
    const seats = Number(item?.seatsAvailable);
    const isOpenTrip = item?.openTrip === true || seats > 0 || Boolean(item?.note);
    const hasBookingDate = Boolean(item?.bookingDate);
    const status = (item?.status || "").toString().trim().toUpperCase();
    const bookingStatuses = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"];
    const hasBookingSignal = hasBookingDate || bookingStatuses.includes(status);
    return isOpenTrip && !hasBookingSignal;
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BOOKING_SPLIT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        const rawData = parsed.data && typeof parsed.data === "object" ? parsed.data : {};
        const computedData = Object.fromEntries(
          Object.entries(rawData).map(([k, v]) => [k, ensureBookingComputedSplit(v)])
        );
        setBookingSplitDataByBooking(computedData);
        setBookingSplitFormByBooking(parsed.form && typeof parsed.form === "object" ? parsed.form : {});
      }
    } catch {}
  }, []);

  const syncBookingSplitToServer = async (
    booking,
    dataByBooking = bookingSplitDataByBooking,
    formByBooking = bookingSplitFormByBooking
  ) => {
    const key = bookingSplitKey(booking);
    // For collaboration trips, store under host so all participants read the same record.
    const hostOwner = normalizeIdentity(booking?._ownerEmail || booking?.username);
    const viewerOwner = normalizeIdentity(currentEmail || displayEmail || displayName || "local-user");
    const ownerId = hostOwner || viewerOwner;
    if (!key || !ownerId) return;
    try {
      await axios.post(
        `${API_BASE}/open-trip-splits`,
        {
          ownerId,
          postKey: `booking-${key}`,
          data: dataByBooking[key] || {},
          form: formByBooking[key] || {},
          memberForm: {},
        },
        { withCredentials: true }
      );
    } catch (err) {
      console.warn("Failed to sync booking split to backend", err?.message || err);
    }
  };

  useEffect(() => {
    const ownerId = normalizeIdentity(currentEmail || displayEmail || displayName || "local-user");
    if (!ownerId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await axios.get(`${API_BASE}/open-trip-splits`, {
          params: { ownerId },
          withCredentials: true,
        });
        const entries = Array.isArray(res?.data?.entries) ? res.data.entries : [];
        if (cancelled || entries.length === 0) return;
        const nextData = { ...bookingSplitDataByBooking };
        const nextForm = { ...bookingSplitFormByBooking };
        entries.forEach((entry) => {
          if (!entry?.postKey || !entry.postKey.startsWith("booking-")) return;
          const key = entry.postKey.replace(/^booking-/, "");
          nextData[key] = ensureBookingComputedSplit(entry.data || {});
          nextForm[key] = entry.form || {};
        });
        setBookingSplitDataByBooking(nextData);
        setBookingSplitFormByBooking(nextForm);
        localStorage.setItem(BOOKING_SPLIT_KEY, JSON.stringify({ data: nextData, form: nextForm }));
      } catch (err) {
        console.warn("Booking split backend load failed; staying local", err?.message || err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [currentEmail, displayEmail, displayName]);

  // Preload split data for collaboration bookings so expense history survives refresh without manual toggling.
  const bookingsCount = bookings ? bookings.length : 0;
  const collabCount = collaborationTrips ? collaborationTrips.length : 0;
  useEffect(() => {
    if (!bookings || bookings.length === 0) return;
    const preload = async () => {
      await Promise.all(
        bookings.map(async (b) => {
          const key = bookingSplitKey(b);
          if (bookingSplitDataByBooking[key]?.expenses?.length) return;
          try {
            await loadBookingSplitFromTrip(b);
          } catch (err) {
            console.warn("Preload split failed", err?.message || err);
          }
        })
      );
    };
    preload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingsCount, collabCount]);

  // After bookings load, also fetch open-trip-splits for each booking owner so shared expenses appear for all.
  useEffect(() => {
    if (!bookings || bookings.length === 0) return;
    const uniqueOwners = [
      ...new Set(
        bookings
          .map((b) => normalizeIdentity(b?._ownerEmail || b?.username || ""))
          .filter(Boolean)
      ),
    ];
    if (uniqueOwners.length === 0) return;

    const mergeEntries = (entries) => {
      const nextData = { ...bookingSplitDataByBooking };
      const nextForm = { ...bookingSplitFormByBooking };
      entries.forEach((entry) => {
        if (!entry?.postKey || !entry.postKey.startsWith("booking-")) return;
        const key = entry.postKey.replace(/^booking-/, "");
        nextData[key] = ensureBookingComputedSplit(entry.data || {});
        nextForm[key] = entry.form || {};
      });
      setBookingSplitDataByBooking(nextData);
      setBookingSplitFormByBooking(nextForm);
      try {
        localStorage.setItem(BOOKING_SPLIT_KEY, JSON.stringify({ data: nextData, form: nextForm }));
      } catch {}
    };

    const fetchAll = async () => {
      for (const ownerId of uniqueOwners) {
        try {
          const res = await axios.get(`${API_BASE}/open-trip-splits`, {
            params: { ownerId },
            withCredentials: true,
          });
          const entries = Array.isArray(res?.data?.entries) ? res.data.entries : [];
          if (entries.length > 0) mergeEntries(entries);
        } catch (err) {
          console.warn("owner split fetch failed", ownerId, err?.message || err);
        }
      }
    };
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingsCount]);

  useEffect(() => {
    try {
      localStorage.setItem(
        BOOKING_SPLIT_KEY,
        JSON.stringify({
          data: bookingSplitDataByBooking,
          form: bookingSplitFormByBooking,
        })
      );
    } catch {}
  }, [bookingSplitDataByBooking, bookingSplitFormByBooking]);

  const recomputeBookingSplit = (members, expenses) => {
    const normalizedMembers = (Array.isArray(members) ? members : [])
      .map((m) => ({
        name: (m?.name || "Trip Member").toString().trim() || "Trip Member",
        email: normalizeEmail(m?.email),
      }))
      .filter((m) => m.email);
    const memberEmails = normalizedMembers.map((m) => m.email);
    const nameByEmail = normalizedMembers.reduce((acc, m) => {
      acc[m.email] = m.name;
      return acc;
    }, {});

    const ledger = {};
    memberEmails.forEach((email) => {
      ledger[email] = 0;
    });

    let totalExpenses = 0;
    (Array.isArray(expenses) ? expenses : []).forEach((exp) => {
      const amount = parseAmount(exp?.amount);
      if (amount <= 0) return;
      totalExpenses += amount;
      const payer = normalizeEmail(exp?.paidByEmail);
      if (payer) {
        if (ledger[payer] == null) ledger[payer] = 0;
        ledger[payer] += amount;
      }

      const splitBetween = (Array.isArray(exp?.splitBetweenEmails) ? exp.splitBetweenEmails : memberEmails)
        .map((x) => normalizeEmail(x))
        .filter(Boolean);
      if (splitBetween.length === 0) return;

      const allocations = exp?.allocations && typeof exp.allocations === "object" ? exp.allocations : {};
      const splitType = (exp?.splitType || "").toString().toUpperCase() === "CUSTOM" ? "CUSTOM" : "EQUAL";

      if (splitType === "CUSTOM") {
        const totalAlloc = splitBetween.reduce((sum, email) => {
          const a = Number(allocations[email]);
          return sum + (Number.isFinite(a) && a > 0 ? a : 0);
        }, 0);
        splitBetween.forEach((email) => {
          const a = Number(allocations[email]);
          const alloc = Number.isFinite(a) && a > 0 ? a : 0;
          const share = totalAlloc > 0 ? (amount * alloc) / totalAlloc : amount / splitBetween.length;
          if (ledger[email] == null) ledger[email] = 0;
          ledger[email] -= share;
        });
      } else {
        const share = amount / splitBetween.length;
        splitBetween.forEach((email) => {
          if (ledger[email] == null) ledger[email] = 0;
          ledger[email] -= share;
        });
      }
    });

    const balances = Object.entries(ledger).map(([email, bal]) => ({
      email,
      name: nameByEmail[email] || email,
      balance: round2(bal),
    }));

    const creditors = [];
    const debtors = [];
    balances.forEach((b) => {
      const cents = Math.round(b.balance * 100);
      if (cents > 0) creditors.push({ email: b.email, cents });
      if (cents < 0) debtors.push({ email: b.email, cents: -cents });
    });

    const settlements = [];
    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const pay = Math.min(debtors[i].cents, creditors[j].cents);
      if (pay > 0) {
        settlements.push({
          fromEmail: debtors[i].email,
          fromName: nameByEmail[debtors[i].email] || debtors[i].email,
          toEmail: creditors[j].email,
          toName: nameByEmail[creditors[j].email] || creditors[j].email,
          amount: round2(pay / 100),
        });
      }
      debtors[i].cents -= pay;
      creditors[j].cents -= pay;
      if (debtors[i].cents === 0) i += 1;
      if (creditors[j].cents === 0) j += 1;
    }

    return {
      members: normalizedMembers,
      expenses: Array.isArray(expenses) ? expenses : [],
      balances,
      settlements,
      totalExpenses: round2(totalExpenses),
    };
  };

  const ensureBookingSplitInitialized = (booking) => {
    const bookingId = bookingSplitKey(booking);
    if (bookingSplitDataByBooking[bookingId]) return bookingId;
    const defaultEmail = normalizeEmail(currentEmail) || "me@tripweaver.local";
    const defaultMembers = [
      {
        name: displayName || "You",
        email: defaultEmail,
      },
    ];
      const initial = recomputeBookingSplit(defaultMembers, []);
      setBookingSplitDataByBooking((prev) => ({
        ...prev,
        [bookingId]: initial,
      }));
      setBookingSplitFormByBooking((prev) => ({
        ...prev,
        [bookingId]: {
          description: "",
          amount: "",
          paidByEmail: defaultEmail,
          paidByName: displayName || "You",
          splitBetweenEmails: defaultMembers.map((m) => m.email),
          splitType: "EQUAL",
          allocations: defaultMembers.reduce((acc, m) => {
            acc[m.email] = "";
            return acc;
          }, {}),
        },
      }));
    return bookingId;
  };

  const setBookingSplitFormField = (bookingId, field, value) => {
    setBookingSplitFormByBooking((prev) => ({
      ...prev,
      [bookingId]: { ...(prev[bookingId] || {}), [field]: value },
    }));
  };

  const setBookingSplitAllocation = (bookingId, memberEmail, amount) => {
    const email = normalizeEmail(memberEmail);
    setBookingSplitFormByBooking((prev) => {
      const current = prev[bookingId] || {};
      const allocations = { ...(current.allocations || {}) };
      const num = Number(amount);
      allocations[email] = Number.isFinite(num) && num >= 0 ? num : 0;
      return { ...prev, [bookingId]: { ...current, allocations } };
    });
  };

  const toggleBookingSplitMember = (bookingId, memberEmail) => {
    const email = normalizeEmail(memberEmail);
    setBookingSplitFormByBooking((prev) => {
      const current = prev[bookingId] || {};
      const currentList = Array.isArray(current.splitBetweenEmails) ? current.splitBetweenEmails : [];
      const exists = currentList.includes(email);
      const next = exists ? currentList.filter((x) => x !== email) : [...currentList, email];
      return {
        ...prev,
        [bookingId]: { ...current, splitBetweenEmails: next },
      };
    });
  };

  const findBookingById = (id) =>
    (bookings || []).find((b) => {
      const bid = bookingSplitKey(b);
      return String(bid) === String(id);
    });

  const handleAddBookingExpense = async (bookingId) => {
    const data = bookingSplitDataByBooking[bookingId] || { members: [], expenses: [] };
    const form = bookingSplitFormByBooking[bookingId] || {};
    const description = (form.description || "").toString().trim();
    const amount = parseAmount(form.amount);
    const paidByEmail = normalizeEmail(form.paidByEmail);
    const splitBetweenEmails = (Array.isArray(form.splitBetweenEmails) ? form.splitBetweenEmails : [])
      .map((x) => normalizeEmail(x))
      .filter(Boolean);
    const splitType = (form.splitType || "").toString().toUpperCase() === "CUSTOM" ? "CUSTOM" : "EQUAL";
    const allocations = form.allocations && typeof form.allocations === "object" ? form.allocations : {};

    if (!description) {
      showToast("Enter an expense description.", "warning");
      return;
    }
    if (amount <= 0) {
      showToast("Enter a valid amount.", "warning");
      return;
    }
    if (!paidByEmail) {
      showToast("Choose who paid.", "warning");
      return;
    }
    if (splitBetweenEmails.length === 0) {
      showToast("Select at least one member to split.", "warning");
      return;
    }

    const booking = findBookingById(bookingId);
    const linkedTripId = booking ? findLinkedTripIdForBooking(booking) : null;
    const payerMember = (data.members || []).find((m) => normalizeEmail(m.email) === paidByEmail);
    const paidByName = payerMember?.name || displayName || "Trip Member";
    const addExpenseLocally = () => {
      const expense = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        description,
        amount: round2(amount),
        paidByEmail,
        paidByName,
        splitBetweenEmails,
        splitType,
        allocations,
        createdAt: new Date().toISOString(),
      };
      const nextExpenses = [expense, ...(data.expenses || [])];
      const nextData = recomputeBookingSplit(data.members || [], nextExpenses);
      const nextDataByBooking = { ...bookingSplitDataByBooking, [bookingId]: nextData };
      const nextFormByBooking = {
        ...bookingSplitFormByBooking,
        [bookingId]: { ...(bookingSplitFormByBooking[bookingId] || {}), description: "", amount: "" },
      };
      setBookingSplitDataByBooking(nextDataByBooking);
      setBookingSplitFormByBooking(nextFormByBooking);
      persistBookingSplit(nextDataByBooking, nextFormByBooking);
      syncBookingSplitToServer(booking, nextDataByBooking, nextFormByBooking);
      showToast("Expense saved", "success");
    };

    if (linkedTripId) {
      try {
        await axios.post(
          `${API_BASE}/collaboration-trips/${linkedTripId}/expenses`,
          {
            description,
            amount: round2(amount),
            paidByEmail,
            paidByName,
            splitBetweenEmails,
            splitType,
            allocations,
          },
          { withCredentials: true }
        );
        await loadBookingSplitFromTrip(booking);
        setBookingSplitFormByBooking((prev) => ({
          ...prev,
          [bookingId]: {
            ...(prev[bookingId] || {}),
            description: "",
            amount: "",
            paidByEmail,
            paidByName,
          },
        }));
        return;
      } catch (err) {
        addExpenseLocally();
        console.warn(err?.response?.data?.message || "Backend rejected expense. Saved locally instead.");
        return;
      }
    }

    addExpenseLocally();
  };

  const handleSaveBookingSplit = async (booking) => {
    const bookingId = bookingSplitKey(booking);
    const data = bookingSplitDataByBooking[bookingId];
    const form = bookingSplitFormByBooking[bookingId];
    if (!data) {
      showToast("No split data to save for this booking yet.", "warning");
      return;
    }
    // If the user filled the form but didn't click "Add Expense", capture it now so it persists.
    const pendingAmount = parseAmount(form?.amount);
    const pendingDesc = (form?.description || "").toString().trim();
    if (pendingAmount > 0 && pendingDesc) {
      await handleAddBookingExpense(bookingId);
      return;
    }
    const dataByBooking = { ...bookingSplitDataByBooking, [bookingId]: data };
    const formByBooking = { ...bookingSplitFormByBooking, [bookingId]: form || {} };
    persistBookingSplit(dataByBooking, formByBooking);
    syncBookingSplitToServer(booking, dataByBooking, formByBooking);
      showToast("Booking split saved", "success");
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
    const hostCandidates = [
      booking?._ownerEmail,
      booking?.username,
      booking?.hostName,
      currentEmail,
      displayEmail,
      profileEmail,
      sessionEmail,
      localEmail,
    ]
      .map((x) => normalizeIdentity(x))
      .filter(Boolean);
    const destination = normalizeText(booking?.destination);
    const startDate = normalizeDateKey(booking?.startDate);
    const endDate = normalizeDateKey(booking?.endDate);
    const linkedTripId = findLinkedTripIdForBooking(booking);
    if (hostCandidates.length === 0 || !destination || !startDate || !endDate) return [];

    return (requestActivity || []).filter((req) =>
      (req?.status || "").toString().trim().toUpperCase() === "ACCEPTED" &&
      (
        (linkedTripId && String(req?.postId || "") === String(linkedTripId)) ||
        (
          hostCandidates.includes(normalizeIdentity(req?.hostEmail || req?.email || req?.toEmail || req?.hostName)) &&
          normalizeText(req?.destination) === destination &&
          normalizeDateKey(req?.startDate) === startDate &&
          normalizeDateKey(req?.endDate) === endDate
        )
      )
    );
  };

  const getJoinedTravelerNamesForBooking = (booking) => {
    const accepted = getAcceptedTripRequestsForBooking(booking);
    return [...new Set(
      accepted
        .map((req) => (req?.requesterName || req?.requesterEmail || "").toString().trim())
        .filter(Boolean)
    )];
  };

  const getTripMembersForBooking = (booking, extraMembers = []) => {
    const hostRaw = booking?._ownerEmail || booking?.username;
    const hostEmail = normalizeEmail(hostRaw) || (hostRaw || "").toString().trim().toLowerCase();
    const hostName = (booking?.hostName || booking?.username || booking?._ownerEmail || "Trip Host").toString().trim();
    const accepted = getAcceptedTripRequestsForBooking(booking);
    const requesterMembers = accepted.map((req) => {
      const rawEmail = (req?.requesterEmail || req?.email || req?.toEmail || req?.requesterName || "").toString().trim();
      const normalized = normalizeEmail(rawEmail);
      const safeEmail =
        normalized ||
        rawEmail.toLowerCase() ||
        `guest-${req?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`}`;
      return {
        name: (req?.requesterName || rawEmail || "Trip Member").toString().trim() || "Trip Member",
        email: safeEmail,
      };
    });
    const base = hostEmail ? [{ name: hostName || "Trip Host", email: hostEmail }] : [];
    return mergeUniqueMembers([...base, ...requesterMembers, ...(Array.isArray(extraMembers) ? extraMembers : [])]);
  };

  const isCollabBooking = (booking) => {
    const accepted = getAcceptedTripRequestsForBooking(booking);
    return Boolean(
      (accepted && accepted.length > 0) ||
      booking?._shared ||
      booking?._fromAcceptedRequest ||
      findLinkedTripIdForBooking(booking)
    );
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

  const loadBookingSplitFromTrip = async (booking) => {
    const bookingId = bookingSplitKey(booking);
      const tripId = findLinkedTripIdForBooking(booking);
    const ownerId = normalizeIdentity(currentEmail || displayEmail || displayName || "local-user");
    // When there is no collaboration trip, bootstrap from local members and persist to backend for future visits
    if (!tripId) {
      const memberList = getTripMembersForBooking(booking);
      if (memberList.length > 0) {
        const initialData = recomputeBookingSplit(memberList, []);
        const initialForm = {
          description: "",
          amount: "",
          paidByEmail: memberList[0]?.email || normalizeEmail(currentEmail) || "",
          paidByName: memberList[0]?.name || displayName || "You",
          splitBetweenEmails: memberList.map((m) => m.email),
          splitType: "EQUAL",
          allocations: memberList.reduce((acc, m) => {
            acc[m.email] = "";
            return acc;
          }, {}),
        };
        const nextDataByBooking = { ...bookingSplitDataByBooking, [bookingId]: initialData };
        const nextFormByBooking = { ...bookingSplitFormByBooking, [bookingId]: initialForm };
        setBookingSplitDataByBooking(nextDataByBooking);
        setBookingSplitFormByBooking(nextFormByBooking);
        persistBookingSplit(nextDataByBooking, nextFormByBooking);
        syncBookingSplitToServer(booking, nextDataByBooking, nextFormByBooking);
      } else {
        ensureBookingSplitInitialized(booking);
      }
      return;
    }

    try {
      const [membersRes, expensesRes, settlementsRes] = await Promise.all([
        axios.get(`${API_BASE}/collaboration-trips/${tripId}/members`, { withCredentials: true }),
        axios.get(`${API_BASE}/collaboration-trips/${tripId}/expenses`, { withCredentials: true }),
        axios.get(`${API_BASE}/collaboration-trips/${tripId}/settlements`, { withCredentials: true }),
      ]);
      const apiMembers = (Array.isArray(membersRes?.data) ? membersRes.data : [])
        .map((m) => ({ name: m?.name || "Trip Member", email: normalizeEmail(m?.email) }))
        .filter((m) => m.email);
      const members = getTripMembersForBooking(booking, apiMembers);
      const apiExpenses = (Array.isArray(expensesRes?.data) ? expensesRes.data : []).map((e) => ({
        id: e?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        description: e?.description || "Trip expense",
        amount: round2(parseAmount(e?.amount)),
        paidByEmail: normalizeEmail(e?.paidByEmail),
        paidByName: e?.paidByName || "Trip Member",
        splitBetweenEmails: Array.isArray(e?.splitBetweenEmails)
          ? e.splitBetweenEmails.map((x) => normalizeEmail(x)).filter(Boolean)
          : [],
        splitType: (e?.splitType || "EQUAL").toString().toUpperCase(),
        allocations:
          e?.allocations && typeof e.allocations === "object" ? e.allocations : {},
        createdAt: e?.createdAt || new Date().toISOString(),
      }));
      const localSaved = bookingSplitDataByBooking[bookingId] || { expenses: [] };
      // merge: prefer API fields but keep local allocations/splitType if API lacks
      const mergedExpensesMap = new Map();
      (localSaved.expenses || []).forEach((exp) => {
        mergedExpensesMap.set(String(exp.id), exp);
      });
      apiExpenses.forEach((exp) => {
        const existing = mergedExpensesMap.get(String(exp.id));
        if (existing) {
          mergedExpensesMap.set(String(exp.id), {
            ...existing,
            ...exp,
            allocations:
              Object.keys(exp.allocations || {}).length > 0
                ? exp.allocations
                : existing.allocations || {},
            splitType: exp.splitType || existing.splitType || "EQUAL",
          });
        } else {
          mergedExpensesMap.set(String(exp.id), exp);
        }
      });
      // If API returned no expenses yet, try to recover from local or generic open-trip-splits store
      if (apiExpenses.length === 0 && mergedExpensesMap.size === 0) {
        if (Array.isArray(localSaved.expenses)) {
          localSaved.expenses.forEach((exp) => mergedExpensesMap.set(String(exp.id), exp));
        } else {
          const ownerIdsToTry = [
            normalizeIdentity(booking?._ownerEmail || booking?.username),
            ownerId,
          ].filter(Boolean);
          for (const oid of ownerIdsToTry) {
            try {
              const splitsRes = await axios.get(`${API_BASE}/open-trip-splits`, {
                params: { ownerId: oid },
                withCredentials: true,
              });
              const entries = Array.isArray(splitsRes?.data?.entries) ? splitsRes.data.entries : [];
              const match = entries.find((e) => e?.postKey === `booking-${bookingId}`);
              if (match?.data?.expenses && Array.isArray(match.data.expenses)) {
                match.data.expenses.forEach((exp) => {
                  const id = String(exp.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
                  mergedExpensesMap.set(id, {
                    ...exp,
                    id,
                    amount: round2(parseAmount(exp.amount)),
                    paidByEmail: normalizeEmail(exp.paidByEmail),
                    splitBetweenEmails: Array.isArray(exp.splitBetweenEmails)
                      ? exp.splitBetweenEmails.map((x) => normalizeEmail(x)).filter(Boolean)
                      : [],
                    splitType: (exp.splitType || "EQUAL").toString().toUpperCase(),
                    allocations:
                      exp.allocations && typeof exp.allocations === "object" ? exp.allocations : {},
                    createdAt: exp.createdAt || new Date().toISOString(),
                  });
                });
                break;
              }
            } catch {
              // ignore; try next ownerId
            }
          }
        }
      }
      const expenses = [...mergedExpensesMap.values()];
      const settlements = settlementsRes?.data || {};
      const recomputed = recomputeBookingSplit(members, expenses);
      const merged = {
        members,
        apiMemberEmails: apiMembers.map((m) => normalizeEmail(m.email)).filter(Boolean),
        expenses,
        // Prefer API settlements/balances when present; otherwise fall back to fresh computation so values aren't zeroed after refresh.
        balances: Array.isArray(settlements?.balances) && settlements.balances.length > 0
          ? settlements.balances
          : recomputed.balances,
        settlements: Array.isArray(settlements?.settlements) && settlements.settlements.length > 0
          ? settlements.settlements
          : recomputed.settlements,
        totalExpenses: Number.isFinite(parseAmount(settlements?.totalExpenses)) && parseAmount(settlements?.totalExpenses) > 0
          ? round2(parseAmount(settlements?.totalExpenses))
          : recomputed.totalExpenses,
      };
      const hydratedForm = {
        description: "",
        amount: "",
        paidByEmail: members[0]?.email || normalizeEmail(currentEmail) || "",
        paidByName: members[0]?.name || displayName || "You",
        splitBetweenEmails: members.map((m) => m.email),
      };
      if (!Array.isArray(hydratedForm.splitBetweenEmails) || hydratedForm.splitBetweenEmails.length === 0) {
        hydratedForm.splitBetweenEmails = members.map((m) => m.email);
      }
      const nextDataByBooking = { ...bookingSplitDataByBooking, [bookingId]: merged };
      const nextFormByBooking = { ...bookingSplitFormByBooking, [bookingId]: hydratedForm };
      setBookingSplitDataByBooking(nextDataByBooking);
      setBookingSplitFormByBooking(nextFormByBooking);
      persistBookingSplit(nextDataByBooking, nextFormByBooking);
      // Also mirror the latest collaborative expenses into the generic splits store so they survive refreshes
      syncBookingSplitToServer(booking, nextDataByBooking, nextFormByBooking);
    } catch {
      // If trip API fails (CORS/offline), fall back to previously saved local data instead of wiping to zero
      const fallbackData = bookingSplitDataByBooking[bookingId];
      const fallbackForm = bookingSplitFormByBooking[bookingId];
      if (fallbackData) {
        const safeData = ensureBookingComputedSplit(fallbackData);
        const nextDataByBooking = { ...bookingSplitDataByBooking, [bookingId]: safeData };
        const nextFormByBooking = { ...bookingSplitFormByBooking, [bookingId]: fallbackForm || {} };
        setBookingSplitDataByBooking(nextDataByBooking);
        setBookingSplitFormByBooking(nextFormByBooking);
        persistBookingSplit(nextDataByBooking, nextFormByBooking);
      } else {
        ensureBookingSplitInitialized(booking);
      }
    }
  };

  const handleSettleUp = (bookingId) => {
    const data = bookingSplitDataByBooking[bookingId] || {};
    const settlements = data.settlements || [];
    if (settlements.length === 0) {
      showToast("Nothing to settle for this booking.", "info");
      return;
    }
    showToast("Use the settlement list to transfer amounts and mark as settled.", "success");
  };


  const handleToggleBookingSplit = async (booking) => {
    const bookingId = bookingSplitKey(booking);
    const nextOpen = !splitOpenByBooking[bookingId];
    if (nextOpen && !bookingSplitDataByBooking[bookingId]) {
      await loadBookingSplitFromTrip(booking);
    }
    setSplitOpenByBooking((prev) => ({ ...prev, [bookingId]: nextOpen }));
  };

  const isPendingStatus = (status) => {
    const normalized = (status || "").toString().trim().toUpperCase();
    return normalized === "PENDING" || normalized === "REQUESTED";
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

  const refreshCollaborationState = useCallback(() => {
    const load = async () => {
      let effectiveEmail = currentEmail;
      if (!effectiveEmail) {
        try {
          const statusRes = await axios.get(`${API_BASE}/profile/status`, { withCredentials: true });
          const statusData = statusRes?.data || {};
          const recoveredEmail = resolveProfileEmail(statusData);
          const recoveredName = resolveProfileName(statusData) || displayName;
          if (recoveredEmail) {
            effectiveEmail = recoveredEmail;
            persistIdentity({ name: recoveredName, email: recoveredEmail });
            setProfile((prev) => ({ ...(prev || {}), email: recoveredEmail, name: recoveredName }));
          }
        } catch {}
      }

      const viewerIdentity = normalizeIdentity(effectiveEmail || displayName || sessionUsername || localUsername);
      const effectiveIdentity = (effectiveEmail || displayName || sessionUsername || localUsername || "").toString().trim();
      const identityCandidates = [
        effectiveEmail,
        profileEmail,
        displayEmail,
        displayName,
        sessionEmail,
        sessionUsername,
        localEmail,
        localUsername,
      ]
        .map((x) => (x || "").toString().trim())
        .filter(Boolean);
      const uniqueIdentityCandidates = [...new Set(identityCandidates)];

      const localHostRequests = uniqueIdentityCandidates
        .flatMap((id) => getJoinRequestsForHost(id).map(normalizeRequest))
        .filter(Boolean);
      const localRequesterRequests = uniqueIdentityCandidates
        .flatMap((id) => getJoinRequestsForRequester(id).map(normalizeRequest))
        .filter(Boolean);

      let remoteHostRequests = [];
      let remoteRequesterRequests = [];
      let remoteLoaded = false;
      const identitiesToQuery =
        uniqueIdentityCandidates.length > 0
          ? uniqueIdentityCandidates
          : (effectiveIdentity ? [effectiveIdentity] : []);
      for (const id of identitiesToQuery) {
        if (!id) continue;
        try {
          const [hostRes, requesterRes] = await Promise.all([
            axios.get(`${API_BASE}/collaboration-trips/join-requests/host`, {
              params: { email: id },
              withCredentials: true,
            }),
            axios.get(`${API_BASE}/collaboration-trips/join-requests/requester`, {
              params: { email: id },
              withCredentials: true,
            }),
          ]);
          remoteHostRequests.push(
            ...(Array.isArray(hostRes?.data) ? hostRes.data : []).map(normalizeRequest)
          );
          remoteRequesterRequests.push(
            ...(Array.isArray(requesterRes?.data) ? requesterRes.data : []).map(normalizeRequest)
          );
          remoteLoaded = remoteLoaded || (hostRes?.data?.length > 0 || requesterRes?.data?.length > 0);
        } catch (err) {
          console.warn("join-requests fetch failed for", id, err?.message || err);
        }
      }
      // Fallback: if no remote data returned but we did query, still treat as loaded to avoid ignoring empty responses.
      if (!remoteLoaded && identitiesToQuery.length > 0) {
        remoteLoaded = true;
      }

      const mergedById = new Map();
      const sourceRequests = remoteLoaded
        ? [...remoteHostRequests, ...remoteRequesterRequests]
        : [...localHostRequests, ...localRequesterRequests];
      sourceRequests.forEach((req) => {
        if (!req?.id) return;
        mergedById.set(req.id, req);
      });

      const merged = [...mergedById.values()].sort(
        (a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
      );
      const incomingPending = viewerIdentity
        ? merged.filter((req) => isPendingStatus(req.status) && isReceivedRequest(req))
        : [];
      setJoinRequests(incomingPending);
      setRequestActivity(merged);

      let tripsList = [];
      try {
        const tripsRes = await axios.get(`${API_BASE}/collaboration-trips`, { withCredentials: true });
        tripsList = Array.isArray(tripsRes?.data) ? tripsRes.data : [];
        setCollaborationTrips(tripsList);
      } catch {
        setCollaborationTrips([]);
      }

      try {
        const bookingLists = await Promise.all(
          uniqueIdentityCandidates.map(async (candidate) => {
            try {
              const r = await axios.get(`${API_BASE}/bookings/my-bookings`, {
                params: { username: candidate },
                withCredentials: true,
              });
              return Array.isArray(r?.data) ? r.data : [];
            } catch {
              return [];
            }
          })
        );
        const myBookingsRaw = bookingLists.flat().filter((b) => !looksLikeCollabPost(b));
        const myBookings = myBookingsRaw.map((b) => ({
          ...b,
          _ownerEmail: normalizeEmail(b?.username || effectiveEmail || displayEmail),
          _shared: false,
        }));

        const acceptedAsRequester = merged.filter((req) => {
          const isAccepted = isAcceptedStatus(req?.status) || isNonRejectedStatus(req?.status);
          const requestedByViewer =
            identityMatches(req?.requesterEmail, effectiveEmail || viewerIdentity) ||
            identityMatches(req?.requesterName, displayName || viewerIdentity);
          return isAccepted && requestedByViewer;
        });

        const sharedTripKeys = acceptedAsRequester.map((req) => ({
          hostEmail: normalizeEmail(req?.hostEmail),
          hostIdentity: normalizeIdentity(req?.hostEmail || req?.email || req?.toEmail || req?.hostName),
          destination: normalizeText(req?.destination),
              startDate: normalizeDateKey(req?.startDate),
              endDate: normalizeDateKey(req?.endDate),
            }));

        const joinedOpenTrips = (tripsList || [])
          .filter((t) => normalizeEmail(t?.hostEmail))
          .filter((t) =>
            sharedTripKeys.some((k) =>
              normalizeEmail(t?.hostEmail) === k.hostEmail &&
              normalizeText(t?.destination) === k.destination &&
              (t?.startDate || "").toString().trim() === k.startDate &&
              (t?.endDate || "").toString().trim() === k.endDate
            )
          )
          .map((t) => ({
            hostEmail: normalizeEmail(t?.hostEmail),
            destination: normalizeText(t?.destination),
            startDate: normalizeDateKey(t?.startDate),
            endDate: normalizeDateKey(t?.endDate),
          }));

        const allSharedKeys = joinedOpenTrips.length > 0 ? joinedOpenTrips : sharedTripKeys;
        const hostEmails = [...new Set(allSharedKeys.map((k) => k.hostEmail).filter(Boolean))];
        const hostIdentities = [...new Set(allSharedKeys.map((k) => k.hostIdentity).filter(Boolean))];

        const sharedHostBookingsLists = await Promise.all(
          (hostEmails.length > 0 ? hostEmails : hostIdentities).map(async (host) => {
            try {
              const hostRes = await axios.get(`${API_BASE}/bookings/my-bookings`, {
                params: { username: host },
                withCredentials: true,
              });
                const list = Array.isArray(hostRes?.data) ? hostRes.data : [];
                return list.filter((b) => !looksLikeCollabPost(b));
            } catch {
              return [];
            }
          })
        );

        const sharedBookings = sharedHostBookingsLists
          .flat()
          .filter((b) => !looksLikeCollabPost(b))
          .filter((b) =>
            allSharedKeys.some((k) =>
              (normalizeEmail(b?.username) === k.hostEmail ||
               normalizeIdentity(b?.username) === k.hostIdentity) &&
              normalizeText(b?.destination) === k.destination &&
              normalizeDateKey(b?.startDate) === k.startDate &&
              normalizeDateKey(b?.endDate) === k.endDate
            )
          )
          .map((b) => ({
            ...b,
            _ownerEmail: normalizeEmail(b?.username),
            _shared: !identityMatches(b?.username, effectiveEmail || viewerIdentity),
          }));

        // Fallback: if we can't fetch host bookings, still show a lightweight shared booking entry for accepted requests
        const syntheticSharedBookings = acceptedAsRequester.map((req) => {
          const matchTrip = (tripsList || []).find(
            (t) =>
              (normalizeEmail(t?.hostEmail) === normalizeEmail(req?.hostEmail) ||
               normalizeIdentity(t?.hostEmail) === normalizeIdentity(req?.hostEmail || req?.hostName)) &&
              normalizeText(t?.destination) === normalizeText(req?.destination) &&
              normalizeDateKey(t?.startDate) === normalizeDateKey(req?.startDate) &&
              normalizeDateKey(t?.endDate) === normalizeDateKey(req?.endDate)
          );
          return {
            id: req?.postId || `${req?.hostEmail || "host"}-${req?.destination}-${req?.startDate}`,
            destination: req?.destination || matchTrip?.destination || "Trip",
            startDate: req?.startDate || matchTrip?.startDate,
            endDate: req?.endDate || matchTrip?.endDate,
            totalCost: matchTrip?.totalCost || matchTrip?.price || 0,
            bookingDate: req?.updatedAt || req?.createdAt || new Date().toISOString(),
            username: req?.hostEmail || matchTrip?.hostEmail || "Trip Host",
            hostName: req?.hostName || matchTrip?.hostName || "Trip Host",
            _ownerEmail: normalizeEmail(req?.hostEmail || matchTrip?.hostEmail),
            _shared: true,
            _fromAcceptedRequest: true,
          };
        });

        const mergedBookingsMap = new Map();
        [...myBookings, ...sharedBookings, ...syntheticSharedBookings].forEach((b) => {
          const key = b?.id != null
            ? `id-${b.id}`
            : `${normalizeEmail(b?.username)}-${normalizeText(b?.destination)}-${(b?.startDate || "").toString().trim()}-${(b?.endDate || "").toString().trim()}-${(b?.bookingDate || "").toString().trim()}`;
          if (!mergedBookingsMap.has(key)) mergedBookingsMap.set(key, b);
        });
        const finalBookings = [...mergedBookingsMap.values()].sort(
          (a, b) => new Date(b.bookingDate || 0) - new Date(a.bookingDate || 0)
        );
        setBookings(finalBookings);
      } catch {
        setBookings([]);
      }
    };

    load();
  }, [
    currentEmail,
    displayName,
    displayEmail,
    profileEmail,
    sessionEmail,
    sessionUsername,
    localEmail,
    localUsername,
    hasSessionIdentity,
  ]);

  useEffect(() => {
    refreshCollaborationState();
    const onStorage = () => refreshCollaborationState();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refreshCollaborationState]);

  useEffect(() => {
    const loadHistory = async () => {
      const profileHistory = Array.isArray(profile?.history) ? profile.history : [];
      if (profileHistory.length > 0) {
        setHistoryItems(profileHistory);
        return;
      }
      const localIdentityExists =
        Boolean((sessionStorage.getItem("username") || localStorage.getItem("username") || "").trim()) ||
        Boolean((sessionStorage.getItem("email") || localStorage.getItem("email") || "").trim());

      if ((hasServerProfile && profile?.loggedIn !== false) || localIdentityExists) {
        try {
          const candidates = [
            currentEmail,
            displayEmail,
            sessionStorage.getItem("email"),
            sessionStorage.getItem("username"),
            localStorage.getItem("email"),
            localStorage.getItem("username"),
          ]
            .map((v) => (v || "").toString().trim())
            .filter(Boolean);
          const uniqueCandidates = [...new Set(candidates)];
          const historyLists = await Promise.all(
            uniqueCandidates.map(async (id) => {
              try {
                const res = await axios.get(`${API_BASE}/search-history`, {
                  withCredentials: true,
                  params: { email: id },
                });
                return Array.isArray(res?.data) ? res.data : [];
              } catch {
                return [];
              }
            })
          );
          let list = historyLists.flat();
          // Fallback: try unfiltered pull once if still empty
          if (list.length === 0) {
            try {
              const historyRes = await axios.get(`${API_BASE}/search-history`, { withCredentials: true });
              list = Array.isArray(historyRes?.data) ? historyRes.data : [];
            } catch {}
          }
          // Deduplicate by timestamp + query/destination
          const seen = new Set();
          const normalized = [];
          list.forEach((item) => {
            const key = `${item.searchedAt || item.timestamp || ""}|${item.query || item.destination || ""}`;
            if (seen.has(key)) return;
            seen.add(key);
            normalized.push(item);
          });
          if (normalized.length > 0) {
            setHistoryItems(normalized);
            try {
              localStorage.setItem("tripweaver_search_history_cache", JSON.stringify(normalized));
            } catch {}
            return;
          }
        } catch {}
      }
      // Last resort: cached local history (if any)
      try {
        const cached = JSON.parse(localStorage.getItem("tripweaver_search_history_cache") || "[]");
        if (Array.isArray(cached) && cached.length > 0) {
          setHistoryItems(cached);
          return;
        }
      } catch {}
      setHistoryItems([]);
    };
    loadHistory();
  }, [profile, hasServerProfile]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncTripChats = async () => {
      const accepted = (requestActivity || [])
        .filter((req) => isAcceptedStatus(req?.status))
        .filter((req) => hasBackendTripChat(req));
      const entries = await Promise.all(
        accepted.map(async (req) => {
          const threadId = getTripChatThreadId(resolveBackendTripChatRequest(req));
          if (!threadId) return null;
          const messages = await getTripChatMessages(threadId);
          return [threadId, messages];
        })
      );
      if (cancelled) return;
      const next = {};
      entries.forEach((entry) => {
        if (!entry) return;
        const [threadId, messages] = entry;
        next[threadId] = messages;
      });
      setTripChatMessagesByThread(next);
    };

    syncTripChats();
    const intervalId = window.setInterval(syncTripChats, 5000);
    window.addEventListener("trip-collaboration-chat-updated", syncTripChats);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("trip-collaboration-chat-updated", syncTripChats);
    };
  }, [requestActivity, collaborationTrips]);

  const handleHistoryClick = (h) => {
    if (h.type === "DESTINATION") {
      navigate(`/search?query=${encodeURIComponent(h.destination || h.query)}`);
    } else if (h.type === "TRIP") {
      navigate("/trips", { state: { restore: h } });
    } else if (h.type === "ITINERARY") {
      navigate("/planner", { state: { restore: h } });
    }
  };

  const handleTripChatInputChange = (threadId, value) => {
    setTripChatInputByThread((prev) => ({ ...prev, [threadId]: value }));
  };

  const toggleTripChat = (requestId) => {
    const nextId = requestId != null ? String(requestId) : "";
    setOpenTripChatRequestId((prev) => (prev === nextId ? "" : nextId));
  };

  const resolveBackendTripChatRequest = (request) => {
    const directTripId = getTripChatTripId(request);
    if (
      directTripId &&
      /^\d+$/.test(String(directTripId)) &&
      (collaborationTrips || []).some((trip) => String(trip?.id) === String(directTripId))
    ) {
      return { ...request, tripId: String(directTripId) };
    }

    const hostIdentity = normalizeIdentity(
      request?.hostEmail || request?.email || request?.toEmail || request?.hostName
    );
    const destination = normalizeText(request?.destination);
    const startDate = normalizeDateKey(request?.startDate);
    const endDate = normalizeDateKey(request?.endDate);

    const matchedTrip = (collaborationTrips || []).find((trip) => {
      const tripHostIdentity = normalizeIdentity(trip?.hostEmail || trip?.hostName);
      return (
        tripHostIdentity === hostIdentity &&
        normalizeText(trip?.destination) === destination &&
        normalizeDateKey(trip?.startDate) === startDate &&
        normalizeDateKey(trip?.endDate) === endDate
      );
    });

    return matchedTrip?.id != null ? { ...request, tripId: String(matchedTrip.id) } : request;
  };

  const hasBackendTripChat = (request) => {
    const resolvedTripId = getTripChatTripId(resolveBackendTripChatRequest(request));
    return Boolean(resolvedTripId && /^\d+$/.test(String(resolvedTripId)));
  };

  const getTripChatSenderIdentity = (request) => {
    const received = isReceivedRequest(request);
    if (received) {
      return {
        senderEmail:
          (request?.hostEmail || request?.email || request?.toEmail || currentEmail || displayEmail || "").toString().trim(),
        senderName:
          (request?.hostName || displayName || "Trip Host").toString().trim() || "Trip Host",
      };
    }
    return {
      senderEmail:
        (request?.requesterEmail || currentEmail || displayEmail || "").toString().trim(),
      senderName:
        (request?.requesterName || displayName || "Trip Member").toString().trim() || "Trip Member",
    };
  };

  const getTripChatViewerIdentity = (request) => {
    const received = isReceivedRequest(request);
    return received
      ? normalizeIdentity(request?.hostEmail || request?.email || request?.toEmail || request?.hostName)
      : normalizeIdentity(request?.requesterEmail || request?.requesterName);
  };

  const getTripChatOtherName = (request) => {
    const received = isReceivedRequest(request);
    return received
      ? (request?.requesterName || request?.requesterEmail || "Trip Member").toString().trim() || "Trip Member"
      : (request?.hostName || request?.hostEmail || "Trip Host").toString().trim() || "Trip Host";
  };

  const handleTripChatSend = async (request) => {
    if (!hasBackendTripChat(request)) {
      showToast("Trip chat is not available for this request yet.", "warning");
      return;
    }
    const threadId = getTripChatThreadId(resolveBackendTripChatRequest(request));
    const text = (tripChatInputByThread[threadId] || "").toString().trim();
    if (!threadId || !text) return;
    const { senderEmail, senderName } = getTripChatSenderIdentity(request);

    const saved = await addTripChatMessage(threadId, {
      text,
      senderName,
      senderEmail,
    });
    if (!saved) {
      showToast("Trip chat could not sync to backend. Please try again.", "error");
      return;
    }

    setTripChatMessagesByThread((prev) => ({
      ...prev,
      [threadId]: [...(prev[threadId] || []), saved],
    }));
    setTripChatInputByThread((prev) => ({ ...prev, [threadId]: "" }));
    showToast("Trip message sent.", "success");
  };

  const handleJoinDecision = async (request, status) => {
    const requestId = request?.id != null ? String(request.id) : "";
    setActionRequestId(requestId);

    let updated = {
      ...request,
      status,
      updatedAt: new Date().toISOString(),
    };

    const hasNumericId = /^\d+$/.test(requestId);
    if (hasNumericId) {
      try {
        const res = await axios.patch(
          `${API_BASE}/collaboration-trips/join-requests/${requestId}/status`,
          null,
          {
            params: { status },
            withCredentials: true,
          }
        );
        if (res?.data) {
          updated = normalizeRequest(res.data);
        }
      } catch (err) {
        console.error("Failed to update request status on server", err);
      }
    }

    const localUpdated = updateJoinRequestStatus(requestId, status);
    if (localUpdated) {
      updated = normalizeRequest(localUpdated);
    }

    if (status === "ACCEPTED") {
      try {
        let seatUpdated = false;
        const canSendAcceptanceEmail = isValidEmail(updated.requesterEmail);
        if (updated.postId) {
          try {
            await axios.post(
              `${API_BASE}/collaboration-trips/${updated.postId}/accept-seat`,
              {},
              { withCredentials: true }
            );
            decrementLocalCollaborationSeat(updated.postId);
            seatUpdated = true;
          } catch (seatErr) {
            // Some requests reference non-collaboration trip ids; don't block acceptance email.
            console.warn("Seat update skipped for this request", seatErr);
          }
        }
        if (canSendAcceptanceEmail) {
          await axios.post(
            `${API_BASE}/collaboration-trips/send-join-accepted-email`,
            {
              toEmail: updated.requesterEmail,
              requesterName: updated.requesterName,
              hostName: updated.hostName,
              destination: updated.destination,
              startDate: updated.startDate,
              endDate: updated.endDate,
            },
            { withCredentials: true }
          );
          showToast(
            seatUpdated ? "Accepted. Seat updated and requester notified." : "Accepted. Requester notified.",
            "success"
          );
        } else {
          if (seatUpdated) {
            showToast("Accepted. Seat updated. Email skipped (no requester email).", "info");
          } else {
            showToast("Accepted. Email skipped (no requester email).", "info");
          }
        }
      } catch (err) {
        console.error("Acceptance email failed", err);
        if (hasNumericId) {
          try {
            await axios.patch(
              `${API_BASE}/collaboration-trips/join-requests/${requestId}/status`,
              null,
              {
                params: { status: "PENDING" },
                withCredentials: true,
              }
            );
          } catch {}
        }
        updateJoinRequestStatus(requestId, "PENDING");
        showToast("Accept failed. Request restored to pending.", "error");
      }
    } else {
      showToast("Request declined.", "info");
    }

    refreshCollaborationState();
    setActionRequestId("");
  };

  if (loading) {
    return (
      <>
        <p style={{ color: "black", textAlign: "center", marginTop: "100px" }}>Loading profile...</p>
        {toast ? (
          <div
            style={{
              position: "fixed",
              right: "16px",
              bottom: "16px",
              minWidth: "240px",
              maxWidth: "340px",
              padding: "12px 14px",
              borderRadius: "10px",
              color: "#fff",
              background:
                toast.type === "success"
                  ? "#16a34a"
                  : toast.type === "error"
                  ? "#dc2626"
                  : toast.type === "warning"
                  ? "#d97706"
                  : "#2563eb",
              boxShadow: "0 12px 30px rgba(15,23,42,0.18)",
              zIndex: 9999,
              fontWeight: 600,
            }}
          >
            {toast.message}
          </div>
        ) : null}
      </>
    );
  }

  const hasLocalIdentity =
    Boolean((sessionStorage.getItem("username") || localStorage.getItem("username") || "").trim()) ||
    Boolean((sessionStorage.getItem("email") || localStorage.getItem("email") || "").trim());

  if ((!profile || profile.loggedIn === false) && !hasLocalIdentity) {
    return (
      <div style={{ color: "black", textAlign: "center", marginTop: "150px" }}>
        <h2>Please login to view your profile</h2>
        <button
          onClick={() => navigate("/signup")}
          style={{
            marginTop: "20px",
            padding: "10px 20px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Go to Login
        </button>
      </div>
    );
  }

  const history = [...(historyItems || [])].sort(
    (a, b) => new Date(b.searchedAt || 0) - new Date(a.searchedAt || 0)
  );
  const statusText = (status) => (status === "PENDING" ? "REQUESTED" : status);
  const acceptedRequests = requestActivity.filter(
    (req) => ((req.status || "").toString().trim().toUpperCase() === "ACCEPTED")
  );
  const requestedRequests = requestActivity.filter(
    (req) => !isReceivedRequest(req) && isPendingStatus(req.status)
  );

  const SectionToggle = ({ sectionKey, label }) => (
    <button
      type="button"
      className="section-toggle"
      onClick={() => toggleSection(sectionKey)}
      aria-label={
        label ||
        (sectionOpen[sectionKey] ? `Collapse ${sectionKey}` : `Expand ${sectionKey}`)
      }
      aria-expanded={Boolean(sectionOpen[sectionKey])}
    >
      {sectionOpen[sectionKey] ? "▾" : "▸"}
    </button>
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
              <p className="hero-subtitle">
                Keep bookings, collaboration requests, and searches grouped neatly.
              </p>
              <div className="chip-row">
                <span className="chip">{displayEmail || "No email saved"}</span>
              </div>
            </div>
            <div className="stat-grid hero-stats">
              <div className="stat-card">
                <p>Bookings</p>
                <strong>{bookings.length}</strong>
              </div>
              <div className="stat-card">
                <p>Searches</p>
                <strong>{history.length}</strong>
              </div>
              <div className="stat-card">
                <p>Requests</p>
                <strong>{requestActivity.length}</strong>
              </div>
            </div>
          </div>

          <div className="profile-content">
            <div className="profile-card">
              <div className="avatar">
                <img
                  src={profile.picture || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                  alt="profile"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h3>{displayName}</h3>
              <p className="muted-text">{displayEmail || displayName || "Email not available"}</p>
              <span className="role-badge">Explorer</span>
              <div className="mini-stats">
                <div className="mini-stat">
                  <span>Bookings</span>
                  <strong>{bookings.length}</strong>
                </div>
                <div className="mini-stat">
                  <span>Open requests</span>
                  <strong>{joinRequests.length}</strong>
                </div>
                <div className="mini-stat">
                  <span>History</span>
                  <strong>{history.length}</strong>
                </div>
              </div>
            </div>

            <div className="profile-main">
              <section className="section-card">
                <div className="section-header">
                  <div>
                    <p className="eyebrow">Trips</p>
                    <h2 className="section-title">My Bookings</h2>
                    <p className="section-note">Split costs and see who has joined.</p>
                  </div>
                  <SectionToggle sectionKey="bookings" label="Toggle bookings" />
                </div>
                {sectionOpen.bookings ? (
                  bookings.length === 0 ? (
                    <p className="empty-state">No bookings found.</p>
                  ) : (
                    <div className="history-list">
                      {bookings.map((b) => {
                        const bookingKey = bookingSplitKey(b);
                        const reactKey = `${bookingKey}-${b?.id != null ? b.id : "synthetic"}`;
                        const rawSplitData = bookingSplitDataByBooking[bookingKey] || {
                          members: [],
                          expenses: [],
                          balances: [],
                          settlements: [],
                          totalExpenses: 0,
                        };
                        const mergedMembers = mergeUniqueMembers([
                          ...(rawSplitData.members || []),
                          ...getTripMembersForBooking(b),
                        ]);
                        const recomputed = recomputeBookingSplit(
                          mergedMembers,
                          rawSplitData.expenses || []
                        );
                        const splitData = {
                          ...recomputed,
                          settlements:
                            Array.isArray(rawSplitData.settlements) && rawSplitData.settlements.length > 0
                              ? rawSplitData.settlements
                              : recomputed.settlements,
                        };
                        const splitForm = bookingSplitFormByBooking[bookingKey] || {
                          description: "",
                          amount: "",
                          paidByEmail: mergedMembers[0]?.email || normalizeEmail(currentEmail) || "",
                          splitBetweenEmails: mergedMembers.map((m) => m.email),
                        };
                        const acceptedForBooking = getAcceptedTripRequestsForBooking(b);
                        const collab = isCollabBooking(b);
                        const open = Boolean(splitOpenByBooking[bookingKey]);
                        const hasExpenses = Array.isArray(splitData.expenses) && splitData.expenses.length > 0;
                        const showSplitToggle = collab || Boolean(hasExpenses);
                        return (
                          <div key={`booking-${reactKey}`} className="history-item">
                            <div className="history-details">
                              <h4>{b.destination || "Trip Booking"}</h4>
                              <p>
                                {b.startDate} to {b.endDate}
                              </p>
                              <p>Total Cost: Rs.{parseAmount(b.totalCost)}</p>
                              <p>
                                Split Amount (per person): Rs.{getSplitAmountForBooking(b)} (
                                {getParticipantCountForBooking(b)} travelers)
                              </p>
                              <p>
                                Joined Travelers:{" "}
                                {getJoinedTravelerNamesForBooking(b).length > 0
                                  ? getJoinedTravelerNamesForBooking(b).join(", ")
                                  : "No one joined yet"}
                              </p>
                              <p>
                                {b._shared
                                  ? `Shared booking from host: ${b._ownerEmail || b.username || "Host"}`
                                  : `Booked by: ${b._ownerEmail || b.username || "You"}`}
                              </p>
                              <small>
                                {b.bookingDate
                                  ? new Date(b.bookingDate).toLocaleString()
                                  : "Booking date unavailable"}
                              </small>
                        {open ? (
                            <div className="booking-split-panel">
                            <p className="booking-split-result">
                              Total Expenses: <strong>Rs.{splitData.totalExpenses || 0}</strong>
                            </p>

                                  <div className="booking-split-members">
                                    {(splitData.members || []).map((member) => {
                                      const email = normalizeEmail(member.email);
                                      const checked = (splitForm.splitBetweenEmails || []).includes(email);
                                      return (
                                        <label key={`${bookingKey}-${email}`} className="booking-split-check">
                                          <input
                                            type="checkbox"
                                            checked={Boolean(checked)}
                                            onChange={() => toggleBookingSplitMember(bookingKey, email)}
                                          />
                                          {formatMemberLabel(member)}
                                        </label>
                                      );
                                    })}
                                  </div>

                                  <label className="booking-split-label">
                                    Expense Description
                                    <input
                                      type="text"
                                      value={splitForm.description || ""}
                                      onChange={(e) =>
                                        setBookingSplitFormField(bookingKey, "description", e.target.value)
                                      }
                                    />
                                  </label>
                                  <label className="booking-split-label">
                                    Amount
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={splitForm.amount || ""}
                                      onChange={(e) =>
                                        setBookingSplitFormField(bookingKey, "amount", e.target.value)
                                      }
                                    />
                                  </label>
                                  <label className="booking-split-label">
                                    Paid By
                                    <select
                                      value={splitForm.paidByEmail || ""}
                                      onChange={(e) =>
                                        setBookingSplitFormField(bookingKey, "paidByEmail", e.target.value)
                                      }
                                    >
                                      {(splitData.members || []).map((member) => (
                                        <option
                                          key={`payer-${bookingKey}-${member.email}`}
                                          value={normalizeEmail(member.email)}
                                        >
                                          {formatMemberLabel(member)}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label className="booking-split-label">
                                    Split Type
                                    <select
                                      value={splitForm.splitType || "EQUAL"}
                                      onChange={(e) =>
                                        setBookingSplitFormField(bookingKey, "splitType", e.target.value)
                                      }
                                    >
                                      <option value="EQUAL">Equal split</option>
                                      <option value="CUSTOM">Custom amounts</option>
                                    </select>
                                  </label>

                                  {splitForm.splitType === "CUSTOM" ? (
                                    <div className="booking-split-list">
                                      <h4>Custom amounts per member</h4>
                                          {(splitForm.splitBetweenEmails || splitData.members.map((m) => m.email)).map(
                                            (email) => {
                                              const member = (splitData.members || []).find(
                                                (m) => normalizeEmail(m.email) === normalizeEmail(email)
                                              );
                                              const allocationValue =
                                                (splitForm.allocations || {})[normalizeEmail(email)] ?? "";
                                              return (
                                                <label key={`custom-${bookingKey}-${email}`} className="booking-split-label inline">
                                                  {member?.name || email}
                                                  <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={allocationValue}
                                                    onChange={(e) =>
                                                      setBookingSplitAllocation(bookingKey, email, e.target.value)
                                                    }
                                                  />
                                                </label>
                                            );
                                          }
                                        )}
                                    </div>
                                  ) : null}

                                  <div className="booking-split-actions">
                                    <button
                                      className="join-btn join-yes"
                                      type="button"
                                      onClick={() => handleAddBookingExpense(bookingKey)}
                                    >
                                      Save Expense
                                    </button>
                                    <button
                                      className="join-btn join-no"
                                      type="button"
                                      onClick={() => handleSettleUp(bookingKey)}
                                    >
                                      Settle Up
                                    </button>
                                  </div>

                                  <div className="booking-split-list">
                                    <h4>Expenses</h4>
                                    {(splitData.expenses || []).length === 0 ? (
                                      <p>No expenses added yet.</p>
                                    ) : (
                                      <ul style={{ paddingLeft: "18px", margin: "6px 0" }}>
                                        {(splitData.expenses || []).map((exp) => (
                                          <li key={exp.id || exp.createdAt}>
                                            <strong>{exp.description}</strong> — Rs.{exp.amount} | Paid by{" "}
                                            {exp.paidByName || exp.paidByEmail || "Unknown"} |{" "}
                                            {exp.createdAt ? new Date(exp.createdAt).toLocaleString() : "Now"}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>

                                  <div className="booking-split-summary">
                                    <div>
                                      <h4>Balances</h4>
                                      <ul>
                                        {(splitData.balances || []).map((balance, idx) => (
                                          <li key={`balance-${bookingKey}-${idx}`}>
                                            {balance.name || balance.email}: {getBalanceLabel(balance.balance)}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                    <div>
                                      <h4>Settlements</h4>
                                      <ul>
                                        {(splitData.settlements || []).map((settlement, idx) => (
                                          <li key={`settlement-${bookingKey}-${idx}`}>
                                            {(settlement.fromName || settlement.fromEmail || "Traveler")} pays {(settlement.toName || settlement.toEmail || "Traveler")}: Rs.{settlement.amount}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                              </div>
                            ) : null}
                          </div>
                          {showSplitToggle ? (
                            <div className="join-actions">
                              <button
                                className="join-btn join-yes"
                                type="button"
                                onClick={() => handleToggleBookingSplit(b)}
                              >
                                {open ? "Hide Split" : "Split Expenses"}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )
                ) : null}
              </section>

              <section className="section-card">
                <div className="section-header">
                  <div>
                    <p className="eyebrow">Recent</p>
                    <h2 className="section-title">Travel Search History</h2>
                    <p className="section-note">Tap any item to reopen details.</p>
                  </div>
                  <SectionToggle sectionKey="history" label="Toggle search history" />
                </div>
                {sectionOpen.history ? (
                  history.length === 0 ? (
                    <p className="empty-state">No journeys yet.</p>
                  ) : (
                    <div className="history-list">
                      {history.map((h, i) => (
                        <div
                          key={i}
                          className="history-item"
                          onClick={() => handleHistoryClick(h)}
                          style={{ cursor: "pointer" }}
                          title="Click to view details"
                        >
                          <div className="history-details">
                            <h4>{h.query}</h4>
                            <p>
                              {h.type === "DESTINATION" && "Destination"}
                              {h.type === "TRIP" && "Trip"}
                              {h.type === "ITINERARY" && "Itinerary"}
                              {" - "}
                              {h.category}
                            </p>
                            <small>{new Date(h.searchedAt).toLocaleString()}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : null}
              </section>

              <section className="section-card">
                <div className="section-header">
                  <div>
                    <p className="eyebrow">Collaboration</p>
                    <h2 className="section-title">Incoming Requests</h2>
                    <p className="section-note">Approve or decline travelers who want to join.</p>
                  </div>
                  <SectionToggle sectionKey="incoming" label="Toggle incoming requests" />
                </div>
                {sectionOpen.incoming ? (
                  joinRequests.length === 0 ? (
                    <p className="empty-state">
                      No pending requests.
                      {(currentEmail || displayName)
                        ? ` (Signed in as: ${[currentEmail, displayName].filter(Boolean).join(" / ")})`
                        : ""}
                    </p>
                  ) : (
                    <div className="history-list">
                      {joinRequests.map((req) => (
                        <div key={req.id} className="history-item">
                          <div className="history-details">
                            <h4>{req.requesterName} wants to join</h4>
                            <p>
                              {req.destination} - {req.startDate} to {req.endDate}
                            </p>
                            <p>Requester email: {req.requesterEmail || "Not provided"}</p>
                          </div>
                          <div className="join-actions">
                            <button
                              className="join-btn join-yes"
                              onClick={() => handleJoinDecision(req, "ACCEPTED")}
                              disabled={actionRequestId === req.id}
                            >
                              Accept Request
                            </button>
                            <button
                              className="join-btn join-no"
                              onClick={() => handleJoinDecision(req, "REJECTED")}
                              disabled={actionRequestId === req.id}
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : null}
              </section>

              <section className="section-card">
                <div className="section-header">
                  <div>
                    <p className="eyebrow">Collaboration</p>
                    <h2 className="section-title">Accepted</h2>
                    <p className="section-note">Trips you or others approved.</p>
                  </div>
                  <SectionToggle sectionKey="accepted" label="Toggle accepted requests" />
                </div>
                {sectionOpen.accepted ? (
                  acceptedRequests.length === 0 ? (
                    <p className="empty-state">No accepted requests yet.</p>
                  ) : (
                    <div className="history-list">
                      {acceptedRequests.map((req) => {
                        const resolvedRequest = resolveBackendTripChatRequest(req);
                        const threadId = getTripChatThreadId(resolvedRequest);
                        const chatOpen = openTripChatRequestId === String(req.id);
                        const chatAvailable = hasBackendTripChat(req);
                        const threadMessages = tripChatMessagesByThread[threadId] || [];
                        return (
                        <div key={`accepted-${req.id}`} className={`history-item accepted-history-item ${chatOpen ? "chat-open" : ""}`}>
                          <div className="history-details">
                            <h4>
                              {isReceivedRequest(req)
                                ? `${req.requesterName || "Requester"} -> ${req.destination}`
                                : `You -> ${req.destination}`}
                            </h4>
                            <p>
                              {req.startDate} to {req.endDate}
                            </p>
                            <small>{new Date(req.updatedAt || req.createdAt).toLocaleString()}</small>
                            <div className="accepted-actions">
                              <button
                                className={`trip-chat-toggle-btn ${chatOpen ? "active" : ""}`}
                                type="button"
                                onClick={() => toggleTripChat(req.id)}
                              >
                                {chatOpen ? "Close Chat" : "Chat"}
                              </button>
                            </div>
                            {chatOpen ? (
                              chatAvailable ? (
                                <div className="trip-chat-panel">
                                  <div className="trip-chat-header-row">
                                    <div>
                                      <strong>Trip chat</strong>
                                      <span className="trip-chat-note">
                                        Visible only after request acceptance for this trip's collaborators.
                                      </span>
                                    </div>
                                  </div>
                                  <div className="trip-chat-messages">
                                    {threadMessages.length === 0 ? (
                                    <p className="trip-chat-empty">
                                      No messages yet. Start the collaboration here.
                                    </p>
                                  ) : (
                                    threadMessages.map((msg) => {
                                      const mine = identityMatches(
                                        msg?.senderEmail,
                                        getTripChatViewerIdentity(req)
                                      );
                                      const senderLabel = mine
                                        ? "You"
                                        : (msg?.senderName || getTripChatOtherName(req) || "Trip Member");
                                      return (
                                        <div
                                          key={msg.id}
                                          className={`trip-chat-message ${mine ? "mine" : ""}`}
                                        >
                                          <div className="trip-chat-meta">
                                            <strong>{senderLabel}</strong>
                                            <span>
                                              {msg.createdAt
                                                ? new Date(msg.createdAt).toLocaleString()
                                                : "Just now"}
                                            </span>
                                          </div>
                                          <p>{msg.text}</p>
                                        </div>
                                      );
                                    })
                                  )}
                                  </div>
                                  <div className="trip-chat-compose">
                                    <textarea
                                      className="trip-chat-input"
                                      rows={3}
                                      value={tripChatInputByThread[threadId] || ""}
                                      onChange={(e) =>
                                        handleTripChatInputChange(threadId, e.target.value)
                                      }
                                      placeholder="Message your accepted trip group here..."
                                    />
                                    <button
                                      className="trip-chat-send-btn"
                                      type="button"
                                      onClick={() => handleTripChatSend(req)}
                                    >
                                      Send Message
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="trip-chat-panel trip-chat-panel-disabled">
                                  <div className="trip-chat-header-row">
                                    <div>
                                      <strong>Trip chat</strong>
                                      <span className="trip-chat-note">
                                        Chat will appear when this accepted request is linked to a collaboration trip.
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )
                            ) : null}
                          </div>
                          <div className="status-badge status-accepted">{statusText(req.status)}</div>
                        </div>
                      )})}
                    </div>
                  )
                ) : null}
              </section>

              <section className="section-card">
                <div className="section-header">
                  <div>
                    <p className="eyebrow">Collaboration</p>
                    <h2 className="section-title">Requested</h2>
                    <p className="section-note">Trips you have asked to join.</p>
                  </div>
                  <SectionToggle sectionKey="requested" label="Toggle requested trips" />
                </div>
                {sectionOpen.requested ? (
                  requestedRequests.length === 0 ? (
                    <p className="empty-state">No requested trips yet.</p>
                  ) : (
                    <div className="history-list">
                      {requestedRequests.map((req) => (
                        <div key={`sent-${req.id}`} className="history-item">
                          <div className="history-details">
                            <h4>{`You -> ${req.destination}`}</h4>
                            <p>
                              {req.startDate} to {req.endDate} {" - Requested"}
                            </p>
                            <small>{new Date(req.updatedAt || req.createdAt).toLocaleString()}</small>
                          </div>
                          <div className={`status-badge status-${(req.status || "PENDING").toLowerCase()}`}>
                            {statusText(req.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : null}
              </section>
            </div>
          </div>
        </div>
      </div>
      {toast ? (
        <div
          style={{
            position: "fixed",
            right: "16px",
            bottom: "16px",
            minWidth: "240px",
            maxWidth: "340px",
            padding: "12px 14px",
            borderRadius: "10px",
            color: "#fff",
            background:
              toast.type === "success" ? "#16a34a" : toast.type === "error" ? "#dc2626" : toast.type === "warning" ? "#d97706" : "#2563eb",
            boxShadow: "0 12px 30px rgba(15,23,42,0.18)",
            zIndex: 9999,
            fontWeight: 600,
          }}
        >
          {toast.message}
        </div>
      ) : null}
    </>
  );
}
