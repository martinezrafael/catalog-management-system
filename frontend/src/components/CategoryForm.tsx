import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CategoryFormProps {
  onCategoryCreated: () => void;
}

interface ValidationError {
  field: string;
  message: string;
}

export function CategoryForm({ onCategoryCreated }: CategoryFormProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  // Estado para capturar erros específicos do Zod para categorias
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    setLoading(true);

    try {
      const response = await fetch("http://localhost:3333/api/v1/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      if (response.status === 201) {
        setName("");
        onCategoryCreated();
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
          alert(errorData.message || "Erro ao validar categoria.");
        }
      } else {
        const errJson = await response.json().catch(() => ({}));
        alert(errJson.message || "Erro ao criar categoria.");
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
        <CardTitle className="text-lg font-bold">Nova Categoria</CardTitle>
        <CardDescription>
          Criação síncrona diretamente no banco de dados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">
              Nome da Categoria
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Eletrônicos, Vestuário"
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

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white"
          >
            {loading ? "Criando..." : "Criar Categoria"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
