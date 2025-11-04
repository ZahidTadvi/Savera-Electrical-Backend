import mongoose from 'mongoose';

const { Schema } = mongoose;

const customerSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[+]?[1-9][\d\s\-\(\)]{8,15}$/, 'Please enter a valid phone number'],
    unique: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    sparse: true
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
    maxlength: [500, 'Address cannot be more than 500 characters']
  },
  pincode: {
    type: String,
    trim: true,
    maxlength: [10, 'Pincode cannot be more than 10 characters']
  },
  city: {
    type: String,
    trim: true,
    maxlength: [100, 'City cannot be more than 100 characters']
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true,
    maxlength: [100, 'State cannot be more than 100 characters']
  },
  igst: {
    type: Number,
    min: [0, 'IGST cannot be negative'],
    max: [100, 'IGST cannot be more than 100%'],
    default: 0
  },
  gstNumber: {
    type: String,
    trim: true,
    uppercase: true,
    match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Please enter a valid GST number'],
    sparse: true
  },
  customerGstin:{type:String, required:false},
  customerType: {
    type: String,
    enum: ['individual', 'business'],
    default: 'individual'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  },
  totalPurchases: {
    type: Number,
    default: 0,
    min: [0, 'Total purchases cannot be negative']
  },
  totalAmount: {
    type: Number,
    default: 0,
    min: [0, 'Total amount cannot be negative']
  },
  lastPurchaseDate: {
    type: Date
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for better performance
customerSchema.index({ phone: 1 });
customerSchema.index({ email: 1 });
customerSchema.index({ state: 1 });
customerSchema.index({ name: 'text', phone: 'text' });
customerSchema.index({ isActive: 1, totalAmount: -1 });

// Virtual for formatted address
customerSchema.virtual('formattedAddress').get(function() {
  return this.address || '';
});

// Virtual for customer summary
customerSchema.virtual('customerSummary').get(function() {
  return {
    id: this._id,
    name: this.name,
    phone: this.phone,
    totalPurchases: this.totalPurchases,
    totalAmount: this.totalAmount,
    lastPurchaseDate: this.lastPurchaseDate,
    customerType: this.customerType
  };
});

// Static method to search customers
customerSchema.statics.searchCustomers = function(query) {
  return this.find({
    isActive: true,
    $text: { $search: query }
  }, {
    score: { $meta: 'textScore' }
  }).sort({ score: { $meta: 'textScore' } });
};

// Static method to find top customers
customerSchema.statics.findTopCustomers = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ totalAmount: -1 })
    .limit(limit);
};

// Method to update purchase stats
customerSchema.methods.updatePurchaseStats = function(amount) {
  this.totalPurchases += 1;
  this.totalAmount += amount;
  this.lastPurchaseDate = new Date();
  return this.save();
};

// Ensure virtuals are included in JSON
customerSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Customer', customerSchema);


