import { create } from 'zustand';
import reviewsApi from '../api/reviews';

interface Review {
  reviewId: string;
  sellerEmail: string;
  reviewerName: string;
  reviewerEmail: string;
  rating: number;
  comment: string;
  createdAt: string;
  productId?: string;
}

interface ReviewsState {
  sellerReviews: Review[];
  averageRating: string;
  totalReviews: number;
  currentPage: number;
  totalPages: number;
  loadingReviews: boolean;
  loadingMoreReviews: boolean;
  showReviewForm: boolean;
  reviewRating: number;
  reviewComment: string;
  submittingReview: boolean;

  // Actions
  fetchSellerReviews: (sellerEmail: string, page?: number) => Promise<void>;
  loadMoreReviews: (sellerEmail: string) => Promise<void>;
  setShowReviewForm: (show: boolean) => void;
  setReviewRating: (rating: number) => void;
  setReviewComment: (comment: string) => void;
  submitReview: (sellerEmail: string, productId?: string) => Promise<boolean>;
  resetReviewForm: () => void;
}

const useReviewsStore = create<ReviewsState>((set, get) => ({
  sellerReviews: [],
  averageRating: '0',
  totalReviews: 0,
  currentPage: 0,
  totalPages: 0,
  loadingReviews: false,
  loadingMoreReviews: false,
  showReviewForm: false,
  reviewRating: 5,
  reviewComment: '',
  submittingReview: false,

  fetchSellerReviews: async (sellerEmail: string, page = 0) => {
    if (!sellerEmail) {
      console.warn('[reviewsStore] No seller email provided for fetching reviews');
      return;
    }

    if (page === 0) {
      set({ loadingReviews: true });
    } else {
      set({ loadingMoreReviews: true });
    }

    try {
      const response = await reviewsApi.getSellerReviews(sellerEmail, page, 10);

      if (page === 0) {
        set({
          sellerReviews: response.reviews || [],
          averageRating: response.averageRating || '0',
          totalReviews: response.totalItems || 0,
          currentPage: response.currentPage || 0,
          totalPages: response.totalPages || 0,
        });
      } else {
        // Append new reviews to existing ones for pagination
        set(state => ({
          sellerReviews: [...state.sellerReviews, ...(response.reviews || [])],
          currentPage: response.currentPage || 0,
          totalPages: response.totalPages || 0,
        }));
      }
    } catch (error) {
      console.error('[reviewsStore] Error fetching seller reviews:', error);
    } finally {
      if (page === 0) {
        set({ loadingReviews: false });
      } else {
        set({ loadingMoreReviews: false });
      }
    }
  },

  loadMoreReviews: async (sellerEmail: string) => {
    const { currentPage, totalPages, loadingMoreReviews } = get();
    if (currentPage < totalPages - 1 && !loadingMoreReviews) {
      await get().fetchSellerReviews(sellerEmail, currentPage + 1);
    }
  },

  setShowReviewForm: (show: boolean) => {
    set({ showReviewForm: show });
  },

  setReviewRating: (rating: number) => {
    set({ reviewRating: rating });
  },

  setReviewComment: (comment: string) => {
    set({ reviewComment: comment });
  },

  resetReviewForm: () => {
    set({
      reviewRating: 5,
      reviewComment: '',
      showReviewForm: false,
    });
  },

  submitReview: async (sellerEmail: string, productId?: string) => {
    const { reviewRating, reviewComment } = get();

    if (!sellerEmail) {
      console.warn('[reviewsStore] No seller email provided for submitting review');
      return false;
    }

    if (!reviewComment.trim()) {
      return false;
    }

    set({ submittingReview: true });

    try {
      // Get the authentication token using Auth from aws-amplify
      try {
        const { Auth } = require('aws-amplify');
        const currentSession = await Auth.currentSession();
        const token = currentSession.getIdToken().getJwtToken();

        if (!token) {
          console.error('[reviewsStore] Authentication token not available');
          return false;
        }

        // Use the reviews API module
        await reviewsApi.postReview(
          {
            sellerEmail: sellerEmail,
            rating: reviewRating,
            comment: reviewComment,
            productId: productId || '',
          },
          token
        );

        // Reset form
        get().resetReviewForm();

        // Refresh reviews
        await get().fetchSellerReviews(sellerEmail, 0);
        return true;
      } catch (authError) {
        console.error('[reviewsStore] Auth error:', authError);
        return false;
      }
    } catch (error) {
      console.error('[reviewsStore] Error submitting review:', error);
      return false;
    } finally {
      set({ submittingReview: false });
    }
  },
}));

export default useReviewsStore;
