import express from 'express';
import {
  getBills,
  getBill,
  createBill,
  updateBill,
  updatePayment,
  cancelBill,
  getSalesSummary,
  getBillsByDateRange
} from '../controller/billController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  validateBill,
  validateObjectId,
  validatePagination,
  validateDateRange,
  handleValidationErrors
} from '../middleware/validation.js';

const router = express.Router();

// @route   GET /api/bills/summary
// @desc    Get sales summary
// @access  Private
router.get(
  '/summary',
  authenticate,
  validateDateRange,
  handleValidationErrors,
  getSalesSummary
);

// @route   GET /api/bills/date-range
// @desc    Get bills by date range
// @access  Private
router.get(
  '/date-range',
  authenticate,
  validateDateRange,
  handleValidationErrors,
  getBillsByDateRange
);

// @route   GET /api/bills
// @desc    Get all bills with filtering and pagination
// @access  Private
router.get(
  '/',
  authenticate,
  validatePagination,
  handleValidationErrors,
  getBills
);

// @route   GET /api/bills/:id
// @desc    Get single bill
// @access  Private
router.get(
  '/:id',
  authenticate,
  validateObjectId('id'),
  handleValidationErrors,
  getBill
);

// @route   POST /api/bills
// @desc    Create new bill
// @access  Private
router.post(
  '/',
  authenticate,
  validateBill,
  handleValidationErrors,
  createBill
);

// @route   PUT /api/bills/:id
// @desc    Update bill
// @access  Private
router.put(
  '/:id',
  authenticate,
  validateObjectId('id'),
  handleValidationErrors,
  updateBill
);

// @route   PUT /api/bills/:id/payment
// @desc    Update payment status
// @access  Private
router.put(
  '/:id/payment',
  authenticate,
  validateObjectId('id'),
  handleValidationErrors,
  updatePayment
);

// @route   PUT /api/bills/:id/cancel
// @desc    Cancel bill
// @access  Private (Admin/Manager)
router.put(
  '/:id/cancel',
  authenticate,
  authorize('admin', 'manager'),
  validateObjectId('id'),
  handleValidationErrors,
  cancelBill
);

export default router;
