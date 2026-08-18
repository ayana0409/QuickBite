/**
 * app/profile/page.tsx
 * Account Profile Settings page - accessible to both Customer and Merchant.
 * Renders the shared AccountProfileForm component.
 * Uses server-side session guard to redirect unauthenticated users.
 */

import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/src/lib/auth';
import AccountProfileForm from '@/src/components/shared/AccountProfileForm';
import { User, ChevronRight, Home } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Cài đặt tài khoản | QuickBite',
  description: 'Cập nhật thông tin cá nhân và đổi mật khẩu tài khoản QuickBite của bạn.',
};

export default async function ProfilePage() {
  // Server-side auth guard
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/40 to-slate-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 mb-6">
          <Link href="/" className="flex items-center gap-1 hover:text-orange-600 transition-colors font-medium">
            <Home className="w-3.5 h-3.5" />
            <span>Trang chủ</span>
          </Link>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <span className="text-slate-700 font-semibold">Tài khoản</span>
        </nav>

        {/* Page title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-md shadow-orange-500/20">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Cài đặt tài khoản</h1>
            <p className="text-xs text-slate-500 mt-0.5">Quản lý thông tin cá nhân và bảo mật tài khoản</p>
          </div>
        </div>

        {/* Main content */}
        <AccountProfileForm />

        <div className="h-12" />
      </div>
    </div>
  );
}
