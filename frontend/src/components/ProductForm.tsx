import React, { useState } from "react";

export function ProductForm({
  onProductCreated,
}: {
  onProductCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState(0);

  return (
    <form className="p-4 bg-white rounded shadow">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome"
        className="border p-2 m-2"
      />
      <input
        value={sku}
        onChange={(e) => setSku(e.target.value)}
        placeholder="TEL-0001-A1"
        className="border p-2 m-2"
      />
      <input
        type="number"
        value={price}
        onChange={(e) => setPrice(Number(e.target.value))}
        placeholder="Preço"
        className="border p-2 m-2"
      />
      <button type="submit" className="bg-blue-500 text-white p-2 rounded">
        Enviar
      </button>
    </form>
  );
}
