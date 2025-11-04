import express from "express";

import { 
  createBill, 
  getAllBills, 
  getBillById, 
  updateBillById, 
  deleteBillById,
  getBillsByCustomer,
  getRecentBills,
  recalculateAllBillsStatus
} from "../controller/newBillController.js";

const newBillRouter = express.Router();

newBillRouter.post("/register", createBill);        // Create
newBillRouter.get("/getBills", getAllBills);          // Get all
newBillRouter.get("/getBillsById/:id", getBillById);      // Get by ID
newBillRouter.put("/updateBills/:id", updateBillById);   // Update by ID
newBillRouter.delete("/deleteBills/:id", deleteBillById);// Delete by ID
newBillRouter.get("/customer/:customerId", getBillsByCustomer); // Get bills by customer
newBillRouter.get("/recent", getRecentBills);        // Get recent bills
newBillRouter.post("/recalculate-status", recalculateAllBillsStatus); // Recalculate all bills status

export default newBillRouter;