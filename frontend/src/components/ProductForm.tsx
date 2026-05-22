import React from "react";

export function ProductForm({
  onProductCreated,
}: {
  onProductCreated: () => void;
}) {
  return (
    <form className="p-4 bg-white rounded shadow">
      <input
        placeholder="Nome do Produto"
        className="border p-2 m-2"
        required
      />
      <button type="submit" className="bg-blue-500 text-white p-2 rounded">
        Enviar
      </button>
    </form>
  );
}
