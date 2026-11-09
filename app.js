const STORAGE_KEY = "setup-sparziel-v1";

const DEFAULT_ITEMS = [
  {
    id: "pc",
    name: "PC",
    note: "inklusive 29,90 € Versand",
    priceCents: 258846,
  },
  {
    id: "monitor",
    name: "Monitor",
    note: "Gigabyte GS27QA",
    priceCents: 12990,
  },
  {
    id: "mouse",
    name: "Maus",
    note: "Logitech G305 Lightspeed",
    priceCents: 3999,
  },
  {
    id: "keyboard",
    name: "Tastatur",
    note: "Cherry MX 2.0 S",
    priceCents: 4199,
  },
  {
    id: "windows",
    name: "Windows",
    note: "Windows 11 Pro",
    priceCents: 12900,
  },
];

const currency = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

const elements = {
  savedValue: document.querySelector("#savedValue"),
  goalValue: document.querySelector("#goalValue"),
  percentValue: document.querySelector("#percentValue"),
  remainingValue: document.querySelector("#remainingValue"),
  overallProgress: document.querySelector("#overallProgress"),
  overallProgressFill: document.querySelector("#overallProgressFill"),
  amountInput: document.querySelector("#amountInput"),
  addButton: document.querySelector("#addButton"),
  subtractButton: document.querySelector("#subtractButton"),
  setButton: document.querySelector("#setButton"),
  resetButton: document.querySelector("#resetButton"),
  formMessage: document.querySelector("#formMessage"),
  targetList: document.querySelector("#targetList"),
  targetTemplate: document.querySelector("#targetTemplate"),
  editPricesButton: document.querySelector("#editPricesButton"),
  pricesDialog: document.querySelector("#pricesDialog"),
  pricesForm: document.querySelector("#pricesForm"),
  priceFields: document.querySelector("#priceFields"),
  savePricesButton: document.querySelector("#savePricesButton"),
  installButton: document.querySelector("#installButton"),
  iosInstallHint: document.querySelector("#iosInstallHint"),
};

let state = loadState();
let deferredInstallPrompt = null;

function loadState() {
  const fallback = {
    savedCents: 0,
    items: structuredClone(DEFAULT_ITEMS),
  };

  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!stored || !Array.isArray(stored.items)) return fallback;

    const prices = new Map(stored.items.map((item) => [item.id, item.priceCents]));
    return {
      savedCents: Number.isFinite(stored.savedCents) ? Math.max(0, stored.savedCents) : 0,
      items: DEFAULT_ITEMS.map((item) => ({
        ...item,
        priceCents: Number.isFinite(prices.get(item.id))
          ? Math.max(0, prices.get(item.id))
          : item.priceCents,
      })),
    };
  } catch {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatMoney(cents) {
  return currency.format(cents / 100);
}

function totalGoal() {
  return state.items.reduce((sum, item) => sum + item.priceCents, 0);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function render() {
  const goal = totalGoal();
  const progress = goal === 0 ? 100 : clamp((state.savedCents / goal) * 100, 0, 100);
  const remaining = Math.max(goal - state.savedCents, 0);
  const surplus = Math.max(state.savedCents - goal, 0);

  elements.savedValue.textContent = formatMoney(state.savedCents);
  elements.goalValue.textContent = formatMoney(goal);
  elements.percentValue.textContent = `${Math.floor(progress)} %`;
  elements.remainingValue.textContent = surplus > 0
    ? `${formatMoney(surplus)} übrig`
    : remaining === 0
      ? "Ziel erreicht"
      : `Noch ${formatMoney(remaining)}`;
  elements.overallProgressFill.style.width = `${progress}%`;
  elements.overallProgress.setAttribute("aria-valuenow", String(Math.round(progress)));

  renderTargets();
}

function renderTargets() {
  elements.targetList.replaceChildren();
  let availableCents = state.savedCents;

  state.items.forEach((item) => {
    const fundedCents = clamp(availableCents, 0, item.priceCents);
    const progress = item.priceCents === 0 ? 100 : (fundedCents / item.priceCents) * 100;
    availableCents = Math.max(availableCents - item.priceCents, 0);

    const fragment = elements.targetTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".target-card");
    const progressTrack = fragment.querySelector(".progress-track");

    fragment.querySelector(".target-name").textContent = item.name;
    fragment.querySelector(".target-note").textContent = item.note;
    fragment.querySelector(".target-price").textContent = formatMoney(item.priceCents);
    fragment.querySelector(".progress-fill").style.width = `${progress}%`;
    fragment.querySelector(".target-funded").textContent = `${formatMoney(fundedCents)} gespart`;
    fragment.querySelector(".target-percent").textContent = `${Math.floor(progress)} %`;

    progressTrack.setAttribute("aria-label", `Sparfortschritt für ${item.name}`);
    progressTrack.setAttribute("aria-valuenow", String(Math.round(progress)));
    if (progress >= 100) card.classList.add("is-complete");

    elements.targetList.append(fragment);
  });
}

function readAmount() {
  const normalized = elements.amountInput.value.trim().replace(",", ".");
  const amount = Number.parseFloat(normalized);

  if (!Number.isFinite(amount) || amount < 0) {
    elements.formMessage.textContent = "Bitte gib einen gültigen Betrag ein.";
    return null;
  }

  elements.formMessage.textContent = "";
  return Math.round(amount * 100);
}

function clearAmountInput() {
  elements.amountInput.value = "";
  elements.amountInput.focus();
}

function updateSaved(mode) {
  const amountCents = readAmount();
  if (amountCents === null) return;

  if (mode === "add") state.savedCents += amountCents;
  if (mode === "subtract") state.savedCents = Math.max(0, state.savedCents - amountCents);
  if (mode === "set") state.savedCents = amountCents;

  saveState();
  render();
  clearAmountInput();
}

function openPriceEditor() {
  elements.priceFields.replaceChildren();

  state.items.forEach((item) => {
    const wrapper = document.createElement("div");
    wrapper.className = "price-field";

    const label = document.createElement("label");
    label.htmlFor = `price-${item.id}`;
    label.textContent = item.name;

    const input = document.createElement("input");
    input.id = `price-${item.id}`;
    input.name = item.id;
    input.type = "number";
    input.min = "0";
    input.step = "0.01";
    input.inputMode = "decimal";
    input.required = true;
    input.value = (item.priceCents / 100).toFixed(2);

    wrapper.append(label, input);
    elements.priceFields.append(wrapper);
  });

  elements.pricesDialog.showModal();
}

function savePrices() {
  const formData = new FormData(elements.pricesForm);

  state.items = state.items.map((item) => {
    const rawValue = String(formData.get(item.id) ?? "").replace(",", ".");
    const parsed = Number.parseFloat(rawValue);
    return {
      ...item,
      priceCents: Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100)) : item.priceCents,
    };
  });

  saveState();
  render();
}

elements.addButton.addEventListener("click", () => updateSaved("add"));
elements.subtractButton.addEventListener("click", () => updateSaved("subtract"));
elements.setButton.addEventListener("click", () => updateSaved("set"));
elements.amountInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") updateSaved("add");
});

elements.editPricesButton.addEventListener("click", openPriceEditor);
elements.pricesForm.addEventListener("submit", (event) => {
  if (event.submitter === elements.savePricesButton) savePrices();
});

elements.resetButton.addEventListener("click", () => {
  const confirmed = window.confirm("Gesparten Betrag und geänderte Preise wirklich zurücksetzen?");
  if (!confirmed) return;

  state = {
    savedCents: 0,
    items: structuredClone(DEFAULT_ITEMS),
  };
  saveState();
  render();
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  elements.installButton.hidden = false;
});

elements.installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  elements.installButton.hidden = true;
});

window.addEventListener("appinstalled", () => {
  elements.installButton.hidden = true;
  elements.iosInstallHint.hidden = true;
});

function showIosInstallHint() {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  elements.iosInstallHint.hidden = !(isIos && !isStandalone);
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // Die App funktioniert weiterhin online, auch wenn die Registrierung fehlschlägt.
    });
  });
}

showIosInstallHint();
render();
