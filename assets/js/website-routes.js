document.addEventListener("DOMContentLoaded", () => {
  const API_URL = "/.netlify/functions/api";
  const tableBody = document.getElementById("routes-table-body");
  const modal = document.getElementById("route-modal");
  const form = document.getElementById("route-form");

  let allRoutes = [];

  // 1. Fetch Routes
  async function loadRoutes() {
    tableBody.innerHTML =
      '<tr><td colspan="6" class="text-center">Loading...</td></tr>';
    try {
      const res = await fetch(`${API_URL}?action=getRoutes`);
      const data = await res.json();

      // Handle array response
      allRoutes = Array.isArray(data) ? data : data.routes || [];
      renderTable(allRoutes);
    } catch (err) {
      console.error(err);
      tableBody.innerHTML =
        '<tr><td colspan="6" class="text-danger">Error loading routes</td></tr>';
    }
  }

  // 2. Render Table
  function renderTable(routes) {
    tableBody.innerHTML = "";
    routes.forEach((r) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
                <td><b>${r.Destination}</b><br><small class="text-muted">${r.Origin}</small></td>
                <td>${r.Distance_Km} km / ${r.Time_Hours} hrs</td>
                <td>${formatCurrency(r.Price_Sedan)}</td>
                <td>${formatCurrency(r.Price_Innova)}</td>
                <td>${r.Popular_Route === "Yes" ? '<span class="badge badge-success">Yes</span>' : "No"}</td>
                <td>
                    <button class="btn-icon" onclick="openEdit('${r.Route_Slug}')"><i class="fas fa-edit"></i></button>
                </td>
            `;
      tableBody.appendChild(tr);
    });
  }

  // 3. Open Modal (Edit or Add)
  window.openEdit = (slug) => {
    const route = allRoutes.find((r) => r.Route_Slug === slug);
    if (!route) return;

    document.getElementById("modal-title").innerText =
      "Edit Route: " + route.Destination;

    // Populate inputs
    const inputs = form.querySelectorAll("input, select, textarea");
    inputs.forEach((input) => {
      if (route[input.name]) input.value = route[input.name];
    });

    // Lock Slug for editing
    document.getElementById("slug-input").readOnly = true;

    modal.classList.add("active");
  };

  document.getElementById("add-route-btn").addEventListener("click", () => {
    form.reset();
    document.getElementById("modal-title").innerText = "Add New Route";
    document.getElementById("slug-input").readOnly = false;
    document.getElementById("slug-input").value = "chennai-to-"; // Helper prefix
    modal.classList.add("active");
  });

  window.closeModal = () => modal.classList.remove("active");

  // 4. Save Route
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerText;

    btn.disabled = true;
    btn.innerText = "Saving...";

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      await fetch(`${API_URL}?action=saveRoute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      closeModal();
      loadRoutes(); // Refresh table
      alert("Route saved successfully!");
    } catch (error) {
      alert("Error saving route");
    } finally {
      btn.disabled = false;
      btn.innerText = originalText;
    }
  });

  loadRoutes();
});
