import mongoose from 'mongoose';

// ✅ Regex for validations
const emailRegex = /^\S+@\S+\.\S+$/;
const phoneRegex = /^[0-9]{10}$/;
const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;


const companyInfoSchema = new mongoose.Schema({
    name:{type:String , required:true},
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true }
    },
   gstNumber: {
      type: String,
      required: true,
      uppercase: true,
      match: [gstRegex, "Invalid GST Number"]
    },
    phone: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          // Remove all non-digit characters and check if it's 10 digits
          const digits = v.replace(/\D/g, '');
          return digits.length === 10;
        },
        message: "Phone number must be 10 digits"
      }
    },
   email: {
      type: String,
      required: true,
      lowercase: true,
      match: [emailRegex, "Invalid email format"]
    },
    website:{type:String , required:true},
    logo:{type:String , required:false, default:""},
    stateCode:{type:String , required:true},
    invoiceTemplete:{type:String , enum:["Standard","Modern","Minimal"], default:"Standard"},
     // Display settings
    companyLogo:{type:Boolean, default:true},
    gstNumberDisplay:{type:Boolean, default:true},
    emailAddress:{type:Boolean, default:true},
    phoneNumber:{type:Boolean, default:true},
    termsConditions:{type:Boolean, default:true},
    signatureLine:{type:Boolean, default:true},
        // Bill prefixes
    gstBillPrefix:{type:String, default:"GST"},
    nonGstBillPrefix:{type:String, default:"NGST"},
    demoBill:{type:String, default:"DEMO"},
    // Bill number settings
    billNumberPrefix:{type:String, default:"BILL"},
    billNumberStartingCount:{type:Number, default:1},
    // Bill count settings for financial year
    billCountLimit:{type:Number, default:1000}, // Maximum bills allowed per financial year
    billNumberFormat:{type:String, default:"Bill-0001"}, // Format for bill numbers
    // Financial settings
    financialYearMonth:{type:String, default:"April"},
    financialYearStart:{type:Number, default:"2000"},
    currentFinancialYear:{type:Number, default:"2025"},
      // Default tax rates
    defaultGstRate:{type:Number, default:18}, // Default GST rate, can be overridden per product
    defaultNonGstRate:{type:Number, default:0},
    // Currency and decimal settings
    decimalPlaces:{type:Number, default:2},
    // Product search setting
    isProductSearch:{type:Boolean, default:false},
    // Non-GST Bill Visibility Settings
    showNonGstBills:{type:Boolean, default:true},
    // Non-GST Bill Limit Settings
    nonGstBillLimit:{type:Number, min:1},
    // States management
    states: [{
        name: { type: String, required: false },
        pincode: { type: String, required: false },
        gstRate: { type: Number, default: 18, min: 0, max: 100 }
    }],
},
{ timestamps: true }
);

const CompanyInfo = mongoose.model('CompanyInfo', companyInfoSchema);
export default CompanyInfo;