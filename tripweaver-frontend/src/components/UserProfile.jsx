import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./UserProfile.css";
import Navbar from "./navbar";
import API_BASE from "../config";
import { persistIdentity, resolveProfileEmail, resolveProfileName } from "../utils/userIdentity";
import {
  decrementLocalCollaborationSeat,
  getJoinRequestsForHost,
  getJoinRequestsForRequester,
  updateJoinRequestStatus,
} from "../utils/collaboration";

axios.defaults.withCredentials = true;

export default function UserProfile() {
  const BOOKING_SPLIT_KEY = "profile_booking_splitwise_v1";
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joinRequests, setJoinRequests] = useState([]);
  const [requestActivity, setRequestActivity] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [collaborationTrips, setCollaborationTrips] = useState([]);
  const [splitOpenByBooking, setSplitOpenByBooking] = useState({});
  const [bookingSplitDataByBooking, setBookingSplitDataByBooking] = useState({});
  const [bookingSplitFormByBooking, setBookingSplitFormByBooking] = useState({});
  const [actionRequestId, setActionRequestId] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profileRes = await axios.get("http://localhost:8090/api/profile", { withCredentials: true });
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
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const profileEmail = resolveProfileEmail(profile);
  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || "").trim());
  const emailCandidates = [
    profileEmail,
    profile?.email,
    profile?.userEmail,
    profile?.mail,
    profile?.user?.email,
    profile?.principal?.email,
    profile?.attributes?.email,
    profile?.attributes?.mail,
    sessionStorage.getItem("email"),
    localStorage.getItem("email"),
    sessionStorage.getItem("username"),
    localStorage.getItem("username"),
  ]
    .map((value) => (value || "").toString().trim().toLowerCase())
    .filter(Boolean);
  const currentEmail = emailCandidates.find((value) => isValidEmail(value)) || "";
  const displayName = resolveProfileName(profile) || sessionStorage.getItem("username") || "Traveler";
  const displayEmail = currentEmail || profileEmail || sessionStorage.getItem("email") || localStorage.getItem("email") || "";
  const normalizeEmail = (value) => (value || "").toString().trim().toLowerCase();
  const normalizeRequest = (req) => ({
    ...req,
    id: req?.id != null ? String(req.id) : "",
    hostEmail: req?.hostEmail || req?.email || req?.toEmail || "",
    requesterEmail: req?.requesterEmail || "",
    status: (req?.status || "PENDING").toString().toUpperCase(),
  });
  const normalizeText = (value) => (value || "").toString().trim().toLowerCase();
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BOOKING_SPLIT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        setBookingSplitDataByBooking(parsed.data && typeof parsed.data === "object" ? parsed.data : {});
        setBookingSplitFormByBooking(parsed.form && typeof parsed.form === "object" ? parsed.form : {});
      }
    } catch {}
  }, []);

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
      const share = amount / splitBetween.length;
      splitBetween.forEach((email) => {
        if (ledger[email] == null) ledger[email] = 0;
        ledger[email] -= share;
      });
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
    const bookingId = booking?.id != null ? String(booking.id) : `${booking?.destination}-${booking?.startDate}-${booking?.endDate}`;
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
      const bid = b?.id != null ? String(b.id) : `${b?.destination}-${b?.startDate}-${b?.endDate}`;
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

    if (!description) {
      alert("Please enter expense description.");
      return;
    }
    if (amount <= 0) {
      alert("Please enter valid amount.");
      return;
    }
    if (!paidByEmail) {
      alert("Please choose who paid.");
      return;
    }
    if (splitBetweenEmails.length === 0) {
      alert("Choose at least one member to split.");
      return;
    }

    const booking = findBookingById(bookingId);
    const linkedTripId = booking ? findLinkedTripIdForBooking(booking) : null;
    const payerMember = (data.members || []).find((m) => normalizeEmail(m.email) === paidByEmail);
    const paidByName = payerMember?.name || displayName || "Trip Member";

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
            splitType: "EQUAL",
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
        alert(err?.response?.data?.message || "Failed to add expense.");
        return;
      }
    }

    const expense = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      description,
      amount: round2(amount),
      paidByEmail,
      paidByName,
      splitBetweenEmails,
      createdAt: new Date().toISOString(),
    };
    const nextExpenses = [expense, ...(data.expenses || [])];
    const nextData = recomputeBookingSplit(data.members || [], nextExpenses);
    setBookingSplitDataByBooking((prev) => ({ ...prev, [bookingId]: nextData }));
    setBookingSplitFormByBooking((prev) => ({
      ...prev,
      [bookingId]: {
        ...(prev[bookingId] || {}),
        description: "",
        amount: "",
      },
    }));
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

  const loadBookingSplitFromTrip = async (booking) => {
    const bookingId = booking?.id != null ? String(booking.id) : `${booking?.destination}-${booking?.startDate}-${booking?.endDate}`;
    const tripId = findLinkedTripIdForBooking(booking);
    if (!tripId) {
      ensureBookingSplitInitialized(booking);
      return;
    }

    try {
      const [membersRes, expensesRes, settlementsRes] = await Promise.all([
        axios.get(`${API_BASE}/collaboration-trips/${tripId}/members`, { withCredentials: true }),
        axios.get(`${API_BASE}/collaboration-trips/${tripId}/expenses`, { withCredentials: true }),
        axios.get(`${API_BASE}/collaboration-trips/${tripId}/settlements`, { withCredentials: true }),
      ]);
      const members = (Array.isArray(membersRes?.data) ? membersRes.data : [])
        .map((m) => ({ name: m?.name || "Trip Member", email: normalizeEmail(m?.email) }))
        .filter((m) => m.email);
      const expenses = (Array.isArray(expensesRes?.data) ? expensesRes.data : []).map((e) => ({
        id: e?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        description: e?.description || "Trip expense",
        amount: round2(parseAmount(e?.amount)),
        paidByEmail: normalizeEmail(e?.paidByEmail),
        paidByName: e?.paidByName || "Trip Member",
        splitBetweenEmails: Array.isArray(e?.splitBetweenEmails)
          ? e.splitBetweenEmails.map((x) => normalizeEmail(x)).filter(Boolean)
          : [],
        createdAt: e?.createdAt || new Date().toISOString(),
      }));
      const settlements = settlementsRes?.data || {};
      const merged = {
        members,
        expenses,
        balances: Array.isArray(settlements?.balances) ? settlements.balances : [],
        settlements: Array.isArray(settlements?.settlements) ? settlements.settlements : [],
        totalExpenses: round2(parseAmount(settlements?.totalExpenses)),
      };
      setBookingSplitDataByBooking((prev) => ({ ...prev, [bookingId]: merged }));
      setBookingSplitFormByBooking((prev) => ({
        ...prev,
        [bookingId]: {
          description: "",
          amount: "",
          paidByEmail: members[0]?.email || normalizeEmail(currentEmail) || "",
          paidByName: members[0]?.name || displayName || "You",
          splitBetweenEmails: members.map((m) => m.email),
        },
      }));
    } catch {
      ensureBookingSplitInitialized(booking);
    }
  };

  const handleToggleBookingSplit = async (booking) => {
    const bookingId = booking?.id != null ? String(booking.id) : `${booking?.destination}-${booking?.startDate}-${booking?.endDate}`;
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
    const requester = normalizeEmail(req?.requesterEmail);
    const host = normalizeEmail(req?.hostEmail || req?.email || req?.toEmail);
    const current = normalizeEmail(currentEmail);
    const currentName = (displayName || "").trim().toLowerCase();
    const hostName = (req?.hostName || "").trim().toLowerCase();

    if (current && requester && requester === current) return false;
    if (current && host && host === current) return true;
    if (current) return false;
    if (!current && currentName && hostName && hostName === currentName) return true;
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

      if (!effectiveEmail) {
        setJoinRequests([]);
        setRequestActivity([]);
        return;
      }

      const localHostRequests = getJoinRequestsForHost(effectiveEmail).map(normalizeRequest);
      const localRequesterRequests = getJoinRequestsForRequester(effectiveEmail).map(normalizeRequest);

      let remoteHostRequests = [];
      let remoteRequesterRequests = [];
      let remoteLoaded = false;
      try {
        const [hostRes, requesterRes] = await Promise.all([
          axios.get(`${API_BASE}/collaboration-trips/join-requests/host`, {
            params: { email: effectiveEmail },
            withCredentials: true,
          }),
          axios.get(`${API_BASE}/collaboration-trips/join-requests/requester`, {
            params: { email: effectiveEmail },
            withCredentials: true,
          }),
        ]);
        remoteHostRequests = (Array.isArray(hostRes?.data) ? hostRes.data : []).map(normalizeRequest);
        remoteRequesterRequests = (Array.isArray(requesterRes?.data) ? requesterRes.data : []).map(normalizeRequest);
        remoteLoaded = true;
      } catch {}

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
      const incomingPending = merged.filter((req) => isPendingStatus(req.status) && isReceivedRequest(req));
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
        const myBookingsRes = await axios.get(`${API_BASE}/bookings/my-bookings`, {
          params: { username: effectiveEmail },
          withCredentials: true,
        });
        let myBookingsRaw = Array.isArray(myBookingsRes?.data) ? myBookingsRes.data : [];
        if (myBookingsRaw.length === 0) {
          const bookingCandidates = [
            effectiveEmail,
            profileEmail,
            displayEmail,
            sessionStorage.getItem("email"),
            localStorage.getItem("email"),
            sessionStorage.getItem("username"),
            localStorage.getItem("username"),
          ]
            .map((x) => (x || "").toString().trim())
            .filter(Boolean);
          const fallbackLists = await Promise.all(
            [...new Set(bookingCandidates)].map(async (candidate) => {
              try {
                const r = await axios.get(`${API_BASE}/bookings/my-bookings`, {
                  params: { username: candidate },
                  withCredentials: false,
                });
                return Array.isArray(r?.data) ? r.data : [];
              } catch {
                return [];
              }
            })
          );
          myBookingsRaw = fallbackLists.flat();
        }
        const myBookings = myBookingsRaw.map((b) => ({
          ...b,
          _ownerEmail: normalizeEmail(effectiveEmail),
          _shared: false,
        }));

        const acceptedAsRequester = merged.filter(
          (req) =>
            normalizeEmail(req?.requesterEmail) === normalizeEmail(effectiveEmail) &&
            (req?.status || "").toString().trim().toUpperCase() === "ACCEPTED"
        );

        const sharedTripKeys = acceptedAsRequester.map((req) => ({
          hostEmail: normalizeEmail(req?.hostEmail),
          destination: normalizeText(req?.destination),
          startDate: (req?.startDate || "").toString().trim(),
          endDate: (req?.endDate || "").toString().trim(),
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
            startDate: (t?.startDate || "").toString().trim(),
            endDate: (t?.endDate || "").toString().trim(),
          }));

        const allSharedKeys = joinedOpenTrips.length > 0 ? joinedOpenTrips : sharedTripKeys;
        const hostEmails = [...new Set(allSharedKeys.map((k) => k.hostEmail).filter(Boolean))];

        const sharedHostBookingsLists = await Promise.all(
          hostEmails.map(async (hostEmail) => {
            try {
              const hostRes = await axios.get(`${API_BASE}/bookings/my-bookings`, {
                params: { username: hostEmail },
                withCredentials: false,
              });
              return Array.isArray(hostRes?.data) ? hostRes.data : [];
            } catch {
              return [];
            }
          })
        );

        const sharedBookings = sharedHostBookingsLists
          .flat()
          .filter((b) =>
            allSharedKeys.some((k) =>
              normalizeEmail(b?.username) === k.hostEmail &&
              normalizeText(b?.destination) === k.destination &&
              (b?.startDate || "").toString().trim() === k.startDate &&
              (b?.endDate || "").toString().trim() === k.endDate
            )
          )
          .map((b) => ({
            ...b,
            _ownerEmail: normalizeEmail(b?.username),
            _shared: normalizeEmail(b?.username) !== normalizeEmail(effectiveEmail),
          }));

        const mergedBookingsMap = new Map();
        [...myBookings, ...sharedBookings].forEach((b) => {
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
  }, [currentEmail, displayName, displayEmail, profileEmail]);

  useEffect(() => {
    refreshCollaborationState();
    const onStorage = () => refreshCollaborationState();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refreshCollaborationState]);

  const handleHistoryClick = (h) => {
    if (h.type === "DESTINATION") {
      navigate(`/search?query=${encodeURIComponent(h.destination || h.query)}`);
    } else if (h.type === "TRIP") {
      navigate("/trips", { state: { restore: h } });
    } else if (h.type === "ITINERARY") {
      navigate("/planner", { state: { restore: h } });
    }
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
        if (seatUpdated) {
          alert("Accepted. Seat updated and requester got acceptance email.");
        } else {
          alert("Accepted and requester got acceptance email.");
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
        alert("Accept failed. Request restored to pending.");
      }
    } else {
      alert("Request declined.");
    }

    refreshCollaborationState();
    setActionRequestId("");
  };

  if (loading) {
    return <p style={{ color: "black", textAlign: "center", marginTop: "100px" }}>Loading profile...</p>;
  }

  if (!profile || profile.loggedIn === false) {
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

  const history = [...(profile.history || [])].sort(
    (a, b) => new Date(b.searchedAt || 0) - new Date(a.searchedAt || 0)
  );
  const statusText = (status) => (status === "PENDING" ? "REQUESTED" : status);
  const acceptedRequests = requestActivity.filter(
    (req) => ((req.status || "").toString().trim().toUpperCase() === "ACCEPTED")
  );
  const requestedRequests = requestActivity.filter(
    (req) => !isReceivedRequest(req) && isPendingStatus(req.status)
  );

  return (
    <div className="profile-page">
      <Navbar />
      <div className="profile-container">
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
            <p>{displayEmail || "Email not available"}</p>
            <span className="role-badge">Explorer</span>
          </div>

          <div className="history-section">
            <div className="requests-section" style={{ order: 0, marginTop: 0 }}>
              <h3>My Bookings</h3>
              {bookings.length === 0 ? (
                <p>No bookings found.</p>
              ) : (
                <div className="history-list">
                  {bookings.map((b) => {
                    const bookingId = b?.id != null ? String(b.id) : `${b.destination}-${b.startDate}-${b.endDate}`;
                    const open = Boolean(splitOpenByBooking[bookingId]);
                    const hasCollaborationTrip = Boolean(findLinkedTripIdForBooking(b));
                    const splitData = bookingSplitDataByBooking[bookingId] || {
                      members: [],
                      expenses: [],
                      balances: [],
                      settlements: [],
                      totalExpenses: 0,
                    };
                    const splitForm = bookingSplitFormByBooking[bookingId] || {
                      description: "",
                      amount: "",
                      paidByEmail: normalizeEmail(currentEmail) || "",
                      splitBetweenEmails: [],
                    };
                    return (
                      <div key={`booking-${bookingId}`} className="history-item">
                        <div className="history-details">
                          <h4>{b.destination || "Trip Booking"}</h4>
                          <p>{b.startDate} to {b.endDate}</p>
                          <p>Total Cost: Rs.{parseAmount(b.totalCost)}</p>
                          <p>
                            {b._shared
                              ? `Shared booking from host: ${b._ownerEmail || b.username || "Host"}`
                              : `Booked by: ${b._ownerEmail || b.username || "You"}`}
                          </p>
                          <small>
                            {b.bookingDate ? new Date(b.bookingDate).toLocaleString() : "Booking date unavailable"}
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
                                    <label key={`${bookingId}-${email}`} className="booking-split-check">
                                      <input
                                        type="checkbox"
                                        checked={Boolean(checked)}
                                        onChange={() => toggleBookingSplitMember(bookingId, email)}
                                      />
                                      {(member.name || "Trip Member")} ({email})
                                    </label>
                                  );
                                })}
                              </div>

                              <label className="booking-split-label">
                                Expense Description
                                <input
                                  type="text"
                                  value={splitForm.description || ""}
                                  onChange={(e) => setBookingSplitFormField(bookingId, "description", e.target.value)}
                                />
                              </label>
                              <label className="booking-split-label">
                                Amount
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={splitForm.amount || ""}
                                  onChange={(e) => setBookingSplitFormField(bookingId, "amount", e.target.value)}
                                />
                              </label>
                              <label className="booking-split-label">
                                Paid By
                                <select
                                  value={splitForm.paidByEmail || ""}
                                  onChange={(e) => setBookingSplitFormField(bookingId, "paidByEmail", e.target.value)}
                                >
                                  {(splitData.members || []).map((member) => (
                                    <option key={`payer-${bookingId}-${member.email}`} value={normalizeEmail(member.email)}>
                                      {member.name} ({normalizeEmail(member.email)})
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <button
                                type="button"
                                className="join-btn join-yes"
                                onClick={() => handleAddBookingExpense(bookingId)}
                              >
                                Add Expense
                              </button>

                              <div className="booking-split-list">
                                <h4>Who Owes Whom</h4>
                                {(splitData.settlements || []).length === 0 ? (
                                  <p className="booking-split-result">No dues. Everyone is settled up.</p>
                                ) : (
                                  (splitData.settlements || []).map((item, idx) => (
                                    <p key={`settlement-${bookingId}-${idx}`}>
                                      {item.fromName || item.fromEmail} owes {item.toName || item.toEmail} Rs.{item.amount}
                                    </p>
                                  ))
                                )}
                              </div>

                              <div className="booking-split-list">
                                <h4>Balances</h4>
                                <p className="booking-split-result">Positive means receive, negative means pay.</p>
                                {(splitData.balances || []).map((bal, idx) => (
                                  <p key={`balance-${bookingId}-${idx}`}>
                                    {bal.name || bal.email}: {getBalanceLabel(bal.balance)}
                                  </p>
                                ))}
                              </div>
                              <p className="booking-split-result">
                                Trip Total Cost per person (equal, using members):{" "}
                                <strong>
                                  Rs.
                                  {Math.ceil(
                                    parseAmount(b.totalCost) /
                                      Math.max(1, (splitData.members || []).length || 1)
                                  )}
                                </strong>
                              </p>
                            </div>
                          ) : null}
                        </div>
                        <div className="join-actions">
                          {hasCollaborationTrip ? (
                            <button
                              className="join-btn join-yes"
                              type="button"
                              onClick={() => handleToggleBookingSplit(b)}
                            >
                              {open ? "Hide Split" : "Split Expenses"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <h3 style={{ order: 3, marginTop: "28px" }}>Travel Search History</h3>

            {history.length === 0 ? (
              <p style={{ order: 4 }}>No journeys yet</p>
            ) : (
              <div className="history-list" style={{ order: 4 }}>
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
                        {" â€¢ "}
                        {h.category}
                      </p>
                      <small>{new Date(h.searchedAt).toLocaleString()}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="requests-section" style={{ order: 1, marginTop: 0 }}>
              <h3>Incoming Requests</h3>
              {joinRequests.length === 0 ? (
                <p>No pending requests.{currentEmail ? ` (Signed in as: ${currentEmail})` : ""}</p>
              ) : (
                <div className="history-list">
                  {joinRequests.map((req) => (
                    <div key={req.id} className="history-item">
                      <div className="history-details">
                        <h4>{req.requesterName} wants to join</h4>
                        <p>{req.destination} â€¢ {req.startDate} to {req.endDate}</p>
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
              )}
            </div>

            <div className="requests-section" style={{ order: 2 }}>
              <h3>Accepted</h3>
              {acceptedRequests.length === 0 ? (
                <p>No accepted requests yet.</p>
              ) : (
                <div className="history-list">
                  {acceptedRequests.map((req) => (
                    <div key={`accepted-${req.id}`} className="history-item">
                      <div className="history-details">
                        <h4>
                          {isReceivedRequest(req)
                            ? `${req.requesterName || "Requester"} -> ${req.destination}`
                            : `You -> ${req.destination}`}
                        </h4>
                        <p>{req.startDate} to {req.endDate}</p>
                        <small>{new Date(req.updatedAt || req.createdAt).toLocaleString()}</small>
                      </div>
                      <div className="status-badge status-accepted">{statusText(req.status)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="requests-section" style={{ order: 2 }}>
              <h3>Requested</h3>
              {requestedRequests.length === 0 ? (
                <p>No requested trips yet.</p>
              ) : (
                <div className="history-list">
                  {requestedRequests.map((req) => (
                    <div key={`sent-${req.id}`} className="history-item">
                      <div className="history-details">
                        <h4>{`You -> ${req.destination}`}</h4>
                        <p>{req.startDate} to {req.endDate} {" • Requested"}</p>
                        <small>{new Date(req.updatedAt || req.createdAt).toLocaleString()}</small>
                      </div>
                      <div className={`status-badge status-${(req.status || "PENDING").toLowerCase()}`}>
                        {statusText(req.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


