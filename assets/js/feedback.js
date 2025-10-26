/**
 * ====================================================================
 * Shrish Travels - Feedback Page Logic (feedback.js)
 * ====================================================================
 */

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Get DOM Elements ---
    const loader = document.getElementById('loader');
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');

    // Get the 3 main content cards
    const card5Star = document.getElementById('review-5-star');
    const card4Star = document.getElementById('review-4-star');
    const card123Star = document.getElementById('review-123-star');

    // Get the ID from the URL
    const params = new URLSearchParams(window.location.search);
    const reviewId = params.get('review_id');

    // --- 2. Main Function to Fetch and Display ---
    async function loadFeedback() {
        if (!reviewId) {
            showError('No review ID was provided in the link.');
            return;
        }

        try {
            const response = await fetch(`/api?action=getReviewById&id=${reviewId}`);
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }
            
            const data = await response.json();
            if (data.error || !data.review) {
                throw new Error(data.error || 'Review data not found.');
            }

            // We have data!
            displayFeedback(data.review);

        } catch (error) {
            console.error('Failed to load feedback:', error);
            showError(error.message);
        }
    }

    // --- 3. Function to Display the Correct Card ---
    function displayFeedback(review) {
        const rating = parseInt(review.rating, 10);
        const name = review.reviewer_name || 'Valued Guest';
        const comment = review.comment || 'No comment provided.';
        const dsNo = review.ds_no || 'N/A';
        const mobile = review.guest_mobile || 'your registered number';

        // Hide loader, show the correct card
        loader.style.display = 'none';

        if (rating === 5) {
            // Populate 5-star card
            document.getElementById('name-5').textContent = name;
            document.getElementById('comment-5').textContent = comment;
            document.getElementById('cite-5').textContent = name;
            document.getElementById('dsno-5').textContent = dsNo;
            card5Star.style.display = 'block';

        } else if (rating === 4) {
            // Populate 4-star card
            document.getElementById('name-4').textContent = name;
            document.getElementById('comment-4').textContent = comment;
            document.getElementById('cite-4').textContent = name;
            card4Star.style.display = 'block';

        } else if (rating >= 1 && rating <= 3) {
            // Populate 1-3 star card
            document.getElementById('name-123').textContent = name;
            document.getElementById('comment-123').textContent = comment;
            document.getElementById('cite-123').textContent = name;
            document.getElementById('mobile-123').textContent = mobile;
            document.getElementById('dsno-123').textContent = dsNo;
            card123Star.style.display = 'block';
        
        } else {
            // Handle invalid rating number
            showError(`Invalid rating value found: ${review.rating}`);
        }
    }

    // --- 4. Helper to Show Errors ---
    function showError(message) {
        loader.style.display = 'none';
        errorMessage.textContent = message;
        errorState.style.display = 'block';
    }

    // --- 5. Run the logic ---
    loadFeedback();
});