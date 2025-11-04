import Bill from '../models/Bill.js';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';

// @desc    Get all bills with filtering and pagination
// @route   GET /api/bills
// @access  Private
export const getBills = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      billType,
      paymentStatus,
      status,
      customer,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (billType) filter.billType = billType;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (status) filter.status = status;
    if (customer) filter.customer = customer;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query
    const bills = await Bill.find(filter)
      .populate('customer', 'name phone email')
      .populate('createdBy', 'name')
      .populate('salesPerson', 'name')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Bill.countDocuments(filter);

    res.json({
      success: true,
      data: {
        bills,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get bills error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bills',
      error: error.message
    });
  }
};

// @desc    Get single bill by ID
// @route   GET /api/bills/:id
// @access  Private
export const getBill = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('customer')
      .populate('items.product', 'name category brand')
      .populate('createdBy', 'name email')
      .populate('salesPerson', 'name');

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }

    res.json({
      success: true,
      data: { bill }
    });
  } catch (error) {
    console.error('Get bill error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bill',
      error: error.message
    });
  }
};

// @desc    Create new bill
// @route   POST /api/bills
// @access  Private
export const createBill = async (req, res) => {
  try {
    const { customer: customerId, items, ...billData } = req.body;

    // Verify customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Verify products and check stock
    const processedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.product}`
        });
      }

      if (product.stockQuantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}, Required: ${item.quantity}`
        });
      }

      // Calculate item totals
      const itemTotal = item.price * item.quantity;
      const gstAmount = billData.billType === 'GST' ? (itemTotal * item.gstPercent) / 100 : 0;

      const processedItem = {
        product: product._id,
        productName: product.name,
        quantity: item.quantity,
        price: item.price,
        gstPercent: item.gstPercent || 0,
        totalAmount: itemTotal,
        gstAmount
      };

      processedItems.push(processedItem);
      subtotal += itemTotal;
    }

    // Calculate bill totals
    const discountAmount = (subtotal * (billData.discountPercent || 0)) / 100;
    const discountedSubtotal = subtotal - discountAmount;
    
    let totalGst = 0;
    let cgst = 0;
    let sgst = 0;
    
    if (billData.billType === 'GST') {
      totalGst = processedItems.reduce((sum, item) => sum + item.gstAmount, 0);
      cgst = totalGst / 2;
      sgst = totalGst / 2;
    }

    const finalAmount = discountedSubtotal + totalGst;

    // Create bill
    const bill = await Bill.create({
      ...billData,
      customer: customerId,
      items: processedItems,
      subtotal,
      discountAmount,
      taxAmount: totalGst,
      cgst,
      sgst,
      totalGst,
      finalAmount,
      createdBy: req.user._id,
      salesPerson: req.user._id
    });

    // Update product stock
    for (let i = 0; i < items.length; i++) {
      await Product.findByIdAndUpdate(
        items[i].product,
        { $inc: { stockQuantity: -items[i].quantity } }
      );
    }

    // Update customer stats
    await customer.updatePurchaseStats(finalAmount);

    // Populate and return
    await bill.populate('customer', 'name phone email');
    await bill.populate('createdBy', 'name');

    res.status(201).json({
      success: true,
      message: 'Bill created successfully',
      data: { bill }
    });
  } catch (error) {
    console.error('Create bill error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating bill',
      error: error.message
    });
  }
};

// @desc    Update bill
// @route   PUT /api/bills/:id
// @access  Private
export const updateBill = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }

    // Check if bill can be updated
    if (bill.status === 'Paid' || bill.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update a paid or cancelled bill'
      });
    }

    const updateData = {
      ...req.body,
      updatedBy: req.user._id
    };

    const updatedBill = await Bill.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('customer', 'name phone email')
     .populate('createdBy updatedBy', 'name');

    res.json({
      success: true,
      message: 'Bill updated successfully',
      data: { bill: updatedBill }
    });
  } catch (error) {
    console.error('Update bill error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating bill',
      error: error.message
    });
  }
};

// @desc    Update payment status
// @route   PUT /api/bills/:id/payment
// @access  Private
export const updatePayment = async (req, res) => {
  try {
    const { amount, method } = req.body;
    
    const bill = await Bill.findById(req.params.id);
    
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }

    if (bill.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update payment for cancelled bill'
      });
    }

    // Update payment
    await bill.updatePayment(amount, method);

    res.json({
      success: true,
      message: 'Payment updated successfully',
      data: { 
        bill: {
          id: bill._id,
          billNumber: bill.billNumber,
          paidAmount: bill.paidAmount,
          balanceAmount: bill.balanceAmount,
          paymentStatus: bill.paymentStatus
        }
      }
    });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating payment',
      error: error.message
    });
  }
};

// @desc    Cancel bill
// @route   PUT /api/bills/:id/cancel
// @access  Private (Admin/Manager)
export const cancelBill = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }

    if (bill.status === 'Paid') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a paid bill'
      });
    }

    // Restore product stock
    for (const item of bill.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stockQuantity: item.quantity } }
      );
    }

    // Update bill status
    bill.status = 'Cancelled';
    bill.paymentStatus = 'Cancelled';
    bill.updatedBy = req.user._id;
    await bill.save();

    res.json({
      success: true,
      message: 'Bill cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel bill error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling bill',
      error: error.message
    });
  }
};

// @desc    Get sales summary
// @route   GET /api/bills/summary
// @access  Private
export const getSalesSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();

    const summary = await Bill.getSalesSummary(start, end);

    res.json({
      success: true,
      data: { 
        summary,
        period: {
          startDate: start,
          endDate: end
        }
      }
    });
  } catch (error) {
    console.error('Get sales summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sales summary',
      error: error.message
    });
  }
};

// @desc    Get bills by date range
// @route   GET /api/bills/date-range
// @access  Private
export const getBillsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const bills = await Bill.findByDateRange(new Date(startDate), new Date(endDate));

    res.json({
      success: true,
      data: { bills }
    });
  } catch (error) {
    console.error('Get bills by date range error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bills by date range',
      error: error.message
    });
  }
};

export default {
  getBills,
  getBill,
  createBill,
  updateBill,
  updatePayment,
  cancelBill,
  getSalesSummary,
  getBillsByDateRange
};
