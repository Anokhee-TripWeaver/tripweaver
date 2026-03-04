const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || "").trim());

export const resolveProfileEmail = (profile) => {
  const candidates = [
    profile?.email,
    profile?.userEmail,
    profile?.mail,
    profile?.user?.email,
    profile?.principal?.email,
    profile?.attributes?.email,
  ];

  const found = candidates.find((item) => isValidEmail(item));
  return (found || "").trim().toLowerCase();
};

export const resolveProfileName = (profile) => {
  const candidates = [
    profile?.name,
    profile?.username,
    profile?.user?.name,
    profile?.user?.username,
    profile?.principal?.name,
    profile?.attributes?.name,
    profile?.attributes?.given_name,
  ];
  return (candidates.find((item) => (item || "").toString().trim()) || "").toString().trim();
};

export const persistIdentity = ({ name, email }) => {
  const normalizedName = (name || "").toString().trim();
  const normalizedEmail = (email || "").toString().trim().toLowerCase();

  if (normalizedName) {
    sessionStorage.setItem("username", normalizedName);
    localStorage.setItem("username", normalizedName);
  }
  if (isValidEmail(normalizedEmail)) {
    sessionStorage.setItem("email", normalizedEmail);
    localStorage.setItem("email", normalizedEmail);
  }
};

