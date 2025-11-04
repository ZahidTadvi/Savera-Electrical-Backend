import mongoose from 'mongoose';

const newBillSchema = new mongoose.Schema ({
    billType:{type:String, required:true, enum:["GST","NON_GST","QUOTATION","Demo"]},
    billNumber:{type:String, unique:false},
    date:{type:Date, default:Date.now},
    customerName:{type:String, required:true},
    customerAddress:{type:String, required:true},
    customerPhone:{
  type: String,
  required: true,
  validate: {
    validator: function(v) {
      return /^\d{10}$/.test(v); // Only allows 10 digits
    },
    message: props => `${props.value} is not a valid 10-digit phone number!`
  }
},
    state:{type:String},
    pincode:{type:String},
    items:[{
        itemName:{type:String, required:true},
        itemPrice:{type:Number, required:true},
        itemQuantity:{type:Number, required:true}
    }],
    discount:{type:Number, default:0},
    gstPercent:{type:Number, default:18}, // Store GST percentage
    gstAmount:{type:Number, default:0}, // Store GST amount
    totalAmount:{type:Number},
    tax:{type:Number, default:0},
    paymentType:{type:String, required:true, enum:["Full","Partial","UPI","Card"]},
    paidAmount: { type: Number, default: 0 },
    remainingAmount: { type: Number, default: 0 },
    status: { type: String, default: "completed", enum: ["draft", "completed", "pending"] },
    createdBy:{type:String}
}, {timestamps:true}
);

// Pre-save hook to automatically calculate status based on payment
newBillSchema.pre('save', function(next) {
  // Only calculate if totalAmount and paidAmount are defined

  if (this.totalAmount !== undefined && this.paidAmount !== undefined) {
    // Calculate remaining amount
    this.remainingAmount = this.totalAmount - this.paidAmount;
    
    // Determine status based on payment
    if (this.remainingAmount <= 0) {
      this.status = 'completed';
    } else {
      this.status = 'pending';
    }
    
    console.log('🔄 Pre-save hook - Status calculation:', {
      totalAmount: this.totalAmount,
      paidAmount: this.paidAmount,
      remainingAmount: this.remainingAmount,
      status: this.status
    });
  }
  
  next();
});

// Pre-update hook to automatically calculate status based on payment
newBillSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function(next) {
  const update = this.getUpdate();
  
  if (update && (update.paidAmount !== undefined || update.totalAmount !== undefined)) {
    // Get the current document to access existing values
    this.findOne().then(doc => {
      if (doc) {
        const totalAmount = update.totalAmount !== undefined ? update.totalAmount : doc.totalAmount;
        const paidAmount = update.paidAmount !== undefined ? update.paidAmount : doc.paidAmount;
        
        if (totalAmount !== undefined && paidAmount !== undefined) {
          const remainingAmount = totalAmount - paidAmount;
          
          // Determine status based on payment
          if (remainingAmount <= 0) {
            update.status = 'completed';
          } else {
            update.status = 'pending';
          }
          
          update.remainingAmount = remainingAmount;
          
          console.log('🔄 Pre-update hook - Status calculation:', {
            totalAmount,
            paidAmount,
            remainingAmount,
            status: update.status
          });
        }
      }
      next();
    }).catch(err => {
      console.error('❌ Pre-update hook error:', err);
      next();
    });
  } else {
    next();
  }
});

const newBillModel = mongoose.model('NewBill', newBillSchema);
export default newBillModel;
