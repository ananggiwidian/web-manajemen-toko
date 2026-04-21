"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toaster, toast } from "sonner";

export default function StockPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [type, setType] = useState<"IN" | "OUT">("IN");
  const [reference, setReference] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (session?.user?.role !== "ADMIN") router.push("/pos");
    fetch("/api/products").then(res => res.json()).then(setProducts);
  }, [status, session, router]);

  const handleSubmit = async () => {
    if (!productId) return toast.error("Pilih produk");
    const res = await fetch("/api/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity, type, reference }),
    });
    if (res.ok) {
      toast.success("Stok berhasil diupdate");
      setProductId(""); setQuantity(1); setReference("");
      fetch("/api/products").then(res => res.json()).then(setProducts);
    } else {
      toast.error("Gagal update stok");
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <Toaster />
      <h1 className="text-2xl font-bold mb-4">Manajemen Stok</h1>
      <Select onValueChange={setProductId} value={productId}>
        <SelectTrigger><SelectValue placeholder="Pilih Produk" /></SelectTrigger>
        <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} (Stok: {p.stock})</SelectItem>)}</SelectContent>
      </Select>
      <Select onValueChange={(v) => setType(v as any)} defaultValue="IN">
        <SelectTrigger className="my-2"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="IN">Stok Masuk (Pembelian)</SelectItem><SelectItem value="OUT">Stok Keluar (Rusak/Kadaluarsa)</SelectItem></SelectContent>
      </Select>
      <Input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} placeholder="Jumlah" className="my-2" />
      <Input placeholder="Referensi (Supplier / Invoice)" value={reference} onChange={e => setReference(e.target.value)} className="my-2" />
      <Button onClick={handleSubmit}>Proses</Button>
    </div>
  );
}