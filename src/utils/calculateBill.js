import gstConfig from "./gstConfig.js";

export function calculateBill(data) {
  // 1️⃣ Subtotal
  let subtotal = data.items.reduce(
    (acc, item) => acc + (item.itemPrice * item.itemQuantity),
    0
  );

  // 2️⃣ Discount
  let discountAmount = (subtotal * (data.discount || 0)) / 100;
  let afterDiscount = subtotal - discountAmount;

  // 3️⃣ Detect state from customerState field, pincode, or address
  let stateKey = "default";

  // First, try to use the customerState field if provided
  if (data.customerState && typeof data.customerState === 'string') {
    const customerState = data.customerState.toLowerCase();
    stateKey = Object.keys(gstConfig.states).find(key => 
      key.toLowerCase() === customerState.toLowerCase()
    ) || "default";
  } else if (data.pincode && gstConfig.pincodes[data.pincode]) {
    // Check if pincode matches any known pincodes
    const stateName = gstConfig.pincodes[data.pincode];
    stateKey = Object.keys(gstConfig.states).find(key => 
      key.toLowerCase() === stateName.toLowerCase()
    ) || "default";
  }

  // 4️⃣ GST % - Use proper GST rate based on product or company settings
  let gstPercent = gstConfig.states[stateKey] || gstConfig.states.default;
  
  // If items have individual GST rates, use the first item's rate
  if (data.items && data.items.length > 0 && data.items[0].gstRate) {
    gstPercent = data.items[0].gstRate;
  }
  
  let gstAmount = (afterDiscount * gstPercent) / 100;

  // 5️⃣ Final Total
  let totalAmount = afterDiscount + gstAmount;

  // 6️⃣ Payment logic
  let remainingAmount = 0;
  if (data.paymentType === "Partial") {
    remainingAmount = totalAmount - (data.paidAmount || 0);
  }

  return {
    subtotal,
    discountAmount,
    afterDiscount,
    gstPercent,
    gstAmount,
    totalAmount,
    paidAmount: data.paidAmount || 0,
    remainingAmount,
    stateKey,
  };
}
