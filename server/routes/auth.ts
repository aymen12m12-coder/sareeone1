import express from 'express';
import { unifiedAuthService, requireAuth } from '../auth';

const router = express.Router();

/**
 * @route POST /api/auth/login
 * @desc تسجيل الدخول الموحد (عميل، سائق، مدير)
 */
router.post('/login', async (req, res) => {
  try {
    const { identifier, password, userType } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'بيانات الدخول مطلوبة'
      });
    }

    const result = await unifiedAuthService.login(identifier, password, userType);
    
    if (!result.success) {
      return res.status(401).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('خطأ في تسجيل الدخول:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم'
    });
  }
});

// مسارات متوافقة مع النظام القديم (لضمان عدم تعطل الواجهة الأمامية حالياً)
router.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;
  const result = await unifiedAuthService.login(email, password, 'admin');
  if (!result.success) return res.status(401).json(result);
  res.json(result);
});

router.post('/driver/login', async (req, res) => {
  const { phone, password } = req.body;
  const result = await unifiedAuthService.login(phone, password, 'driver');
  if (!result.success) return res.status(401).json(result);
  res.json(result);
});

router.post('/customer/login', async (req, res) => {
  const { phone, password } = req.body;
  const result = await unifiedAuthService.login(phone, password, 'customer');
  if (!result.success) return res.status(401).json(result);
  res.json(result);
});

/**
 * @route POST /api/auth/register
 * @desc تسجيل مستخدم جديد
 */
router.post('/register', async (req, res) => {
  try {
    const result = await unifiedAuthService.createUser(req.body);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.status(201).json(result);
  } catch (error) {
    console.error('خطأ في التسجيل:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم'
    });
  }
});

/**
 * @route GET /api/auth/me
 * @desc الحصول على بيانات المستخدم الحالي
 */
router.get('/me', requireAuth, async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

/**
 * @route POST /api/auth/logout
 * @desc تسجيل الخروج
 */
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    if (token) {
      await unifiedAuthService.logout(token);
    }
    
    res.json({
      success: true,
      message: 'تم تسجيل الخروج بنجاح'
    });
  } catch (error) {
    console.error('خطأ في تسجيل الخروج:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم'
    });
  }
});

export default router;
