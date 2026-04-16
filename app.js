const modal = document.getElementById("offer-modal");
const openBtn = document.getElementById("open-offer");
const closeBtn = document.getElementById("close-offer");
const cancelBtn = document.getElementById("cancel-offer");

const items = document.querySelectorAll(".selectable");
const offerBox = document.getElementById("offer-items");
const fairnessBox = document.getElementById("fairness");

let total = 0;
let selected = [];
const target = 80;
let modalOpen = false;

openBtn.addEventListener("click", () => {
  modal.classList.remove("hidden");
  modalOpen = true;
  document.body.classList.add("select-mode");
});

function closeModal() {
  modal.classList.add("hidden");
  modalOpen = false;
  document.body.classList.remove("select-mode");
  reset();
}

closeBtn.addEventListener("click", closeModal);
cancelBtn.addEventListener("click", closeModal);

modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});

items.forEach((item) => {
  item.addEventListener("click", () => {
    if (!modalOpen) return;

    const value = Number(item.dataset.value);
    const name = item.dataset.name;

    if (item.classList.contains("selected")) {
      item.classList.remove("selected");
      selected = selected.filter((entry) => entry.name !== name);
      total -= value;
    } else {
      item.classList.add("selected");
      selected.push({ name, value });
      total += value;
    }

    update();
  });
});

function update() {
  if (!selected.length) {
    offerBox.innerHTML = "Click items in your inventory";
    offerBox.classList.add("empty");
  } else {
    const chips = selected
      .map((entry) => `<span class="chip collection">${entry.name}</span>`)
      .join("");

    offerBox.innerHTML = `${chips}<div class="value-line">Total Value: ${total}</div>`;
    offerBox.classList.remove("empty");
  }

  let label = "No offer yet";
  let cls = "neutral";

  if (total > 0) {
    if (total < target * 0.8) {
      label = `Underpay (${total} vs ${target})`;
      cls = "under";
    } else if (total > target * 1.2) {
      label = `Overpay (${total} vs ${target})`;
      cls = "over";
    } else {
      label = `Fair (${total} vs ${target})`;
      cls = "fair";
    }
  }

  fairnessBox.textContent = label;
  fairnessBox.className = `fairness ${cls}`;
}

function reset() {
  total = 0;
  selected = [];

  items.forEach((item) => item.classList.remove("selected"));

  offerBox.innerHTML = "Click items in your inventory";
  offerBox.classList.add("empty");

  fairnessBox.textContent = "No offer yet";
  fairnessBox.className = "fairness neutral";
}
