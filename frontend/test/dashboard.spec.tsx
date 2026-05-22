import React from "react";
import { render, screen, act } from "@testing-library/react";
import { CatalogDashboard } from "../src/components/CatalogDashboard.js";
import "@testing-library/jest-dom";

describe("UX React Polling Interface", () => {
  beforeEach(() => {
    jest.useFakeTimers();

    (globalThis as any).fetch = jest.fn();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("deve cessar o polling periódico assim que todos os status transicionarem para PROCESSED", async () => {
    const mockInitialData = {
      data: [
        {
          id: 1,
          name: "Produto Teste",
          sku: "TST-1111-A1",
          status: "PROCESSING",
          attributes: {},
        },
      ],
    };

    const mockProcessedData = {
      data: [
        {
          id: 1,
          name: "Produto Teste",
          sku: "TST-1111-A1",
          status: "PROCESSED",
          attributes: { external_category: "Eletro" },
        },
      ],
    };

    const fetchMock = globalThis.fetch as jest.Mock;

    fetchMock
      .mockResolvedValueOnce({ json: async () => mockInitialData })
      .mockResolvedValueOnce({ json: async () => mockProcessedData });

    const clearIntervalSpy = jest.spyOn(globalThis, "clearInterval");

    await act(async () => {
      render(<CatalogDashboard />);
    });

    expect(screen.getByText("PROCESSING")).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    expect(screen.getByText("PROCESSED")).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
