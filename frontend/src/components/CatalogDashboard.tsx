import React, { useState } from "react";

export function CatalogDashboard() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

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
              <td>{p.status}</td>
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
