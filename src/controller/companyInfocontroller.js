import CompanyInfo from "../models/companyInfo.js";
import { successResponse, errorResponse } from "../helper/sucessAndError.js";
import path from "path";
import fs from "fs";

// Helper function to convert month name to number
const getMonthNumber = (monthName) => {
  const months = {
    'january': 1, 'february': 2, 'march': 3, 'april': 4,
    'may': 5, 'june': 6, 'july': 7, 'august': 8,
    'september': 9, 'october': 10, 'november': 11, 'december': 12
  };
  return months[monthName.toLowerCase()] || 4; // Default to April if not found
};

// Calculate current financial year dynamically
const calculateCurrentFinancialYear = (financialYearMonth) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const startMonth = getMonthNumber(financialYearMonth || "April");
  
  if (currentMonth >= startMonth) {
    return currentYear;
  } else {
    return currentYear - 1;
  }
};

// Create Company Info
export const createCompany = async (req, res) => {
  try {
    const company = new CompanyInfo(req.body);
    await company.save();
    res.status(201).json({ success: true, data: company });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Get Company Info
export const getCompany = async (req, res) => {
  try {
    const company = await CompanyInfo.findOne();
    
    // Auto-calculate current financial year if company exists
    if (company && company.financialYearMonth) {
      company.currentFinancialYear = calculateCurrentFinancialYear(company.financialYearMonth);
      console.log('🔍 Backend - Auto-calculated current financial year for getCompany:', company.currentFinancialYear);
    }
    
    res.json({ success: true, data: company });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update Company Info
export const updateUer = async (req,res)=>{
    try {
        const query = req.body;
        const id = req.params.id;
        
        console.log('🔍 Backend - updateUer called with ID:', id);
        console.log('🔍 Backend - Request body:', JSON.stringify(query, null, 2));
        console.log('🔍 Backend - States in request:', query.states);
        console.log('🔍 Backend - States type:', typeof query.states);
        console.log('🔍 Backend - States length:', query.states?.length || 0);
        console.log('🔍 Backend - showNonGstBills in request:', query.showNonGstBills);
        console.log('🔍 Backend - showNonGstBills type:', typeof query.showNonGstBills);
        console.log('🔍 Backend - All fields in request:', Object.keys(query));
        console.log('🔍 Backend - showNonGstBills field exists in request:', 'showNonGstBills' in query);
        
        // Clean states by removing any temporary _id values
        if (query.states && Array.isArray(query.states)) {
            query.states = query.states.map(state => ({
                name: state.name,
                pincode: state.pincode,
                gstRate: state.gstRate
                // Remove _id to let MongoDB generate new ObjectIds
            }));
            console.log('🔍 Backend - Cleaned states:', query.states);
        }

        // Auto-calculate current financial year if financial year month is being updated
        if (query.financialYearMonth) {
            query.currentFinancialYear = calculateCurrentFinancialYear(query.financialYearMonth);
            console.log('🔍 Backend - Auto-calculated current financial year:', query.currentFinancialYear);
        }
        
        // Ensure showNonGstBills is properly handled
        if (query.showNonGstBills !== undefined) {
            console.log('🔍 Backend - showNonGstBills field found in request:', query.showNonGstBills);
            // Ensure the field is properly set
            query.showNonGstBills = Boolean(query.showNonGstBills);
            console.log('🔍 Backend - showNonGstBills converted to boolean:', query.showNonGstBills);
        } else {
            console.log('🔍 Backend - showNonGstBills field not found in request');
            console.log('🔍 Backend - Available fields in request:', Object.keys(query));
        }
        
        // Ensure nonGstBillLimit is properly handled
        if (query.nonGstBillLimit !== undefined) {
            console.log('🔍 Backend - nonGstBillLimit field found in request:', query.nonGstBillLimit);
            // Convert to number or null
            query.nonGstBillLimit = query.nonGstBillLimit === '' || query.nonGstBillLimit === null ? null : Number(query.nonGstBillLimit);
            console.log('🔍 Backend - nonGstBillLimit converted to:', query.nonGstBillLimit);
        } else {
            console.log('🔍 Backend - nonGstBillLimit field not found in request');
        }
        
        // Force include nonGstBillLimit in update if it exists in request body
        if (req.body.nonGstBillLimit !== undefined) {
            console.log('🔍 Backend - nonGstBillLimit found in req.body:', req.body.nonGstBillLimit);
            query.nonGstBillLimit = req.body.nonGstBillLimit === '' || req.body.nonGstBillLimit === null ? null : Number(req.body.nonGstBillLimit);
            console.log('🔍 Backend - nonGstBillLimit set from req.body:', query.nonGstBillLimit);
        }
        
        // Log the query object before sending to MongoDB
        console.log('🔍 Backend - Query object being sent to MongoDB:', JSON.stringify(query, null, 2));
        console.log('🔍 Backend - showNonGstBills in query object:', query.showNonGstBills);
        console.log('🔍 Backend - nonGstBillLimit in query object:', query.nonGstBillLimit);
        
        // Ensure showNonGstBills is explicitly included in the update
        if (query.showNonGstBills !== undefined) {
            console.log('🔍 Backend - showNonGstBills is being updated to:', query.showNonGstBills);
        } else {
            console.log('🔍 Backend - showNonGstBills is not in the update query');
            console.log('🔍 Backend - Available fields in query:', Object.keys(query));
            console.log('🔍 Backend - Query object keys:', Object.keys(query));
            console.log('🔍 Backend - Query object values:', Object.values(query));
        }
        
        // Ensure nonGstBillLimit is explicitly included in the update
        if (query.nonGstBillLimit !== undefined) {
            console.log('🔍 Backend - nonGstBillLimit is being updated to:', query.nonGstBillLimit);
        } else {
            console.log('🔍 Backend - nonGstBillLimit is not in the update query');
        }
        
        // Force include showNonGstBills in the update if it's in the request
        if (query.showNonGstBills !== undefined) {
            console.log('🔍 Backend - Forcing showNonGstBills update to:', query.showNonGstBills);
            // Explicitly set the field in the update query
            query.showNonGstBills = query.showNonGstBills;
        } else {
            console.log('🔍 Backend - showNonGstBills not found in request, checking if it should be included');
            // If showNonGstBills is not in the request, check if it should be included
            if (query.hasOwnProperty('showNonGstBills')) {
                console.log('🔍 Backend - showNonGstBills property exists but is undefined');
            } else {
                console.log('🔍 Backend - showNonGstBills property does not exist in request');
            }
        }
        
        // Force include nonGstBillLimit in the update if it's in the request
        if (query.nonGstBillLimit !== undefined) {
            console.log('🔍 Backend - Forcing nonGstBillLimit update to:', query.nonGstBillLimit);
            // Explicitly set the field in the update query
            query.nonGstBillLimit = query.nonGstBillLimit;
        } else {
            console.log('🔍 Backend - nonGstBillLimit not found in request, checking if it should be included');
            // If nonGstBillLimit is not in the request, check if it should be included
            if (query.hasOwnProperty('nonGstBillLimit')) {
                console.log('🔍 Backend - nonGstBillLimit property exists but is undefined');
            } else {
                console.log('🔍 Backend - nonGstBillLimit property does not exist in request');
            }
        }
        
        // Log the final query object before sending to MongoDB
        console.log('🔍 Backend - Final query object:', JSON.stringify(query, null, 2));
        console.log('🔍 Backend - showNonGstBills in final query:', query.showNonGstBills);
        console.log('🔍 Backend - nonGstBillLimit in final query:', query.nonGstBillLimit);
        
        // Use $set operator to ensure the field is updated
        const updateQuery = { $set: query };
        console.log('🔍 Backend - Using $set operator for update:', JSON.stringify(updateQuery, null, 2));
        console.log('🔍 Backend - showNonGstBills in $set query:', updateQuery.$set.showNonGstBills);
        console.log('🔍 Backend - nonGstBillLimit in $set query:', updateQuery.$set.nonGstBillLimit);
        
        // Force update nonGstBillLimit if it exists in request
        if (req.body.nonGstBillLimit !== undefined) {
            updateQuery.$set.nonGstBillLimit = req.body.nonGstBillLimit === '' || req.body.nonGstBillLimit === null ? null : Number(req.body.nonGstBillLimit);
            console.log('🔍 Backend - Force set nonGstBillLimit:', updateQuery.$set.nonGstBillLimit);
        }
        
        // Force include nonGstBillLimit in update query
        if (req.body.hasOwnProperty('nonGstBillLimit')) {
            updateQuery.$set.nonGstBillLimit = req.body.nonGstBillLimit === '' || req.body.nonGstBillLimit === null ? null : Number(req.body.nonGstBillLimit);
            console.log('🔍 Backend - Force include nonGstBillLimit:', updateQuery.$set.nonGstBillLimit);
        }
        
        // Log final update query
        console.log('🔍 Backend - Final update query:', JSON.stringify(updateQuery, null, 2));
        
        // Direct MongoDB update to force nonGstBillLimit update
        if (req.body.nonGstBillLimit !== undefined) {
            const updateValue = req.body.nonGstBillLimit === '' || req.body.nonGstBillLimit === null ? null : Number(req.body.nonGstBillLimit);
            console.log('🔍 Backend - Direct MongoDB update for nonGstBillLimit:', updateValue);
            console.log('🔍 Backend - Request body nonGstBillLimit:', req.body.nonGstBillLimit);
            console.log('🔍 Backend - Update value:', updateValue);
            
            const updateResult = await CompanyInfo.updateOne(
                { _id: id },
                { $set: { nonGstBillLimit: updateValue } }
            );
            console.log('🔍 Backend - Update result:', updateResult);
            
            // Verify the update immediately
            const verifyDoc = await CompanyInfo.findById(id);
            console.log('🔍 Backend - Immediate verification - nonGstBillLimit:', verifyDoc.nonGstBillLimit);
        }
        
        const updatedUser = await CompanyInfo.findByIdAndUpdate(id, updateQuery, {
            new: true,
            runValidators: false // Disable validators to force update
        })
        
        // Verify update by fetching from database
        const verifyUpdate = await CompanyInfo.findById(id);
        console.log('🔍 Backend - Verification - nonGstBillLimit in DB:', verifyUpdate.nonGstBillLimit);
        
        console.log('🔍 Backend - Updated user:', JSON.stringify(updatedUser, null, 2));
        console.log('🔍 Backend - States in response:', updatedUser.states);
        console.log('🔍 Backend - showNonGstBills in response:', updatedUser.showNonGstBills);
        console.log('🔍 Backend - showNonGstBills type in response:', typeof updatedUser.showNonGstBills);
        console.log('🔍 Backend - nonGstBillLimit in response:', updatedUser.nonGstBillLimit);
        console.log('🔍 Backend - nonGstBillLimit type in response:', typeof updatedUser.nonGstBillLimit);
        console.log('🔍 Backend - All fields in updatedUser:', Object.keys(updatedUser.toObject ? updatedUser.toObject() : updatedUser));
        console.log('🔍 Backend - showNonGstBills field exists:', 'showNonGstBills' in (updatedUser.toObject ? updatedUser.toObject() : updatedUser));
        
        // Check if the field is in the database document
        const dbDoc = await CompanyInfo.findById(id);
        console.log('🔍 Backend - showNonGstBills in database:', dbDoc.showNonGstBills);
        console.log('🔍 Backend - showNonGstBills type in database:', typeof dbDoc.showNonGstBills);
        console.log('🔍 Backend - nonGstBillLimit in database:', dbDoc.nonGstBillLimit);
        console.log('🔍 Backend - nonGstBillLimit type in database:', typeof dbDoc.nonGstBillLimit);
        console.log('🔍 Backend - All fields in database document:', Object.keys(dbDoc.toObject()));
        console.log('🔍 Backend - showNonGstBills field exists in database:', 'showNonGstBills' in dbDoc.toObject());
        console.log('🔍 Backend - nonGstBillLimit field exists in database:', 'nonGstBillLimit' in dbDoc.toObject());
        
        res.status(200).json(successResponse(200,"User is updated successfully",updatedUser));
    } catch (error) {
        console.error('🔍 Backend - Error in updateUer:', error);
        res.status(500).json(errorResponse(500,"User is not Updated",error));
    }
};

// Delete Company Info
export const deleteUser = async (req,res)=>{
    try {
        const id = req.params.id;
        const deletedUser = await CompanyInfo.findByIdAndUpdate(id,{isActive:false},{
            new:true,
            runValidators:true
        });
        res.status(200).json(successResponse(200,"User is deleted successfully",deletedUser));
    } catch (error) {
        res.status(500).json(errorResponse(500,"User is not deleted",error));
    }
};

// ✅ Get Company Info by ID
export const getCompanyById = async (req, res) => {
  try {
    const { id } = req.params;

    const company = await CompanyInfo.findById(id);

    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    res.json({ success: true, data: company });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ✅ Test endpoint to check showNonGstBills field
export const testShowNonGstBills = async (req, res) => {
  try {
    console.log('🧪 Testing showNonGstBills field...');
    
    // Get the first company record
    let company = await CompanyInfo.findOne();
    
    if (!company) {
      return res.status(404).json({ 
        success: false, 
        message: "No company found" 
      });
    }
    
    console.log('🔍 Current showNonGstBills value:', company.showNonGstBills);
    console.log('🔍 Current showNonGstBills type:', typeof company.showNonGstBills);
    console.log('🔍 Schema fields:', Object.keys(CompanyInfo.schema.paths));
    console.log('🔍 showNonGstBills in schema:', 'showNonGstBills' in CompanyInfo.schema.paths);
    
    // Test updating the field
    const testValue = req.body.showNonGstBills !== undefined ? req.body.showNonGstBills : !company.showNonGstBills;
    
    company.showNonGstBills = testValue;
    await company.save();
    
    console.log('🔍 Updated showNonGstBills value:', company.showNonGstBills);
    
    res.json({ 
      success: true, 
      message: "showNonGstBills field test completed",
      data: {
        originalValue: company.showNonGstBills,
        updatedValue: testValue,
        fieldExists: 'showNonGstBills' in company.toObject(),
        schemaFields: Object.keys(CompanyInfo.schema.paths),
        showNonGstBillsInSchema: 'showNonGstBills' in CompanyInfo.schema.paths
      }
    });
    
  } catch (error) {
    console.error('Error testing showNonGstBills:', error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to test showNonGstBills field",
      error: error.message 
    });
  }
};

// ✅ Upload Company Logo
export const uploadLogo = async (req, res) => {
  try {
    console.log('🖼️ Upload Logo endpoint hit!');
    console.log('📁 Request file:', req.file);
    console.log('📋 Request body:', req.body);
    
    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({ 
        success: false, 
        message: "No file uploaded" 
      });
    }

    // Get the uploaded file info
    const file = req.file;
    const logoUrl = `/uploads/profiles/${file.filename}`;

    // Find the first company record and update it with the logo URL
    let company = await CompanyInfo.findOne();
    
    if (!company) {
      // If no company exists, create a new one with default values
      company = new CompanyInfo({
        name: "Savera Electronics",
        logo: logoUrl,
        address: {
          street: "123 Business Street",
          city: "Burhanpur",
          state: "Madhya Pradesh",
          pincode: "450331"
        },
        gstNumber: "23ABCDE1234F1Z5",
        phone: "9876543210",
        email: "info@saveraelectronic.com",
        website: "www.saveraelectronic.com",
        stateCode: "23",
        invoiceTemplete: "Standard",
        companyLogo: true,
        gstNumberDisplay: true,
        emailAddress: true,
        phoneNumber: true,
        termsConditions: true,
        signatureLine: false,
        gstBillPrefix: "GST",
        nonGstBillPrefix: "NGST",
        demoBill: "DEMO",
        financialYearMonth: "April",
        financialYearStart: 2024,
        currentFinancialYear: 2025,
        defaultGstRate: 18, // Default GST rate
        defaultNonGstRate: 0,
        decimalPlaces: 2,
        defaultPaymentMethod: "cash",
        paymentTerms: 30,
        cgstRate: 9,
        sgstRate: 9,
        autoGenerateBillNumber: true,
        includeGstBreakdown: true,
        sendPaymentReminders: false,
        reminderDays: 7,
        isProductSearch: false,
        enableProductSearch: true,
        searchByProductName: true,
        searchByCategory: true,
        searchByBrand: true,
        searchBySku: false,
        showProductImages: true,
        maxSearchResults: 10
      });
      await company.save();
    } else {
      // Update existing company with new logo
      company.logo = logoUrl;
      await company.save();
    }

    res.json({ 
      success: true, 
      message: "Logo uploaded successfully",
      data: { 
        logoUrl: logoUrl,
        company: company 
      }
    });

  } catch (error) {
    console.error('Error uploading logo:', error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to upload logo",
      error: error.message 
    });
  }
};