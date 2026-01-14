import express from "express";
import { storage } from "../storage";
import { insertUserSchema, insertUserAddressSchema, insertRatingSchema, type UserAddress } from "../../shared/schema";
import { randomUUID } from "crypto";
import { requireAuth } from "../auth";

const router = express.Router();

// جلب ملف العميل (الحالي)
router.get("/profile", requireAuth, async (req, res) => {
  try {
    const id = req.user!.id;
    const customer = await storage.getUser(id);

    if (!customer) {
      return res.status(404).json({ error: "العميل غير موجود" });
    }

    res.json(customer);
  } catch (error) {
    console.error("خطأ في جلب ملف العميل:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// تحديث ملف العميل
router.put("/profile", requireAuth, async (req, res) => {
  try {
    const id = req.user!.id;
    const updateData = req.body;

    const updatedCustomer = await storage.updateUser(id, updateData);

    if (!updatedCustomer) {
      return res.status(404).json({ error: "العميل غير موجود" });
    }

    res.json(updatedCustomer);
  } catch (error) {
    console.error("خطأ في تحديث ملف العميل:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب عناوين العميل
router.get("/addresses", requireAuth, async (req, res) => {
  try {
    const id = req.user!.id;
    
    const addresses = await storage.getUserAddresses(id);
    
    addresses.sort((a: UserAddress, b: UserAddress) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    res.json(addresses);
  } catch (error) {
    console.error("خطأ في جلب عناوين العميل:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// إضافة عنوان جديد
router.post("/addresses", requireAuth, async (req, res) => {
  try {
    const id = req.user!.id;
    const addressData = req.body;

    const validatedData = insertUserAddressSchema.omit({ id: true, userId: true, createdAt: true }).parse(addressData);
    const newAddress = await storage.createUserAddress(id, validatedData as any);

    res.json(newAddress);
  } catch (error) {
    console.error("خطأ في إضافة عنوان جديد:", error);
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: "بيانات العنوان غير صحيحة" });
    } else {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  }
});

// تحديث عنوان
router.put("/addresses/:addressId", requireAuth, async (req, res) => {
  try {
    const customerId = req.user!.id;
    const { addressId } = req.params;
    const updateData = req.body;

    const validatedData = insertUserAddressSchema.omit({ id: true, userId: true, createdAt: true }).partial().parse(updateData);
    const updatedAddress = await storage.updateUserAddress(addressId, customerId, validatedData);

    if (!updatedAddress) {
      return res.status(404).json({ error: "العنوان غير موجود أو لا يخص هذا العميل" });
    }

    res.json(updatedAddress);
  } catch (error) {
    console.error("خطأ في تحديث العنوان:", error);
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: "بيانات العنوان غير صحيحة" });
    } else {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  }
});

// حذف عنوان
router.delete("/addresses/:addressId", requireAuth, async (req, res) => {
  try {
    const customerId = req.user!.id;
    const { addressId } = req.params;

    const success = await storage.deleteUserAddress(addressId, customerId);

    if (!success) {
      return res.status(404).json({ error: "العنوان غير موجود أو لا يخص هذا العميل" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("خطأ في حذف العنوان:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب طلبات العميل
router.get("/orders", requireAuth, async (req, res) => {
  try {
    const id = req.user!.id;
    const { page = 1, limit = 10 } = req.query;
    
    const allOrders = await storage.getOrders();
    const customerOrders = allOrders.filter(order => order.customerId === id);
    
    customerOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedOrders = customerOrders.slice(startIndex, endIndex);

    res.json(paginatedOrders);
  } catch (error) {
    console.error("خطأ في جلب طلبات العميل:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// تقييم طلب
router.post("/orders/:orderId/review", requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const customerId = req.user!.id;
    const { rating, comment } = req.body;

    const order = await storage.getOrder(orderId);
    if (!order) {
      return res.status(404).json({ error: "الطلب غير موجود" });
    }

    if (order.customerId !== customerId) {
      return res.status(403).json({ error: "غير مصرح لك بتقييم هذا الطلب" });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "التقييم يجب أن يكون بين 1 و 5" });
    }

    const customer = await storage.getUser(customerId);
    if (!customer) {
      return res.status(404).json({ error: "العميل غير موجود" });
    }

    const reviewData = {
      orderId,
      restaurantId: order.restaurantId,
      customerName: customer.name,
      customerPhone: customer.phone || "",
      rating: Number(rating),
      comment: comment || null,
      isApproved: false
    };

    const newReview = await storage.createRating(reviewData);

    res.json(newReview);
  } catch (error) {
    console.error("خطأ في إضافة التقييم:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

export { router as customerRoutes };

export { router as customerRoutes };