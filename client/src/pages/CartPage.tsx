import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useCart } from '../contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { InsertOrder, Restaurant } from '@shared/schema';

export default function CartPage() {
  const [, setLocation] = useLocation();
  const { state, removeItem, updateQuantity, clearCart } = useCart();
  const { items, subtotal } = state;
  const { toast } = useToast();

  // الحصول على بيانات المطعم
  const restaurantId = items[0]?.restaurantId;
  const { data: restaurantData } = useQuery<Restaurant>({
    queryKey: ['/api/restaurants', restaurantId],
    enabled: !!restaurantId,
  });

  // حساب رسوم التوصيل
  const deliveryFee = restaurantData?.deliveryFee 
    ? parseFloat(restaurantData.deliveryFee) 
    : items.length > 0 ? 5 : 0;

  const total = items.length > 0 ? subtotal + deliveryFee : 0;

  const [orderForm, setOrderForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    deliveryAddress: '',
    notes: '',
    paymentMethod: 'cash',
  });

  useEffect(() => {
    // تحديث رسوم التوصيل عند تغيير المحتويات
    if (restaurantData && items.length > 0) {
      console.log('رسوم التوصيل للمطعم:', restaurantData.deliveryFee);
    }
  }, [restaurantData, items]);

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
      // توجيه العميل لصفحة تتبع الطلب
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
        description: "يرجى إدخال عنوان التوصيل",
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
        description: `الحد الأدنى للطلب من ${restaurantData.name} هو ${restaurantData.minimumOrder} ريال`,
        variant: "destructive",
      });
      return;
    }

    const orderData: InsertOrder = {
      orderNumber: `ORD${Date.now()}`,
      customerName: orderForm.customerName,
      customerPhone: orderForm.customerPhone,
      customerEmail: orderForm.customerEmail || undefined,
      deliveryAddress: orderForm.deliveryAddress,
      notes: orderForm.notes || undefined,
      paymentMethod: orderForm.paymentMethod,
      items: JSON.stringify(items),
      subtotal: subtotal.toString(),
      deliveryFee: deliveryFee.toString(),
      total: total.toString(),
      totalAmount: total.toString(),
      restaurantId: items[0]?.restaurantId || '',
      status: 'pending',
    };

    placeOrderMutation.mutate(orderData);
  };

  // دالة لتحويل السعر من string إلى number للحسابات
  const parsePrice = (price: string | number): number => {
    if (typeof price === 'number') return price;
    const num = parseFloat(price);
    return isNaN(num) ? 0 : num;
  };

  return (
    <div>
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/')}
            data-testid="button-cart-back"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-bold text-foreground">السلة</h2>
        </div>
      </header>

      <section className="p-4">
        {/* Cart Items */}
        <div className="space-y-4 mb-6">
          {items.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <div className="text-4xl mb-4">🛒</div>
              <p>السلة فارغة</p>
              <p className="text-sm">أضف بعض العناصر لتبدأ طلبك</p>
            </div>
          ) : (
            items.map((item) => (
              <Card key={item.id} className="p-4 flex justify-between items-center">
                <div className="flex-1">
                  <h4 className="font-medium text-foreground" data-testid={`cart-item-name-${item.id}`}>
                    {item.name}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {parsePrice(item.price)} ريال × {item.quantity}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (item.quantity > 1) {
                          updateQuantity(item.id, item.quantity - 1);
                        } else {
                          removeItem(item.id);
                        }
                      }}
                      data-testid={`button-decrease-${item.id}`}
                    >
                      -
                    </Button>
                    <span className="px-3 py-1 bg-muted rounded" data-testid={`quantity-${item.id}`}>
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      data-testid={`button-increase-${item.id}`}
                    >
                      +
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-primary" data-testid={`item-total-${item.id}`}>
                    {parsePrice(item.price) * item.quantity} ريال
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                    className="text-destructive hover:bg-destructive/10"
                    data-testid={`button-remove-${item.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Order Summary and Form */}
        {items.length > 0 && (
          <Card className="p-4">
            <h3 className="font-bold text-foreground mb-4">ملخص الطلب</h3>
            
            {/* Restaurant Info */}
            {restaurantData && (
              <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="font-medium">المطعم:</span>
                  <span>{restaurantData.name}</span>
                </div>
                {restaurantData.deliveryTime && (
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <span>وقت التوصيل:</span>
                    <span>{restaurantData.deliveryTime}</span>
                  </div>
                )}
                {restaurantData.minimumOrder && (
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <span>الحد الأدنى:</span>
                    <span>{restaurantData.minimumOrder} ريال</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Order Summary */}
            <div className="space-y-2 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">المجموع الفرعي</span>
                <span className="text-foreground" data-testid="order-subtotal">
                  {subtotal} ريال
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">رسوم التوصيل</span>
                <span className="text-foreground">
                  {deliveryFee} ريال
                  {restaurantData && (
                    <span className="text-xs text-muted-foreground block">
                      حسب {restaurantData.name}
                    </span>
                  )}
                </span>
              </div>
              <div className="border-t border-border pt-2 mt-2">
                <div className="flex justify-between font-bold">
                  <span className="text-foreground">الإجمالي</span>
                  <span className="text-primary" data-testid="order-total">
                    {total} ريال
                  </span>
                </div>
              </div>
            </div>

            {/* Order Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="customerName" className="text-foreground">الاسم *</Label>
                <Input
                  id="customerName"
                  value={orderForm.customerName}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="أدخل اسمك"
                  data-testid="input-customer-name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="customerPhone" className="text-foreground">رقم الهاتف *</Label>
                <Input
                  id="customerPhone"
                  value={orderForm.customerPhone}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                  placeholder="أدخل رقم هاتفك"
                  data-testid="input-customer-phone"
                  required
                />
              </div>

              <div>
                <Label htmlFor="customerEmail" className="text-foreground">البريد الإلكتروني</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={orderForm.customerEmail}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, customerEmail: e.target.value }))}
                  placeholder="أدخل بريدك الإلكتروني (اختياري)"
                  data-testid="input-customer-email"
                />
              </div>

              <div>
                <Label htmlFor="deliveryAddress" className="text-foreground">عنوان التوصيل *</Label>
                <Input
                  id="deliveryAddress"
                  value={orderForm.deliveryAddress}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                  placeholder="أدخل عنوانك بالتفصيل"
                  data-testid="input-delivery-address"
                  required
                />
              </div>

              <div>
                <Label htmlFor="notes" className="text-foreground">ملاحظات الطلب</Label>
                <Textarea
                  id="notes"
                  value={orderForm.notes}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="ملاحظات إضافية (اختياري)"
                  className="h-20 resize-none"
                  data-testid="input-notes"
                />
              </div>

              <div>
                <Label className="text-foreground">طريقة الدفع</Label>
                <RadioGroup
                  value={orderForm.paymentMethod}
                  onValueChange={(value) => setOrderForm(prev => ({ ...prev, paymentMethod: value }))}
                  className="space-y-2 mt-2"
                >
                  <div className="flex items-center space-x-2 space-x-reverse p-3 bg-muted rounded-lg">
                    <RadioGroupItem value="cash" id="cash" data-testid="payment-cash" />
                    <Label htmlFor="cash" className="flex items-center gap-3 cursor-pointer">
                      <span className="text-2xl">💵</span>
                      <span className="text-foreground">الدفع عند الاستلام</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse p-3 bg-muted rounded-lg">
                    <RadioGroupItem value="card" id="card" data-testid="payment-card" />
                    <Label htmlFor="card" className="flex items-center gap-3 cursor-pointer">
                      <span className="text-2xl">💳</span>
                      <span className="text-foreground">الدفع الإلكتروني</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse p-3 bg-muted rounded-lg">
                    <RadioGroupItem value="wallet" id="wallet" data-testid="payment-wallet" />
                    <Label htmlFor="wallet" className="flex items-center gap-3 cursor-pointer">
                      <span className="text-2xl">💰</span>
                      <span className="text-foreground">الدفع من الرصيد</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <Button
              onClick={handlePlaceOrder}
              disabled={placeOrderMutation.isPending || 
                (restaurantData?.minimumOrder && subtotal < parseFloat(restaurantData.minimumOrder))}
              className="w-full mt-6 py-4 text-lg font-bold"
              data-testid="button-place-order"
            >
              {placeOrderMutation.isPending ? 'جاري تأكيد الطلب...' : 'تأكيد الطلب'}
            </Button>

            {restaurantData?.minimumOrder && subtotal < parseFloat(restaurantData.minimumOrder) && (
              <p className="text-red-600 text-sm text-center mt-2">
                يجب أن يكون المجموع الفرعي {parseFloat(restaurantData.minimumOrder)} ريال على الأقل
              </p>
            )}
          </Card>
        )}
      </section>
    </div>
  );
}
