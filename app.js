console.log("HKDV Trader OS shell loaded");

const openListModalBtn = document.getElementById("open-list-modal-btn");
const listModalOverlay = document.getElementById("list-modal-overlay");
const closeListModalBtn = document.getElementById("close-list-modal-btn");
const cancelListModalBtn = document.getElementById("cancel-list-modal-btn");

const decreaseQtyBtn = document.getElementById("decrease-qty-btn");
const increaseQtyBtn = document.getElementById("increase-qty-btn");
const quantityDisplay = document.getElementById("quantity-display");
const priceInput = document.getElementById("price");
const estimatedTotal = document.getElementById("estimated-total");

let quantity = 1;
const maxQuantity = 3;

function openListModal() {
  listModalOverlay.classList.remove("hidden");
}

function closeListModal() {
  listModalOverlay.classList.add("hidden");
}

function updateEstimatedTotal() {
  const price = Number(priceInput.value) || 0;
  const total = quantity * price;
  quantityDisplay.textContent = quantity;
  estimatedTotal.textContent = total;
}

function increaseQuantity() {
  if (quantity < maxQuantity) {
    quantity += 1;
    updateEstimatedTotal();
  }
}

function decreaseQuantity() {
  if (quantity > 1) {
    quantity -= 1;
    updateEstimatedTotal();
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
priceInput.addEventListener("input", updateEstimatedTotal);

updateEstimatedTotal();
