import express from 'express';
import Customer from '../models/Customer.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/customers/search
// @desc    Search customers by name, phone, or email
// @access  Public
router.get('/search', async (req, res) => {
  try {
    const { q: searchTerm, limit = 20 } = req.query;

    if (!searchTerm || searchTerm.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search term must be at least 2 characters long'
      });
    }

    const searchRegex = new RegExp(searchTerm.trim(), 'i');
    
    const customers = await Customer.find({
      isActive: true,
      $or: [
        { name: { $regex: searchRegex } },
        { phone: { $regex: searchRegex } },
        { email: { $regex: searchRegex } }
      ]
    })
    .select('name phone email address customerType gstNumber createdAt')
    .sort({ name: 1 })
    .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        customers,
        total: customers.length,
        searchTerm: searchTerm.trim()
      }
    });
  } catch (error) {
    console.error('Customer search error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching customers',
      error: error.message
    });
  }
});

// @route   GET /api/customers
// @desc    Get all customers with filtering and pagination
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      customerType,
      isActive = 'true',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};
    
    if (isActive !== 'all') {
      filter.isActive = isActive === 'true';
    }
    
    if (customerType) filter.customerType = customerType;
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const customers = await Customer.find(filter)
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum);

    const total = await Customer.countDocuments(filter);

    res.json({
      success: true,
      data: {
        customers,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalCustomers: total,
          hasNext: pageNum < Math.ceil(total / limitNum),
          hasPrev: pageNum > 1
        }
      }
    });
  } catch (error) {
    console.error('Customers fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customers',
      error: error.message
    });
  }
});

// @route   GET /api/customers/:id
// @desc    Get single customer
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      data: { customer }
    });
  } catch (error) {
    console.error('Customer fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customer',
      error: error.message
    });
  }
});

// @route   POST /api/customers
// @desc    Create new customer
// @access  Private
router.post('/', authenticate, async (req, res) => {
  try {
    const customerData = {
      ...req.body,
      createdBy: req.user._id
    };

    const customer = new Customer(customerData);
    await customer.save();

    // Ensure customerGstin is included in response
    const customerResponse = customer.toObject();

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: { customer: customerResponse }
    });
  } catch (error) {
    console.error('Customer creation error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating customer',
      error: error.message
    });
  }
});

// @route   PUT /api/customers/:id
// @desc    Update customer
// @access  Private
router.put('/:id', authenticate, async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: { customer }
    });
  } catch (error) {
    console.error('Customer update error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating customer',
      error: error.message
    });
  }
});

// @route   DELETE /api/customers/:id
// @desc    Delete customer (soft delete)
// @access  Private (Admin/Manager only)
router.delete('/:id', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { isActive: false, updatedBy: req.user?._id },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    console.error('Customer deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting customer',
      error: error.message
    });
  }
});

export default router;


