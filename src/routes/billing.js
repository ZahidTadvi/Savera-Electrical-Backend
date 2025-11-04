import express from "express";
import { BillingService } from "../services/billing-service.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();
const billingService = new BillingService();

// Get all bills with pagination and filters
router.get('/bills', authenticate, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      billType,
      paymentStatus,
      startDate,
      endDate,
      customerId,
    } = req.query;

    const filters = {};
    
    if (search) {
      filters.$or = [
        { billNumber: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.phone': { $regex: search, $options: 'i' } },
      ];
    }
    
    if (billType) filters.billType = billType;
    if (paymentStatus) filters.paymentStatus = paymentStatus;
    if (customerId) filters['customer.id'] = customerId;
    
    if (startDate || endDate) {
      filters.billDate = {};
      if (startDate) filters.billDate.$gte = new Date(startDate);
      if (endDate) filters.billDate.$lte = new Date(endDate);
    }

    const bills = await billingService.getBills(filters, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.json(bills);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
});

// Get single bill by ID
router.get('/bills/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const bill = await billingService.getBillById(id);
    
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    res.json(bill);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bill' });
  }
});

// Create new bill
router.post('/bills', authenticate, async (req, res) => {
  try {
    const billData = req.body;
    const userId = req.user?.id;
    
    const calculatedBill = await billingService.calculateBillAmounts(billData);
    
    const billNumber = await billingService.generateBillNumber(
      billData.billType,
      billData.financialYear
    );
    
    const newBill = await billingService.createBill({
      ...calculatedBill,
      billNumber,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    res.status(201).json(newBill);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create bill' });
  }
});

// Update bill
router.put('/bills/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    let updatedData = updates;
    if (updates.items) {
      updatedData = await billingService.calculateBillAmounts(updates);
    }
    
    const updatedBill = await billingService.updateBill(id, {
      ...updatedData,
      updatedAt: new Date(),
    });
    
    res.json(updatedBill);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update bill' });
  }
});

// Delete bill (soft delete)
router.delete('/bills/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await billingService.deleteBill(id);
    res.json({ message: 'Bill deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete bill' });
  }
});

// Generate PDF for bill
router.get('/bills/:id/pdf', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const bill = await billingService.getBillById(id);
    
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    const pdfBuffer = await billingService.generatePDF(bill);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Bill-${bill.billNumber}.pdf"`,
    });
    
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Dashboard statistics
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const stats = await billingService.getDashboardStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Sales returns
router.get('/returns', authenticate, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      startDate,
      endDate,
    } = req.query;

    const filters = {};
    
    if (search) {
      filters.$or = [
        { returnNumber: { $regex: search, $options: 'i' } },
        { originalBillNumber: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
      ];
    }
    
    if (status) filters.status = status;
    
    if (startDate || endDate) {
      filters.returnDate = {};
      if (startDate) filters.returnDate.$gte = new Date(startDate);
      if (endDate) filters.returnDate.$lte = new Date(endDate);
    }

    const returns = await billingService.getSalesReturns(filters, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.json(returns);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sales returns' });
  }
});

router.post('/returns', authenticate, async (req, res) => {
  try {
    const returnData = req.body;
    const userId = req.user?.id;
    
    const returnNumber = await billingService.generateReturnNumber();
    
    const newReturn = await billingService.createSalesReturn({
      ...returnData,
      returnNumber,
      createdBy: userId,
      createdAt: new Date(),
    });
    
    res.status(201).json(newReturn);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create sales return' });
  }
});

router.put('/returns/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const updatedReturn = await billingService.updateSalesReturnStatus(id, status);
    res.json(updatedReturn);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update sales return' });
  }
});

export default router;


