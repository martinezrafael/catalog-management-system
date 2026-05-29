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

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("http://localhost:3333/api/v1/categories")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) =>
        setCategories(Array.isArray(data) ? data : data.data || []),
      )
      .catch((err) => console.error("Erro ao buscar categorias:", err));
  }, [refreshTrigger]);

  const convertToCents = (formattedValue: string): number | undefined => {
    if (!formattedValue) return undefined;
    const cleanNumber = formattedValue.replace(/\D/g, "");
    return cleanNumber ? Number(cleanNumber) : undefined;
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    value = value.replace(/\D/g, "");

    if (value === "") {
      setPriceCents("");
      return;
    }

    const options = { minimumFractionDigits: 2 };
    const formattedResult = new Intl.NumberFormat("pt-BR", options).format(
      parseFloat(value) / 100,
    );

    setPriceCents(formattedResult);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    const payload = {
      name: name || undefined,
      description: description || undefined,
      sku: sku || undefined,
      price_cents: convertToCents(priceCents),
      category_ids: selectedCategory ? [Number(selectedCategory)] : undefined,
      attributes: {
        color: color || undefined,
        size: size || undefined,
      },
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
        setSize("Medium");
        setSelectedCategory("");
        onProductCreated();
      } else if (response.status === 400) {
        const errorData = await response.json();

        if (
          errorData.status === "validation_error" &&
          Array.isArray(errorData.errors)
        ) {
          const mappedErrors: Record<string, string> = {};

          errorData.errors.forEach((err: ValidationError) => {
            mappedErrors[err.field] = err.message;
          });

          setErrors(mappedErrors);
        }
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

  const renderError = (fieldKey: string) => {
    if (!errors[fieldKey]) return null;
    return (
      <p className="text-xs text-red-500 font-medium mt-1">
        {errors[fieldKey]}
      </p>
    );
  };

  const inputClass = (fieldKey: string) => {
    return errors[fieldKey]
      ? "border-red-500 focus-visible:ring-red-500/50"
      : "border-slate-200";
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
          {/* Campo: Nome */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">
              Nome *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Mouse Gamer Pro"
              className={inputClass("name")}
            />
            {renderError("name")}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">
              SKU Único *
            </label>
            <Input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="Ex: AAA-1111-AA"
              className={inputClass("sku")}
            />
            {renderError("sku")}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Preço *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1.5 text-sm text-slate-400 font-medium select-none">
                  R$
                </span>
                <Input
                  type="text"
                  value={priceCents}
                  onChange={handlePriceChange}
                  placeholder="0,00"
                  className={`pl-9 ${inputClass("price_cents")}`}
                />
              </div>
              {renderError("price_cents")}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Categoria *
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={`w-full h-8 rounded-md border px-3 py-1 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 ${
                  errors["category_ids"]
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
              {renderError("category_ids")}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Cor
              </label>
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Ex: Preto Cósmico"
                className={inputClass("attributes.color")}
              />
              {renderError("attributes.color")}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Tamanho
              </label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className={`w-full h-8 rounded-md border border-slate-200 px-3 py-1 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 ${
                  errors["attributes.size"]
                    ? "border-red-500 focus:ring-red-500/50"
                    : "border-slate-200 focus:ring-slate-900"
                }`}
              >
                <option value="Small">Small</option>
                <option value="Medium">Medium</option>
                <option value="Large">Large</option>
                <option value="X-Large">X-Large</option>
              </select>
              {renderError("attributes.size")}
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white mt-2"
          >
            {loading ? "Enviando..." : "Postar Produto na Fila"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
