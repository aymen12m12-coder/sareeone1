import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, UserPlus, UserCog, Calendar, Clock, 
  Award, DollarSign, Shield, LogOut, Edit,
  Trash2, Eye, CheckCircle, XCircle, Mail,
  Phone, MapPin, GraduationCap, Briefcase, FileText,
  Download, Filter, Search, TrendingUp, AlertCircle,
  Lock, Unlock, Bell, MessageSquare, CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: 'admin' | 'manager' | 'support' | 'accountant' | 'hr';
  department: string;
  salary: number;
  hireDate: string;
  status: 'active' | 'inactive' | 'on_leave' | 'terminated';
  permissions: string[];
  attendanceRate: number;
  performanceScore: number;
  lastActive: string;
  address: string;
  emergencyContact: string;
  documents: string[];
}

interface Attendance {
  id: string;
  employeeId: string;
  employeeName: string;
  checkIn: string;
  checkOut: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'early_leave' | 'on_leave';
  hoursWorked: number;
  notes: string;
}

interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'annual' | 'sick' | 'emergency' | 'unpaid';
  startDate: string;
  endDate: string;
  duration: number;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  submittedAt: string;
}

export default function AdminHRManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false);
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('employees');
  
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    email: '',
    phone: '',
    position: 'admin',
    department: 'management',
    salary: '',
    hireDate: new Date(),
    address: '',
    emergencyContact: '',
    permissions: ['view_dashboard', 'manage_orders']
  });

  // جلب الموظفين
  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ['/api/admin/employees'],
  });

  // جلب الحضور
  const { data: attendanceRecords } = useQuery<Attendance[]>({
    queryKey: ['/api/admin/attendance'],
  });

  // جلب طلبات الإجازة
  const { data: leaveRequests } = useQuery<LeaveRequest[]>({
    queryKey: ['/api/admin/leave-requests'],
  });

  // إضافة موظف جديد
  const addEmployeeMutation = useMutation({
    mutationFn: async (data: typeof employeeForm) => {
      const response = await apiRequest('POST', '/api/admin/employees', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/employees'] });
      toast({ title: 'تم إضافة الموظف بنجاح' });
      setShowEmployeeDialog(false);
      resetEmployeeForm();
    },
  });

  // تحديث حالة الموظف
  const updateEmployeeStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest('PUT', `/api/admin/employees/${id}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/employees'] });
      toast({ title: 'تم تحديث حالة الموظف' });
    },
  });

  // الموافقة على طلب الإجازة
  const approveLeaveMutation = useMutation({
    mutationFn: async (leaveId: string) => {
      const response = await apiRequest('PUT', `/api/admin/leave-requests/${leaveId}/approve`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/leave-requests'] });
      toast({ title: 'تمت الموافقة على الإجازة' });
    },
  });

  const resetEmployeeForm = () => {
    setEmployeeForm({
      name: '',
      email: '',
      phone: '',
      position: 'admin',
      department: 'management',
      salary: '',
      hireDate: new Date(),
      address: '',
      emergencyContact: '',
      permissions: ['view_dashboard', 'manage_orders']
    });
  };

  const handleAddEmployee = () => {
    if (!employeeForm.name || !employeeForm.email || !employeeForm.phone) {
      toast({ title: 'خطأ', description: 'يرجى ملء جميع الحقول المطلوبة', variant: 'destructive' });
      return;
    }
    addEmployeeMutation.mutate(employeeForm);
  };

  const getPositionLabel = (position: string) => {
    const positions: Record<string, string> = {
      admin: 'مدير نظام',
      manager: 'مدير',
      support: 'دعم فني',
      accountant: 'محاسب',
      hr: 'موارد بشرية'
    };
    return positions[position] || position;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      on_leave: 'bg-yellow-100 text-yellow-800',
      terminated: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: 'نشط',
      inactive: 'غير نشط',
      on_leave: 'في إجازة',
      terminated: 'منتهي الخدمة'
    };
    return labels[status] || status;
  };

  const filteredEmployees = employees?.filter(employee => {
    const matchesSearch = 
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.phone.includes(searchTerm);
    
    const matchesDepartment = departmentFilter === 'all' || employee.department === departmentFilter;
    const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;
    
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const todayAttendance = attendanceRecords?.filter(record => 
    new Date(record.date).toDateString() === new Date().toDateString()
  );

  const pendingLeaveRequests = leaveRequests?.filter(request => request.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-blue-500" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">إدارة الموارد البشرية</h1>
            <p className="text-muted-foreground">إدارة الموظفين، الحضور، والإجازات</p>
          </div>
        </div>
        
        <Button 
          onClick={() => setShowEmployeeDialog(true)}
          className="gap-2"
        >
          <UserPlus className="h-4 w-4" />
          إضافة موظف جديد
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الموظفين</p>
                <p className="text-2xl font-bold">{employees?.length || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">الحضور اليوم</p>
                <p className="text-2xl font-bold">{todayAttendance?.length || 0}/{employees?.length || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">طلبات الإجازة</p>
                <p className="text-2xl font-bold">{pendingLeaveRequests?.length || 0}</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">متوسط الأداء</p>
                <p className="text-2xl font-bold">
                  {employees?.reduce((sum, emp) => sum + emp.performanceScore, 0) / (employees?.length || 1)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="employees">الموظفين</TabsTrigger>
          <TabsTrigger value="attendance">الحضور</TabsTrigger>
          <TabsTrigger value="leaves">الإجازات</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>البحث</Label>
                  <Input
                    placeholder="ابحث بالموظف..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div>
                  <Label>القسم</Label>
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="جميع الأقسام" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الأقسام</SelectItem>
                      <SelectItem value="management">الإدارة</SelectItem>
                      <SelectItem value="support">الدعم الفني</SelectItem>
                      <SelectItem value="finance">المالية</SelectItem>
                      <SelectItem value="hr">الموارد البشرية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>الحالة</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="جميع الحالات" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الحالات</SelectItem>
                      <SelectItem value="active">نشط</SelectItem>
                      <SelectItem value="inactive">غير نشط</SelectItem>
                      <SelectItem value="on_leave">في إجازة</SelectItem>
                      <SelectItem value="terminated">منتهي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" className="w-full" onClick={() => {
                    setSearchTerm('');
                    setDepartmentFilter('all');
                    setStatusFilter('all');
                  }}>
                    إعادة التعيين
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employees Table */}
          <Card>
            <CardHeader>
              <CardTitle>قائمة الموظفين</CardTitle>
              <CardDescription>إدارة جميع موظفي النظام</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الموظف</TableHead>
                      <TableHead>الوظيفة</TableHead>
                      <TableHead>القسم</TableHead>
                      <TableHead>الراتب</TableHead>
                      <TableHead>تاريخ التعيين</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>الأداء</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees?.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                              {employee.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium">{employee.name}</p>
                              <p className="text-sm text-muted-foreground">{employee.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getPositionLabel(employee.position)}</Badge>
                        </TableCell>
                        <TableCell>{employee.department}</TableCell>
                        <TableCell className="font-bold">{employee.salary.toLocaleString()} ريال</TableCell>
                        <TableCell>{new Date(employee.hireDate).toLocaleDateString('ar')}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(employee.status)}>
                            {getStatusLabel(employee.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full" 
                                style={{ width: `${employee.performanceScore}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{employee.performanceScore}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedEmployee(employee);
                                setShowEmployeeDialog(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedEmployee(employee);
                                setEmployeeForm({
                                  name: employee.name,
                                  email: employee.email,
                                  phone: employee.phone,
                                  position: employee.position,
                                  department: employee.department,
                                  salary: employee.salary.toString(),
                                  hireDate: new Date(employee.hireDate),
                                  address: employee.address,
                                  emergencyContact: employee.emergencyContact,
                                  permissions: employee.permissions
                                });
                                setShowEmployeeDialog(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-red-600">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    هل أنت متأكد من حذف الموظف "{employee.name}"؟
                                    هذا الإجراء لا يمكن التراجع عنه.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction 
                                    className="bg-red-600 hover:bg-red-700"
                                    onClick={() => updateEmployeeStatusMutation.mutate({ 
                                      id: employee.id, 
                                      status: 'terminated' 
                                    })}
                                  >
                                    حذف
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-6">
          {/* Attendance Management */}
          <Card>
            <CardHeader>
              <CardTitle>سجل الحضور والانصراف</CardTitle>
              <CardDescription>متابعة حضور الموظفين يومياً</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الموظف</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>وقت الحضور</TableHead>
                      <TableHead>وقت الانصراف</TableHead>
                      <TableHead>ساعات العمل</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>ملاحظات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRecords?.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.employeeName}</TableCell>
                        <TableCell>{new Date(record.date).toLocaleDateString('ar')}</TableCell>
                        <TableCell>{record.checkIn ? new Date(record.checkIn).toLocaleTimeString('ar') : '--'}</TableCell>
                        <TableCell>{record.checkOut ? new Date(record.checkOut).toLocaleTimeString('ar') : '--'}</TableCell>
                        <TableCell>{record.hoursWorked} ساعة</TableCell>
                        <TableCell>
                          <Badge variant={
                            record.status === 'present' ? 'default' :
                            record.status === 'absent' ? 'destructive' :
                            record.status === 'late' ? 'secondary' : 'outline'
                          }>
                            {record.status === 'present' ? 'حاضر' :
                             record.status === 'absent' ? 'غائب' :
                             record.status === 'late' ? 'متأخر' : 'مغادر مبكراً'}
                          </Badge>
                        </TableCell>
                        <TableCell>{record.notes || '--'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaves" className="space-y-6">
          {/* Leave Requests */}
          <Card>
            <CardHeader>
              <CardTitle>طلبات الإجازة</CardTitle>
              <CardDescription>إدارة طلبات إجازة الموظفين</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الموظف</TableHead>
                      <TableHead>نوع الإجازة</TableHead>
                      <TableHead>من تاريخ</TableHead>
                      <TableHead>إلى تاريخ</TableHead>
                      <TableHead>المدة</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>سبب الإجازة</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveRequests?.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.employeeName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {request.type === 'annual' ? 'سنوية' :
                             request.type === 'sick' ? 'مرضية' :
                             request.type === 'emergency' ? 'طارئة' : 'غير مدفوعة'}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(request.startDate).toLocaleDateString('ar')}</TableCell>
                        <TableCell>{new Date(request.endDate).toLocaleDateString('ar')}</TableCell>
                        <TableCell>{request.duration} أيام</TableCell>
                        <TableCell>
                          <Badge variant={
                            request.status === 'approved' ? 'default' :
                            request.status === 'pending' ? 'secondary' : 'destructive'
                          }>
                            {request.status === 'approved' ? 'موافق عليه' :
                             request.status === 'pending' ? 'معلق' : 'مرفوض'}
                          </Badge>
                        </TableCell>
                        <TableCell>{request.reason}</TableCell>
                        <TableCell>
                          {request.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => approveLeaveMutation.mutate(request.id)}
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // Handle reject leave
                                }}
                              >
                                <XCircle className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Employee Dialog */}
      <Dialog open={showEmployeeDialog} onOpenChange={setShowEmployeeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedEmployee ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>الاسم الكامل</Label>
                <Input
                  value={employeeForm.name}
                  onChange={(e) => setEmployeeForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="أدخل الاسم"
                />
              </div>
              <div>
                <Label>البريد الإلكتروني</Label>
                <Input
                  type="email"
                  value={employeeForm.email}
                  onChange={(e) => setEmployeeForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="employee@example.com"
                />
              </div>
              <div>
                <Label>رقم الهاتف</Label>
                <Input
                  value={employeeForm.phone}
                  onChange={(e) => setEmployeeForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+967XXXXXXXXX"
                />
              </div>
              <div>
                <Label>الراتب</Label>
                <Input
                  type="number"
                  value={employeeForm.salary}
                  onChange={(e) => setEmployeeForm(prev => ({ ...prev, salary: e.target.value }))}
                  placeholder="الراتب الشهري"
                />
              </div>
              <div>
                <Label>الوظيفة</Label>
                <Select value={employeeForm.position} onValueChange={(value) => setEmployeeForm(prev => ({ ...prev, position: value as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">مدير نظام</SelectItem>
                    <SelectItem value="manager">مدير</SelectItem>
                    <SelectItem value="support">دعم فني</SelectItem>
                    <SelectItem value="accountant">محاسب</SelectItem>
                    <SelectItem value="hr">موارد بشرية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>القسم</Label>
                <Select value={employeeForm.department} onValueChange={(value) => setEmployeeForm(prev => ({ ...prev, department: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="management">الإدارة</SelectItem>
                    <SelectItem value="support">الدعم الفني</SelectItem>
                    <SelectItem value="finance">المالية</SelectItem>
                    <SelectItem value="hr">الموارد البشرية</SelectItem>
                    <SelectItem value="operations">العمليات</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>تاريخ التعيين</Label>
                <DatePicker
                  date={employeeForm.hireDate}
                  onDateChange={(date) => setEmployeeForm(prev => ({ ...prev, hireDate: date }))}
                />
              </div>
              <div>
                <Label>جهة الاتصال الطارئة</Label>
                <Input
                  value={employeeForm.emergencyContact}
                  onChange={(e) => setEmployeeForm(prev => ({ ...prev, emergencyContact: e.target.value }))}
                  placeholder="اسم ورقم جهة الاتصال"
                />
              </div>
              <div className="md:col-span-2">
                <Label>العنوان</Label>
                <Textarea
                  value={employeeForm.address}
                  onChange={(e) => setEmployeeForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="عنوان السكن"
                  rows={2}
                />
              </div>
            </div>

            <div>
              <Label className="mb-2">الصلاحيات</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  { id: 'view_dashboard', label: 'عرض لوحة التحكم' },
                  { id: 'manage_orders', label: 'إدارة الطلبات' },
                  { id: 'manage_restaurants', label: 'إدارة المطاعم' },
                  { id: 'manage_drivers', label: 'إدارة السائقين' },
                  { id: 'manage_users', label: 'إدارة المستخدمين' },
                  { id: 'view_reports', label: 'عرض التقارير' },
                  { id: 'manage_finance', label: 'إدارة المالية' },
                  { id: 'manage_hr', label: 'إدارة الموارد البشرية' },
                  { id: 'system_settings', label: 'إعدادات النظام' }
                ].map((permission) => (
                  <div key={permission.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={permission.id}
                      checked={employeeForm.permissions.includes(permission.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEmployeeForm(prev => ({
                            ...prev,
                            permissions: [...prev.permissions, permission.id]
                          }));
                        } else {
                          setEmployeeForm(prev => ({
                            ...prev,
                            permissions: prev.permissions.filter(p => p !== permission.id)
                          }));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor={permission.id} className="text-sm cursor-pointer">
                      {permission.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmployeeDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleAddEmployee} disabled={addEmployeeMutation.isPending}>
              {addEmployeeMutation.isPending ? 'جاري الحفظ...' : (selectedEmployee ? 'تحديث' : 'إضافة')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
