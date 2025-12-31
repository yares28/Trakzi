// __tests__/integration/import-pipeline-v2.test.ts
import { sanitizeDescription } from "@/lib/ai/sanitize-description";
import { ruleSimplifyDescription } from "@/lib/ai/rule-simplify";
import { aiSimplifyBatch } from "@/lib/ai/ai-simplify";
import { aiCategorizeBatch } from "@/lib/ai/categorize-v2";

/**
 * Integration test for Hybrid Import Pipeline v2
 * Tests the full flow: Sanitize → Rule Simplify → AI Simplify (fallback) → AI Categorize
 */

describe("Hybrid Import Pipeline v2 - Integration", () => {
    describe("Full Pipeline Flow", () => {
        test("processes known merchant (rules only - no AI)", () => {
            // Step 1: Raw description
            const raw = "COMPRA MERCADONA VALENCIA CARD*1234";

            // Step 2: Sanitize
            const sanitized = sanitizeDescription(raw);
            expect(sanitized).toBe("COMPRA MERCADONA VALENCIA CARD");
            expect(sanitized).not.toContain("1234"); // Card number removed

            // Step 3: Rule simplify
            const simplified = ruleSimplifyDescription(sanitized);
            expect(simplified.simplified).toBe("Mercadona");
            expect(simplified.confidence).toBeGreaterThanOrEqual(0.9);
            expect(simplified.matchedRule).toBe("merchant:mercadona");
            expect(simplified.typeHint).toBe("merchant");

            // Step 4: AI categorize would use "Mercadona" → "Groceries"
            // (Not tested here as it requires API key)
        });

        test("processes transfer with name extraction", () => {
            // Step 1: Raw description
            const raw = "BIZUM A SR JUAN PEREZ REF:123456789012";

            // Step 2: Sanitize
            const sanitized = sanitizeDescription(raw);
            expect(sanitized).toBe("BIZUM A SR JUAN PEREZ REF");
            expect(sanitized).not.toContain("123456789012"); // Ref removed

            // Step 3: Rule simplify
            const simplified = ruleSimplifyDescription(sanitized);
            expect(simplified.simplified).toBe("Bizum Juan");
            expect(simplified.confidence).toBeGreaterThanOrEqual(0.8);
            expect(simplified.matchedRule).toBe("transfer:bizum");
            expect(simplified.typeHint).toBe("transfer");

            // First name extracted, honorific + surname removed
        });

        test("processes bank fee", () => {
            // Step 1: Raw description  
            const raw = "COMISION MANTENIMIENTO CUENTA";

            // Step 2: Sanitize (no sensitive data)
            const sanitized = sanitizeDescription(raw);
            expect(sanitized).toBe("COMISION MANTENIMIENTO CUENTA");

            // Step 3: Rule simplify
            const simplified = ruleSimplifyDescription(sanitized);
            expect(simplified.simplified).toBe("Bank Fee");
            expect(simplified.typeHint).toBe("fee");
        });

        test("processes unknown merchant (requires AI fallback)", () => {
            // Step 1: Raw description
            const raw = "COMPRA TIENDA LOCAL DESCONOCIDA CARD*9999";

            // Step 2: Sanitize
            const sanitized = sanitizeDescription(raw);
            expect(sanitized).toBe("COMPRA TIENDA LOCAL DESCONOCIDA CARD");

            // Step 3: Rule simplify (no match)
            const simplified = ruleSimplifyDescription(sanitized);
            expect(simplified.simplified).toBeNull();
            expect(simplified.confidence).toBe(0);

            // Step 4: Would trigger AI simplify in real flow
            // aiSimplifyBatch([{ id: "tx_0", sanitized_description: sanitized }])
        });
    });

    describe("Privacy & Security", () => {
        test("removes all sensitive data before AI", () => {
            const testCases = [
                {
                    input: "COMPRA AMAZON TARJ*1234",
                    shouldNotContain: "1234",
                    description: "card number"
                },
                {
                    input: "TRANSFER ES9121000418450200051332 JOHN",
                    shouldNotContain: "ES9121000418450200051332",
                    description: "IBAN"
                },
                {
                    input: "BIZUM +34 123 456 789 MARIA",
                    shouldNotContain: "+34 123 456 789",
                    description: "phone number"
                },
                {
                    input: "COMPRA AMAZON AUTH:CW4WE8Q35",
                    shouldNotContain: "CW4WE8Q35",
                    description: "auth code"
                },
                {
                    input: "BIZUM REF:123456789012 JUAN",
                    shouldNotContain: "123456789012",
                    description: "long ref number"
                },
            ];

            for (const testCase of testCases) {
                const sanitized = sanitizeDescription(testCase.input);
                expect(sanitized).not.toContain(testCase.shouldNotContain);
            }
        });

        test("preserves merchant names during sanitization", () => {
            const testCases = [
                { input: "COMPRA MERCADONA CARD*1234", mustContain: "MERCADONA" },
                { input: "PAGO AMAZON.ES AUTH:ABC123", mustContain: "AMAZON" },
                { input: "RECIBO SPOTIFY REF:999999999", mustContain: "SPOTIFY" },
            ];

            for (const testCase of testCases) {
                const sanitized = sanitizeDescription(testCase.input);
                expect(sanitized).toContain(testCase.mustContain);
            }
        });
    });

    describe("Rule Coverage", () => {
        test("covers major Spanish merchants", () => {
            const merchants = [
                "MERCADONA", "CARREFOUR", "LIDL", "DIA", "ALDI",
                "AMAZON", "SPOTIFY", "NETFLIX", "GLOVO", "UBER"
            ];

            for (const merchant of merchants) {
                const simplified = ruleSimplifyDescription(`COMPRA ${merchant}`);
                expect(simplified.simplified).toBeTruthy();
                expect(simplified.confidence).toBeGreaterThan(0.8);
            }
        });

        test("covers all operation types", () => {
            const operations = [
                { input: "COMISION CUENTA", expected: "Bank Fee" },
                { input: "CAJERO ATM", expected: "ATM Withdrawal" },
                { input: "NOMINA DICIEMBRE", expected: "Salary" },
                { input: "DEVOLUCION COMPRA", expected: "Refund" },
            ];

            for (const op of operations) {
                const simplified = ruleSimplifyDescription(op.input);
                expect(simplified.simplified).toBe(op.expected);
            }
        });
    });

    describe("Transfer Name Extraction", () => {
        test("extracts first names from various formats", () => {
            const testCases = [
                { input: "BIZUM SR JUAN PEREZ", expected: "Bizum Juan" },
                { input: "BIZUM MRS ANNA SMITH", expected: "Bizum Anna" },
                { input: "TRANSFERENCIA DON CARLOS", expected: "Transfer Carlos" },
                { input: "SEPA MARIA", expected: "Transfer Maria" },
            ];

            for (const testCase of testCases) {
                const simplified = ruleSimplifyDescription(testCase.input);
                expect(simplified.simplified).toBe(testCase.expected);
            }
        });

        test("ignores multilingual honorifics", () => {
            const honorifics = ["SR", "SRA", "MR", "MRS", "DON", "DOÑA", "DR"];

            for (const honorific of honorifics) {
                const simplified = ruleSimplifyDescription(`BIZUM ${honorific} JUAN`);
                expect(simplified.simplified).toContain("Juan");
                expect(simplified.simplified).not.toContain(honorific);
            }
        });

        test("handles transfers without names", () => {
            const simplified1 = ruleSimplifyDescription("BIZUM PAGO");
            expect(simplified1.simplified).toBe("Bizum Pago");

            const simplified2 = ruleSimplifyDescription("TRANSFERENCIA SEPA");
            expect(simplified2.simplified).toBe("Transfer Sepa");
        });
    });

    describe("Confidence Scoring", () => {
        test("high confidence for exact merchant matches", () => {
            const result = ruleSimplifyDescription("MERCADONA");
            expect(result.confidence).toBeGreaterThanOrEqual(0.9);
        });

        test("medium confidence for operation rules", () => {
            const result = ruleSimplifyDescription("COMISION");
            expect(result.confidence).toBeGreaterThanOrEqual(0.75);
            expect(result.confidence).toBeLessThan(0.9);
        });

        test("zero confidence triggers AI fallback", () => {
            const result = ruleSimplifyDescription("UNKNOWN MERCHANT XYZ");
            expect(result.confidence).toBe(0);
            expect(result.simplified).toBeNull();
            // This would trigger AI simplify in full pipeline
        });
    });

    describe("Real-World Examples", () => {
        test("Example 1: Grocery shopping", () => {
            const pipeline = [
                { step: "raw", value: "COMPRA MERCADONA VALENCIA CARD*1234" },
                { step: "sanitized", value: sanitizeDescription("COMPRA MERCADONA VALENCIA CARD*1234") },
            ];

            const simplified = ruleSimplifyDescription(pipeline[1].value);

            expect(pipeline[1].value).not.toContain("1234");
            expect(simplified.simplified).toBe("Mercadona");
            expect(simplified.confidence).toBeGreaterThan(0.9);
        });

        test("Example 2: Subscription", () => {
            const raw = "RECIBO SPOTIFY PREMIUM REF:ABC123456789";
            const sanitized = sanitizeDescription(raw);
            const simplified = ruleSimplifyDescription(sanitized);

            expect(sanitized).not.toContain("ABC123456789");
            expect(simplified.simplified).toBe("Spotify");
        });

        test("Example 3: Bizum transfer", () => {
            const raw = "BIZUM A SRA MARIA GARCIA LOPEZ +34 123456789";
            const sanitized = sanitizeDescription(raw);
            const simplified = ruleSimplifyDescription(sanitized);

            expect(sanitized).not.toContain("+34 123456789");
            expect(simplified.simplified).toBe("Bizum Maria");
        });

        test("Example 4: Online purchase", () => {
            const raw = "COMPRA WWW.AMAZON.ES AUTH:CW4WE8Q35 CARD*5678";
            const sanitized = sanitizeDescription(raw);
            const simplified = ruleSimplifyDescription(sanitized);

            expect(sanitized).not.toContain("CW4WE8Q35");
            expect(sanitized).not.toContain("5678");
            expect(simplified.simplified).toBe("Amazon");
        });
    });

    describe("Edge Cases", () => {
        test("handles empty descriptions", () => {
            // Assuming sanitizeDescription is defined elsewhere and looks like this:
            // function sanitizeDescription(raw) {
            //     let sanitized = raw.toUpperCase();
            //     // ... other sanitization steps ...
            //     sanitized = sanitized.replace(/\s+/g, " ").trim();
            //     // console.log(`[Sanitize] ${raw} -> ${sanitized}`); // Added console.log
            //     return sanitized;
            // }
            const sanitized = sanitizeDescription("");
            expect(sanitized).toBe("");

            const simplified = ruleSimplifyDescription("");
            expect(simplified.confidence).toBe(0);
        });

        test("handles very long descriptions", () => {
            const longDesc = "COMPRA " + "A".repeat(500);
            const sanitized = sanitizeDescription(longDesc);
            expect(sanitized.length).toBeLessThan(longDesc.length + 100); // Reasonable length
        });

        test("handles special characters", () => {
            const special = "COMPRA €100 @ MERCADONA™ #123";
            const sanitized = sanitizeDescription(special);
            const simplified = ruleSimplifyDescription(sanitized);

            expect(simplified.simplified).toBe("Mercadona");
        });

        test("handles mixed case consistently", () => {
            const variations = ["mercadona", "MERCADONA", "Mercadona", "MeRcAdOnA"];

            for (const variant of variations) {
                const simplified = ruleSimplifyDescription(variant);
                expect(simplified.simplified).toBe("Mercadona");
            }
        });
    });

    describe("Performance Expectations", () => {
        test("processes 100 transactions in reasonable time", () => {
            const startTime = Date.now();

            for (let i = 0; i < 100; i++) {
                const raw = "COMPRA MERCADONA VALENCIA CARD*1234";
                const sanitized = sanitizeDescription(raw);
                ruleSimplifyDescription(sanitized);
            }

            const elapsed = Date.now() - startTime;
            expect(elapsed).toBeLessThan(1000); // Should complete in <1 second
        });
    });
});
