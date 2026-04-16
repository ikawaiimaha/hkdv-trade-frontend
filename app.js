const modal = document.getElementById("offer-modal");
const openBtn = document.getElementById("open-offer");
const closeBtn = document.getElementById("close-offer");
const cancelBtn = document.getElementById("cancel-offer");

const offerBox = document.getElementById("offer-items");
const fairnessBox = document.getElementById("fairness");

let total = 0;
let selected = [];
const target = 80;

openBtn.onclick = () => {
  modal.classList.remove("hidden");
};

function closeModal() {
  modal.classList.add("hidden");
  reset();
}

closeBtn.onclick = closeModal;
cancelBtn.onclick = closeModal;

modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});


// 🔥 KEY FIX: EVENT DELEGATION
document.addEventListener("click", (e) => {
  const item = e.target.closest(".selectable");

  if (!item || modal.classList.contains("hidden")) return;

  const value = Number(item.dataset.value);
  const name = item.dataset.name;

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
});


function update() {
  if (!selected.length) {
    offerBox.innerHTML = "Click items below";
  } else {
    offerBox.innerHTML =
      selected.map(i => `<span class="chip collection">${i.name}</span>`).join("") +
      `<div class="value-line">Total Value: ${total}</div>`;
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

  fairnessBox.innerText = label;
  fairnessBox.className = "fairness " + cls;
}


function reset() {
  total = 0;
  selected = [];

  document.querySelectorAll(".selectable").forEach(i => {
    i.classList.remove("selected");
  });

  offerBox.innerHTML = "Click items below";
  fairnessBox.innerText = "No offer yet";
  fairnessBox.className = "fairness neutral";
}
