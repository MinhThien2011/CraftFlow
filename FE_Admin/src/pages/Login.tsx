import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Factory } from 'lucide-react';
export function Login() {
  const { login } = useInventory();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập tài khoản và mật khẩu');
      return;
    }
    // Mock login - accept anything for demo, but prefer 'admin'
    login(username);
  };
  return (
    <div className="min-h-screen bg-craft-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-16 w-16 bg-craft-primary rounded-2xl flex items-center justify-center shadow-lg shadow-craft-primary/20">
            <Factory className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-stone-900">
          CRAFTFLOW
        </h2>
        <p className="mt-2 text-center text-sm text-stone-600">
          Hệ thống quản lý kho nguyên liệu
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-stone-200/50 sm:rounded-xl sm:px-10 border border-stone-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <Input
              label="Tài khoản"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên đăng nhập "
              autoComplete="username" />
            

            <div>
              <Input
                label="Mật khẩu"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password" />
              <div className="mt-2 text-right">
                <a href="#" className="text-sm text-stone-600 hover:text-craft-primary transition">
                  Quên mật khẩu?
                </a>
              </div>
            </div>

            {error &&
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                {error}
              </div>
            }

            <Button type="submit" className="w-full" size="lg">
              Đăng nhập
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-stone-500">
            <p>Cần hỗ trợ kỹ thuật? <a href="#" className="text-craft-primary hover:underline">Liên hệ ngay</a></p>
          </div>
        </div>
      </div>

      <div className="mt-12 text-center text-xs text-stone-500 space-y-2">
        <div className="flex justify-center gap-4">
          <a href="#" className="hover:text-craft-primary transition">Điều khoản</a>
          <a href="#" className="hover:text-craft-primary transition">Bảo mật</a>
          <a href="#" className="hover:text-craft-primary transition">Hỗ trợ</a>
        </div>
        <p>© 2026 CRAFTFLOW. Tất cả quyền được bảo lưu.</p>
      </div>
    </div>);

}