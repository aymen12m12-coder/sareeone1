import express from "express";
import { storage } from "../storage";
import { z } from "zod";
import { requireAuth } from "../auth";

const router = express.Router();

// لوحة معلومات السائق
router.get("/dashboard", requireAuth, async (req, res) => {
  try {
    const driverId = req.user!.id;
    
    // التحقق من وجود السائق
    const driver = await storage.getDriver(driverId);
    if (!driver) {
      return res.status(404).json({ error: "السائق غير موجود" });
    }

    // جلب جميع الطلبات وفلترتها
    const allOrders = await storage.getOrders();
    const driverOrders = allOrders.filter(order => order.driverId === driverId);
    
    // حساب الإحصائيات
    const today = new Date().toDateString();
    const todayOrders = driverOrders.filter(order => 
      order.createdAt.toDateString() === today
    );
    const completedToday = todayOrders.filter(order => order.status === "delivered");
    const totalEarnings = driverOrders
      .filter(order => order.status === "delivered")
      .reduce((sum, order) => sum + parseFloat(order.driverEarnings || "0"), 0);
    const todayEarnings = completedToday
      .reduce((sum, order) => sum + parseFloat(order.driverEarnings || "0"), 0);

    // الطلبات المتاحة (غير مُعيَّنة لسائق)
    const availableOrders = allOrders
      .filter(order => order.status === "confirmed" && !order.driverId)
      .slice(0, 10);

    // الطلبات الحالية للسائق
    const currentOrders = driverOrders.filter(order => 
      order.status === "picked_up" || order.status === "ready"
    );

    res.json({
      stats: {
        todayOrders: todayOrders.length,
        todayEarnings,
        completedToday: completedToday.length,
        totalOrders: driverOrders.length,
        totalEarnings,
        averageRating: 4.5
      },
      availableOrders,
      currentOrders
    });
  } catch (error) {
    console.error("خطأ في لوحة معلومات السائق:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// قبول طلب
router.post("/orders/:id/accept", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const driverId = req.user!.id;

    // جلب الطلب
    const order = await storage.getOrder(id);
    if (!order) {
      return res.status(404).json({ error: "الطلب غير موجود" });
    }

    // التحقق من إمكانية قبول الطلب
    if (order.status !== "confirmed" || order.driverId) {
      return res.status(400).json({ error: "لا يمكن قبول هذا الطلب" });
    }

    // تحديث الطلب
    const updatedOrder = await storage.updateOrder(id, {
      driverId,
      status: "ready",
      driverEarnings: "10.00" // قيمة افتراضية
    });

    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error("خطأ في قبول الطلب:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// تحديث حالة الطلب
router.put("/orders/:id/status", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const driverId = req.user!.id;
    const { status, location } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: "الحالة مطلوبة" });
    }

    // جلب الطلب والتحقق من صلاحية السائق
    const order = await storage.getOrder(id);
    if (!order) {
      return res.status(404).json({ error: "الطلب غير موجود" });
    }

    if (order.driverId !== driverId) {
      return res.status(403).json({ error: "غير مصرح بتحديث هذا الطلب" });
    }

    // التحقق من الحالات المسموحة
    const allowedStatuses = ["ready", "picked_up", "delivered"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "حالة غير صحيحة" });
    }

    // إعداد بيانات التحديث
    const updateData: any = { status };
    if (status === "delivered") {
      updateData.actualDeliveryTime = new Date();
    }

    const updatedOrder = await storage.updateOrder(id, updateData);
    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error("خطأ في تحديث حالة الطلب:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب تفاصيل طلب محدد
router.get("/orders/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const driverId = req.user!.id;

    const order = await storage.getOrder(id);
    if (!order) {
      return res.status(404).json({ error: "الطلب غير موجود" });
    }

    // التحقق من صلاحية السائق
    if (order.driverId !== driverId) {
      return res.status(403).json({ error: "غير مصرح بعرض هذا الطلب" });
    }

    res.json(order);
  } catch (error) {
    console.error("خطأ في جلب تفاصيل الطلب:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب طلبات السائق
router.get("/orders", requireAuth, async (req, res) => {
  try {
    const driverId = req.user!.id;
    const { status } = req.query;

    // جلب جميع الطلبات وفلترتها
    const allOrders = await storage.getOrders();
    let driverOrders = allOrders.filter(order => order.driverId === driverId);
    
    // فلترة حسب الحالة إذا تم توفيرها
    if (status && typeof status === 'string') {
      driverOrders = driverOrders.filter(order => order.status === status);
    }
    
    // ترتيب حسب تاريخ الإنشاء
    driverOrders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    res.json(driverOrders);
  } catch (error) {
    console.error("خطأ في جلب طلبات السائق:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// إحصائيات السائق
router.get("/stats", requireAuth, async (req, res) => {
  try {
    const driverId = req.user!.id;

    // التحقق من وجود السائق
    const driver = await storage.getDriver(driverId);
    if (!driver) {
      return res.status(404).json({ error: "السائق غير موجود" });
    }

    // جلب طلبات السائق
    const allOrders = await storage.getOrders();
    const driverOrders = allOrders.filter(order => order.driverId === driverId);
    const deliveredOrders = driverOrders.filter(order => order.status === "delivered");
    
    // حساب الإحصائيات
    const totalEarnings = deliveredOrders.reduce((sum, order) => 
      sum + parseFloat(order.driverEarnings || "0"), 0
    );
    
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const monthlyOrders = deliveredOrders.filter(order => 
      order.createdAt >= thisMonth
    );
    const monthlyEarnings = monthlyOrders.reduce((sum, order) => 
      sum + parseFloat(order.driverEarnings || "0"), 0
    );

    res.json({
      totalOrders: driverOrders.length,
      completedOrders: deliveredOrders.length,
      totalEarnings,
      monthlyOrders: monthlyOrders.length,
      monthlyEarnings,
      averageRating: 4.5,
      successRate: driverOrders.length > 0 ? 
        Math.round((deliveredOrders.length / driverOrders.length) * 100) : 0
    });
  } catch (error) {
    console.error("خطأ في جلب إحصائيات السائق:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// تحديث الملف الشخصي
router.put("/profile", requireAuth, async (req, res) => {
  try {
    const driverId = req.user!.id;
    const updateData = req.body;

    // إزالة أي حقول غير مسموحة
    const allowedFields = ['name', 'phone', 'email', 'currentLocation', 'isAvailable'];
    const sanitizedData: any = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        sanitizedData[field] = updateData[field];
      }
    }

    const updatedDriver = await storage.updateDriver(driverId, sanitizedData);
    
    if (!updatedDriver) {
      return res.status(404).json({ error: "السائق غير موجود" });
    }

    res.json({ success: true, driver: updatedDriver });
  } catch (error) {
    console.error("خطأ في تحديث الملف الشخصي:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

export default router;
