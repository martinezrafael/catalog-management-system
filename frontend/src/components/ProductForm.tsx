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

interface ValidationError {
  field: string;
  message: string;
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

  // Estado para armazenar erros mapeados por campo
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    setErrors({}); // Limpa erros anteriores

    setLoading(true);

    const payload = {
      name,
      description,
      sku,
      price_cents: priceCents ? Number(priceCents) : undefined, // Deixa o backend/Zod validar se for vazio
      category_ids: selectedCategory ? [Number(selectedCategory)] : [],
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
        setSelectedCategory("");
        onProductCreated();
      } else if (response.status === 400) {
        const errorData = await response.json();

        if (
          errorData.status === "validation_error" &&
          Array.isArray(errorData.errors)
        ) {
          const fieldErrors: Record<string, string> = {};
          errorData.errors.forEach((err: ValidationError) => {
            fieldErrors[err.field] = err.message;
          });
          setErrors(fieldErrors);
        } else {
          alert(errorData.message || "Erro de validação nos dados.");
        }
      } else {
        const errJson = await response.json().catch(() => ({}));
        alert(errJson.message || "Erro ao enviar o produto.");
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
          {/* Nome */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">
              Nome
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Mouse Gamer Pro"
              className={
                errors.name
                  ? "border-red-500 focus-visible:ring-red-500/50"
                  : ""
              }
            />
            {errors.name && (
              <p className="text-xs text-red-500 font-medium">{errors.name}</p>
            )}
          </div>

          {/* SKU */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">
              SKU Único
            </label>
            <Input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="Ex: ABC-1234-AB"
              className={
                errors.sku ? "border-red-500 focus-visible:ring-red-500/50" : ""
              }
            />
            {errors.sku && (
              <p className="text-xs text-red-500 font-medium">{errors.sku}</p>
            )}
          </div>

          {/* Descrição */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">
              Descrição
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Resumo do produto..."
              className={
                errors.description
                  ? "border-red-500 focus-visible:ring-red-500/50"
                  : ""
              }
            />
            {errors.description && (
              <p className="text-xs text-red-500 font-medium">
                {errors.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Preço */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Preço (Centavos)
              </label>
              <Input
                type="number"
                value={priceCents}
                onChange={(e) => setPriceCents(e.target.value)}
                placeholder="59900"
                className={
                  errors.price_cents
                    ? "border-red-500 focus-visible:ring-red-500/50"
                    : ""
                }
              />
              {errors.price_cents && (
                <p className="text-xs text-red-500 font-medium">
                  {errors.price_cents}
                </p>
              )}
            </div>

            {/* Categoria */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Categoria
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={`w-full h-10 rounded-md border px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 ${
                  errors.category_ids
                    ? "border-red-500 focus:ring-red-500/50"
                    : "border-slate-200 focus:ring-slate-900"
                }`}
              >
                <option value="">Selecione...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.category_ids && (
                <p className="text-xs text-red-500 font-medium">
                  {errors.category_ids}
                </p>
              )}
            </div>
          </div>

          {/* Atributos */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Cor
              </label>
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Ex: Preto"
                className={
                  errors["attributes.color"]
                    ? "border-red-500 focus-visible:ring-red-500/50"
                    : ""
                }
              />
              {errors["attributes.color"] && (
                <p className="text-xs text-red-500 font-medium">
                  {errors["attributes.color"]}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Tamanho
              </label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className={`w-full h-10 rounded-md border px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 ${
                  errors["attributes.size"]
                    ? "border-red-500 focus:ring-red-500/50"
                    : "border-slate-200 focus:ring-slate-900"
                }`}
              >
                <option value="Small">Small</option>
                <option value="Medium">Medium</option>
                <option value="Large">Large</option>
              </select>
              {errors["attributes.size"] && (
                <p className="text-xs text-red-500 font-medium">
                  {errors["attributes.size"]}
                </p>
              )}
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
