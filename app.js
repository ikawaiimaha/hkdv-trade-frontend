const modal = document.getElementById("offer-modal");
const openBtn = document.getElementById("open-offer-builder");
const closeBtn = document.getElementById("close-offer");
const cancelBtn = document.getElementById("cancel-offer");

const selectableItems = document.querySelectorAll(".selectable");
const offerBox = document.getElementById("offer-items");
const fairnessBox = document.getElementById("fairness-indicator");

let selectedItems = [];
let totalValue = 0;

const targetValue = 80;
let modalOpen = false;

openBtn.onclick = () => {
  modal.classList.remove("hidden");
  modalOpen = true;
};

function closeModal() {
  modal.classList.add("hidden");
  modalOpen = false;
  resetOffer();
}

closeBtn.onclick = closeModal;
cancelBtn.onclick = closeModal;

modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

selectableItems.forEach(item => {
  item.addEventListener("click", () => {

    // 🚨 KEY FIX: ignore clicks unless modal is open
    if (!modalOpen) return;

    const value = Number(item.dataset.value);
    const name = item.querySelector("h3").innerText;

    if (item.classList.contains("selected")) {
      item.classList.remove("selected");
      selectedItems = selectedItems.filter(i => i.name !== name);
      totalValue -= value;
    } else {
      item.classList.add("selected");
      selectedItems.push({ name, value });
      totalValue += value;
    }

    updateUI();
  });
});

function updateUI() {
  if (selectedItems.length === 0) {
    offerBox.innerText = "Select items below";
    offerBox.classList.add("empty");
  } else {
    offerBox.innerText = selectedItems.map(i => i.name).join(", ");
    offerBox.classList.remove("empty");
  }

  evaluate();
}

function evaluate() {
  let text = "No offer yet";
  let cls = "neutral";

  if (totalValue > 0) {
    if (totalValue < targetValue * 0.8) {
      text = "Underpay";
      cls = "under";
    } else if (totalValue > targetValue * 1.2) {
      text = "Overpay";
      cls = "over";
    } else {
      text = "Fair";
      cls = "fair";
    }
  }

  fairnessBox.innerText = text;
  fairnessBox.className = "fairness " + cls;
}

function resetOffer() {
  selectedItems = [];
  totalValue = 0;

  selectableItems.forEach(i => i.classList.remove("selected"));

  offerBox.innerText = "Select items below";
  offerBox.classList.add("empty");

  fairnessBox.innerText = "No offer yet";
  fairnessBox.className = "fairness neutral";
}
