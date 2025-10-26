/**
 * ====================================================================
 * Shrish Travels - Feedbacks Dashboard Logic (feedbacks.js)
 * ====================================================================
 */

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. ELEMENT REFERENCES ---
    const container = document.getElementById('feedbacks-container');
    const grid = document.getElementById('feedbacks-grid');
    const loader = document.getElementById('skeleton-loader');
    const errorState = document.getElementById('error-state');
    const emptyState = document.getElementById('empty-state');
    const retryButton = document.getElementById('retry-fetch-btn');

    // Modal elements
    const viewModal = document.getElementById('view-details-modal');
    const modalBody = document.getElementById('modal-body');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    // --- 2. STATE ---
    let allReviews = [];
    let isLoading = true;
    let error = null;

    // --- 3. DATA FETCHING ---
    async function loadFeedbacks() {
        isLoading = true;
        error = null;
        render(); // Show loader

        try {
            const response = await fetch('/api?action=getAllReviews');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            allReviews = data.reviews || [];
        
        } catch (err) {
            console.error("Failed to load feedbacks:", err);
            error = err.message;
        } finally {
            isLoading = false;
            render(); // Render final state
        }
    }

    // --- 4. MAIN RENDER FUNCTION ---
    function render() {
        // Show/hide main state containers
        loader.style.display = isLoading ? 'grid' : 'none';
        errorState.style.display = error ? 'block' : 'none';
        emptyState.style.display = !isLoading && !error && allReviews.length === 0 ? 'block' : 'none';
        grid.style.display = !isLoading && !error && allReviews.length > 0 ? 'grid' : 'none';

        if (isLoading || error) return;

        // Render cards
        grid.innerHTML = ''; // Clear old cards
        allReviews.forEach(review => {
            const card = createFeedbackCard(review);
            grid.appendChild(card);
        });
    }

    function createFeedbackCard(review) {
        const card = document.createElement('div');
        const rating = parseInt(review.rating, 10);
        
        // Add rating class to card for the colored border
        card.className = `feedback-mini-card rating-border-${rating}`;

        const name = review.reviewer_name || 'Anonymous';
        const comment = review.comment || 'No comment provided.';
        const dsNo = review.ds_no || 'N/A';
        const followUpSent = review.follow_up_sent === 'Yes';

        // NEW: Use the star generator
        const starsHtml = generateStars(rating);

        card.innerHTML = `
            <div class="card-header">
                <h4>${name}</h4>
                <div class="action-menu">
                    <button class="action-menu-btn" aria-label="Actions">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div class="action-dropdown">
                        <button class="view-btn">
                            <i class="fas fa-eye"></i> View Details
                        </button>
                        <a href="#" class="share-btn" target="_blank">
                            <i class="fab fa-whatsapp"></i> Share
                        </a>
                    </div>
                </div>
            </div>
            <div class="card-body">
                <div class="card-rating rating-${rating}">
                    ${starsHtml}
                </div>
                <p>${comment}</p>
            </div>
            <div class="card-footer">
                <div class="card-info-tags">
                    <span class="info-tag tag-dsno">DS #${dsNo}</span>
                    <span class="info-tag ${followUpSent ? 'tag-sent' : 'tag-pending'}">
                        ${followUpSent ? 'Shared' : 'Pending'}
                    </span>
                </div>
            </div>
        `;

        // --- Add Event Listeners for this card ---
        const menuBtn = card.querySelector('.action-menu-btn');
        const actionMenu = card.querySelector('.action-menu');

        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.action-menu.is-open').forEach(m => {
                if (m !== actionMenu) m.classList.remove('is-open');
            });
            actionMenu.classList.toggle('is-open');
        });

        // View Button (now uses the new review_id)
        card.querySelector('.view-btn').addEventListener('click', () => {
            openViewModal(review.review_id); // <-- Pass ID only
        });

        // Share Button (uses review data, as guest_mobile is there)
        const shareLink = `https://admin.shrishgroup.com/feedback.html?id=${review.review_id}`;
        const shareMessage = `Dear ${name},\n\nThank you for your feedback! We'd like to share a summary with you.\n\nPlease view it here:\n${shareLink}\n\n- Shrish Travels`;
        const whatsappUrl = `https://wa.me/91${review.guest_mobile}?text=${encodeURIComponent(shareMessage.trim())}`;
        
        const shareBtn = card.querySelector('.share-btn');
        shareBtn.href = whatsappUrl;

        return card;
    }

    async function openViewModal(reviewId) {
        // Show loading state in modal first
        modalBody.innerHTML = '<div class="skeleton-loader"><div class="skeleton-card" style="height: 200px;"></div></div>';
        viewModal.classList.add('visible');
        
        try {
            // Call the new "smart" API
            const response = await fetch(`/api?action=getFeedbackDetails&id=${reviewId}`);
            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(data.error || 'Failed to fetch details.');
            }

            const { review, slip } = data;
            const rating = parseInt(review.rating, 10);

            // --- Build Rich HTML for the Modal ---
            let tripHtml = `
                <div class="detail-section">
                    <h4>Trip Details (DS #${review.ds_no || 'N/A'})</h4>
                    <p class="detail-error">No matching duty slip found. Details may be limited.</p>
                </div>`;

            if (slip) {
                tripHtml = `
                <div class="detail-section">
                    <h4>Trip Details (DS #${slip.DS_No})</h4>
                    <div class="detail-grid">
                        <label>Guest Name:</label>
                        <span>${slip.Guest_Name || 'N/A'}</span>
                        
                        <label>Trip Date:</label>
                        <span>${slip.Date || 'N/A'}</span>
                        
                        <label>Route:</label>
                        <span>${slip.Routing || 'N/A'}</span>

                        <label>Vehicle:</label>
                        <span>${slip.Vehicle_No || 'N/A'}</span>
                    </div>
                </div>`;
            }

            modalBody.innerHTML = `
                <div class="detail-section">
                    <h4>Review Details (ID #${review.review_id})</h4>
                    <div class="detail-grid">
                        <label>Reviewer Name:</label>
                        <span>${review.reviewer_name || 'N/A'}</span>
                        
                        <label>Guest Mobile:</label>
                        <span>${review.guest_mobile || 'N/A'}</span>
                        
                        <label>Rating:</label>
                        <span class="card-rating rating-${rating}">${generateStars(rating)}</span>
                        
                        <label>Shared:</label>
                        <span>${review.follow_up_sent || 'No'}</span>
                    </div>
                    <div class="comment-box">
                        <label>Comment:</label>
                        <p>${review.comment || 'No comment provided.'}</p>
                    </div>
                </div>
                ${tripHtml}
            `;

        } catch (error) {
            console.error('Failed to open modal:', error);
            modalBody.innerHTML = `
                <div class="full-page-state" style="margin: 0; padding: 1rem;">
                    <i class="fas fa-exclamation-triangle" style="color: var(--color-danger);"></i>
                    <h3>Error Loading Details</h3>
                    <p>${error.message}</p>
                </div>`;
        }
    }

    function closeViewModal() {
        viewModal.classList.remove('visible');
    }

    // --- 6. EVENT LISTENERS ---
    function setupEventListeners() {
        retryButton.addEventListener('click', loadFeedbacks);
        modalCloseBtn.addEventListener('click', closeViewModal);
        
        viewModal.addEventListener('click', e => {
            if (e.target === viewModal || e.target.matches('.modal-overlay')) {
                closeViewModal();
            }
        });

        // Close dropdown menu if clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.action-menu')) {
                document.querySelectorAll('.action-menu.is-open').forEach(m => {
                    m.classList.remove('is-open');
                });
            }
        });
    }

    function generateStars(rating) {
        let starsHtml = '';
        const solidStars = parseInt(rating, 10);
        for (let i = 1; i <= 5; i++) {
            if (i <= solidStars) {
                starsHtml += `<i class="fas fa-star"></i>`; // Solid star
            } else {
                starsHtml += `<i class="far fa-star"></i>`; // Empty star
            }
        }
        return starsHtml;
    }

    // --- 7. INITIALIZE ---
    loadFeedbacks();
    setupEventListeners();
});