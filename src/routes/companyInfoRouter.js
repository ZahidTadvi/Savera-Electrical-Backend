import express from "express";
import multer from "multer";

import { createCompany, getCompany, updateUer, deleteUser, getCompanyById, uploadLogo, testShowNonGstBills } from "../controller/companyInfocontroller.js";

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/profiles/'); // Make sure this directory exists
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

const companyInfoRouter = express.Router();

// Add debugging middleware
companyInfoRouter.use((req, res, next) => {
  console.log(`🔍 CompanyInfo Route Hit: ${req.method} ${req.path}`);
  next();
});

companyInfoRouter.post("/createCompany", createCompany);        // Create
companyInfoRouter.get("/getCompany", getCompany);          // Get all   
companyInfoRouter.get("/:id", getCompanyById);             // Get Company by ID
companyInfoRouter.put("/:id", updateUer);                 // Update by ID
companyInfoRouter.delete("/:id", deleteUser);             // Delete by ID
companyInfoRouter.post("/test-showNonGstBills", testShowNonGstBills); // Test showNonGstBills field

// Test route without multer
companyInfoRouter.get("/test-upload", (req, res) => {
  res.json({ message: "Upload route is accessible!" });
});

companyInfoRouter.post("/upload-logo", upload.single('logo'), uploadLogo); // Upload logo

export default companyInfoRouter;