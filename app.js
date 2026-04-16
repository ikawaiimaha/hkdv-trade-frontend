const modal = document.getElementById("offer-modal");
const openBtn = document.getElementById("open-offer-builder");
const closeBtn = document.getElementById("close-offer");
const cancelBtn = document.getElementById("cancel-offer");

const selectableItems = document.querySelectorAll(".selectable");
const offerBox = document.getElementById("offer-items");
const fairnessBox = document.getElementById("fairness-indicator");

let selectedItems = [];
let totalValue = 0;

// fake baseline for now
const targetValue = 80;

openBtn.onclick = () => {
  modal.classList.remove("hidden");
};

function closeModal() {
  modal.classList.add("hidden");
  resetOffer();
}

closeBtn.onclick = closeModal;
cancelBtn.onclick = closeModal;

modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

selectableItems.forEach(item => {
  item.addEventListener("click", () => {
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

    updateOfferUI();
  });
});

function updateOfferUI() {
  if (selectedItems.length === 0) {
    offerBox.innerText = "Select items below";
    offerBox.classList.add("empty");
  } else {
    offerBox.innerText = selectedItems.map(i => i.name).join(", ");
    offerBox.classList.remove("empty");
  }

  evaluateFairness();
}

function evaluateFairness() {
  let result = "";
  let className = "";

  if (totalValue === 0) {
    result = "No offer yet";
    className = "neutral";
  } else if (totalValue < targetValue * 0.8) {
    result = "Underpay";
    className = "under";
  } else if (totalValue > targetValue * 1.2) {
    result = "Overpay";
    className = "over";
  } else {
    result = "Fair";
    className = "fair";
  }

  fairnessBox.innerText = result;
  fairnessBox.className = "fairness " + className;
}

function resetOffer() {
  selectedItems = [];
  totalValue = 0;

  selectableItems.forEach(item => {
    item.classList.remove("selected");
  });

  offerBox.innerText = "Select items below";
  offerBox.classList.add("empty");

  fairnessBox.innerText = "No offer yet";
  fairnessBox.className = "fairness neutral";
}
