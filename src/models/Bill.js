import mongoose from 'mongoose';

const { Schema } = mongoose;

const billItemSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  gstPercent: {
    type: Number,
    required: true,
    min: [0, 'GST cannot be negative'],
    max: [100, 'GST cannot be more than 100%']
  },
  totalAmount: {
    type: Number,
    required: true,
    min: [0, 'Total amount cannot be negative']
  },
  gstAmount: {
    type: Number,
    required: true,
    min: [0, 'GST amount cannot be negative']
  },
  discountPercent: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot be more than 100%']
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: [0, 'Discount amount cannot be negative']
  }
});

const billSchema = new Schema({
  billNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  billType: {
    type: String,
    enum: ['GST', 'Non-GST', 'Demo'],
    required: true
  },
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  items: [billItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Subtotal cannot be negative']
  },
  discountPercent: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot be more than 100%']
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: [0, 'Discount amount cannot be negative']
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: [0, 'Tax amount cannot be negative']
  },
  cgst: {
    type: Number,
    default: 0,
    min: [0, 'CGST cannot be negative']
  },
  sgst: {
    type: Number,
    default: 0,
    min: [0, 'SGST cannot be negative']
  },
  igst: {
    type: Number,
    default: 0,
    min: [0, 'IGST cannot be negative']
  },
  totalGst: {
    type: Number,
    default: 0,
    min: [0, 'Total GST cannot be negative']
  },
  finalAmount: {
    type: Number,
    required: true,
    min: [0, 'Final amount cannot be negative']
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Partial', 'Overdue', 'Cancelled'],
    default: 'Pending'
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Card', 'UPI', 'Net Banking', 'Cheque', 'Other']
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: [0, 'Paid amount cannot be negative']
  },
  balanceAmount: {
    type: Number,
    default: 0,
    min: [0, 'Balance amount cannot be negative']
  },
  dueDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['Draft', 'Sent', 'Paid', 'Cancelled', 'Refunded'],
    default: 'Draft'
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  },
  terms: {
    type: String,
    maxlength: [1000, 'Terms cannot be more than 1000 characters']
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  salesPerson: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for better performance
billSchema.index({ billNumber: 1 });
billSchema.index({ customer: 1, createdAt: -1 });
billSchema.index({ createdAt: -1 });
billSchema.index({ paymentStatus: 1 });
billSchema.index({ status: 1 });
billSchema.index({ billType: 1, createdAt: -1 });

// Generate bill number before saving
billSchema.pre('save', async function(next) {
  if (!this.billNumber && this.isNew) {
    const currentYear = new Date().getFullYear().toString().slice(-2);
    const prefix = this.billType === 'GST' ? 'GST' : this.billType === 'Non-GST' ? 'NGST' : 'DEMO';
    
    // Find the last bill with same type and year
    const lastBill = await this.constructor.findOne({
      billType: this.billType,
      billNumber: new RegExp(`^${prefix}/${currentYear}/`)
    }).sort({ billNumber: -1 });
    
    let sequence = 1;
    if (lastBill) {
      const lastSequence = parseInt(lastBill.billNumber.split('/')[2]);
      sequence = lastSequence + 1;
    }
    
    this.billNumber = `${prefix}/${currentYear}/${sequence.toString().padStart(4, '0')}`;
  }
  next();
});

// Calculate balance amount before saving
billSchema.pre('save', function(next) {
  this.balanceAmount = Math.max(0, this.finalAmount - this.paidAmount);
  
  // Update payment status based on paid amount
  if (this.paidAmount === 0) {
    this.paymentStatus = 'Pending';
  } else if (this.paidAmount >= this.finalAmount) {
    this.paymentStatus = 'Paid';
    this.balanceAmount = 0;
  } else {
    this.paymentStatus = 'Partial';
  }
  
  next();
});

// Virtual for bill age in days
billSchema.virtual('billAge').get(function() {
  const now = new Date();
  const billDate = this.createdAt;
  const diffTime = Math.abs(now.getTime() - billDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for overdue status
billSchema.virtual('isOverdue').get(function() {
  if (this.paymentStatus === 'Paid' || !this.dueDate) return false;
  return new Date() > this.dueDate;
});

// Static method to find bills by date range
billSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({
    createdAt: {
      $gte: startDate,
      $lte: endDate
    }
  }).populate('customer', 'name phone').populate('createdBy', 'name');
};

// Static method to get sales summary
billSchema.statics.getSalesSummary = async function(startDate, endDate) {
  const pipeline = [
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $ne: 'Cancelled' }
      }
    },
    {
      $group: {
        _id: null,
        totalBills: { $sum: 1 },
        totalAmount: { $sum: '$finalAmount' },
        totalPaid: { $sum: '$paidAmount' },
        totalPending: { $sum: '$balanceAmount' },
        gstBills: {
          $sum: { $cond: [{ $eq: ['$billType', 'GST'] }, 1, 0] }
        },
        nonGstBills: {
          $sum: { $cond: [{ $eq: ['$billType', 'Non-GST'] }, 1, 0] }
        }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalBills: 0,
    totalAmount: 0,
    totalPaid: 0,
    totalPending: 0,
    gstBills: 0,
    nonGstBills: 0
  };
};

// Method to update payment
billSchema.methods.updatePayment = function(amount, method) {
  this.paidAmount += amount;
  this.paymentMethod = method;
  return this.save();
};

// Ensure virtuals are included in JSON
billSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Bill', billSchema);


