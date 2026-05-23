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

export function CategoryForm({ onCategoryCreated }: CategoryFormProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("O nome da categoria é obrigatório.");

    setLoading(true);

    try {
      const response = await fetch("http://localhost:3333/api/v1/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      console.log(response);

      if (response.ok) {
        setName("");
        onCategoryCreated();
      } else {
        alert("Erro ao cadastrar categoria.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexão ao salvar categoria.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-md font-bold">Nova Categoria</CardTitle>
        <CardDescription>
          Crie partições relacionais para o catálogo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Eletrônicos, Roupas"
              className="h-9"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="bg-slate-900 hover:bg-slate-800 text-white h-9 text-xs px-4"
          >
            {loading ? "Salvando..." : "Criar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
