import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import "./OpenTrips.css";
import API_BASE from "../config";
import { createJoinRequest } from "../utils/collaboration";
import { persistIdentity, resolveProfileEmail, resolveProfileName } from "../utils/userIdentity";

const STORAGE_KEY = "trip_collaboration_posts";
const SPLIT_KEY = "open_trips_splitwise_v1";
const OPEN_TRIP_SPLIT_ENABLED = false; // disable split UI/flows for Open Trips; use booking split instead

function OpenTrips({ onTripsLoaded }) {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncMessage, setSyncMessage] = useState("");
  const [expandedById, setExpandedById] = useState({});
  
  const [cartItems, setCartItems] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [splitDataByPost, setSplitDataByPost] = useState({});
  const [splitFormByPost, setSplitFormByPost] = useState({});
  const [memberFormByPost, setMemberFormByPost] = useState({});
  const [splitLocalLoaded, setSplitLocalLoaded] = useState(false);
  const [splitRemoteLoaded, setSplitRemoteLoaded] = useState(false);
  const [splitHydrated, setSplitHydrated] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = React.useRef(null);

  const showToast = (message, type = "info", duration = 2800) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), duration);
  };
  
  const username =
    sessionStorage.getItem("username") || localStorage.getItem("username") || "";
  const cartKey = username ? `cart-${username}` : "cart";
  const wishlistKey = username ? `wishlist-${username}` : "wishlist";
  const [email, setEmail] = useState(sessionStorage.getItem("email") || localStorage.getItem("email") || "");
  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || "").trim());
  const normalizeIdentity = (value) => (value || "").toString().trim().toLowerCase();
  const normalizeEmail = (value) => (value || "").toString().trim().toLowerCase();
  const ownerId = normalizeIdentity(email || username || "local-user");
  const ownerReady = ownerId && ownerId !== "local-user";
  const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

  const parseMaybeJson = (value) => {
    if (!value) return null;
    if (typeof value === "object") return value;
    if (typeof value !== "string") return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const persistSplitState = (
    data = splitDataByPost,
    form = splitFormByPost,
    memberForm = memberFormByPost
  ) => {
    try {
      localStorage.setItem(
        SPLIT_KEY,
        JSON.stringify({
          data,
          form,
          memberForm,
        })
      );
    } catch {}
  };

  const syncSplitToServer = async (
    postKey,
    data = splitDataByPost,
    form = splitFormByPost,
    memberForm = memberFormByPost,
    { force = false } = {}
  ) => {
    if (!postKey) return;
    if (!splitHydrated && !force) return;
    const effectiveOwner = ownerReady ? ownerId : "local-user";
    try {
      await axios.post(
        `${API_BASE}/open-trip-splits`,
        {
          ownerId: effectiveOwner,
          postKey,
          data: data[postKey] || {},
          form: form[postKey] || {},
          memberForm: memberForm[postKey] || {},
        },
        { withCredentials: true }
      );
      try {
        const res = await axios.get(`${API_BASE}/open-trip-splits`, {
          params: { ownerId },
          withCredentials: true,
        });
        const entries = Array.isArray(res?.data?.entries) ? res.data.entries : [];
        if (entries.length > 0) {
          const freshData = {};
          entries.forEach((entry) => {
            if (!entry?.postKey) return;
            freshData[entry.postKey] = ensureComputedSplit(entry.data || {});
          });
          setSplitDataByPost((prev) => ({ ...prev, ...freshData }));
        }
      } catch {}
    } catch (err) {
      console.warn("Failed to sync split to backend", err?.message || err);
      alert(`Failed to save split: ${err?.message || "network error"}`);
    }
  };

  useEffect(() => {
    const readList = (key) => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    const legacyCart = readList("trip_cart");
    const legacyWishlist = readList("trip_wishlist");
    const scopedCart = readList(cartKey);
    const scopedWishlist = readList(wishlistKey);

    const initialCart = scopedCart.length > 0 ? scopedCart : legacyCart;
    const initialWishlist = scopedWishlist.length > 0 ? scopedWishlist : legacyWishlist;

    setCartItems(initialCart);
    setWishlistItems(initialWishlist);

    if (initialCart.length > 0 && scopedCart.length === 0) {
      localStorage.setItem(cartKey, JSON.stringify(initialCart));
    }
    if (initialWishlist.length > 0 && scopedWishlist.length === 0) {
      localStorage.setItem(wishlistKey, JSON.stringify(initialWishlist));
    }
  }, [cartKey, wishlistKey]);

  useEffect(() => {
    localStorage.setItem(cartKey, JSON.stringify(cartItems));
    localStorage.setItem("trip_cart", JSON.stringify(cartItems));
  }, [cartItems, cartKey]);

  useEffect(() => {
    localStorage.setItem(wishlistKey, JSON.stringify(wishlistItems));
    localStorage.setItem("trip_wishlist", JSON.stringify(wishlistItems));
  }, [wishlistItems, wishlistKey]);

  useEffect(() => {
    if (!OPEN_TRIP_SPLIT_ENABLED) return;
    try {
      const raw = localStorage.getItem(SPLIT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          const rawData = parsed.data && typeof parsed.data === "object" ? parsed.data : {};
          const computedData = Object.fromEntries(
            Object.entries(rawData).map(([k, v]) => [k, ensureComputedSplit(v)])
          );
          setSplitDataByPost(computedData);
          setSplitFormByPost(parsed.form && typeof parsed.form === "object" ? parsed.form : {});
          setMemberFormByPost(parsed.memberForm && typeof parsed.memberForm === "object" ? parsed.memberForm : {});
        }
      }
    } catch {} finally {
      setSplitLocalLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!OPEN_TRIP_SPLIT_ENABLED) return;
    try {
      persistSplitState();
    } catch {}
  }, [splitDataByPost, splitFormByPost, memberFormByPost]);

  useEffect(() => {
    if (!OPEN_TRIP_SPLIT_ENABLED) return;
    setSplitHydrated(splitLocalLoaded && splitRemoteLoaded);
  }, [splitLocalLoaded, splitRemoteLoaded]);

  useEffect(() => {
    const savedEmail = sessionStorage.getItem("email") || "";
    if (isValidEmail(savedEmail)) {
      setEmail(savedEmail);
      return;
    }

    axios
      .get(`${API_BASE}/profile`, { withCredentials: true })
      .then((res) => {
        const profileEmail = resolveProfileEmail(res?.data);
        const profileName = resolveProfileName(res?.data);
        if (isValidEmail(profileEmail)) {
          persistIdentity({ name: profileName, email: profileEmail });
          setEmail(profileEmail);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!OPEN_TRIP_SPLIT_ENABLED) {
      setSplitRemoteLoaded(true);
      return;
    }
  }, [ownerId]);

  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (msg) => showToast(String(msg || ""), "info");
    return () => {
      window.alert = originalAlert;
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const parseAmount = (value) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  const isInCart = (postId) => cartItems.some(item => item.id === postId);
  const isInWishlist = (postId) => wishlistItems.some(item => item.id === postId);
  const getPostKey = (post) =>
    post?.id != null
      ? String(post.id)
      : `${post?.destination || "trip"}-${post?.startDate || ""}-${post?.endDate || ""}`;

  const recomputeSplit = (members, expenses) => {
    const normalizedMembers = (Array.isArray(members) ? members : [])
      .map((m) => ({
        name: (m?.name || "Trip Member").toString().trim() || "Trip Member",
        email: normalizeEmail(m?.email || m?.id || m?.name),
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
        const weights = exp?.weights && typeof exp.weights === "object" ? exp.weights : {};
        const totalWeight = splitBetween.reduce((sum, email) => {
          const w = Number(weights[email]);
          return sum + (Number.isFinite(w) && w > 0 ? w : 1);
        }, 0);

        splitBetween.forEach((email) => {
          const w = Number(weights[email]);
          const weight = Number.isFinite(w) && w > 0 ? w : 1;
          const share = totalWeight > 0 ? (amount * weight) / totalWeight : amount / splitBetween.length;
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
          toEmail: creditors[j].email,
          amount: round2(pay / 100),
          fromName: nameByEmail[debtors[i].email] || debtors[i].email,
          toName: nameByEmail[creditors[j].email] || creditors[j].email,
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

  const ensureComputedSplit = (data) => {
    if (!data || typeof data !== "object") return { members: [], expenses: [], balances: [], settlements: [], totalExpenses: 0 };
    const hasComputed =
      Array.isArray(data.balances) &&
      Array.isArray(data.settlements) &&
      Number.isFinite(Number(data.totalExpenses));
    if (hasComputed) return data;
    return recomputeSplit(data.members || [], data.expenses || []);
  };

  useEffect(() => {
    setSplitDataByPost((prev) => {
      let changed = false;
      const next = Object.fromEntries(
        Object.entries(prev).map(([k, v]) => {
          const normalized = ensureComputedSplit(v);
          if (normalized !== v) changed = true;
          return [k, normalized];
        })
      );
      if (changed) {
        persistSplitState(next, splitFormByPost, memberFormByPost);
      }
      return changed ? next : prev;
    });
  }, [splitFormByPost, memberFormByPost]);

  const ensureSplitInitialized = (post) => {
    const key = getPostKey(post);
    if (splitDataByPost[key]) return key;

    const hostEmail =
      normalizeEmail(post?.hostEmail || post?.email || post?.hostName) ||
      normalizeEmail(post?.username);
    const hostName = (post?.hostName || post?.username || "Trip Host").toString().trim() || "Trip Host";
    const selfEmail = normalizeEmail(email || username || "me@local");
    const defaultMembers = [
      hostEmail ? { name: hostName, email: hostEmail } : null,
      selfEmail ? { name: username || "You", email: selfEmail } : null,
    ].filter(Boolean);

    const initial = recomputeSplit(defaultMembers, []);
    const initialForm = {
      description: "",
      amount: "",
      paidByEmail: (hostEmail && selfEmail ? selfEmail : hostEmail) || selfEmail || "",
      splitBetweenEmails: initial.members.map((m) => m.email),
      weights: initial.members.reduce((acc, m) => {
        acc[m.email] = 1;
        return acc;
      }, {}),
      splitType: "EQUAL",
      allocations: initial.members.reduce((acc, m) => {
        acc[m.email] = "";
        return acc;
      }, {}),
    };

    const nextDataByPost = { ...splitDataByPost, [key]: initial };
    const nextFormByPost = { ...splitFormByPost, [key]: initialForm };
    const nextMemberFormByPost = { ...memberFormByPost, [key]: { name: "", email: "" } };

    setSplitDataByPost(nextDataByPost);
    setSplitFormByPost(nextFormByPost);
    setMemberFormByPost(nextMemberFormByPost);
    if (splitHydrated) {
      persistSplitState(nextDataByPost, nextFormByPost, nextMemberFormByPost);
      syncSplitToServer(key, nextDataByPost, nextFormByPost, nextMemberFormByPost);
    }
    return key;
  };

  const setSplitFormField = (postKey, field, value) => {
    const nextFormByPost = {
      ...splitFormByPost,
      [postKey]: { ...(splitFormByPost[postKey] || {}), [field]: value },
    };
    setSplitFormByPost(nextFormByPost);
    persistSplitState(splitDataByPost, nextFormByPost, memberFormByPost);
    if (splitHydrated) {
      syncSplitToServer(postKey, splitDataByPost, nextFormByPost, memberFormByPost);
    }
  };

  const toggleSplitMember = (postKey, memberEmail) => {
    const email = normalizeEmail(memberEmail);
    const current = splitFormByPost[postKey] || {};
    const list = Array.isArray(current.splitBetweenEmails) ? current.splitBetweenEmails : [];
    const exists = list.includes(email);
    const nextList = exists ? list.filter((x) => x !== email) : [...list, email];
    const nextFormByPost = {
      ...splitFormByPost,
      [postKey]: { ...current, splitBetweenEmails: nextList },
    };
    setSplitFormByPost(nextFormByPost);
    persistSplitState(splitDataByPost, nextFormByPost, memberFormByPost);
    if (splitHydrated) {
      syncSplitToServer(postKey, splitDataByPost, nextFormByPost, memberFormByPost);
    }
  };

  const setSplitWeight = (postKey, memberEmail, weight) => {
    const email = normalizeEmail(memberEmail);
    const current = splitFormByPost[postKey] || {};
    const weights = { ...(current.weights || {}) };
    const num = Number(weight);
    weights[email] = Number.isFinite(num) && num >= 0 ? num : 1;
    const nextFormByPost = {
      ...splitFormByPost,
      [postKey]: { ...current, weights },
    };
    setSplitFormByPost(nextFormByPost);
    persistSplitState(splitDataByPost, nextFormByPost, memberFormByPost);
    if (splitHydrated) {
      syncSplitToServer(postKey, splitDataByPost, nextFormByPost, memberFormByPost);
    }
  };

  const setSplitAllocation = (postKey, memberEmail, amount) => {
    const email = normalizeEmail(memberEmail);
    const current = splitFormByPost[postKey] || {};
    const allocations = { ...(current.allocations || {}) };
    const num = Number(amount);
    allocations[email] = Number.isFinite(num) && num >= 0 ? num : 0;
    const nextFormByPost = {
      ...splitFormByPost,
      [postKey]: { ...current, allocations },
    };
    setSplitFormByPost(nextFormByPost);
    persistSplitState(splitDataByPost, nextFormByPost, memberFormByPost);
  };

  const handleAddMember = (post) => {
    const key = ensureSplitInitialized(post);
    const form = memberFormByPost[key] || {};
    const name = (form.name || "").toString().trim() || "Trip Member";
    const emailVal = normalizeEmail(form.email || form.name);
    if (!emailVal) {
      alert("Please enter a member identifier (email or name).");
      return;
    }
    const data = splitDataByPost[key] || { members: [], expenses: [] };
    if ((data.members || []).some((m) => normalizeEmail(m.email) === emailVal)) {
      alert("Member already added.");
      return;
    }
    const nextMembers = [...(data.members || []), { name, email: emailVal }];
    const nextData = recomputeSplit(nextMembers, data.expenses || []);
    const nextDataByPost = { ...splitDataByPost, [key]: nextData };
    const currentForm = splitFormByPost[key] || {};
    const nextFormByPost = {
      ...splitFormByPost,
      [key]: {
        ...currentForm,
        splitBetweenEmails: [...new Set([...(currentForm.splitBetweenEmails || []), emailVal])],
        paidByEmail: currentForm.paidByEmail || emailVal,
        weights: { ...(currentForm.weights || {}), [emailVal]: 1 },
        allocations: { ...(currentForm.allocations || {}), [emailVal]: "" },
      },
    };
    const nextMemberFormByPost = { ...memberFormByPost, [key]: { name: "", email: "" } };

    setSplitDataByPost(nextDataByPost);
    setSplitFormByPost(nextFormByPost);
    setMemberFormByPost(nextMemberFormByPost);
    persistSplitState(nextDataByPost, nextFormByPost, nextMemberFormByPost);
    syncSplitToServer(key, nextDataByPost, nextFormByPost, nextMemberFormByPost, { force: true });
  };

  const handleAddExpense = (post) => {
    const key = ensureSplitInitialized(post);
    const data = splitDataByPost[key] || { members: [], expenses: [] };
    const form = splitFormByPost[key] || {};
    const description = (form.description || "").toString().trim();
    const amount = parseAmount(form.amount);
    const paidByEmail = normalizeEmail(form.paidByEmail);
    const splitBetween = (Array.isArray(form.splitBetweenEmails) ? form.splitBetweenEmails : [])
      .map((x) => normalizeEmail(x))
      .filter(Boolean);
    const weights = form.weights && typeof form.weights === "object" ? form.weights : {};
    const allocations = form.allocations && typeof form.allocations === "object" ? form.allocations : {};
    const splitType = (form.splitType || "").toString().toUpperCase() === "CUSTOM" ? "CUSTOM" : "EQUAL";

    if (!description) {
      alert("Please enter expense description.");
      return;
    }
    if (amount <= 0) {
      alert("Please enter valid amount.");
      return;
    }
    if (!paidByEmail) {
      alert("Choose who paid.");
      return;
    }
    if (splitBetween.length === 0) {
      alert("Select at least one member to split with.");
      return;
    }

    const paidByName =
      (data.members || []).find((m) => normalizeEmail(m.email) === paidByEmail)?.name ||
      post?.hostName ||
      "Trip Member";

    const expense = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      description,
      amount: round2(amount),
      paidByEmail,
      paidByName,
      splitBetweenEmails: splitBetween,
      weights: weights,
      allocations: allocations,
      splitType,
      createdAt: new Date().toISOString(),
    };

    const nextExpenses = [expense, ...(data.expenses || [])];
    const nextData = recomputeSplit(data.members || [], nextExpenses);
    const nextDataByPost = { ...splitDataByPost, [key]: nextData };
    const nextFormByPost = {
      ...splitFormByPost,
      [key]: { ...(splitFormByPost[key] || {}), description: "", amount: "" },
    };

    setSplitDataByPost(nextDataByPost);
    setSplitFormByPost(nextFormByPost);
    persistSplitState(nextDataByPost, nextFormByPost, memberFormByPost);
    syncSplitToServer(key, nextDataByPost, nextFormByPost, memberFormByPost, { force: true });
  };

  const handleSaveSplit = (post) => {
    const key = ensureSplitInitialized(post);
    const dataSnapshot = ensureComputedSplit(splitDataByPost[key] || {});
    const nextDataByPost = { ...splitDataByPost, [key]: dataSnapshot };
    persistSplitState(nextDataByPost, splitFormByPost, memberFormByPost);
    syncSplitToServer(key, nextDataByPost, splitFormByPost, memberFormByPost, { force: true });
    alert("Split saved to backend.");
  };

  const handleAddToCart = (post) => {
    if (isInCart(post.id)) {
      alert("Already in cart!");
      return;
    }
    
    const cartItem = {
      id: post.id,
      destination: post.destination,
      startDate: post.startDate,
      endDate: post.endDate,
      seatsAvailable: post.seatsAvailable,
      totalCost: post.totalCost,
      hostName: post.hostName,
      flight: parseMaybeJson(post.flightDetails),
      returnFlight: parseMaybeJson(post.returnFlightDetails),
      hotel: parseMaybeJson(post.hotelDetails),
      flightDetails: post.flightDetails || null,
      returnFlightDetails: post.returnFlightDetails || null,
      hotelDetails: post.hotelDetails || null,
      sourceType: "OPEN_TRIP",
    };
    
    setCartItems([...cartItems, cartItem]);
    alert("Added to cart!");
  };

  const handleWishlistToggle = (post) => {
    if (isInWishlist(post.id)) {
      setWishlistItems(wishlistItems.filter(item => item.id !== post.id));
      alert("Removed from wishlist");
    } else {
      const wishlistItem = {
        id: post.id,
        destination: post.destination,
        startDate: post.startDate,
        endDate: post.endDate,
        seatsAvailable: post.seatsAvailable,
        totalCost: post.totalCost,
        hostName: post.hostName,
        flightDetails: post.flightDetails || null,
        returnFlightDetails: post.returnFlightDetails || null,
        hotelDetails: post.hotelDetails || null,
        sourceType: "OPEN_TRIP",
      };
      setWishlistItems([...wishlistItems, wishlistItem]);
      alert("Added to wishlist!");
    }
  };

  const getLocalPosts = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const sortPostsByCreatedAt = (items) =>
    [...items].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const normalizeText = (value) => (value || "").toString().trim().toLowerCase();

  const hasBookingDetails = (post) =>
    Boolean(post?.flightDetails || post?.returnFlightDetails || post?.hotelDetails);

  const mergeMissingDetailsFromSavedTrips = useCallback(async (items) => {
    const list = Array.isArray(items) ? items : [];
    const targets = list.filter((post) => !hasBookingDetails(post) && post?.hostName);
    if (targets.length === 0) return list;

    const uniqueHosts = [...new Set(targets.map((post) => post.hostName).filter(Boolean))];
    const savedByHost = new Map();

    await Promise.all(
      uniqueHosts.map(async (hostName) => {
        try {
          const res = await axios.get(`${API_BASE}/trips/saved`, {
            params: { username: hostName },
            withCredentials: true,
          });
          const trips = Array.isArray(res?.data) ? res.data : [];
          savedByHost.set(hostName, trips);
        } catch {
          savedByHost.set(hostName, []);
        }
      })
    );

    return list.map((post) => {
      if (hasBookingDetails(post) || !post?.hostName) return post;
      const candidates = savedByHost.get(post.hostName) || [];
      const match = [...candidates]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .find((saved) =>
          normalizeText(saved.destination) === normalizeText(post.destination) &&
          normalizeText(saved.startDate) === normalizeText(post.startDate) &&
          normalizeText(saved.endDate) === normalizeText(post.endDate)
        );
      if (!match) return post;
      return {
        ...post,
        flightDetails: post.flightDetails || match.flightDetails || null,
        returnFlightDetails: post.returnFlightDetails || match.returnFlightDetails || null,
        hotelDetails: post.hotelDetails || match.hotelDetails || null,
      };
    });
  }, []);

  const loadPosts = useCallback(async () => {
    setIsLoading(true);
    const cached = getLocalPosts();
    if (cached.length > 0) {
      const filteredCached = cached.filter((post) => {
        const hasHost = Boolean((post.hostEmail || post.email || "").toString().trim());
        const hasSeats = (Number(post.seatsAvailable) || 0) > 0;
        const notPast = post.endDate ? new Date(post.endDate) >= new Date(new Date().toDateString()) : true;
        return hasHost && hasSeats && notPast;
      });
      setPosts(sortPostsByCreatedAt(filteredCached));
      setIsLoading(false);
    }
    try {
      const res = await axios.get(`${API_BASE}/collaboration-trips`, { withCredentials: true });
      const list = Array.isArray(res.data) ? res.data : [];
      const filtered = list.filter((post) => {
        const hasHost = Boolean((post.hostEmail || post.email || "").toString().trim());
        const hasSeats = (Number(post.seatsAvailable) || 0) > 0;
        const notPast = post.endDate ? new Date(post.endDate) >= new Date(new Date().toDateString()) : true;
        return hasHost && hasSeats && notPast;
      });
      // Skip enrichment - use data directly for speed
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      const sorted = sortPostsByCreatedAt(filtered);
      setPosts(sorted);
      if (onTripsLoaded) onTripsLoaded(sorted);
      setSyncMessage("");
    } catch (error) {
      const localPosts = getLocalPosts();
      const filteredLocal = localPosts.filter((post) => Boolean((post.hostEmail || post.email || "").toString().trim()) && (Number(post.seatsAvailable) || 0) > 0);
      setPosts(sortPostsByCreatedAt(filteredLocal));
      setSyncMessage("Showing local posts. Backend sync is not available.");
    } finally {
      setIsLoading(false);
    }
  }, [onTripsLoaded]);

  useEffect(() => {
    loadPosts();

    const reloadOnStorage = () => {
      const filteredLocal = getLocalPosts().filter((post) => Boolean((post.hostEmail || post.email || "").toString().trim()) && (Number(post.seatsAvailable) || 0) > 0);
      setPosts(sortPostsByCreatedAt(filteredLocal));
    };
    const reloadOnSeatUpdate = () => {
      loadPosts();
    };
    window.addEventListener("storage", reloadOnStorage);
    window.addEventListener("trip-collaboration-posts-updated", reloadOnSeatUpdate);
    return () => {
      window.removeEventListener("storage", reloadOnStorage);
      window.removeEventListener("trip-collaboration-posts-updated", reloadOnSeatUpdate);
    };
  }, [loadPosts]);

  const parseDetails = (value) => {
    if (!value) return null;
    if (typeof value === "object") return value;
    if (typeof value !== "string") return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const formatDateOnly = (value) => {
    if (!value) return "N/A";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateTime = (value) => {
    if (!value) return "N/A";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const toggleTripDetails = (postId) => {
    const key = String(postId);
    setExpandedById((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleRequestToJoin = async (post) => {
    if ((Number(post.seatsAvailable) || 0) <= 0) {
      showToast("This trip is full. No seats available.", "error");
      return;
    }

    const hostIdentity = (post.hostEmail || post.email || post.hostName || "").toString().trim();
    const requesterIdentity = (email || username || "").toString().trim();

    if (!hostIdentity) {
      alert("Host identity is missing for this trip.");
      return;
    }
    if (!requesterIdentity) {
      alert("Your account identity is missing. Please sign in and try again.");
      return;
    }
    if (normalizeIdentity(hostIdentity) === normalizeIdentity(requesterIdentity)) {
      alert("You cannot request to join your own trip.");
      return;
    }

    try {
      await axios.post(
        `${API_BASE}/collaboration-trips/join-requests`,
        {
          postId: Number(post.id) || null,
          destination: post.destination,
          startDate: post.startDate,
          endDate: post.endDate,
          hostName: post.hostName || "Trip Host",
          hostEmail: hostIdentity,
          requesterName: username || "TripWeaver User",
          requesterEmail: requesterIdentity,
          status: "PENDING",
          origin: post.origin,
          pricePerPerson: post.pricePerPerson,
        },
        { withCredentials: true }
      );
      showToast("Request sent to host.", "success");
      // Reload so trips that just became full disappear from the list
      loadPosts();
    } catch (err) {
      const msg = (err?.response?.data?.message || err?.message || "").toString().toLowerCase();
      if (msg.includes("already sent") || msg.includes("duplicate")) {
        showToast("You already sent a pending request for this trip.", "warning");
      } else {
        console.error("Failed to send join request", err);
        showToast("Failed to send join request. Try again.", "error");
      }
    }
  };

  return (
    <>
      <div className="open-trips-page">
        <div className="open-trips-container">
          <h2>Open Trips</h2>
          <p>Trips available to join for shared cost and company.</p>
          {syncMessage && <p className="open-trips-sync">{syncMessage}</p>}

          {isLoading ? (
            <div className="open-trips-list">
              {[1,2,3].map(i => (
                <div key={i} className="open-trips-card" style={{ opacity: 0.5 }}>
                  <div style={{ background: '#e0e0e0', height: 24, borderRadius: 6, marginBottom: 10, width: '60%', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ background: '#e0e0e0', height: 16, borderRadius: 6, marginBottom: 8, width: '40%' }} />
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    {[1,2,3].map(j => <div key={j} style={{ background: '#e0e0e0', height: 28, borderRadius: 20, width: 90 }} />)}
                  </div>
                  <div style={{ background: '#e0e0e0', height: 40, borderRadius: 8, width: '100%' }} />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="open-trips-empty">
              No open trips yet. Publish from the Trips summary page.
            </div>
          ) : (
            <div className="open-trips-list">
              {posts.map((post) => {
                const expanded = expandedById[String(post.id)];
                const splitKey = getPostKey(post);
                const outbound = parseMaybeJson(post.flightDetails);
                const hotel = parseMaybeJson(post.hotelDetails);
                const splitData = splitDataByPost[splitKey] || { members: [], expenses: [] };
                const members = Array.isArray(splitData.members) ? splitData.members : [];
                const splitForm = splitFormByPost[splitKey] || {};

                return (
                  <article className="open-trips-card" key={post.id}>
                  <div className="open-trips-header">
                    <h3 className="open-trips-title">
                      {post.origin ? `${post.origin} -> ${post.destination}` : post.destination}
                    </h3>
                    <p className="open-trips-dates">
                      {formatDateOnly(post.startDate)} - {formatDateOnly(post.endDate)}
                    </p>
                  </div>

                  <div className="open-trips-badges">
                    <span className="open-trips-badge">Seats: {post.seatsAvailable}</span>
                    <span className="open-trips-badge">Total: Rs.{post.totalCost}</span>
                    <span className="open-trips-badge">Per Person: Rs.{post.pricePerPerson || Math.ceil(post.totalCost / (post.seatsAvailable + 1))}</span>
                  </div>
                  
                  <div className="open-trips-actions-simple">
                    <button
                      onClick={() => handleWishlistToggle(post)}
                      className={`action-btn ${isInWishlist(post.id) ? "active-wishlist" : "wishlist"}`}
                    >
                      {isInWishlist(post.id) ? "Saved" : "Save"}
                    </button>
                    
                    <button
                      onClick={() => handleAddToCart(post)}
                      disabled={isInCart(post.id)}
                      className={`action-btn ${isInCart(post.id) ? "active-cart" : "cart"}`}
                    >
                      {isInCart(post.id) ? "Added" : "Add"}
                    </button>
                    
                    <button
                      className="open-trips-toggle"
                      type="button"
                      onClick={() => toggleTripDetails(post.id)}
                    >
                      {expanded ? "Hide Details" : "Show Details"}
                    </button>
                  </div>

                  {expanded ? (
                    <div className="open-trips-meta">
                      <h4 className="open-trips-detail-title">Trip Details</h4>
                      <div className="open-trips-meta-row">
                        <span className="open-trips-label">Destination</span>
                        <span className="open-trips-value">{post.destination || "N/A"}</span>
                      </div>
                      <div className="open-trips-meta-row">
                        <span className="open-trips-label">Start Date</span>
                        <span className="open-trips-value">{formatDateOnly(post.startDate)}</span>
                      </div>
                      <div className="open-trips-meta-row">
                        <span className="open-trips-label">End Date</span>
                        <span className="open-trips-value">{formatDateOnly(post.endDate)}</span>
                      </div>
                      <div className="open-trips-meta-row">
                        <span className="open-trips-label">Host</span>
                        <span className="open-trips-value">{post.hostName || "Trip Host"}</span>
                      </div>

                      <h4 className="open-trips-detail-title">Departure Flight</h4>
                      {outbound ? (
                        <>
                          <div className="open-trips-meta-row">
                            <span className="open-trips-label">Airline</span>
                            <span className="open-trips-value">{outbound.airline || "N/A"}</span>
                          </div>
                          <div className="open-trips-meta-row">
                            <span className="open-trips-label">Flight No</span>
                            <span className="open-trips-value">{outbound.flightNumber || "N/A"}</span>
                          </div>
                          <div className="open-trips-meta-row">
                            <span className="open-trips-label">From/To</span>
                            <span className="open-trips-value">
                              {(outbound.departureAirport || "N/A")} to {(outbound.arrivalAirport || "N/A")}
                            </span>
                          </div>
                          <div className="open-trips-meta-row">
                            <span className="open-trips-label">Departure</span>
                            <span className="open-trips-value">{formatDateTime(outbound.departureTime)}</span>
                          </div>
                          <div className="open-trips-meta-row">
                            <span className="open-trips-label">Arrival</span>
                            <span className="open-trips-value">{formatDateTime(outbound.arrivalTime)}</span>
                          </div>
                          <div className="open-trips-meta-row">
                            <span className="open-trips-label">Price</span>
                            <span className="open-trips-value">{outbound.price || "N/A"}</span>
                          </div>
                        </>
                      ) : (
                        <p className="open-trips-empty-line">Departure flight details not available.</p>
                      )}

                      <h4 className="open-trips-detail-title">Hotel</h4>
                      {hotel ? (
                        <>
                          <div className="open-trips-meta-row">
                            <span className="open-trips-label">Hotel Name</span>
                            <span className="open-trips-value">{hotel.name || "N/A"}</span>
                          </div>
                          <div className="open-trips-meta-row">
                            <span className="open-trips-label">Address</span>
                            <span className="open-trips-value">{hotel.address || "N/A"}</span>
                          </div>
                          <div className="open-trips-meta-row">
                            <span className="open-trips-label">Price/Night</span>
                            <span className="open-trips-value">Rs.{hotel.price || 0}</span>
                          </div>
                        </>
                          ) : (
                        <p className="open-trips-empty-line">Hotel details not available.</p>
                      )}

                      {OPEN_TRIP_SPLIT_ENABLED ? (
                      <div className="open-trips-splitwise">
                        <h4>Split expenses (local)</h4>
                        <div className="open-trips-split-members">
                          {members.map((member) => {
                              const emailId = normalizeEmail(member.email);
                              const checked = (splitForm.splitBetweenEmails || []).includes(emailId);
                              const weight = (splitForm.weights || {})[emailId] ?? 1;
                              return (
                                <label key={`${splitKey}-${emailId}`} className="open-trips-check">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(checked)}
                                    onChange={() => toggleSplitMember(splitKey, emailId)}
                                  />
                                  <span>{member.name || "Trip Member"} ({emailId || "id missing"})</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    style={{ width: "64px", marginLeft: "auto" }}
                                    value={weight}
                                    onChange={(e) => setSplitWeight(splitKey, emailId, e.target.value)}
                                  />
                                </label>
                              );
                            })
                          }
                        </div>
                      </div>
                      ) : null}
                    </div>
                  ) : null}

                  {post.note && <p className="open-trips-note">{post.note}</p>}
                  <button
                    className="open-trips-request"
                    onClick={() => handleRequestToJoin(post)}
                    disabled={(Number(post.seatsAvailable) || 0) <= 0}
                    style={(Number(post.seatsAvailable) || 0) <= 0 ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                  >
                    {(Number(post.seatsAvailable) || 0) <= 0 ? "Trip Full" : "Request to Join"}
                  </button>
                </article>
              );
              })}
            </div>
          )}
        </div>
      </div>
      {toast ? (
        <div
          style={{
            position: "fixed",
            right: "16px",
            bottom: "16px",
            minWidth: "260px",
            maxWidth: "360px",
            padding: "12px 14px",
            borderRadius: "10px",
            color: "#fff",
            background:
              toast.type === "success"
                ? "linear-gradient(135deg,#22c55e,#16a34a)"
                : toast.type === "warning"
                ? "linear-gradient(135deg,#f59e0b,#d97706)"
                : toast.type === "error"
                ? "linear-gradient(135deg,#dc2626,#b91c1c)"
                : "linear-gradient(135deg,#2563eb,#1d4ed8)",
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

export default OpenTrips;
