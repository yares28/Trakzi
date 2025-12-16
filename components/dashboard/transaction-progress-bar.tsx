"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TransactionProgressBarProps {
    spendingTransactions: number;
    groceryTransactions: number;
    maxTransactions?: number;
    className?: string;
}

export function TransactionProgressBar({
    spendingTransactions = 0,
    groceryTransactions = 0,
    maxTransactions = 500,
    className,
}: TransactionProgressBarProps) {
    const totalTransactions = spendingTransactions + groceryTransactions;
    const freeSlots = Math.max(0, maxTransactions - totalTransactions);

    const segments = [
        {
            label: "Spending/Income",
            value: spendingTransactions,
            color: "bg-primary"
        },
        {
            label: "Grocery Shopping",
            value: groceryTransactions,
            color: "bg-emerald-500"
        },
    ];

    return (
        <Card className={cn("w-full shadow-sm", className)}>
            <CardContent className="py-4">
                <p className="mb-4 text-base text-muted-foreground">
                    Transactions tracked{" "}
                    <span className="font-semibold tabular-nums text-foreground">
                        {totalTransactions.toLocaleString()}
                    </span>{" "}
                    of {maxTransactions.toLocaleString()} max
                </p>

                <div className="mb-4 flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    {segments.map((segment) => {
                        const percentage = (segment.value / maxTransactions) * 100;
                        return (
                            <div
                                key={segment.label}
                                className={cn("h-full transition-all", segment.color)}
                                style={{ width: `${percentage}%` }}
                                role="progressbar"
                                aria-label={segment.label}
                                aria-valuenow={segment.value}
                                aria-valuemin={0}
                                aria-valuemax={maxTransactions}
                            />
                        );
                    })}
                </div>

                <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                    {segments.map((segment) => (
                        <div key={segment.label} className="flex items-center gap-2">
                            <span
                                className={cn("size-3 shrink-0 rounded", segment.color)}
                                aria-hidden="true"
                            />
                            <span className="text-sm text-muted-foreground">
                                {segment.label}
                            </span>
                            <span className="text-sm tabular-nums text-foreground font-medium">
                                {segment.value.toLocaleString()}
                            </span>
                        </div>
                    ))}
                    <div className="flex items-center gap-2">
                        <span
                            className="size-3 shrink-0 rounded-sm bg-muted"
                            aria-hidden="true"
                        />
                        <span className="text-sm text-muted-foreground">Available</span>
                        <span className="text-sm tabular-nums text-foreground font-medium">
                            {freeSlots.toLocaleString()}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
