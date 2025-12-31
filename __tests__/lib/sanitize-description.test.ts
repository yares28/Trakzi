// __tests__/lib/sanitize-description.test.ts
import { sanitizeDescription, extractMerchantTokens } from "@/lib/ai/sanitize-description";

describe("sanitizeDescription", () => {
    describe("Card Number Masking", () => {
        test("masks TARJ* pattern", () => {
            expect(sanitizeDescription("COMPRA TARJ*1234 AMAZON")).toBe("COMPRA CARD AMAZON");
        });

        test("masks CARD pattern", () => {
            expect(sanitizeDescription("PAYMENT CARD 5678 ZARA")).toBe("PAYMENT CARD ZARA");
        });

        test("masks **** pattern", () => {
            expect(sanitizeDescription("**** 9012 MERCADONA")).toBe("CARD MERCADONA");
        });

        test("masks full card numbers", () => {
            expect(sanitizeDescription("COMPRA 1234 5678 9012 3456 AMAZON")).toBe("COMPRA CARD AMAZON");
        });
    });

    describe("IBAN Masking", () => {
        test("masks Spanish IBAN", () => {
            expect(sanitizeDescription("TRF ES9121000418450200051332 JOHN"))
                .toBe("TRF IBAN JOHN");
        });

        test("masks French IBAN", () => {
            expect(sanitizeDescription("TRANSFER FR1420041010050500013M02606"))
                .toBe("TRANSFER IBAN");
        });
    });

    describe("Phone Number Masking", () => {
        test("masks international phone format", () => {
            expect(sanitizeDescription("CALL +34 123 456 789 SUPPORT"))
                .toBe("CALL PHONE SUPPORT");
        });

        test("masks US phone format", () => {
            expect(sanitizeDescription("SMS 123-456-7890 VERIFY"))
                .toBe("SMS PHONE VERIFY");
        });

        test("masks phone with parentheses", () => {
            expect(sanitizeDescription("CONTACT (555) 123-4567"))
                .toBe("CONTACT PHONE");
        });
    });

    describe("Authorization Code Masking", () => {
        test("masks AUTH: pattern", () => {
            expect(sanitizeDescription("AUTH:ABC123XYZ AMAZON"))
                .toBe("AUTH AMAZON");
        });

        test("masks AUTORIZACION pattern", () => {
            expect(sanitizeDescription("AUTORIZACION CW4WE8Q35 SPOTIFY"))
                .toBe("AUTH SPOTIFY");
        });

        test("masks AUTH without colon", () => {
            expect(sanitizeDescription("COMPRA AUTH123456 GLOVO"))
                .toBe("COMPRA AUTH GLOVO");
        });
    });

    describe("Long Numeric Sequence Masking", () => {
        test("masks 12+ digit sequences", () => {
            expect(sanitizeDescription("REF 1234567890123 TRANSFERENCIA"))
                .toBe("REF REF TRANSFERENCIA");
        });

        test("masks REF: prefix pattern", () => {
            expect(sanitizeDescription("BIZUM REF:12345678 JUAN"))
                .toBe("BIZUM REF JUAN");
        });
    });

    describe("Merchant Name Preservation", () => {
        test("preserves Amazon", () => {
            const result = sanitizeDescription("COMPRA ONLINE AMAZON.ES");
            expect(result).toContain("AMAZON");
        });

        test("preserves Mercadona", () => {
            const result = sanitizeDescription("PAGO MERCADONA VALENCIA");
            expect(result).toContain("MERCADONA");
        });

        test("preserves merchant with card masking", () => {
            const result = sanitizeDescription("COMPRA ZARA CARD*1234");
            expect(result).toContain("ZARA");
            expect(result).not.toContain("1234");
        });
    });

    describe("Edge Cases", () => {
        test("handles empty string", () => {
            expect(sanitizeDescription("")).toBe("");
        });

        test("normalizes whitespace", () => {
            expect(sanitizeDescription("COMPRA    AMAZON     LIBROS"))
                .toBe("COMPRA AMAZON LIBROS");
        });

        test("handles multiple sensitive data types", () => {
            const input = "BIZUM CARD*1234 +34 123 456 789 REF:123456789012";
            const result = sanitizeDescription(input);
            expect(result).toBe("BIZUM CARD PHONE REF");
        });
    });
});

describe("extractMerchantTokens", () => {
    test("extracts merchant tokens", () => {
        const tokens = extractMerchantTokens("COMPRA AMAZON LIBROS");
        expect(tokens).toContain("AMAZON");
        expect(tokens).toContain("LIBROS");
        expect(tokens).not.toContain("COMPRA"); // noise word
    });

    test("filters out noise words", () => {
        const tokens = extractMerchantTokens("PAGO EN MERCADONA");
        expect(tokens).toContain("MERCADONA");
        expect(tokens).not.toContain("PAGO");
        expect(tokens).not.toContain("EN");
    });

    test("filters out short tokens", () => {
        const tokens = extractMerchantTokens("COMPRA A LA TIENDA");
        expect(tokens).not.toContain("A"); // too short
        expect(tokens).not.toContain("LA"); // too short
        expect(tokens).toContain("TIENDA");
    });

    test("filters out URL keywords", () => {
        const tokens = extractMerchantTokens("WWW AMAZON COM");
        expect(tokens).toContain("AMAZON");
        expect(tokens).not.toContain("WWW");
        expect(tokens).not.toContain("COM");
    });

    test("handles empty input", () => {
        expect(extractMerchantTokens("")).toEqual([]);
    });

    test("splits by various separators", () => {
        const tokens = extractMerchantTokens("AMAZON/KINDLE-BOOKS|DIGITAL");
        expect(tokens).toContain("AMAZON");
        expect(tokens).toContain("KINDLE");
        expect(tokens).toContain("BOOKS");
        expect(tokens).toContain("DIGITAL");
    });
});
