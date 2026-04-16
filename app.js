console.log("HKDV Trader OS shell loaded");

const openListModalBtn = document.getElementById("open-list-modal-btn");
const listModalOverlay = document.getElementById("list-modal-overlay");
const closeListModalBtn = document.getElementById("close-list-modal-btn");
const cancelListModalBtn = document.getElementById("cancel-list-modal-btn");

function openListModal() {
  listModalOverlay.classList.remove("hidden");
}

function closeListModal() {
  listModalOverlay.classList.add("hidden");
}

openListModalBtn.addEventListener("click", openListModal);
closeListModalBtn.addEventListener("click", closeListModal);
cancelListModalBtn.addEventListener("click", closeListModal);

listModalOverlay.addEventListener("click", function (event) {
  if (event.target === listModalOverlay) {
    closeListModal();
  }
});
