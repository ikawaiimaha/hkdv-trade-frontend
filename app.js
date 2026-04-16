console.log("HKDV Trader OS shell loaded");

const openListModalBtn = document.getElementById("open-list-modal-btn");
const listModalOverlay = document.getElementById("list-modal-overlay");
const closeListModalBtn = document.getElementById("close-list-modal-btn");
const cancelListModalBtn = document.getElementById("cancel-list-modal-btn");

const decreaseQtyBtn = document.getElementById("decrease-qty-btn");
const increaseQtyBtn = document.getElementById("increase-qty-btn");
const quantityDisplay = document.getElementById("quantity-display");

let quantity = 1;
const maxQuantity = 3;

function openListModal() {
  listModalOverlay.classList.remove("hidden");
}

function closeListModal() {
  listModalOverlay.classList.add("hidden");
}

function updateQuantityDisplay() {
  quantityDisplay.textContent = quantity;
}

function increaseQuantity() {
  if (quantity < maxQuantity) {
    quantity += 1;
    updateQuantityDisplay();
  }
}

function decreaseQuantity() {
  if (quantity > 1) {
    quantity -= 1;
    updateQuantityDisplay();
  }
}

openListModalBtn.addEventListener("click", openListModal);
closeListModalBtn.addEventListener("click", closeListModal);
cancelListModalBtn.addEventListener("click", closeListModal);

listModalOverlay.addEventListener("click", function (event) {
  if (event.target === listModalOverlay) {
    closeListModal();
  }
});

increaseQtyBtn.addEventListener("click", increaseQuantity);
decreaseQtyBtn.addEventListener("click", decreaseQuantity);

document.querySelectorAll(".option-row").forEach((row) => {
  const buttons = row.querySelectorAll(".option-btn");
  const groupName = row.dataset.group;

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      if (groupName === "listing-type") {
        buttons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");
      } else {
        button.classList.toggle("active");
      }
    });
  });
});

updateQuantityDisplay();
