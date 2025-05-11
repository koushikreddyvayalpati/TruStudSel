import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Icon from 'react-native-vector-icons/FontAwesome';
import useReviewsStore from '../../store/reviewsStore';

// Rating Stars Component
const RatingStars: React.FC<{
  rating: number;
  size?: number;
  color?: string;
}> = React.memo(({ rating, size = 16, color = '#f7b305' }) => {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  return (
    <View style={styles.ratingContainer}>
      {Array.from({ length: fullStars }).map((_, index) => (
        <Icon key={`full_${index}`} name="star" size={size} color={color} />
      ))}
      {halfStar && <Icon key="half" name="star-half-o" size={size} color={color} />}
      {Array.from({ length: emptyStars }).map((_, index) => (
        <Icon key={`empty_${index}`} name="star-o" size={size} color={color} />
      ))}
    </View>
  );
});

interface ReviewsSectionProps {
  sellerEmail: string;
  sellerName: string;
  productId?: string;
  isUserSeller: boolean;
  onViewAllReviews: () => void;
  onUpdateTotalReviews?: (totalReviews: number) => void;
}

const ReviewsSection: React.FC<ReviewsSectionProps> = ({
  sellerEmail,
  sellerName: _sellerName,
  productId,
  isUserSeller,
  onViewAllReviews,
  onUpdateTotalReviews,
}) => {
  // Use the reviews store
  const {
    sellerReviews,
    averageRating,
    totalReviews,
    currentPage,
    totalPages,
    loadingReviews,
    loadingMoreReviews,
    showReviewForm,
    reviewRating,
    reviewComment,
    submittingReview,

    fetchSellerReviews,
    loadMoreReviews,
    setShowReviewForm,
    setReviewRating,
    setReviewComment,
    submitReview,
  } = useReviewsStore();

  // Fetch reviews when the component mounts
  useEffect(() => {
    if (sellerEmail) {
      fetchSellerReviews(sellerEmail);
    }
  }, [sellerEmail, fetchSellerReviews]);

  // Update parent component when total reviews changes
  useEffect(() => {
    if (onUpdateTotalReviews) {
      onUpdateTotalReviews(totalReviews);
    }
  }, [totalReviews, onUpdateTotalReviews]);

  // Handle submit review
  const handleSubmitReview = async () => {
    if (!reviewComment.trim()) {
      Alert.alert('Error', 'Please enter a review comment.');
      return;
    }

    const success = await submitReview(sellerEmail, productId);

    if (success) {
      Alert.alert('Success', 'Your review has been submitted.');
    } else {
      Alert.alert('Error', 'Failed to submit review. Please try again later.');
    }
  };

  // Handle load more reviews
  const handleLoadMoreReviews = () => {
    loadMoreReviews(sellerEmail);
  };

  // Determine how many reviews to display
  // Show all available reviews instead of limiting to 5 when we have multiple pages
  const displayedReviews = currentPage > 0 ? sellerReviews : sellerReviews.slice(0, Math.min(sellerReviews.length, 5));
  const hasMoreToLoad = currentPage < totalPages - 1;
  const hasMoreToShow = sellerReviews.length < totalReviews;

  // If loading, show loading indicator
  if (loadingReviews) {
    return (
      <View style={styles.reviewsSection}>
        <Text style={styles.sectionTitle}>Seller Reviews</Text>
        <View style={styles.loadingReviewsContainer}>
          <ActivityIndicator size="small" color="#f7b305" />
          <Text style={styles.loadingReviewsText}>Loading reviews...</Text>
        </View>
      </View>
    );
  }

  // If no reviews found, show message
  if (sellerReviews.length === 0) {
    return (
      <View style={styles.reviewsSection}>
        <View style={styles.reviewsSectionHeader}>
          <Text style={styles.sectionTitle}>Seller Reviews</Text>
          {!isUserSeller && (
            <TouchableOpacity
              style={styles.writeReviewButton}
              onPress={() => setShowReviewForm(true)}
            >
              <Text style={styles.writeReviewText}>Write a Review</Text>
              <Ionicons name="create-outline" size={16} color="#f7b305" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.noReviewsContainer}>
          <Ionicons name="chatbubble-ellipses-outline" size={24} color="#ccc" />
          <Text style={styles.noReviewsText}>
            No reviews yet for this seller.
          </Text>
          {!isUserSeller && (
            <Text style={styles.beFirstText}>
              Be the first to leave a review!
            </Text>
          )}
        </View>

        {!isUserSeller && (
          <Modal
            visible={showReviewForm}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowReviewForm(false)}
          >
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.reviewFormModalContainer}
            >
              <View style={styles.reviewFormContent}>
                <View style={styles.reviewFormHeader}>
                  <Text style={styles.reviewFormTitle}>Write a Review</Text>
                  <TouchableOpacity
                    style={styles.closeFormButton}
                    onPress={() => setShowReviewForm(false)}
                  >
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>

                <ScrollView 
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.formScrollContent}
                >
                  <Text style={styles.ratingLabel}>Rating:</Text>
                  <View style={styles.ratingSelector}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={`star_${star}`}
                        onPress={() => setReviewRating(star)}
                        style={styles.ratingStar}
                      >
                        <Icon
                          name={star <= reviewRating ? 'star' : 'star-o'}
                          size={32}
                          color="#f7b305"
                        />
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.reviewCommentLabel}>Your Review:</Text>
                  <TextInput
                    style={styles.reviewCommentInput}
                    placeholder="Share your experience with this seller..."
                    placeholderTextColor="#999"
                    multiline
                    textAlignVertical="top"
                    value={reviewComment}
                    onChangeText={setReviewComment}
                  />

                  <TouchableOpacity
                    style={[
                      styles.submitReviewButton,
                      (!reviewComment.trim() || submittingReview) && styles.disabledButton,
                    ]}
                    onPress={handleSubmitReview}
                    disabled={!reviewComment.trim() || submittingReview}
                  >
                    {submittingReview ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.submitReviewButtonText}>Submit Review</Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </Modal>
        )}
      </View>
    );
  }

  return (
    <View style={styles.reviewsSection}>
      <View style={styles.reviewsSectionHeader}>
        <View style={styles.reviewsTitleContainer}>
          <Text style={styles.sectionTitle}>Seller Reviews</Text>
          <View style={styles.reviewMetaInfo}>
            <RatingStars rating={parseFloat(averageRating)} size={14} />
            <Text style={styles.reviewMetaText}>({totalReviews})</Text>
          </View>
        </View>

        {!isUserSeller && (
          <TouchableOpacity
            style={styles.writeReviewButton}
            onPress={() => setShowReviewForm(true)}
          >
            <Text style={styles.writeReviewText}>Write a Review</Text>
            <Ionicons name="create-outline" size={16} color="#f7b305" />
          </TouchableOpacity>
        )}
      </View>

      {/* Reviews summary card */}
      <View style={styles.reviewsSummaryCard}>
        <View style={styles.reviewAverageContainer}>
          <Text style={styles.reviewAverageScore}>{parseFloat(averageRating).toFixed(1)}</Text>
          <RatingStars rating={parseFloat(averageRating)} size={20} />
        </View>

        {/* Reviews list */}
        <View style={currentPage > 0 || displayedReviews.length > 5 ? styles.reviewsScrollContainerLarge : styles.reviewsScrollContainer}>
          <ScrollView
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={false}
          >
            {displayedReviews.map((item, index) => (
              <React.Fragment key={item.reviewId}>
                <View style={styles.reviewItemCompact}>
                  <View style={styles.reviewHeaderCompact}>
                    <View style={styles.reviewerInfoContainer}>
                      <View style={styles.reviewerInitialCircle}>
                        <Text style={styles.reviewerInitial}>
                          {item.reviewerName ? item.reviewerName.charAt(0).toUpperCase() : 'U'}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.reviewerNameCompact}>{item.reviewerName}</Text>
                        <Text style={styles.reviewDateCompact}>
                          {new Date(item.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                    <RatingStars rating={item.rating} size={14} />
                  </View>
                  <Text style={styles.reviewTextCompact} numberOfLines={2} ellipsizeMode="tail">
                    {item.comment}
                  </Text>
                </View>
                {index < displayedReviews.length - 1 && <View style={styles.reviewSeparator} />}
              </React.Fragment>
            ))}

            {/* Show loading indicator when fetching more reviews */}
            {loadingMoreReviews && (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color="#f7b305" />
                <Text style={styles.loadingMoreText}>Loading more reviews...</Text>
              </View>
            )}

            {/* Show load more button if more reviews are available on the server */}
            {(hasMoreToLoad || hasMoreToShow) && !loadingMoreReviews && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={handleLoadMoreReviews}
              >
                <Text style={styles.loadMoreButtonText}>Load more reviews</Text>
                <Ionicons name="chevron-down" size={16} color="#f7b305" />
              </TouchableOpacity>
            )}

            {/* Show a message when all reviews are loaded */}
            {!hasMoreToLoad && currentPage > 0 && sellerReviews.length >= 10 && (
              <View style={styles.allLoadedContainer}>
                <Text style={styles.allLoadedText}>All reviews loaded</Text>
              </View>
            )}

            {/* Show view all button to navigate to a dedicated reviews screen */}
            {hasMoreToShow && (
              <TouchableOpacity
                style={styles.seeAllReviewsButton}
                onPress={onViewAllReviews}
              >
                <Text style={styles.seeAllReviewsText}>See all {totalReviews} reviews</Text>
                <Ionicons name="chevron-forward" size={16} color="#f7b305" />
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Review form modal */}
      {!isUserSeller && (
        <Modal
          visible={showReviewForm}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowReviewForm(false)}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.reviewFormModalContainer}
          >
            <View style={styles.reviewFormContent}>
              <View style={styles.reviewFormHeader}>
                <Text style={styles.reviewFormTitle}>Write a Review</Text>
                <TouchableOpacity
                  style={styles.closeFormButton}
                  onPress={() => setShowReviewForm(false)}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.formScrollContent}
              >
                <Text style={styles.ratingLabel}>Rating:</Text>
                <View style={styles.ratingSelector}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={`star_${star}`}
                      onPress={() => setReviewRating(star)}
                      style={styles.ratingStar}
                    >
                      <Icon
                        name={star <= reviewRating ? 'star' : 'star-o'}
                        size={32}
                        color="#f7b305"
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.reviewCommentLabel}>Your Review:</Text>
                <TextInput
                  style={styles.reviewCommentInput}
                  placeholder="Share your experience with this seller..."
                  placeholderTextColor="#999"
                  multiline
                  textAlignVertical="top"
                  value={reviewComment}
                  onChangeText={setReviewComment}
                />

                <TouchableOpacity
                  style={[
                    styles.submitReviewButton,
                    (!reviewComment.trim() || submittingReview) && styles.disabledButton,
                  ]}
                  onPress={handleSubmitReview}
                  disabled={!reviewComment.trim() || submittingReview}
                >
                  {submittingReview ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.submitReviewButtonText}>Submit Review</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  reviewsSection: {
    marginTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  reviewsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  reviewsTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  reviewMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  reviewMetaText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(247, 179, 5, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  writeReviewText: {
    fontSize: 13,
    color: '#f7b305',
    fontWeight: '600',
    marginRight: 4,
  },
  loadingReviewsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingReviewsText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  noReviewsContainer: {
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#eeeeee',
  },
  noReviewsText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  beFirstText: {
    fontSize: 14,
    color: '#f7b305',
    marginTop: 8,
    fontWeight: '500',
  },
  reviewsSummaryCard: {
    backgroundColor: '#fafafa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eeeeee',
    overflow: 'hidden',
  },
  reviewAverageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    paddingBottom: 12,
  },
  reviewAverageScore: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'black',
    marginRight: 12,
  },
  totalReviewsText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  reviewsScrollContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    maxHeight: 300,
  },
  reviewsScrollContainerLarge: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    maxHeight: 500,
  },
  reviewItemCompact: {
    padding: 16,
    backgroundColor: 'white',
  },
  reviewHeaderCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewerInitialCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  reviewerInitial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  reviewerNameCompact: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  reviewDateCompact: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  reviewTextCompact: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginTop: 0,
    paddingLeft: 46, // Aligns with the text next to the initial circle
  },
  reviewSeparator: {
    height: 1,
    backgroundColor: '#eeeeee',
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingMoreText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#f8f8f8',
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
  },
  loadMoreButtonText: {
    fontSize: 14,
    color: '#f7b305',
    fontWeight: '600',
    marginRight: 4,
  },
  seeAllReviewsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#f8f8f8',
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
  },
  seeAllReviewsText: {
    fontSize: 14,
    color: '#f7b305',
    fontWeight: '600',
    marginRight: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewFormModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  reviewFormContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 0,
    maxHeight: '80%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  reviewFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  reviewFormTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeFormButton: {
    padding: 5,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  ratingSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  ratingStar: {
    padding: 5,
  },
  reviewCommentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  reviewCommentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    height: 120,
    fontSize: 16,
    backgroundColor: '#fafafa',
    marginBottom: 20,
  },
  submitReviewButton: {
    backgroundColor: '#f7b305',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  submitReviewButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  allLoadedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  allLoadedText: {
    fontSize: 14,
    color: '#666',
  },
  formScrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
});

export default React.memo(ReviewsSection);
