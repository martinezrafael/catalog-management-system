import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";

export function ProductForm({
  onProductCreated,
}: {
  onProductCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState(0);

  const handleSubmit = async (e: React.BaseSyntheticEvent) => {
    e.preventDefault();
    const idempotencyKey = uuidv4();

    try {
      const apiUrl = import.meta.env.VITE_API_URL;

      const response = await fetch(`${apiUrl}/api/v1/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          name,
          sku,
          price_cents: price * 100,
          category_ids: [1],
        }),
      });

      if (response.status === 202) {
        onProductCreated();
        setName("");
        setSku("");
        setPrice(0);
      }
    } catch (error) {
      console.error("❌ Falha na comunicação com a API de catálogo:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white rounded shadow">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome"
        className="border p-2 m-2"
        required
      />
      <input
        value={sku}
        onChange={(e) => setSku(e.target.value)}
        placeholder="TEL-0001-A1"
        className="border p-2 m-2"
        required
      />
      <input
        type="number"
        value={price}
        onChange={(e) => setPrice(Number(e.target.value))}
        placeholder="Preço"
        className="border p-2 m-2"
        min="0"
        step="0.01"
        required
      />
      <button type="submit" className="bg-blue-500 text-white p-2 rounded">
        Enviar
      </button>
    </form>
  );
}
