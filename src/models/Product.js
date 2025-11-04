import mongoose from 'mongoose';

const { Schema } = mongoose;

const productSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot be more than 100 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    maxlength: [50, 'Category cannot be more than 50 characters']
  },
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true,
    maxlength: [50, 'Brand name cannot be more than 50 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  gstPercent: {
    type: Number,
    required: [true, 'GST percentage is required'],
    min: [0, 'GST cannot be negative'],
    max: [100, 'GST cannot be more than 100%']
  },
  stockQuantity: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  warranty: {
    type: String,
    trim: true,
    maxlength: [50, 'Warranty description cannot be more than 50 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  sku: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lowStockThreshold: {
    type: Number,
    default: 5,
    min: [0, 'Low stock threshold cannot be negative']
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
productSchema.index({ name: 'text', brand: 'text', category: 'text' });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ stockQuantity: 1 });

// Virtual for low stock check
productSchema.virtual('isLowStock').get(function() {
  return this.stockQuantity <= this.lowStockThreshold;
});

// Virtual for stock status
productSchema.virtual('stockStatus').get(function() {
  if (this.stockQuantity === 0) return 'Out of Stock';
  if (this.stockQuantity <= this.lowStockThreshold) return 'Low Stock';
  return 'In Stock';
});

// Generate SKU if not provided
productSchema.pre('save', function(next) {
  if (!this.sku && this.isNew) {
    const categoryCode = this.category.substring(0, 3).toUpperCase();
    const brandCode = this.brand.substring(0, 2).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    this.sku = `${categoryCode}-${brandCode}-${timestamp}`;
  }
  next();
});

// Static method to find low stock products
productSchema.statics.findLowStock = function() {
  return this.find({
    isActive: true,
    $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] }
  });
};

// Static method to search products
productSchema.statics.searchProducts = function(query) {
  return this.find({
    isActive: true,
    $text: { $search: query }
  }, {
    score: { $meta: 'textScore' }
  }).sort({ score: { $meta: 'textScore' } });
};

// Method to update stock
productSchema.methods.updateStock = function(quantity, operation = 'subtract') {
  if (operation === 'subtract') {
    this.stockQuantity = Math.max(0, this.stockQuantity - quantity);
  } else {
    this.stockQuantity += quantity;
  }
  return this.save();
};

// Ensure virtuals are included in JSON
productSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Product', productSchema);


