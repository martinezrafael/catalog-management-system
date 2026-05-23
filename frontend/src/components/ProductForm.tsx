import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Category {
  id: number;
  name: string;
}

interface ProductFormProps {
  onProductCreated: () => void;
  refreshTrigger?: number;
}

export function ProductForm({
  onProductCreated,
  refreshTrigger,
}: ProductFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sku, setSku] = useState("");
  const [priceCents, setPriceCents] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("Medium");
  const [loading, setLoading] = useState(false);

  // Carrega e atualiza as categorias para o select relacional
  useEffect(() => {
    fetch("http://localhost:3333/api/v1/categories")
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao buscar categorias");
        return res.json();
      })
      .then((data) => {
        const resolvedCategories = Array.isArray(data) ? data : data.data || [];
        setCategories(resolvedCategories);
      })
      .catch((err) => console.error("Erro ao buscar categorias:", err));
  }, [refreshTrigger]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sku || !selectedCategory || !priceCents) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setLoading(true);

    const payload = {
      name,
      description,
      sku,
      price_cents: Number(priceCents),
      category_ids: [Number(selectedCategory)],
      attributes: { color, size },
    };

    try {
      const response = await fetch("http://localhost:3333/api/v1/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `ui-key-${Math.random().toString(36).substring(7)}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 202) {
        setName("");
        setDescription("");
        setSku("");
        setPriceCents("");
        setColor("");
        onProductCreated();
      } else {
        alert("Erro ao enviar o produto para a fila.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg font-bold">Novo Produto</CardTitle>
        <CardDescription>
          Cadastre itens via mensageria assíncrona.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">
              Nome *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Mouse Gamer Pro"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">
              SKU Único *
            </label>
            <Input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="Ex: MSE-GPRO-01"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">
              Descrição
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Resumo do produto..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Preço (Centavos) *
              </label>
              <Input
                type="number"
                value={priceCents}
                onChange={(e) => setPriceCents(e.target.value)}
                placeholder="59900"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Categoria *
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full h-10 rounded-md border border-slate-200 px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">Selecione...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Cor (JSON)
              </label>
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Ex: Preto"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Tamanho (JSON)
              </label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full h-10 rounded-md border border-slate-200 px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="Small">Small</option>
                <option value="Medium">Medium</option>
                <option value="Large">Large</option>
              </select>
            </div>
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white mt-2"
          >
            {loading ? "Enviando..." : "Postar Produto na Fila"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
