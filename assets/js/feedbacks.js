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

    // --- 5. CARD & MODAL CREATION ---
    function createFeedbackCard(review) {
        const card = document.createElement('div');
        card.className = 'feedback-mini-card';

        const rating = parseInt(review.rating, 10);
        const name = review.reviewer_name || 'Anonymous';
        const comment = review.comment || 'No comment provided.';
        const dsNo = review.ds_no || 'N/A';
        const followUpSent = review.follow_up_sent === 'Yes';

        card.innerHTML = `
            <div class="card-header">
                <h4>${name}</h4>
                <div class="card-rating rating-${rating}">
                    <span>${rating}</span>
                    <i class="fas fa-star"></i>
                </div>
            </div>
            <div class="card-body">
                <p>${comment}</p>
            </div>
            <div class="card-footer">
                <div class="card-info-tags">
                    <span class="info-tag tag-dsno">DS #${dsNo}</span>
                    <span class="info-tag ${followUpSent ? 'tag-sent' : 'tag-pending'}">
                        ${followUpSent ? 'Shared' : 'Pending'}
                    </span>
                </div>
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
        `;

        // --- Add Event Listeners for this card ---
        const menuBtn = card.querySelector('.action-menu-btn');
        const actionMenu = card.querySelector('.action-menu');

        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close all other menus
            document.querySelectorAll('.action-menu.is-open').forEach(m => {
                if (m !== actionMenu) m.classList.remove('is-open');
            });
            // Toggle this one
            actionMenu.classList.toggle('is-open');
        });

        // View Button
        card.querySelector('.view-btn').addEventListener('click', () => {
            openViewModal(review);
        });

        // Share Button
        const shareLink = `https://admin.shrishgroup.com/feedback.html?id=${review.review_id}`;
        const shareMessage = `Dear ${name},\n\nThank you for your feedback! We'd like to share a summary with you.\n\nPlease view it here:\n${shareLink}\n\n- Shrish Travels`;
        const whatsappUrl = `https://wa.me/91${review.guest_mobile}?text=${encodeURIComponent(shareMessage.trim())}`;
        
        const shareBtn = card.querySelector('.share-btn');
        shareBtn.href = whatsappUrl;

        return card;
    }

    function openViewModal(review) {
        // Show loading state in modal first
        modalBody.innerHTML = '<div class="skeleton-loader"><div class="skeleton-card" style="height: 200px;"></div></div>';
        viewModal.classList.add('visible');
        
        // Populate modal content
        // We can make this smarter later by calling 'getFeedbackDetails'
        // For now, we'll just show what we have.
        modalBody.innerHTML = `
            <div class="detail-grid">
                <label>Review ID:</label>
                <span>${review.review_id}</span>
                
                <label>D.S. No:</label>
                <span>${review.ds_no || 'N/A'}</span>
                
                <label>Reviewer Name:</label>
                <span>${review.reviewer_name || 'N/A'}</span>
                
                <label>Guest Mobile:</label>
                <span>${review.guest_mobile || 'N/A'}</span>
                
                <label>Rating:</label>
                <span class="card-rating rating-${review.rating}">${review.rating} <i class="fas fa-star"></i></span>
                
                <label>Shared with Client:</label>
                <span>${review.follow_up_sent || 'No'}</span>
            </div>
            
            <div class="comment-box">
                <label>Comment:</label>
                <p>${review.comment || 'No comment provided.'}</p>
            </div>
        `;
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

    // --- 7. INITIALIZE ---
    loadFeedbacks();
    setupEventListeners();
});