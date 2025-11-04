// utils/gstConfig.js
export default {
  // Standard Indian GST rates
  gstRates: {
    0: "0% - Exempt",
    5: "5% - Essential items",
    12: "12% - Standard rate",
    18: "18% - Standard rate", 
    28: "28% - Luxury items"
  },
  // State-wise default GST rates (can be overridden by company settings)
  states: {
    "madhya pradesh": 18,
    "mp": 18,
    "maharashtra": 18,
    "delhi": 18,
    "gujarat": 18,
    "karnataka": 18,
    "tamil nadu": 18,
    "west bengal": 18,
    "uttar pradesh": 18,
    "rajasthan": 18,
    "punjab": 18,
    "haryana": 18,
    "default": 18
  },
  pincodes: {
    "462001": "madhya pradesh",
    "400001": "maharashtra", 
    "110001": "delhi",
    "380001": "gujarat",
    "560001": "karnataka",
    "600001": "tamil nadu",
    "700001": "west bengal",
    "226001": "uttar pradesh",
    "302001": "rajasthan",
    "141001": "punjab",
    "122001": "haryana"
  }
};
