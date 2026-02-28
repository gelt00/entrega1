const socket = io();
const listEl = document.getElementById("rtProductsList");
const formEl = document.getElementById("createForm");
const msgEl = document.getElementById("formMsg");
let formMsgTimer = null;

const notyf = typeof Notyf !== "undefined"
  ? new Notyf({
    duration: 2200,
    position: { x: "right", y: "top" },
    dismissible: true,
    types: [
      {
        type: "info",
        background: "#3b82f6",
        icon: false
      }
    ]
  })
  : null;

function toast(type, message) {
  if (!message) return;
  if (!notyf) return;
  if (type === "success") return notyf.success(message);
  if (type === "error") return notyf.error(message);
  return notyf.open({ type: "info", message });
}

function setFormMsg(type, text, opts = {}) {
  if (!type && !text) {
    msgEl.classList.add("hidden");
    msgEl.textContent = "";
    return;
  }

  const autoHideMs = typeof opts.autoHideMs === "number" ? opts.autoHideMs : 2500;

  if (formMsgTimer) {
    clearTimeout(formMsgTimer);
    formMsgTimer = null;
  }

  msgEl.classList.remove("success", "error", "info", "hidden");

  if (type === "success" || type === "error" || type === "info") {
    msgEl.classList.add(type);
  } else {
    msgEl.classList.add("info");
  }

  msgEl.textContent = text;

  if (autoHideMs > 0) {
    formMsgTimer = setTimeout(() => {
      msgEl.classList.add("hidden");
      msgEl.textContent = "";
      msgEl.classList.remove("success", "error", "info");
      formMsgTimer = null;
    }, autoHideMs);
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderProducts(products) {
  if (!Array.isArray(products) || !listEl) return;

  listEl.innerHTML = products
    .map((p) => {
      const id = escapeHtml(p.id);
      const isActive = p.status !== false;
      const statusClass = isActive ? "badge-active" : "badge-inactive";
      const statusText = isActive ? "Activo" : "Inactivo";
      const liClass = isActive ? "product" : "product inactive";
      const checked = isActive ? "checked" : "";

      return `
        <li class="${liClass}" data-id="${id}">
          <div class="row">
            <strong>${escapeHtml(p.title)}</strong>
            <span class="badge">ID: ${id} • <span class="${statusClass}">${statusText}</span></span>
          </div>
          <div class="muted">${escapeHtml(p.description ?? "")}</div>
          <div class="row gap">
            <span>$ ${Number(p.price).toFixed(2)}</span>
            <span class="chip">code: ${escapeHtml(p.code)}</span>
            <span class="chip">stock: ${Number(p.stock)}</span>
          </div>
          <div class="actions-row">
            <button class="btn danger" data-action="delete" data-id="${id}">Eliminar</button>
            <label class="switch" title="Activar / desactivar">
              <input type="checkbox" data-action="toggle" data-id="${id}" ${checked}>
              <span class="slider"></span>
            </label>
          </div>
        </li>
      `;
    })
    .join("");
}

let didInitialProductsRender = false;
let pendingToast = null;
let lastProductsToastAt = 0;

socket.on("connect", () => {
  toast("success", "Socket conectado");
});

socket.on("disconnect", () => {
  toast("error", "Socket desconectado");
});

socket.on("connect_error", (err) => {
  toast("error", `Error de conexión: ${err?.message || err}`);
});

socket.on("products", (products) => {
  renderProducts(products);

  if (!didInitialProductsRender) {
    didInitialProductsRender = true;
    return;
  }

  if (pendingToast) {
    toast(pendingToast.type, pendingToast.message);
    pendingToast = null;
    return;
  }

  const now = Date.now();
  if (now - lastProductsToastAt > 2500) {
    toast("info", "Lista actualizada");
    lastProductsToastAt = now;
  }
});

if (listEl) {
  listEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action='delete']");
    if (!btn) return;

    const pid = btn.dataset.id;
    const li = btn.closest("li.product");

    if (li) {
      li.classList.add("pending-delete");
      btn.disabled = true;
    }

    socket.emit("product:delete", pid, (resp) => {
      if (!resp?.ok) {
        if (li) {
          li.classList.remove("pending-delete");
          btn.disabled = false;
        }
        toast("error", resp?.error || "No se pudo eliminar");
        return;
      }

      pendingToast = { type: "success", message: "Producto eliminado" };
    });
  });

  listEl.addEventListener("change", (e) => {
    const input = e.target.closest("input[data-action='toggle']");
    if (!input) return;

    const pid = input.dataset.id;
    const nextStatus = Boolean(input.checked);

    const li = input.closest("li.product");
    if (li) {
      li.classList.toggle("inactive", !nextStatus);

      const badge = li.querySelector(".badge-active, .badge-inactive");
      if (badge) {
        badge.classList.toggle("badge-active", nextStatus);
        badge.classList.toggle("badge-inactive", !nextStatus);
        badge.textContent = nextStatus ? "Activo" : "Inactivo";
      }
    }

    socket.emit("product:toggle", { id: pid, status: nextStatus }, (resp) => {
      if (!resp?.ok) {
        input.checked = !nextStatus;
        if (li) li.classList.toggle("inactive", nextStatus);
        pendingToast = null;
        toast("error", resp?.error || "No se pudo actualizar");
      }
    });

    pendingToast = { type: "info", message: nextStatus ? "Producto activado" : "Producto desactivado" };
  });
}

if (formEl) {
  formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    setFormMsg(null, "");

    const formData = new FormData(formEl);
    const thumbnailsRaw = (formData.get("thumbnails") || "").toString().trim();
    const thumbnails = thumbnailsRaw
      ? thumbnailsRaw.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const payload = {
      title: (formData.get("title") || "").toString(),
      description: (formData.get("description") || "").toString(),
      code: (formData.get("code") || "").toString(),
      price: Number(formData.get("price")),
      stock: Number(formData.get("stock")),
      category: (formData.get("category") || "").toString(),
      status: Boolean(formData.get("status")),
      thumbnails
    };

    socket.emit("product:create", payload, (resp) => {
      if (resp?.ok) {
        formEl.reset();
        const status = formEl.querySelector("input[name='status']");
        if (status) status.checked = true;

        setFormMsg("success", "Producto creado");
        pendingToast = { type: "success", message: "Producto creado" };
      } else {
        setFormMsg("error", "No se pudo crear");
        toast("error", "No se pudo crear");
      }
    });
  });
}