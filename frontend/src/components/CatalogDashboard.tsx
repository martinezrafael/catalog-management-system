import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

interface Product {
  id: string | number;
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

interface PaginationMeta {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
}

interface CatalogDashboardProps {
  refreshTrigger: number;
}

export function CatalogDashboard({ refreshTrigger }: CatalogDashboardProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [filterQ, setFilterQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterColor, setFilterColor] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta>({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    itemsPerPage: 5,
  });

  const itemsPerPage = 5;

  const fetchProducts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterQ) params.append("q", filterQ);
      if (filterStatus && filterStatus !== "all")
        params.append("status", filterStatus);
      if (filterCategory && filterCategory !== "all")
        params.append("category_id", filterCategory);
      if (filterColor) params.append("color", filterColor);

      params.append("page", currentPage.toString());
      params.append("limit", itemsPerPage.toString());

      const response = await fetch(
        `http://localhost:3333/api/v1/products?${params.toString()}`,
      );
      if (response.ok) {
        const result = await response.json();
        setProducts(result.data || []);
        if (result.meta) setMeta(result.meta);
      }
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
    }
  }, [filterQ, filterStatus, filterCategory, filterColor, currentPage]);

  // Handler de reprocessamento corrigido com tratamento visual de erro
  const handleRetryProduct = async (productId: string | number) => {
    try {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, status: "PROCESSING" } : p,
        ),
      );

      const response = await fetch(
        `http://localhost:3333/api/v1/products/${productId}/retry`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Erro retornado pelo servidor:", errorData);
        fetchProducts();
        alert(
          `Falha no reprocessamento: ${errorData.error || "Erro desconhecido"}`,
        );
      }
    } catch (error) {
      console.error("Erro de rede ao tentar retry:", error);
      fetchProducts();
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filterQ, filterStatus, filterCategory, filterColor]);

  useEffect(() => {
    fetch("http://localhost:3333/api/v1/categories")
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((data) =>
        setCategories(Array.isArray(data) ? data : data.data || []),
      )
      .catch((err) => console.error("Erro ao carregar categorias:", err));
  }, [refreshTrigger]);

  useEffect(() => {
    fetchProducts();

    const hasPendingProducts = products.some(
      (prod) => prod.status === "PROCESSING",
    );
    if (!hasPendingProducts) return;

    const interval = setInterval(() => {
      fetchProducts();
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchProducts, refreshTrigger, products]);

  return (
    <div className="space-y-6">
      {/* SEÇÃO DE FILTROS */}
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
            <option value="PROCESSING">Pendente</option>
            <option value="PROCESSED">Processado</option>
            <option value="FAILED">Falhou</option>
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
                    {((prod.price_cents || 0) / 100).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </TableCell>
                  <TableCell>
                    <pre className="text-[10px] bg-slate-50 p-2 rounded-md border border-slate-100 max-w-[200px] max-h-[120px] overflow-auto font-mono text-slate-500">
                      {JSON.stringify(prod.attributes, null, 2)}
                    </pre>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
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
                      {prod.status === "FAILED" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRetryProduct(prod.id)}
                          className="size-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-full border border-rose-100 shadow-sm transition-all"
                        >
                          <RotateCcw className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between p-4 bg-slate-50 border-t border-slate-100 text-xs">
          <div className="text-slate-500 font-medium flex items-center gap-4">
            <div>
              Página:{" "}
              <span className="text-slate-900 font-bold">
                {meta.currentPage}
              </span>{" "}
              de{" "}
              <span className="text-slate-900 font-bold">
                {meta.totalPages}
              </span>
            </div>
            <div className="w-px h-3 bg-slate-200" />
            <div>
              Total de Itens:{" "}
              <span className="text-slate-900 font-bold">
                {meta.totalItems}
              </span>
            </div>
          </div>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="h-8 px-2"
            >
              <ChevronLeft className="size-4 mr-0.5" /> Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => prev + 1)}
              disabled={currentPage >= meta.totalPages}
              className="h-8 px-2"
            >
              Próximo <ChevronRight className="size-4 ml-0.5" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
