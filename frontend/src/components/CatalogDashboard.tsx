import React, { useEffect, useState } from "react";

export function CatalogDashboard() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetch(`${apiUrl}/api/v1/products?q=${searchTerm}`)
        .then((res) => res.json())
        .then((result) => setProducts(result.data));
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, apiUrl]);

  useEffect(() => {
    const hasActiveProcessing = products.some(
      (p: any) => p.status === "PROCESSING",
    );
    if (!hasActiveProcessing) return;

    const interval = setInterval(() => {
      fetch(`${apiUrl}/api/v1/products?q=${searchTerm}`)
        .then((res) => res.json())
        .then((result) => setProducts(result.data));
    }, 3000);

    return () => clearInterval(interval);
  }, [products, searchTerm, apiUrl]);

  return (
    <div className="p-6">
      <input
        type="text"
        placeholder="Buscar..."
        onChange={(e) => setSearchTerm(e.target.value)}
        className="border p-2 mb-4 w-full"
      />
      <table className="w-full text-left border">
        <thead>
          <tr>
            <th>Nome</th>
            <th>SKU</th>
            <th>Status</th>
            <th>Categoria Externa</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p: any) => (
            <tr key={p.id} className="border-b">
              <td>{p.name}</td>
              <td>{p.sku}</td>
              <td>
                <span
                  className={`px-2 py-1 rounded text-sm ${
                    p.status === "PROCESSED"
                      ? "bg-green-100 text-green-800"
                      : p.status === "FAILED"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {p.status}
                </span>
              </td>
              <td>
                {p.attributes?.external_category
                  ? String(p.attributes.external_category)
                  : "Aguardando..."}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
