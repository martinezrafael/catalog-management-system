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
        body: JSON.stringify({ name: name || undefined }),
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
          const mappedErrors: Record<string, string> = {};

          errorData.errors.forEach((err: ValidationError) => {
            mappedErrors[err.field] = err.message;
          });

          setErrors(mappedErrors);
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
        <CardTitle className="text-lg font-bold">Nova Categoria</CardTitle>
        <CardDescription>
          Criação síncrona diretamente no banco de dados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">
              Nome da Categoria *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Eletrônicos, Vestuário"
              className={inputClass("name")}
            />
            {renderError("name")}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white mt-2"
          >
            {loading ? "Criando..." : "Criar Categoria"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
