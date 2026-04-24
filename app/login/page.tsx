"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, Mail, Lock, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError("Email atau password salah");
      } else {
        router.push("/pos");
      }
    } catch (err) {
      setError("Terjadi kesalahan, silakan coba lagi");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      {/* Background Image dengan Overlay Gelap */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop')",
        }}
      >
        {/* Overlay hitam tipis untuk meningkatkan kontras teks */}
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Card Login */}
      <Card className="relative z-10 w-full max-w-md border-0 shadow-2xl overflow-hidden rounded-2xl backdrop-blur-sm bg-white/95">
        {/* Header dengan gradien */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8 text-center">
          <div className="flex justify-center mb-3">
            <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
              <Store className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">POS Pro</h1>
          <p className="text-indigo-100 text-sm mt-1">Point of Sale System</p>
        </div>

        <CardContent className="p-6 md:p-8">
          <CardTitle className="text-xl font-semibold text-center text-gray-800 mb-6">
            Login ke Akun Anda
          </CardTitle>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
                <Input
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  className="pl-10 rounded-lg border-gray-300 focus:border-indigo-300 focus:ring focus:ring-indigo-200/50"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
                <Input
                  type="password"
                  placeholder="********"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  className="pl-10 rounded-lg border-gray-300 focus:border-indigo-300 focus:ring focus:ring-indigo-200/50"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3 flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-full py-2.5 transition-all duration-300 shadow-md"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Memproses...
                </div>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" /> Login
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} POS Pro - Sistem Kasir Modern
          </div>
        </CardContent>
      </Card>
    </div>
  );
}