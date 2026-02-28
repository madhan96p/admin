document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.getElementById("bookings-table-body");
  const refreshBtn = document.getElementById("refresh-btn");
  const filterBtns = document.querySelectorAll(".tab-btn");

  // API URL (Your existing Admin API)
  const API_URL = "/.netlify/functions/api";

  // 1. Fetch Data
  async function loadData() {
    tableBody.innerHTML =
      '<tr><td colspan="5" class="text-center">Loading data...</td></tr>';

    try {
      // We need to add 'getBookings' to your Admin API (see next step)
      const response = await fetch(`${API_URL}?action=getBookings`);
      const data = await response.json();

      if (data.bookings) {
        window.allBookings = data.bookings; // Store for filtering
        renderTable(data.bookings);
      } else {
        tableBody.innerHTML =
          '<tr><td colspan="5" class="text-center">No bookings found.</td></tr>';
      }
    } catch (error) {
      console.error(error);
      tableBody.innerHTML =
        '<tr><td colspan="5" class="text-center text-danger">Error loading data.</td></tr>';
    }
  }

  // 2. Render Table
  function renderTable(bookings) {
    tableBody.innerHTML = "";

    bookings.forEach((row) => {
      const tr = document.createElement("tr");

      // Determine Status Color
      let badgeClass = "badge-secondary";
      if (row.Status.includes("New")) badgeClass = "badge-success";
      if (row.Status.includes("Inquiry")) badgeClass = "badge-warning";

      tr.innerHTML = `
                <td><span class="badge ${badgeClass}">${row.Status}</span></td>
                <td>${row.Timestamp || ""}</td>
                <td>
                    <strong>${row.Customer_Name || "Guest"}</strong><br>
                    <small>${row.Mobile_Number}</small>
                </td>
                <td>
                    <div class="journey-info">
                        <strong>Type:</strong> ${row.Journey_Type}<br>
                        ${row.Pickup_City} <i class="fas fa-arrow-right"></i> ${row.Drop_City}
                    </div>
                </td>
                <td>
                    <a href="tel:${row.Mobile_Number}" class="btn-icon"><i class="fas fa-phone"></i></a>
                    <a href="https://wa.me/91${row.Mobile_Number}" target="_blank" class="btn-icon success"><i class="fab fa-whatsapp"></i></a>
                </td>
            `;
      tableBody.appendChild(tr);
    });
  }

  // 3. Filter Logic
  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const filter = btn.dataset.filter;
      if (filter === "all") {
        renderTable(window.allBookings);
      } else {
        const filtered = window.allBookings.filter((b) =>
          b.Status.includes(filter),
        );
        renderTable(filtered);
      }
    });
  });

  refreshBtn.addEventListener("click", loadData);
  loadData(); // Initial Load
});
