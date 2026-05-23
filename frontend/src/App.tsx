import React, { useState } from "react";
import { ProductForm } from "./components/ProductForm";
import { CatalogDashboard } from "./components/CatalogDashboard";
import { CategoryForm } from "./components/CategoryForm";

export default function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Disparador unificado para revalidar todos os dados e selects reativos da SPA
  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 max-w-7xl mx-auto space-y-8">
      {/* CABEÇALHO DO DASHBOARD */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Catalog Architecture
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Interface SPA integrada à fila do BullMQ com sincronização reativa.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-200 w-fit">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Pooling em Tempo Real Ativo
        </div>
      </header>

      {/* GRID PRINCIPAL DO ECOSSISTEMA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COLUNA ESQUERDA: FORMULÁRIOS DE ENTRADA */}
        <div className="lg:col-span-1 space-y-6">
          {/* 🟢 CORRIGIDO: Agora o ProductForm recebe o gatilho para escutar a criação de novas categorias */}
          <ProductForm
            onProductCreated={handleRefresh}
            refreshTrigger={refreshTrigger}
          />
          <CategoryForm onCategoryCreated={handleRefresh} />
        </div>

        {/* COLUNA DIREITA: FILTROS AVANÇADOS E FILA DE PRODUTOS */}
        <div className="lg:col-span-2">
          <CatalogDashboard refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </div>
  );
}
