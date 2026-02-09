// Dashboard logic for running audits and managing history.
const form = document.getElementById("audit-form");
const loadingEl = document.getElementById("loading");
const resultsEl = document.getElementById("results");
const emptyStateEl = document.getElementById("empty-state");
const historyEl = document.getElementById("history");
const clearHistoryBtn = document.getElementById("clear-history");

const auditLink = document.getElementById("audit-link");
const landingLink = document.getElementById("landing-link");
const printLink = document.getElementById("print-link");
const openAuditBtn = document.getElementById("open-audit");
const openLandingBtn = document.getElementById("open-landing");
const openPrintBtn = document.getElementById("open-print");
const copyLinksBtn = document.getElementById("copy-links");
const qrWrapper = document.getElementById("qr-wrapper");
const qrImage = document.getElementById("qr-image");
const menuImageInput = document.getElementById("menu-image-url");
const menuImageFileInput = document.getElementById("menu-image-file");
const menuSlugInput = document.getElementById("menu-slug");
const generateMenuBtn = document.getElementById("generate-menu");
const menuStatus = document.getElementById("menu-status");

const STORAGE_KEY = "auditDashboardRuns";
const MAX_HISTORY = 20;

// Helper: quick slugify for menu filenames.
const slugify = (value) =>
  (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Helper: safely parse stored JSON or return an empty array.
const readHistory = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (error) {
    console.warn("Unable to parse history", error);
    return [];
  }
};

// Helper: persist history to localStorage.
const saveHistory = (history) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
};

// Helper: fill the form with stored values.
const populateForm = (data) => {
  Object.entries(data).forEach(([key, value]) => {
    const input = form.querySelector(`[name="${key}"]`);
    if (input) {
      input.value = value || "";
    }
  });
};

// Render history cards from localStorage.
const renderHistory = () => {
  const history = readHistory();
  historyEl.innerHTML = "";

  if (history.length === 0) {
    historyEl.innerHTML =
      '<p class="text-sm text-slate-400">No runs yet. Your latest audits will appear here.</p>';
    return;
  }

  history.forEach((entry) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "history-card";
    card.innerHTML = `
      <strong class="text-sm text-slate-100">${entry.biz || "Untitled"}</strong>
      <span>${entry.city || ""}</span>
      <span class="text-xs text-slate-500">${entry.timestamp}</span>
    `;

    // Clicking a history card repopulates the form.
    card.addEventListener("click", () => {
      populateForm(entry);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    historyEl.appendChild(card);
  });
};

// Update result UI with links and optional QR image.
const showResults = ({ auditUrl, landingUrl, printUrl, qrImageUrl }) => {
  auditLink.href = auditUrl || "#";
  auditLink.textContent = auditUrl ? `Audit URL → ${auditUrl}` : "Audit URL";
  landingLink.href = landingUrl || "#";
  landingLink.textContent = landingUrl ? `Landing URL → ${landingUrl}` : "Landing URL";
  printLink.href = printUrl || "#";
  printLink.textContent = printUrl ? `Print URL → ${printUrl}` : "Print URL";

  openAuditBtn.onclick = () => auditUrl && window.open(auditUrl, "_blank");
  openLandingBtn.onclick = () => landingUrl && window.open(landingUrl, "_blank");
  openPrintBtn.onclick = () => printUrl && window.open(printUrl, "_blank");

  copyLinksBtn.onclick = async () => {
    const bundle = [auditUrl, landingUrl, printUrl].filter(Boolean).join("\n");
    if (!bundle) return;
    await navigator.clipboard.writeText(bundle);
    copyLinksBtn.textContent = "Copied!";
    setTimeout(() => (copyLinksBtn.textContent = "Copy all links"), 1500);
  };

  if (qrImageUrl) {
    qrImage.src = qrImageUrl;
    qrWrapper.classList.remove("hidden");
  } else {
    qrWrapper.classList.add("hidden");
  }

  emptyStateEl.classList.add("hidden");
  resultsEl.classList.remove("hidden");
};

// Toggle loading state for the form.
const setLoading = (isLoading) => {
  loadingEl.classList.toggle("hidden", !isLoading);
  resultsEl.classList.toggle("hidden", isLoading);
  if (isLoading) {
    emptyStateEl.classList.add("hidden");
  }
};

// Update menu automation status text.
const setMenuStatus = (message, tone = "info") => {
  menuStatus.textContent = message;
  menuStatus.classList.remove("text-emerald-300", "text-rose-300", "text-slate-400");
  if (tone === "success") menuStatus.classList.add("text-emerald-300");
  else if (tone === "error") menuStatus.classList.add("text-rose-300");
  else menuStatus.classList.add("text-slate-400");
};

// Menu automation handler: generate menu HTML and save to /menus via GitHub API.
generateMenuBtn.addEventListener("click", async () => {
  const imageUrl = menuImageInput.value.trim();
  const imageFile = menuImageFileInput?.files?.[0];
  const bizName = form.querySelector("[name=\"biz\"]")?.value.trim();
  const slug = menuSlugInput.value.trim() || slugify(bizName);

  if (!imageUrl && !imageFile) {
    setMenuStatus("Add a menu image URL or upload a file.", "error");
    return;
  }

  if (!slug) {
    setMenuStatus("Add a menu slug or business name.", "error");
    return;
  }

  try {
    generateMenuBtn.disabled = true;
    generateMenuBtn.textContent = "Generating...";
    setMenuStatus("Generating menu with AI and saving to GitHub...");

    let response;
    if (imageFile) {
      const formData = new FormData();
      formData.append("menuImage", imageFile);
      formData.append("bizName", bizName || "");
      formData.append("slug", slug);
      if (imageUrl) formData.append("imageUrl", imageUrl);
      response = await fetch("/api/menu-build", {
        method: "POST",
        body: formData,
      });
    } else {
      response = await fetch("/api/menu-build", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl,
          bizName,
          slug,
        }),
      });
    }

    if (!response.ok) {
      throw new Error(`Menu generation failed with ${response.status}`);
    }

    const result = await response.json();
    const menuField = form.querySelector("[name=\"menu\"]");
    if (menuField && result.menuUrl) {
      menuField.value = result.menuUrl;
    }

    setMenuStatus(`Menu saved: ${result.menuUrl}`, "success");
  } catch (error) {
    console.error(error);
    setMenuStatus("Menu generation failed. Check the API keys and GitHub settings.", "error");
  } finally {
    generateMenuBtn.disabled = false;
    generateMenuBtn.textContent = "Generate Menu";
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setLoading(true);

  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  try {
    // Send the audit payload to the Cloudflare Pages Function.
    const response = await fetch("/api/audit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Audit failed with ${response.status}`);
    }

    const result = await response.json();

    // Normalize the response keys expected by the UI.
    showResults({
      auditUrl: result.auditUrl || result.audit_url || result.audit,
      landingUrl: result.landingUrl || result.landing_url || result.landing,
      printUrl: result.printUrl || result.print_url || result.print,
      qrImageUrl: result.qrImage || result.qr || result.qr_image,
    });

    // Save run to history with timestamp.
    const history = readHistory();
    const timestamp = new Date().toLocaleString();
    const newEntry = { ...payload, timestamp };
    const updated = [newEntry, ...history].slice(0, MAX_HISTORY);
    saveHistory(updated);
    renderHistory();
  } catch (error) {
    console.error(error);
    emptyStateEl.textContent = "Audit failed. Please check the webhook configuration.";
    emptyStateEl.classList.remove("hidden");
  } finally {
    setLoading(false);
  }
});

// Clear all stored history.
clearHistoryBtn.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  renderHistory();
});

// Initial render of stored runs.
renderHistory();
