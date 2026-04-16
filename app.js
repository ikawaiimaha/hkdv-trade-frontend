const modal = document.getElementById("offer-modal");
const openBtn = document.getElementById("open-offer-builder");
const closeBtn = document.getElementById("close-offer");

const selectableItems = document.querySelectorAll(".selectable");
const offerBox = document.getElementById("offer-items");
const fairnessBox = document.getElementById("fairness-indicator");

let selectedItems = [];
let totalValue = 0;

// target item value (fake baseline)
const targetValue = 80;

openBtn.onclick = () => {
  modal.classList.remove("hidden");
};

closeBtn.onclick = () => {
  modal.classList.add("hidden");
  resetOffer();
};

selectableItems.forEach(item => {
  item.addEventListener("click", () => {
    const value = Number(item.dataset.value);
    const name = item.querySelector("h3").innerText;

    selectedItems.push({ name, value });
    totalValue += value;

    updateOfferUI();
  });
});

function updateOfferUI() {
  offerBox.innerHTML = selectedItems.map(i => i.name).join(", ");
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
  offerBox.innerText = "Select items below";
  fairnessBox.innerText = "No offer yet";
  fairnessBox.className = "fairness neutral";
}
