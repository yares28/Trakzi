// __tests__/lib/rule-simplify.test.ts
import { ruleSimplifyDescription } from "@/lib/ai/rule-simplify";
import { sanitizeDescription } from "@/lib/ai/sanitize-description";

describe("ruleSimplifyDescription", () => {
    describe("Merchant Pattern Matching", () => {
        test("simplifies Mercadona", () => {
            const result = ruleSimplifyDescription(sanitizeDescription("COMPRA MERCADONA VALENCIA"));
            expect(result.simplified).toBe("Mercadona");
            expect(result.confidence).toBeGreaterThanOrEqual(0.9);
            expect(result.typeHint).toBe("merchant");
            expect(result.matchedRule).toBe("merchant:mercadona");
        });

        test("simplifies Amazon", () => {
            const result = ruleSimplifyDescription(sanitizeDescription("PAGO WWW.AMAZON.ES CARD"));
            expect(result.simplified).toBe("Amazon");
            expect(result.confidence).toBeGreaterThanOrEqual(0.9);
        });

        test("simplifies Carrefour", () => {
            const result = ruleSimplifyDescription("COMPRA CARREFOUR EXPRESS");
            expect(result.simplified).toBe("Carrefour");
        });

        test("simplifies Lidl", () => {
            const result = ruleSimplifyDescription("PAGO LIDL MADRID");
            expect(result.simplified).toBe("Lidl");
        });

        test("simplifies DIA", () => {
            const result = ruleSimplifyDescription("COMPRA DIA %");
            expect(result.simplified).toBe("DIA");
        });

        test("simplifies Spotify", () => {
            const result = ruleSimplifyDescription("RECIBO SPOTIFY PREMIUM");
            expect(result.simplified).toBe("Spotify");
        });

        test("simplifies Netflix", () => {
            const result = ruleSimplifyDescription("CARGO NETFLIX.COM");
            expect(result.simplified).toBe("Netflix");
        });
    });

    describe("Banking Operation Detection", () => {
        test("detects bank fees", () => {
            const result = ruleSimplifyDescription("COMISION MANTENIMIENTO CUENTA");
            expect(result.simplified).toBe("Bank Fee");
            expect(result.typeHint).toBe("fee");
            expect(result.matchedRule).toBe("fee");
        });

        test("detects fees in English", () => {
            const result = ruleSimplifyDescription("MONTHLY FEE");
            expect(result.simplified).toBe("Bank Fee");
        });

        test("detects ATM withdrawals", () => {
            const result = ruleSimplifyDescription("RETIRADA CAJERO AUTOMATICO");
            expect(result.simplified).toBe("ATM Withdrawal");
            expect(result.typeHint).toBe("atm");
        });

        test("detects ATM in English", () => {
            const result = ruleSimplifyDescription("ATM WITHDRAWAL");
            expect(result.simplified).toBe("ATM Withdrawal");
        });

        test("detects salary", () => {
            const result = ruleSimplifyDescription("NOMINA MES DICIEMBRE");
            expect(result.simplified).toBe("Salary");
            expect(result.typeHint).toBe("salary");
        });

        test("detects refund", () => {
            const result = ruleSimplifyDescription("DEVOLUCION COMPRA ZARA");
            expect(result.simplified).toBe("Refund");
            expect(result.typeHint).toBe("refund");
        });
    });

    describe("Transfer Detection and Name Extraction", () => {
        test("extracts name from Bizum transfer", () => {
            const result = ruleSimplifyDescription("BIZUM A SR JUAN PEREZ");
            expect(result.simplified).toBe("Bizum Juan");
            expect(result.typeHint).toBe("transfer");
            expect(result.matchedRule).toBe("transfer:bizum");
        });

        test("ignores MRS honorific", () => {
            const result = ruleSimplifyDescription("TRANSFERENCIA MRS ANNA SMITH");
            expect(result.simplified).toBe("Transfer Anna");
        });

        test("ignores DON honorific", () => {
            const result = ruleSimplifyDescription("BIZUM DE DON CARLOS GARCIA");
            expect(result.simplified).toBe("Bizum Carlos");
        });

        test("handles transfer without honorific", () => {
            const result = ruleSimplifyDescription("SEPA MARIA");
            expect(result.simplified).toBe("Transfer Maria");
        });

        test("handles transfer without name", () => {
            const result = ruleSimplifyDescription("TRANSFERENCIA SEPA");
            expect(result.simplified).toBe("Transfer");
            expect(result.typeHint).toBe("transfer");
        });

        test("handles Bizum without name", () => {
            const result = ruleSimplifyDescription("BIZUM PAGO");
            expect(result.simplified).toBe("Bizum");
        });

        test("prefers first name over surname", () => {
            const result = ruleSimplifyDescription("BIZUM LUIS RODRIGUEZ MARTINEZ");
            expect(result.simplified).toBe("Bizum Luis");
        });

        test("applies title case to names", () => {
            const result = ruleSimplifyDescription("BIZUM MARIA");
            expect(result.simplified).toBe("Bizum Maria");
        });
    });

    describe("Unknown Merchants (AI Fallback Needed)", () => {
        test("returns null for unknown merchant", () => {
            const result = ruleSimplifyDescription("COMPRA LOCAL DESCONOCIDO 123");
            expect(result.simplified).toBeNull();
            expect(result.confidence).toBe(0);
        });

        test("returns null for unknown online merchant", () => {
            const result = ruleSimplifyDescription("PAGO WWW.TIENDADESCONOCIDA.COM");
            expect(result.simplified).toBeNull();
        });

        test("returns null for generic description", () => {
            const result = ruleSimplifyDescription("COMPRA TARJETA");
            expect(result.simplified).toBeNull();
        });
    });

    describe("Edge Cases", () => {
        test("handles empty string", () => {
            const result = ruleSimplifyDescription("");
            expect(result.simplified).toBeNull();
            expect(result.confidence).toBe(0);
        });

        test("handles case insensitivity", () => {
            const result1 = ruleSimplifyDescription("mercadona");
            const result2 = ruleSimplifyDescription("MERCADONA");
            const result3 = ruleSimplifyDescription("Mercadona");

            expect(result1.simplified).toBe("Mercadona");
            expect(result2.simplified).toBe("Mercadona");
            expect(result3.simplified).toBe("Mercadona");
        });

        test("prioritizes merchant over operation", () => {
            // If description contains both merchant and operation keyword,
            // merchant should match first
            const result = ruleSimplifyDescription("COMISION SPOTIFY");
            expect(result.simplified).toBe("Spotify"); // Not "Bank Fee"
        });

        test("handles Uber vs Uber Eats distinction", () => {
            const uberEats = ruleSimplifyDescription("PAGO UBER EATS");
            const uber = ruleSimplifyDescription("PAGO UBER");

            expect(uberEats.simplified).toBe("Uber Eats");
            expect(uber.simplified).toBe("Uber");
        });
    });

    describe("Confidence Scoring", () => {
        test("high confidence for exact merchant match", () => {
            const result = ruleSimplifyDescription("MERCADONA");
            expect(result.confidence).toBeGreaterThanOrEqual(0.9);
        });

        test("medium-high confidence for operation rules", () => {
            const result = ruleSimplifyDescription("COMISION");
            expect(result.confidence).toBeGreaterThanOrEqual(0.75);
            expect(result.confidence).toBeLessThan(0.9);
        });

        test("zero confidence for no match", () => {
            const result = ruleSimplifyDescription("UNKNOWN MERCHANT");
            expect(result.confidence).toBe(0);
        });
    });
});
