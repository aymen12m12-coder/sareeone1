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
                <Label htmlFor="customerPhone" className="text-sm font-medium text-gray-700 mb-1">رقم الهاتف *</Label>
                <Input
                  id="customerPhone"
                  placeholder="مثال: 05xxxxxxxx"
                  value={orderForm.customerPhone}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                  data-testid="input-customer-phone"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="customerEmail" className="text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني (اختياري)</Label>
                <Input
                  id="customerEmail"
                  placeholder="email@example.com"
                  value={orderForm.customerEmail}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, customerEmail: e.target.value }))}
                  type="email"
                  data-testid="input-customer-email"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address Section with Location Picker */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-red-500" />
              <h3 className="font-semibold text-gray-800">عنوان التوصيل</h3>
            </div>
            
            {/* Location Picker Component */}
            <div className="mb-4">
              <LocationPicker 
                onLocationSelect={handleLocationSelect}
                placeholder="اختر موقع التوصيل من الخريطة"
              />
            </div>

            {/* Manual Address Input */}
            <div className="space-y-2">
              <Label htmlFor="deliveryAddress" className="text-sm font-medium text-gray-700">أو أدخل العنوان يدوياً:</Label>
              <Textarea
                id="deliveryAddress"
                placeholder="أدخل عنوان التوصيل بالتفصيل (الشارع، الحي، المدينة) *"
                value={orderForm.deliveryAddress}
                onChange={(e) => setOrderForm(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                rows={3}
                data-testid="input-delivery-address"
                className="border-gray-300 focus:border-red-500 focus:ring-red-500"
                required
              />
            </div>

            {/* Location Coordinates Display */}
            {orderForm.locationData && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">تم تحديد الموقع بدقة</span>
                </div>
                <p className="text-xs text-green-700 mt-1">
                  📍 الإحداثيات: {orderForm.locationData.lat.toFixed(6)}, {orderForm.locationData.lng.toFixed(6)}
                </p>
                <p className="text-xs text-green-700">
                  سيتم توصيل طلبك بدقة للموقع المحدد
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Notes */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-5 w-5 text-red-500" />
              <h3 className="font-semibold text-gray-800">ملاحظات الطلب</h3>
            </div>
            <div>
              <Label htmlFor="orderNotes" className="text-sm font-medium text-gray-700 mb-1">ملاحظات إضافية (اختياري)</Label>
              <Textarea
                id="orderNotes"
                placeholder="أضف ملاحظات للطلب (مثال: التعليمات، إرشادات التوصيل، ...)"
                value={orderForm.notes}
                onChange={(e) => setOrderForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                data-testid="input-order-notes"
              />
            </div>
          </CardContent>
        </Card>

        {/* Delivery Time */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-5 w-5 text-red-500" />
              <h3 className="font-semibold text-gray-800">تحديد وقت الطلب</h3>
            </div>
            <div className="text-sm text-gray-600 mb-3">وقت لتنفيذ الطلب</div>
            
            <div className="flex gap-3">
              <Button 
                variant={orderForm.deliveryTime === 'now' ? "default" : "outline"}
                className={`flex-1 ${orderForm.deliveryTime === 'now' ? 'bg-red-500 hover:bg-red-600 text-white' : 'border-gray-300'}`}
                onClick={() => setOrderForm(prev => ({ ...prev, deliveryTime: 'now' }))}
              >
                ✓ الآن
              </Button>
              <Button 
                variant={orderForm.deliveryTime === 'later' ? "default" : "outline"}
                className={`flex-1 ${orderForm.deliveryTime === 'later' ? 'bg-red-500 hover:bg-red-600 text-white' : 'border-gray-300'}`}
                onClick={() => setOrderForm(prev => ({ ...prev, deliveryTime: 'later' }))}
              >
                في وقت لاحق
              </Button>
            </div>

            {orderForm.deliveryTime === 'later' && (
              <div className="mt-4 space-y-3">
                <div>
                  <Label htmlFor="deliveryDate" className="text-sm font-medium text-gray-700 mb-1">تاريخ التوصيل</Label>
                  <Input
                    id="deliveryDate"
                    type="date"
                    value={orderForm.deliveryDate}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, deliveryDate: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label htmlFor="deliveryTimeSlot" className="text-sm font-medium text-gray-700 mb-1">وقت التوصيل</Label>
                  <Select
                    value={orderForm.deliveryTimeSlot}
                    onValueChange={(value) => setOrderForm(prev => ({ ...prev, deliveryTimeSlot: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر وقت التوصيل" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="09:00-12:00">9:00 ص - 12:00 م</SelectItem>
                      <SelectItem value="12:00-15:00">12:00 م - 3:00 م</SelectItem>
                      <SelectItem value="15:00-18:00">3:00 م - 6:00 م</SelectItem>
                      <SelectItem value="18:00-21:00">6:00 م - 9:00 م</SelectItem>
                      <SelectItem value="21:00-24:00">9:00 م - 12:00 ص</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-red-500" />
              <h3 className="font-semibold text-gray-800">طريقة الدفع</h3>
            </div>

            <RadioGroup 
              value={orderForm.paymentMethod} 
              onValueChange={(value) => setOrderForm(prev => ({ ...prev, paymentMethod: value }))}
              className="space-y-3"
            >
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="cash" id="cash" />
                <Label htmlFor="cash" className="flex-1 cursor-pointer text-gray-800 font-medium">
                  الدفع عند الاستلام
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="wallet" id="wallet" />
                <Label htmlFor="wallet" className="flex-1 cursor-pointer text-gray-800 font-medium">
                  الدفع من رصيد المحفظة
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="digital" id="digital" />
                <Label htmlFor="digital" className="flex-1 cursor-pointer text-gray-800 font-medium">
                  الدفع باستخدام المحفظة الإلكترونية
                </Label>
              </div>
            </RadioGroup>

            {orderForm.paymentMethod === 'wallet' && (
              <Button className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white font-medium py-3">
                إضافة رصيد للمحفظة
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Final Order Summary */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">المجموع الفرعي</span>
                <span className="text-xl font-bold text-gray-900" data-testid="text-subtotal">
                  {subtotal} ريال
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">رسوم التوصيل</span>
                <span className="text-gray-900" data-testid="text-delivery-fee">
                  {deliveryFee} ريال
                  {restaurantData && (
                    <span className="text-xs text-gray-500 block">
                      حسب سياسة {restaurantData.name}
                    </span>
                  )}
                </span>
              </div>
              
              {restaurantData?.minimumOrder && subtotal > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">الحد الأدنى للطلب</span>
                  <span className="text-gray-700">
                    {parseFloat(restaurantData.minimumOrder)} ريال
                    {subtotal >= parseFloat(restaurantData.minimumOrder) ? (
                      <span className="text-green-600 text-xs block">✓ متوفر</span>
                    ) : (
                      <span className="text-red-600 text-xs block">✗ غير متوفر</span>
                    )}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-gray-800 font-semibold">الإجمالي</span>
                <span className="text-xl font-bold text-red-500" data-testid="text-total">
                  {total} ريال
                </span>
              </div>
              
              <div className="text-sm text-gray-500 text-center mt-4">
                {items.length > 0 && restaurantData ? (
                  <p>
                    الطلب من: <span className="font-medium">{restaurantData.name}</span>
                    {restaurantData.deliveryTime && (
                      <span className="block mt-1">
                        وقت التوصيل المتوقع: {restaurantData.deliveryTime}
                      </span>
                    )}
                  </p>
                ) : (
                  <p>يرجى الاتصال بالإنترنت وتحديد عنوان التوصيل</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Confirmation Button */}
        {items.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <Button 
                className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 text-lg"
                onClick={handlePlaceOrder}
                disabled={placeOrderMutation.isPending || 
                  (restaurantData?.minimumOrder && subtotal < parseFloat(restaurantData.minimumOrder))}
                data-testid="button-place-order"
              >
                {placeOrderMutation.isPending ? 'جاري تأكيد الطلب...' : `تأكيد الطلب - ${total} ريال`}
              </Button>
              
              {restaurantData?.minimumOrder && subtotal < parseFloat(restaurantData.minimumOrder) && (
                <p className="text-red-600 text-sm text-center mt-2">
                  يجب أن يكون المجموع الفرعي {parseFloat(restaurantData.minimumOrder)} ريال على الأقل
                </p>
              )}
            </CardContent>
          </Card>
        )}
        
        {items.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-gray-500">
                <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">السلة فارغة</h3>
                <p className="text-sm">أضف بعض العناصر لبدء الطلب</p>
                <Button 
                  className="mt-4 bg-red-500 hover:bg-red-600 text-white"
                  onClick={() => setLocation('/')}
                  data-testid="button-continue-shopping"
                >
                  تصفح المطاعم
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
