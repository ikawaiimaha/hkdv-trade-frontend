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

openBtn.onclick = () => {
  modal.classList.remove("hidden");
  modalOpen = true;
  document.body.classList.add("select-mode");
};

function closeModal() {
  modal.classList.add("hidden");
  modalOpen = false;
  document.body.classList.remove("select-mode");
  reset();
}

closeBtn.onclick = closeModal;
cancelBtn.onclick = closeModal;

items.forEach(item => {
  item.onclick = () => {
    if (!modalOpen) return;

    const value = Number(item.dataset.value);
    const name = item.querySelector("h3").innerText;

    if (item.classList.contains("selected")) {
      item.classList.remove("selected");
      selected = selected.filter(i => i.name !== name);
      total -= value;
    } else {
      item.classList.add("selected");
      selected.push({ name, value });
      total += value;
    }

    update();
  };
});

function update() {
  if (!selected.length) {
    offerBox.innerHTML = "<span class='placeholder'>Click items in your inventory</span>";
  } else {
    offerBox.innerHTML = selected
      .map(i => `<span class="chip">${i.name}</span>`)
      .join("");
  }

  let label = "No offer yet";
  let cls = "neutral";

  if (total > 0) {
    if (total < target * 0.8) {
      label = "Underpay";
      cls = "under";
    } else if (total > target * 1.2) {
      label = "Overpay";
      cls = "over";
    } else {
      label = "Fair";
      cls = "fair";
    }
  }

  fairnessBox.innerText = label;
  fairnessBox.className = "fairness " + cls;
}

function reset() {
  total = 0;
  selected = [];

  items.forEach(i => i.classList.remove("selected"));

  offerBox.innerHTML = "<span class='placeholder'>Click items in your inventory</span>";

  fairnessBox.innerText = "No offer yet";
  fairnessBox.className = "fairness neutral";
}
