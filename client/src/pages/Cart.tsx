import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRight, Trash2, MapPin, Calendar, Clock, DollarSign, Plus, Minus, ShoppingCart } from 'lucide-react';
import { LocationPicker, LocationData } from '@/components/LocationPicker';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useCart } from '../contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { InsertOrder, Restaurant } from '@shared/schema';

export default function Cart() {
  const [, setLocation] = useLocation();
  const { state, removeItem, updateQuantity, clearCart } = useCart();
  const { items, subtotal } = state;
  const { toast } = useToast();

  // الحصول على بيانات المطعم لرسوم التوصيل
  const restaurantId = items[0]?.restaurantId;
  const { data: restaurantData } = useQuery<Restaurant>({
    queryKey: ['/api/restaurants', restaurantId],
    enabled: !!restaurantId,
  });

  // حساب رسوم التوصيل بناءً على المطعم
  const deliveryFee = restaurantData?.deliveryFee 
    ? parseFloat(restaurantData.deliveryFee) 
    : items.length > 0 ? 5 : 0;

  // حساب الإجمالي
  const total = items.length > 0 ? subtotal + deliveryFee : 0;

  const [orderForm, setOrderForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    deliveryAddress: '',
    notes: '',
    paymentMethod: 'cash',
    deliveryTime: 'now',
    deliveryDate: '',
    deliveryTimeSlot: '',
    locationData: null as LocationData | null,
  });

  // تحديث رسوم التوصيل عند تغيير المطعم
  useEffect(() => {
    if (restaurantData && items.length > 0) {
      const fee = restaurantData.deliveryFee ? parseFloat(restaurantData.deliveryFee) : 5;
      // يمكنك إضافة منطق إضافي هنا إذا لزم الأمر
    }
  }, [restaurantData, items]);

  // Handle location selection from LocationPicker
  const handleLocationSelect = (location: LocationData) => {
    setOrderForm(prev => ({
      ...prev,
      deliveryAddress: location.address,
      locationData: location,
    }));
  };

  const placeOrderMutation = useMutation({
    mutationFn: async (orderData: InsertOrder) => {
      const response = await apiRequest('POST', '/api/orders', orderData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'فشل في تأكيد الطلب');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "تم تأكيد طلبك بنجاح!",
        description: "سيتم التواصل معك قريباً",
      });
      clearCart();
      // توجيه لصفحة تتبع الطلب
      if (data?.order?.id) {
        setLocation(`/order-tracking/${data.order.id}`);
      } else {
        setLocation('/');
      }
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في تأكيد الطلب",
        description: error.message || "يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    },
  });

  const handlePlaceOrder = () => {
    // التحقق من البيانات المطلوبة
    if (!orderForm.customerName.trim()) {
      toast({
        title: "معلومات ناقصة",
        description: "يرجى إدخال اسم العميل",
        variant: "destructive",
      });
      return;
    }

    if (!orderForm.customerPhone.trim()) {
      toast({
        title: "معلومات ناقصة",
        description: "يرجى إدخال رقم الهاتف",
        variant: "destructive",
      });
      return;
    }

    if (!orderForm.deliveryAddress.trim()) {
      toast({
        title: "معلومات ناقصة",
        description: "يرجى تحديد عنوان التوصيل",
        variant: "destructive",
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: "السلة فارغة",
        description: "أضف بعض العناصر قبل تأكيد الطلب",
        variant: "destructive",
      });
      return;
    }

    // التحقق من الحد الأدنى للطلب
    if (restaurantData?.minimumOrder && subtotal < parseFloat(restaurantData.minimumOrder)) {
      toast({
        title: "الحد الأدنى للطلب غير متوفر",
        description: `الحد الأدنى للطلب من هذا المطعم هو ${restaurantData.minimumOrder} ريال`,
        variant: "destructive",
      });
      return;
    }

    const orderData: InsertOrder = {
      ...orderForm,
      items: JSON.stringify(items),
      subtotal: subtotal.toString(),
      deliveryFee: deliveryFee.toString(),
      total: total.toString(),
      totalAmount: total.toString(),
      restaurantId: items[0]?.restaurantId || '',
      status: 'pending',
      orderNumber: `ORD${Date.now()}`,
      customerLocationLat: orderForm.locationData?.lat?.toString(),
      customerLocationLng: orderForm.locationData?.lng?.toString(),
      customerEmail: orderForm.customerEmail || undefined,
      notes: orderForm.notes || undefined,
      deliveryDate: orderForm.deliveryDate || undefined,
      deliveryTimeSlot: orderForm.deliveryTimeSlot || undefined,
    };

    placeOrderMutation.mutate(orderData);
  };

  const parsePrice = (price: string | number): number => {
    if (typeof price === 'number') return price;
    const num = parseFloat(price);
    return isNaN(num) ? 0 : num;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with red theme */}
      <header className="bg-gradient-to-r from-red-500 to-pink-500 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/')}
              className="text-white hover:bg-white/20"
              data-testid="button-cart-back"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">تأكيد الطلب</h1>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => {
              if (confirm('هل تريد تفريغ السلة؟')) {
                clearCart();
              }
            }}
            data-testid="button-clear-cart"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Cart Items */}
        {items.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-gray-800 mb-4">عناصر السلة</h3>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg">
                    <div className="relative">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900" data-testid={`cart-item-name-${item.id}`}>
                        {item.name}
                      </h4>
                      <p className="text-sm font-bold text-gray-900" data-testid={`cart-item-price-${item.id}`}>
                        {parsePrice(item.price)} ريال
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="w-6 h-6"
                        onClick={() => {
                          if (item.quantity > 1) {
                            updateQuantity(item.id, item.quantity - 1);
                          } else {
                            removeItem(item.id);
                          }
                        }}
                        data-testid={`button-decrease-${item.id}`}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium" data-testid={`cart-item-quantity-${item.id}`}>
                        {item.quantity}
                      </span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="w-6 h-6"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        data-testid={`button-increase-${item.id}`}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="w-6 h-6 ml-2 text-red-500 hover:text-red-700"
                        onClick={() => removeItem(item.id)}
                        data-testid={`button-remove-${item.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customer Information Form */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-gray-800 mb-4">معلومات العميل</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="customerName" className="text-sm font-medium text-gray-700 mb-1">الاسم *</Label>
                <Input
                  id="customerName"
                  placeholder="أدخل اسمك الكامل"
                  value={orderForm.customerName}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, customerName: e.target.value }))}
                  data-testid="input-customer-name"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="customerPhone" className="text-sm font-medium text-gray-700 mb-1">رقم
