const notyf = typeof Notyf !== "undefined"
  ? new Notyf({
    duration: 2400,
    position: { x: "right", y: "top" },
    dismissible: true
  })
  : null;

function notify(type, message) {
  if (!notyf || !message) return;
  if (type === "success") return notyf.success(message);
  if (type === "error") return notyf.error(message);
  return notyf.open({ type: "info", message });
}

function readStoredToken() {
  return window.localStorage.getItem("accessToken") || "";
}

function resolveCartId(button) {
  const inputSelector = button.dataset.cartInput;
  if (inputSelector) {
    const input = document.querySelector(inputSelector);
    return input?.value?.trim() || "";
  }

  return button.dataset.cartId?.trim() || window.__PRODUCTS_PAGE__?.cartId || "";
}

async function addToCart(button) {
  const productId = button.dataset.productId;
  const cartId = resolveCartId(button);

  if (!productId) {
    notify("error", "Producto invalido");
    return;
  }

  if (!cartId) {
    notify("error", "Ingresa un cartId para continuar");
    return;
  }

  const accessToken = readStoredToken() || window.prompt("Pega tu access token JWT para consumir la API protegida:");
  if (!accessToken) {
    notify("error", "Se requiere access token");
    return;
  }

  window.localStorage.setItem("accessToken", accessToken);
  button.disabled = true;

  try {
    const response = await fetch(`/api/carts/${cartId}/product/${productId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || "No se pudo agregar al carrito");
    }

    notify("success", "Producto agregado al carrito");
  } catch (error) {
    notify("error", error.message || "No se pudo agregar al carrito");
  } finally {
    button.disabled = false;
  }
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add-to-cart]");
  if (!button) return;
  addToCart(button);
});
