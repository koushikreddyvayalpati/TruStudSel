/**
 * Reviews API Service
 *
 * This service handles communication with the backend reviews API endpoints.
 */
import { API_URL, handleResponse, fetchWithTimeout } from './config';

// Base URL for reviews endpoints
const REVIEWS_API_URL = `${API_URL}/api/reviews`;

// Review types
export interface Review {
  reviewId: string;
  sellerEmail: string;
  reviewerEmail: string;
  reviewerName: string;
  rating: number;
  comment: string;
  productId: string;
  createdAt: string;
}

export interface ReviewsResponse {
  reviews: Review[];
  averageRating: string;
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

export interface PostReviewRequest {
  sellerEmail: string;
  rating: number;
  comment: string;
  productId: string;
}

/**
 * Fetch reviews for a seller
 * @param sellerEmail The email of the seller
 * @param page Page number (default: 0)
 * @param size Items per page (default: 10)
 */
export const getSellerReviews = async (
  sellerEmail: string,
  page: number = 0,
  size: number = 10
): Promise<ReviewsResponse> => {
  try {
    // console.log(`[API:reviews] Fetching reviews for seller: ${sellerEmail}`);

    const url = `${REVIEWS_API_URL}/seller/${encodeURIComponent(sellerEmail)}?page=${page}&size=${size}`;
    const response = await fetchWithTimeout(url, { method: 'GET' });

    return await handleResponse<ReviewsResponse>(response);
  } catch (error) {
    console.error('[API:reviews] Error fetching seller reviews:', error);
    throw error;
  }
};

/**
 * Post a review for a seller
 * @param reviewData The review data
 * @param token JWT authentication token
 */
export const postReview = async (
  reviewData: PostReviewRequest,
  token: string
): Promise<Review> => {
  try {
    // console.log(`[API:reviews] Posting review for seller: ${reviewData.sellerEmail}`);

    const response = await fetchWithTimeout(
      REVIEWS_API_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(reviewData),
      }
    );

    return await handleResponse<Review>(response);
  } catch (error) {
    console.error('[API:reviews] Error posting review:', error);
    throw error;
  }
};

export default {
  getSellerReviews,
  postReview,
};
