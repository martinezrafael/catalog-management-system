import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Product {
  id: string;
  name: string;
  description: string;
  sku: string;
  price_cents: number;
  status: "PROCESSING" | "PROCESSED" | "FAILED";
  attributes: Record<string, any>;
}

interface Category {
  id: number;
  name: string;
}

interface CatalogDashboardProps {
  refreshTrigger: number;
}

export function CatalogDashboard({ refreshTrigger }: CatalogDashboardProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Estados dos filtros conectados à API avançada do Back
  const [filterQ, setFilterQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterColor, setFilterColor] = useState("");

  const fetchProducts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterQ) params.append("q", filterQ);
      if (filterStatus && filterStatus !== "all")
        params.append("status", filterStatus);
      if (filterCategory && filterCategory !== "all")
        params.append("category_id", filterCategory);
      if (filterColor) params.append("color", filterColor);

      const response = await fetch(
        `http://localhost:3333/api/v1/products?${params.toString()}`,
      );
      if (response.ok) {
        const result = await response.json();
        setProducts(result.data || []);
      }
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
    }
  }, [filterQ, filterStatus, filterCategory, filterColor]);

  // 🟢 Corrigido: Carrega e atualiza as categorias para o filtro sempre que o gatilho mudar
  useEffect(() => {
    fetch("http://localhost:3333/api/v1/categories")
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao buscar categorias");
        return res.json();
      })
      .then((data) => {
        // Blindagem para garantir o mapeamento correto caso mude o envelopamento no back
        const resolvedCategories = Array.isArray(data) ? data : data.data || [];
        setCategories(resolvedCategories);
      })
      .catch((err) =>
        console.error("Erro ao carregar categorias no filtro:", err),
      );
  }, [refreshTrigger]); // ✨ Agora escuta o estado de sincronização global!

  // ⚡ Requisito UX Assíncrona: Short Polling reativo de 3 segundos
  useEffect(() => {
    fetchProducts();
    const interval = setInterval(() => {
      fetchProducts();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchProducts, refreshTrigger]);

  return (
    <div className="space-y-6">
      {/* CARD DE FILTROS AVANÇADOS */}
      <Card className="p-4 shadow-sm border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-4 bg-white">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">
            Termo Geral
          </label>
          <Input
            value={filterQ}
            onChange={(e) => setFilterQ(e.target.value)}
            placeholder="Nome ou SKU..."
            className="h-9 text-xs"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">
            Status da Fila
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full h-9 rounded-md border border-slate-200 px-2 text-xs bg-white focus:outline-none"
          >
            <option value="all">Todos os Status</option>
            <option value="PROCESSING">⏳ Pendente</option>
            <option value="PROCESSED">✅ Processado</option>
            <option value="FAILED">❌ Falhou</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">
            Categoria
          </label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full h-9 rounded-md border border-slate-200 px-2 text-xs bg-white focus:outline-none"
          >
            <option value="all">Todas</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">
            Cor (JSON)
          </label>
          <Input
            value={filterColor}
            onChange={(e) => setFilterColor(e.target.value)}
            placeholder="Ex: Preto"
            className="h-9 text-xs"
          />
        </div>
      </Card>

      {/* SHADCN TABLE DATA GRID */}
      <Card className="shadow-sm border-slate-200 overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[220px] font-bold text-slate-700">
                Identificação / SKU
              </TableHead>
              <TableHead className="font-bold text-slate-700">Preço</TableHead>
              <TableHead className="font-bold text-slate-700">
                Atributos NoSQL (JSON)
              </TableHead>
              <TableHead className="text-center font-bold text-slate-700">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-32 text-center text-slate-400"
                >
                  Nenhum produto indexado encontrado.
                </TableCell>
              </TableRow>
            ) : (
              products.map((prod) => (
                <TableRow
                  key={prod.id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <TableCell className="py-4">
                    <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {prod.sku}
                    </span>
                    <div className="font-semibold text-slate-900 mt-1">
                      {prod.name}
                    </div>
                    <div className="text-xs text-slate-400 truncate max-w-[180px]">
                      {prod.description || "Sem descrição"}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-slate-900">
                    {(prod.price_cents / 100).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </TableCell>
                  <TableCell>
                    <pre className="text-[10px] bg-slate-50 p-2 rounded-md border border-slate-100 max-w-[200px] overflow-x-auto font-mono text-slate-500">
                      {JSON.stringify(prod.attributes, null, 2)}
                    </pre>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={`font-bold uppercase tracking-wider text-[10px] px-2.5 py-0.5 shadow-sm ${
                        prod.status === "PROCESSED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : prod.status === "PROCESSING"
                            ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      {prod.status === "PROCESSED"
                        ? "Processed"
                        : prod.status === "PROCESSING"
                          ? "Processing"
                          : "Failed"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
