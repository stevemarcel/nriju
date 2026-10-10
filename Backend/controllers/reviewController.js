import asyncHandler from "express-async-handler";
import Review from "../models/Review.js";
import Product from "../models/Product.js";

// @DESCRIPTION List approved reviews for a product
// @ROUTE       GET /api/v1/reviews/:productId
// @ACCESS      Public
const getProductReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({
    product: req.params.productId,
    status: "approved",
  })
    .populate("user", "name avatar")
    .sort("-createdAt");

  res.json({ success: true, data: reviews });
});

// @DESCRIPTION Submit a new review (pending admin approval)
// @ROUTE       POST /api/v1/reviews
// @ACCESS      Authenticated
const submitReview = asyncHandler(async (req, res) => {
  const { productId, rating, title, comment } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  // Check if user already reviewed this product
  const alreadyReviewed = await Review.findOne({
    user: req.user._id,
    product: productId,
  });

  if (alreadyReviewed) {
    res.status(400);
    throw new Error("Product already reviewed");
  }

  const review = await Review.create({
    product: productId,
    user: req.user._id,
    rating: Number(rating),
    title,
    comment,
    status: "pending",
  });

  res.status(201).json({
    success: true,
    message: "Review submitted and awaiting approval",
    data: review,
  });
});

// @DESCRIPTION Update a review before it is approved
// @ROUTE       PATCH /api/v1/reviews/:id
// @ACCESS      Authenticated (Owner)
const updateReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    res.status(404);
    throw new Error("Review not found");
  }

  if (review.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to update this review");
  }

  if (review.status === "approved") {
    res.status(400);
    throw new Error("Cannot edit an approved review");
  }

  const { rating, title, comment } = req.body;
  if (rating) review.rating = Number(rating);
  if (title) review.title = title;
  if (comment) review.comment = comment;

  await review.save();
  res.json({ success: true, data: review });
});

// @DESCRIPTION Moderation: Approve or reject a review (admin)
// @ROUTE       PATCH /api/v1/reviews/:id/moderate
// @ACCESS      Admin
const moderateReview = asyncHandler(async (req, res) => {
  const { status, moderationNote } = req.body;
  const review = await Review.findById(req.params.id);

  if (!review) {
    res.status(404);
    throw new Error("Review not found");
  }

  review.status = status;
  review.moderatedBy = req.user._id;
  review.moderatedAt = Date.now();
  if (moderationNote) review.moderationNote = moderationNote;

  await review.save();

  // If approved, update the product's average rating
  if (status === "approved") {
    const reviews = await Review.find({
      product: review.product,
      status: "approved",
    });
    const avg = reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length;

    await Product.findByIdAndUpdate(review.product, {
      averageRating: avg,
      reviewCount: reviews.length,
    });
  }

  res.json({ success: true, data: review });
});

export { getProductReviews, submitReview, updateReview, moderateReview };
