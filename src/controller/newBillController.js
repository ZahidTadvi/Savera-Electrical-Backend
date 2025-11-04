import newBillModel from "../models/newBill.js";
import CompanyInfo from "../models/companyInfo.js";
import Customer from "../models/Customer.js";
import gstConfig from "../utils/gstConfig.js";

// Helper function to convert month name to number
const getMonthNumber = (monthName) => {
  const months = {
    'january': 1, 'february': 2, 'march': 3, 'april': 4,
    'may': 5, 'june': 6, 'july': 7, 'august': 8,
    'september': 9, 'october': 10, 'november': 11, 'december': 12
  };
  return months[monthName.toLowerCase()] || 4; // Default to April if not found
};

export const createBill = async (req, res) => {
  console.log('🚀 NEW BILL CREATION - Updated controller logic is running!');
  try {
    const {
      billType,
      customerName,
      customerAddress,
      customerPhone,
      customerGstin,
      pincode,
      customerState,
      state, // Additional state field for GST/IGST calculation
      items,
      discount,
      paymentType,
      createdBy,
    } = req.body;

    let paidAmount = req.body.paidAmount || 0;

    // 🔹 Step 1: Items total
    let subTotal = items.reduce(
      (acc, item) => acc + item.itemPrice * item.itemQuantity,
      0
    );

    // 🔹 Step 2: Apply discount %
    let discountAmount = (subTotal * (discount || 0)) / 100;
    let afterDiscount = subTotal - discountAmount;

    // 🔹 Step 3: Get company settings and calculate GST %
    let gstPercent = 0;
    
    try {
      // Get company settings
      const companyInfo = await CompanyInfo.findOne();
      console.log('🔍 Company Info:', companyInfo);
      
      // 🔹 Step 2.5: Check NON GST bill limit if bill type is NON_GST
      if (billType === "NON_GST" && companyInfo) {
        const nonGstBillLimit = companyInfo.nonGstBillLimit;
        console.log('🔍 NON GST Bill Limit:', nonGstBillLimit);
        
        // If no limit is set, allow unlimited NON GST bills
        if (!nonGstBillLimit || nonGstBillLimit <= 0) {
          console.log('🔍 No NON GST bill limit set - allowing unlimited bills');
        } else {
        
        // Get current financial year
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1; // 0-based to 1-based
        
        // Determine financial year
        let financialYearStart, financialYearEnd;
        if (currentMonth >= 4) { // April to March
          financialYearStart = currentYear;
          financialYearEnd = currentYear + 1;
        } else {
          financialYearStart = currentYear - 1;
          financialYearEnd = currentYear;
        }
        
        const financialYearStartDate = new Date(financialYearStart, 3, 1); // April 1st
        const financialYearEndDate = new Date(financialYearEnd, 2, 31); // March 31st
        
        console.log('🔍 Financial Year:', financialYearStart, '-', financialYearEnd);
        console.log('🔍 Date Range:', financialYearStartDate, 'to', financialYearEndDate);
        
        // Count NON GST bills in current financial year
        const nonGstBillsCount = await newBillModel.countDocuments({
          billType: "NON_GST",
          createdAt: {
            $gte: financialYearStartDate,
            $lte: financialYearEndDate
          }
        });
        
        console.log('🔍 NON GST Bills Count in Financial Year:', nonGstBillsCount);
        console.log('🔍 NON GST Bill Limit:', nonGstBillLimit);
        


        
        if (nonGstBillsCount >= nonGstBillLimit) {
          return res.status(400).json({
            success: false,
            message: `NON GST bill limit exceeded. You can create only ${nonGstBillLimit} NON GST bills per financial year. Current count: ${nonGstBillsCount}`,
            limit: nonGstBillLimit,
            currentCount: nonGstBillsCount,
            financialYear: `${financialYearStart}-${financialYearEnd}`
          });
        }
        }
      }
      
      if (companyInfo) {
        // Check if customer state matches company state
        const companyState = companyInfo.address?.state?.toLowerCase();
        const customerState = (req.body.customerState || req.body.state)?.toLowerCase();
        
        console.log('🔍 Company State:', companyState);
        console.log('🔍 Customer State:', customerState);
        
        if (companyState && customerState) {
          if (companyState === customerState) {
            // Same state - use GST from company settings
            if (companyInfo.states && companyInfo.states.length > 0) {
              const stateInfo = companyInfo.states.find(state => 
                state.name.toLowerCase() === customerState
              );
              if (stateInfo && stateInfo.gstRate > 0) {
                gstPercent = stateInfo.gstRate;
                console.log('🔍 Using state-specific GST rate:', gstPercent);
              } else {
                gstPercent = companyInfo.defaultGstRate || 18; // Use company's default GST rate
                console.log('🔍 Using default GST rate (state not found in settings):', gstPercent);
              }
            } else {
              gstPercent = companyInfo.defaultGstRate || 18;
              console.log('🔍 Using default GST rate (no states configured):', gstPercent);
            }
          } else {
            // Different state - use IGST (same rate as GST but applied to subtotal)
            if (companyInfo.states && companyInfo.states.length > 0) {
              const stateInfo = companyInfo.states.find(state => 
                state.name.toLowerCase() === customerState
              );
              if (stateInfo && stateInfo.gstRate > 0) {
                gstPercent = stateInfo.gstRate;
                console.log('🔍 Using state-specific IGST rate:', gstPercent);
              } else {
                gstPercent = companyInfo.defaultGstRate || 18;
                console.log('🔍 Using default IGST rate (state not found in settings):', gstPercent);
              }
            } else {
              gstPercent = companyInfo.defaultGstRate || 18;
              console.log('🔍 Using default IGST rate (no states configured):', gstPercent);
            }
          }
        } else {
          // Fallback to default rate
          gstPercent = companyInfo.defaultGstRate || 18;
          console.log('🔍 Using default GST rate (no state info):', gstPercent);
        }
      } else {
        // No company info - use hardcoded fallback
        gstPercent = 18; // Fallback GST rate
        console.log('🔍 No company info found, using fallback rate:', gstPercent);
      }
    } catch (error) {
      console.error('❌ Error getting company settings:', error);
      // Fallback to hardcoded rate
      gstPercent = 18;
      console.log('🔍 Error getting company settings, using fallback rate:', gstPercent);
    }

    let gstAmount = (afterDiscount * gstPercent) / 100;
    let totalAmount = afterDiscount + gstAmount;

    // 🔹 Step 4: Payment handling
    let remainingAmount = 0;

    if (paymentType === "Full") {
      paidAmount = totalAmount; // force full payment
      remainingAmount = 0;
    } else if (paymentType === "Partial") {
      remainingAmount = totalAmount - paidAmount;
      if (remainingAmount < 0) remainingAmount = 0;
    } else {
      // agar paymentType galat ya missing hai
      paidAmount = 0;
      remainingAmount = totalAmount;
    }

    // 🔹 Step 5: Check bill count and generate bill number with cycling logic
    console.log('🔍 STEP 5: Starting bill number generation with cycling logic...');
    let billNumber = "";
    let currentBillCount = 1;
    
    try {
      // Get company settings for bill count logic
      const companySettings = await CompanyInfo.findOne();
      console.log('🔍 Company settings found:', companySettings ? 'Yes' : 'No');
      
      const maxBillsPerYear = companySettings?.billCountLimit || 1000;
      const billNumberFormat = companySettings?.billNumberFormat || "Bill-0001";
      
      console.log('🔍 Using settings:', { maxBillsPerYear, billNumberFormat });
      
      // Get current financial year
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1; // 1-12
      
      // Determine financial year based on company settings
      const financialYearStartMonth = companySettings?.financialYearMonth || "April";
      const financialYearStartMonthNum = getMonthNumber(financialYearStartMonth);
      
      let financialYear;
      if (currentMonth >= financialYearStartMonthNum) {
        financialYear = currentYear;
      } else {
        financialYear = currentYear - 1;
      }
      
      console.log('🔍 Financial year calculation:', {
        currentDate: currentDate.toISOString(),
        currentYear,
        currentMonth,
        financialYearStartMonth,
        financialYearStartMonthNum,
        calculatedFinancialYear: financialYear
      });
      
      // Count bills in current financial year
      const financialYearStart = new Date(financialYear, financialYearStartMonthNum - 1, 1);
      const financialYearEnd = new Date(financialYear + 1, financialYearStartMonthNum - 1, 0, 23, 59, 59, 999);
      
      console.log('🔍 Financial year range:', {
        start: financialYearStart.toISOString(),
        end: financialYearEnd.toISOString()
      });
      
      const billsInCurrentFinancialYear = await newBillModel.countDocuments({
        createdAt: {
          $gte: financialYearStart,
          $lte: financialYearEnd
        }
      });
      
      console.log('🔍 Bills in current financial year:', billsInCurrentFinancialYear);
      console.log('🔍 Max bills per year limit:', maxBillsPerYear);
      console.log('🔍 Comparison: billsInCurrentFinancialYear >= maxBillsPerYear?', billsInCurrentFinancialYear >= maxBillsPerYear);
      
      // Calculate current bill count with cycling logic
      if (billsInCurrentFinancialYear >= maxBillsPerYear) {
        // Calculate the position in the cycle (modulo operation)
        const moduloResult = billsInCurrentFinancialYear % maxBillsPerYear;
        currentBillCount = moduloResult + 1;
        console.log('🔄 CYCLING: Bills exceeded limit, cycling to position:', currentBillCount);
        console.log('🔄 Calculation: (', billsInCurrentFinancialYear, '%', maxBillsPerYear, ') + 1 =', currentBillCount);
        console.log('🔄 Modulo result:', moduloResult);
        console.log('🔄 Final currentBillCount:', currentBillCount);
      } else {
        currentBillCount = billsInCurrentFinancialYear + 1;
        console.log('🔍 Normal sequence: Next bill number:', currentBillCount);
      }
      
      // Generate bill number based on format
      console.log('🔍 Generating bill number:', { 
        billNumberFormat, 
        currentBillCount,
        paddedCount: currentBillCount.toString().padStart(4, '0')
      });
      
      // Check format detection and generate bill number
      console.log('🔍 Format detection details:');
      console.log('🔍 - billNumberFormat:', billNumberFormat);
      console.log('🔍 - currentBillCount:', currentBillCount);
      console.log('🔍 - padded count:', currentBillCount.toString().padStart(4, '0'));
      
      if (billNumberFormat.includes("0001")) {
        billNumber = billNumberFormat.replace("0001", currentBillCount.toString().padStart(4, '0'));
        console.log('🔍 Using 0001 format:', billNumber);
        console.log('🔍 Replace operation: "', billNumberFormat, '" -> "', billNumber, '"');
      } else if (billNumberFormat.includes("00001")) {
        billNumber = billNumberFormat.replace("00001", currentBillCount.toString().padStart(5, '0'));
        console.log('🔍 Using 00001 format:', billNumber);
      } else if (billNumberFormat.includes("001")) {
        billNumber = billNumberFormat.replace("001", currentBillCount.toString().padStart(3, '0'));
        console.log('🔍 Using 001 format:', billNumber);
      } else {
        // Default fallback - use the format as-is but replace the number part
        const parts = billNumberFormat.split('-');
        if (parts.length >= 2) {
          const prefix = parts[0];
          const numberPart = parts[1];
          const paddedNumber = currentBillCount.toString().padStart(numberPart.length, '0');
          billNumber = `${prefix}-${paddedNumber}`;
        } else {
          billNumber = `Bill-${currentBillCount.toString().padStart(4, '0')}`;
        }
        console.log('🔍 Using default format:', billNumber);
      }
      
      console.log('🔍 Final generated bill number:', billNumber);
      
    } catch (error) {
      console.error('❌ Error generating bill number:', error);
      // Fallback to simple numbering
      const billCount = await newBillModel.countDocuments();
      billNumber = `Bill-${(billCount + 1).toString().padStart(4, '0')}`;
    }

    // 🔹 Step 6: Create or Update Customer with GSTIN
    console.log('🔍 STEP 6: Creating/Updating customer with GSTIN information');
    console.log('🔍 Customer data received:', {
      customerName,
      customerPhone,
      customerGstin,
      customerAddress,
      pincode,
      customerState: customerState || state
    });
    let customer = null;
    
    try {
      // Check if customer exists by phone number
      customer = await Customer.findOne({ phone: customerPhone });
      console.log('🔍 Existing customer found:', customer ? 'Yes' : 'No');
      
      if (customer) {
        // Update existing customer with GSTIN if provided
        if (customerGstin) {
          console.log('🔍 Updating existing customer with GSTIN:', customerGstin);
          customer.customerGstin = customerGstin;
          customer.customerType = 'business'; // Update customer type to business
          
          // Only update gstNumber if GSTIN is valid format
          if (/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(customerGstin)) {
            customer.gstNumber = customerGstin;
            console.log('🔍 Valid GSTIN format detected, updating gstNumber field');
          } else {
            console.log('🔍 Invalid GSTIN format, only updating customerGstin field');
          }
          
          await customer.save();
          console.log('🔍 Updated existing customer with GSTIN:', customerGstin);
          console.log('🔍 Customer after update:', {
            name: customer.name,
            phone: customer.phone,
            customerGstin: customer.customerGstin,
            gstNumber: customer.gstNumber,
            customerType: customer.customerType
          });
          
          // Verify the customer was updated in database
          const updatedCustomer = await Customer.findById(customer._id);
          console.log('🔍 Customer verification from database after update:', {
            name: updatedCustomer.name,
            phone: updatedCustomer.phone,
            customerGstin: updatedCustomer.customerGstin,
            gstNumber: updatedCustomer.gstNumber,
            customerType: updatedCustomer.customerType
          });
        }
      } else {
        // Create new customer
        console.log('🔍 Creating new customer with GSTIN:', customerGstin);
        const customerData = {
          name: customerName,
          phone: customerPhone,
          address: customerAddress,
          pincode: pincode,
          state: customerState || state,
          customerGstin: customerGstin,
          customerType: customerGstin ? 'business' : 'individual',
          createdBy: createdBy
        };
        
        // Only add gstNumber if GSTIN is valid format
        if (customerGstin && /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(customerGstin)) {
          customerData.gstNumber = customerGstin;
          console.log('🔍 Valid GSTIN format detected, adding to gstNumber field');
        } else if (customerGstin) {
          console.log('🔍 Invalid GSTIN format, only saving to customerGstin field');
        }
        
        console.log('🔍 Customer data to be saved:', customerData);
        customer = new Customer(customerData);
        
        await customer.save();
        console.log('🔍 Created new customer with GSTIN:', customerGstin);
        console.log('🔍 Customer after creation:', {
          name: customer.name,
          phone: customer.phone,
          customerGstin: customer.customerGstin,
          gstNumber: customer.gstNumber,
          customerType: customer.customerType
        });
        
        // Verify the customer was saved to database
        const savedCustomer = await Customer.findById(customer._id);
        console.log('🔍 Customer verification from database:', {
          name: savedCustomer.name,
          phone: savedCustomer.phone,
          customerGstin: savedCustomer.customerGstin,
          gstNumber: savedCustomer.gstNumber,
          customerType: savedCustomer.customerType
        });
      }
    } catch (error) {
      console.error('❌ Error creating/updating customer:', error);
      // Continue with bill creation even if customer creation fails
    }

    // 🔹 Step 7: Save Bill
    console.log('🔍 STEP 7: Creating new bill with bill number:', billNumber);
    const newBill = new newBillModel({
      billType,
      billNumber, // Add the generated bill number
      customerName,
      customerAddress,
      customerPhone,
      customerGstin,
      pincode,
      state: customerState || state, // Use customerState or state field
      items,
      discount,
      gstPercent, // Store the calculated GST percentage
      gstAmount, // Store the calculated GST amount
      totalAmount,
      paymentType,
      paidAmount,
      remainingAmount,
      createdBy,
      customer: customer ? customer._id : null, // Link to customer if created/updated
    });

    await newBill.save();

    res.status(201).json({
      message: "Bill created successfully",
      bill: newBill,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating new bill",
      error: error.message,
    });
  }
};

// Get All Bills
export const getAllBills = async (req, res) => {
  try {
    const bills = await newBillModel.find().sort({ createdAt: -1 });
    res.status(200).json(bills);
  } catch (error) {
    res.status(500).json({ message: "Error fetching bills", error: error.message });
  }
};

// Get Bill by ID
export const getBillById = async (req, res) => {
  try {
    const bill = await newBillModel.findById(req.params.id);
    if (!bill) return res.status(404).json({ message: "Bill not found" });
    res.status(200).json(bill);
  } catch (error) {
    res.status(500).json({ message: "Error fetching bill", error: error.message });
  }
};

// Update Bill by ID
export const updateBillById = async (req, res) => {
  console.log('🔄 BILL UPDATE - This is an update operation, bill number will not change');
  try {
    // Get the original bill to compare changes
    const originalBill = await newBillModel.findById(req.params.id);
    if (!originalBill) return res.status(404).json({ message: "Bill not found" });

    // Detect real user changes (not derived/calculated fields)
    const changes = detectRealChanges(originalBill, req.body);
    
    // Calculate status and remaining amount manually
    const { totalAmount, paidAmount } = req.body;
    let status = 'completed';
    let remainingAmount = 0;
    
    if (totalAmount !== undefined && paidAmount !== undefined) {
      remainingAmount = totalAmount - paidAmount;
      status = remainingAmount <= 0 ? 'completed' : 'pending';
      
      console.log('🔄 Manual status calculation:', {
        totalAmount,
        paidAmount,
        remainingAmount,
        status
      });
    }
    
    // Ensure updatedAt is set to current timestamp
    const updateData = {
      ...req.body,
      status,
      remainingAmount,
      updatedAt: new Date()
    };
    
    const updatedBill = await newBillModel.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    if (!updatedBill) return res.status(404).json({ message: "Bill not found" });
    
    // Store change history if there are real changes
    if (changes.length > 0) {
      await storeChangeHistory(req.params.id, changes, req.body.updatedBy || 'system');
    }
    
    console.log('✅ Bill updated successfully with status:', updatedBill.status, 'remaining:', updatedBill.remainingAmount);
    console.log('📝 Changes detected:', changes);
    res.status(200).json({ 
      message: "Bill updated successfully", 
      bill: updatedBill,
      changes: changes
    });
  } catch (error) {
    console.error('❌ Error updating bill:', error);
    res.status(500).json({ message: "Error updating bill", error: error.message });
  }
};

// Function to detect real user changes (not derived/calculated fields)
const detectRealChanges = (originalBill, updateData) => {
  const changes = [];
  
  // Fields that are considered real user edits (allowlist)
  const editableFields = [
    'customerName', 'customerPhone', 'customerAddress', 'pincode', 'state',
    'paidAmount', 'paymentMethod', 'paymentType', 'status',
    'observation', 'termsAndConditions'
  ];
  
  // Fields that are derived/calculated and should be ignored (denylist)
  const derivedFields = [
    'totalAmount', 'remainingAmount', 'subtotal', 'gstAmount', 'gstPercent',
    'updatedAt', 'createdAt', 'displayDate', 'backendStatus'
  ];
  
  // Check for changes in editable fields
  editableFields.forEach(field => {
    if (updateData[field] !== undefined && updateData[field] !== originalBill[field]) {
      changes.push({
        field,
        oldValue: originalBill[field],
        newValue: updateData[field],
        type: 'field_updated'
      });
    }
  });
  
  // Special handling for items array
  if (updateData.items && Array.isArray(updateData.items)) {
    const itemChanges = detectItemChanges(originalBill.items || [], updateData.items);
    changes.push(...itemChanges);
  }
  
  return changes;
};

// Function to detect item-specific changes
const detectItemChanges = (originalItems, newItems) => {
  const changes = [];
  
  // Create maps for easier comparison
  const originalMap = new Map();
  const newMap = new Map();
  
  originalItems.forEach((item, index) => {
    const key = item.itemName || item.name || `item_${index}`;
    originalMap.set(key, item);
  });
  
  newItems.forEach((item, index) => {
    const key = item.itemName || item.name || `item_${index}`;
    newMap.set(key, item);
  });
  
  // Check for new items
  newMap.forEach((newItem, key) => {
    if (!originalMap.has(key)) {
      changes.push({
        field: 'items',
        type: 'item_added',
        itemName: newItem.itemName || newItem.name,
        quantity: newItem.itemQuantity || newItem.quantity,
        price: newItem.itemPrice || newItem.price
      });
    }
  });
  
  // Check for removed items
  originalMap.forEach((originalItem, key) => {
    if (!newMap.has(key)) {
      changes.push({
        field: 'items',
        type: 'item_removed',
        itemName: originalItem.itemName || originalItem.name
      });
    }
  });
  
  // Check for modified items
  newMap.forEach((newItem, key) => {
    if (originalMap.has(key)) {
      const originalItem = originalMap.get(key);
      const itemChanges = [];
      
      if (newItem.itemQuantity !== originalItem.itemQuantity) {
        itemChanges.push({
          field: 'quantity',
          oldValue: originalItem.itemQuantity,
          newValue: newItem.itemQuantity
        });
      }
      
      if (newItem.itemPrice !== originalItem.itemPrice) {
        itemChanges.push({
          field: 'price',
          oldValue: originalItem.itemPrice,
          newValue: newItem.itemPrice
        });
      }
      
      if (itemChanges.length > 0) {
        changes.push({
          field: 'items',
          type: 'item_updated',
          itemName: newItem.itemName || newItem.name,
          changes: itemChanges
        });
      }
    }
  });
  
  return changes;
};

// Function to store change history
const storeChangeHistory = async (billId, changes, changedBy) => {
  try {
    // This would store in a separate change history collection
    // For now, we'll just log it
    console.log('📝 Storing change history for bill:', billId, {
      changes,
      changedBy,
      timestamp: new Date()
    });
    
    // TODO: Implement actual storage in change history collection
    // await changeHistoryModel.create({
    //   billId,
    //   changes,
    //   changedBy,
    //   timestamp: new Date()
    // });
  } catch (error) {
    console.error('❌ Error storing change history:', error);
  }
};

// Recalculate all bills status and remaining amounts
export const recalculateAllBillsStatus = async (req, res) => {
  try {
    console.log('🔄 Recalculating all bills status and remaining amounts...');
    
    const bills = await newBillModel.find({});
    let updatedCount = 0;
    
    for (const bill of bills) {
      if (bill.totalAmount !== undefined && bill.paidAmount !== undefined) {
        const remainingAmount = bill.totalAmount - bill.paidAmount;
        const status = remainingAmount <= 0 ? 'completed' : 'pending';
        
        // Only update if status or remaining amount has changed
        if (bill.status !== status || bill.remainingAmount !== remainingAmount) {
          await newBillModel.findByIdAndUpdate(bill._id, {
            status,
            remainingAmount,
            updatedAt: new Date()
          });
          
          console.log(`✅ Updated bill ${bill.billNumber}: status=${status}, remaining=${remainingAmount}`);
          updatedCount++;
        }
      }
    }
    
    console.log(`✅ Recalculation complete. Updated ${updatedCount} bills.`);
    res.status(200).json({ 
      message: `Successfully recalculated ${updatedCount} bills`, 
      updatedCount 
    });
  } catch (error) {
    console.error('❌ Error recalculating bills:', error);
    res.status(500).json({ message: "Error recalculating bills", error: error.message });
  }
};

// Delete Bill by ID
export const deleteBillById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Server: Attempting to delete bill with ID: ${id}`);
    
    const deletedBill = await newBillModel.findByIdAndDelete(id);
    
    if (!deletedBill) {
      console.log(`❌ Server: Bill not found with ID: ${id}`);
      return res.status(404).json({ 
        success: false,
        message: "Bill not found" 
      });
    }
    
    console.log(`✅ Server: Bill deleted successfully - ID: ${id}, Bill Number: ${deletedBill.billNumber}`);
    
    res.status(200).json({ 
      success: true,
      message: "Bill deleted successfully",
      deletedBill: {
        id: deletedBill._id,
        billNumber: deletedBill.billNumber
      }
    });
  } catch (error) {
    console.error(`❌ Server: Error deleting bill - ID: ${req.params.id}`, error);
    res.status(500).json({ 
      success: false,
      message: "Error deleting bill", 
      error: error.message 
    });
  }
};

// Get Bills by Customer ID
export const getBillsByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    
    console.log("🔍 Searching for customer ID:", customerId);
    
    // Import Customer model to get customer details
    const Customer = (await import("../models/Customer.js")).default;
    
    let customerPhone = null;
    let customerName = null;
    
    // First, try to get customer details by ID
    try {
      const customer = await Customer.findById(customerId);
      if (customer) {
        customerPhone = customer.phone;
        customerName = customer.name;
        console.log("✅ Found customer:", { name: customerName, phone: customerPhone });
      }
    } catch (customerError) {
      console.log("⚠️ Customer not found by ID, treating as phone/name search");
    }
    
    // Build search query
    const searchQuery = {
      $or: []
    };
    
    // If we found customer details, search by phone and name
    if (customerPhone) {
      searchQuery.$or.push({ customerPhone: customerPhone });
    }
    if (customerName) {
      searchQuery.$or.push({ customerName: { $regex: customerName, $options: 'i' } });
    }
    
    // Also search by the original customerId (in case it's a phone number or name)
    searchQuery.$or.push(
      { customerPhone: customerId },
      { customerName: { $regex: customerId, $options: 'i' } }
    );
    
    // Remove duplicates from $or array
    searchQuery.$or = [...new Set(searchQuery.$or.map(JSON.stringify))].map(JSON.parse);
    
    console.log("🔍 Search query:", JSON.stringify(searchQuery, null, 2));
    
    const bills = await newBillModel.find(searchQuery).sort({ createdAt: -1 });

    console.log("✅ Found bills:", bills.length);

    res.status(200).json({
      success: true,
      data: bills,
      total: bills.length
    });
  } catch (error) {
    console.error("Get customer bills error:", error);
    res.status(500).json({ 
      success: false,
      message: "Error fetching customer bills", 
      error: error.message 
    });
  }
};

// Get Recent Bills
export const getRecentBills = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    
    const bills = await newBillModel.find()
      .sort({ createdAt: -1 })
      .limit(limit);

    res.status(200).json({
      success: true,
      data: bills,
      total: bills.length
    });
  } catch (error) {
    console.error("Get recent bills error:", error);
    res.status(500).json({ 
      success: false,
      message: "Error fetching recent bills", 
      error: error.message 
    });
  }
};