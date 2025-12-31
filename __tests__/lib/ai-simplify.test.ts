// __tests__/lib/ai-simplify.test.ts
import { aiSimplifyBatch } from "@/lib/ai/ai-simplify";

// Mock fetch for testing
global.fetch = jest.fn();

describe("aiSimplifyBatch", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Set mock API key
        process.env.OPENROUTER_API_KEY = "test-key";
    });

    afterEach(() => {
        delete process.env.OPENROUTER_API_KEY;
    });

    describe("Batch Processing", () => {
        test("handles empty array", async () => {
            const results = await aiSimplifyBatch([]);
            expect(results.size).toBe(0);
        });

        test("processes single item", async () => {
            const mockResponse = {
                choices: [{
                    message: {
                        content: JSON.stringify([
                            { id: "tx_0", simplified: "Test Merchant", confidence: 0.9 }
                        ])
                    }
                }]
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const results = await aiSimplifyBatch([
                { id: "tx_0", sanitized_description: "COMPRA TEST MERCHANT" }
            ]);

            expect(results.size).toBe(1);
            expect(results.get("tx_0")?.simplified).toBe("Test Merchant");
            expect(results.get("tx_0")?.confidence).toBe(0.9);
        });

        test("processes multiple items", async () => {
            const mockResponse = {
                choices: [{
                    message: {
                        content: JSON.stringify([
                            { id: "tx_0", simplified: "Merchant A", confidence: 0.9 },
                            { id: "tx_1", simplified: "Merchant B", confidence: 0.8 },
                            { id: "tx_2", simplified: "Merchant C", confidence: 0.7 }
                        ])
                    }
                }]
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const results = await aiSimplifyBatch([
                { id: "tx_0", sanitized_description: "COMPRA MERCHANT A" },
                { id: "tx_1", sanitized_description: "PAGO MERCHANT B" },
                { id: "tx_2", sanitized_description: "RECIBO MERCHANT C" }
            ]);

            expect(results.size).toBe(3);
            expect(results.get("tx_0")?.simplified).toBe("Merchant A");
            expect(results.get("tx_1")?.simplified).toBe("Merchant B");
            expect(results.get("tx_2")?.simplified).toBe("Merchant C");
        });
    });

    describe("Error Handling", () => {
        test("handles missing API key", async () => {
            delete process.env.OPENROUTER_API_KEY;

            const results = await aiSimplifyBatch([
                { id: "tx_0", sanitized_description: "COMPRA TEST" }
            ]);

            expect(results.size).toBe(1);
            expect(results.get("tx_0")?.simplified).toBeTruthy();
            expect(results.get("tx_0")?.confidence).toBeLessThan(0.5); // Fallback confidence
        });

        test("handles API error response", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 500,
                text: async () => "Internal Server Error",
            });

            const results = await aiSimplifyBatch([
                { id: "tx_0", sanitized_description: "COMPRA TEST" }
            ]);

            expect(results.size).toBe(1);
            expect(results.get("tx_0")?.simplified).toBeTruthy(); // Fallback result
        });

        test("handles network error", async () => {
            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

            const results = await aiSimplifyBatch([
                { id: "tx_0", sanitized_description: "COMPRA TEST" }
            ]);

            expect(results.size).toBe(1);
            expect(results.get("tx_0")?.simplified).toBeTruthy(); // Fallback result
        });

        test("handles malformed JSON response", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ choices: [{ message: { content: "not json" } }] }),
            });

            const results = await aiSimplifyBatch([
                { id: "tx_0", sanitized_description: "COMPRA TEST" }
            ]);

            expect(results.size).toBe(1);
            expect(results.get("tx_0")?.simplified).toBeTruthy();
        });
    });

    describe("Response Parsing", () => {
        test("parses array response", async () => {
            const mockResponse = {
                choices: [{
                    message: {
                        content: JSON.stringify([
                            { id: "tx_0", simplified: "Test", confidence: 0.9 }
                        ])
                    }
                }]
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const results = await aiSimplifyBatch([
                { id: "tx_0", sanitized_description: "TEST" }
            ]);

            expect(results.get("tx_0")?.simplified).toBe("Test");
        });

        test("parses object with results array", async () => {
            const mockResponse = {
                choices: [{
                    message: {
                        content: JSON.stringify({
                            results: [
                                { id: "tx_0", simplified: "Test", confidence: 0.9 }
                            ]
                        })
                    }
                }]
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const results = await aiSimplifyBatch([
                { id: "tx_0", sanitized_description: "TEST" }
            ]);

            expect(results.get("tx_0")?.simplified).toBe("Test");
        });

        test("handles missing items with fallback", async () => {
            const mockResponse = {
                choices: [{
                    message: {
                        content: JSON.stringify([
                            { id: "tx_0", simplified: "Test", confidence: 0.9 }
                            // tx_1 missing
                        ])
                    }
                }]
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const results = await aiSimplifyBatch([
                { id: "tx_0", sanitized_description: "TEST" },
                { id: "tx_1", sanitized_description: "ANOTHER TEST" }
            ]);

            expect(results.size).toBe(2);
            expect(results.get("tx_0")?.simplified).toBe("Test");
            expect(results.get("tx_1")?.simplified).toBeTruthy(); // Fallback
        });

        test("clamps confidence to 0-1 range", async () => {
            const mockResponse = {
                choices: [{
                    message: {
                        content: JSON.stringify([
                            { id: "tx_0", simplified: "Test", confidence: 1.5 }, // > 1
                            { id: "tx_1", simplified: "Test", confidence: -0.5 } // < 0
                        ])
                    }
                }]
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const results = await aiSimplifyBatch([
                { id: "tx_0", sanitized_description: "TEST1" },
                { id: "tx_1", sanitized_description: "TEST2" }
            ]);

            expect(results.get("tx_0")?.confidence).toBe(1); // Clamped to 1
            expect(results.get("tx_1")?.confidence).toBe(0); // Clamped to 0
        });

        test("truncates long simplified names", async () => {
            const longName = "A".repeat(100);
            const mockResponse = {
                choices: [{
                    message: {
                        content: JSON.stringify([
                            { id: "tx_0", simplified: longName, confidence: 0.9 }
                        ])
                    }
                }]
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const results = await aiSimplifyBatch([
                { id: "tx_0", sanitized_description: "TEST" }
            ]);

            expect(results.get("tx_0")?.simplified.length).toBeLessThanOrEqual(50);
        });
    });

    describe("Fallback Behavior", () => {
        test("extracts merchant from description", async () => {
            delete process.env.OPENROUTER_API_KEY;

            const results = await aiSimplifyBatch([
                { id: "tx_0", sanitized_description: "COMPRA AMAZON LIBROS" }
            ]);

            const result = results.get("tx_0");
            expect(result?.simplified).toContain("Amazon"); // Should extract merchant
        });

        test("handles short descriptions", async () => {
            delete process.env.OPENROUTER_API_KEY;

            const results = await aiSimplifyBatch([
                { id: "tx_0", sanitized_description: "AB" }
            ]);

            expect(results.get("tx_0")?.simplified).toBeTruthy();
        });

        test("removes banking prefixes", async () => {
            delete process.env.OPENROUTER_API_KEY;

            const results = await aiSimplifyBatch([
                { id: "tx_0", sanitized_description: "COMPRA MERCHANT NAME" }
            ]);

            const result = results.get("tx_0");
            expect(result?.simplified).not.toContain("COMPRA");
        });

        test("applies title case", async () => {
            delete process.env.OPENROUTER_API_KEY;

            const results = await aiSimplifyBatch([
                { id: "tx_0", sanitized_description: "COMPRA MERCHANT NAME" }
            ]);

            const result = results.get("tx_0");
            expect(result?.simplified).toMatch(/^[A-Z][a-z]/); // Title case
        });
    });
});
