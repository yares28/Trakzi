import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, ArrowUp, ArrowDown, Loader2, X, RotateCcw } from "lucide-react";

import { PLAN_INFO, planIcons } from "./plan-info";
import type { PlanType } from "./types";

type PlanCardProps = {
    plan: PlanType;
    isCurrentPlan: boolean;
    currentUserPlan: PlanType;
    onManageSubscription: () => void;
    onUpgrade: (plan: PlanType) => void;
    onDowngrade: (plan: PlanType) => void;
    onReactivate: () => void;
    isManaging: boolean;
    isCancelPending: boolean;
};

export function PlanCard({
    plan,
    isCurrentPlan,
    currentUserPlan,
    onManageSubscription,
    onUpgrade,
    onDowngrade,
    onReactivate,
    isManaging,
    isCancelPending,
}: PlanCardProps) {
    const info = PLAN_INFO[plan];

    const planOrder: PlanType[] = ["free", "basic", "pro", "max"];
    const currentIndex = planOrder.indexOf(currentUserPlan);
    const thisIndex = planOrder.indexOf(plan);
    const isUpgrade = thisIndex > currentIndex;
    const isDowngrade = thisIndex < currentIndex;

    return (
        <div className={`relative p-4 rounded-xl border flex flex-col ${isCurrentPlan ? "border-primary bg-primary/5" : "border-border"}`}>
            {/* Current plan indicator */}
            {isCurrentPlan && (
                <div className="absolute -top-3 left-4">
                    <Badge className="bg-primary text-primary-foreground text-xs">
                        Current
                    </Badge>
                </div>
            )}

            {/* Orange glow effect based on plan tier */}
            {plan === "pro" && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-400 to-orange-600 opacity-10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            )}
            {plan === "max" && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-400 to-orange-500 opacity-20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            )}

            <div className="relative flex-1 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        {/* Show plan image icon for all plans */}
                        <>
                            <Image
                                src={planIcons[plan].dark}
                                alt={`${plan} icon`}
                                width={24}
                                height={24}
                                className="hidden dark:block"
                            />
                            <Image
                                src={planIcons[plan].light}
                                alt={`${plan} icon`}
                                width={24}
                                height={24}
                                className="block dark:hidden"
                            />
                        </>
                        <span className="font-semibold">{info.name}</span>
                    </div>
                    <Badge className={info.badgeClass}>
                        {info.price}
                    </Badge>
                </div>

                {/* Features - show all */}
                <ul className="space-y-1.5 flex-1">
                    {info.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs">
                            <Check className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                            <span className="text-muted-foreground">{feature}</span>
                        </li>
                    ))}
                </ul>

                {/* Action Buttons */}
                <div className="mt-4 space-y-2">
                    {isCurrentPlan ? (
                        currentUserPlan !== "free" ? (
                            isCancelPending ? (
                                // Show reactivate button if subscription is pending cancellation
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-green-600 border-green-600/30 hover:bg-green-500/10"
                                    onClick={onReactivate}
                                    disabled={isManaging}
                                >
                                    {isManaging ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <RotateCcw className="h-4 w-4 mr-1" />
                                            Reactivate
                                        </>
                                    )}
                                </Button>
                            ) : (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                                    onClick={onManageSubscription}
                                    disabled={isManaging}
                                >
                                    {isManaging ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <X className="h-4 w-4 mr-1" />
                                            Unsubscribe
                                        </>
                                    )}
                                </Button>
                            )
                        ) : (
                            <div className="h-9" /> /* Spacer for Free plan */
                        )
                    ) : isUpgrade ? (
                        <Button
                            size="sm"
                            className={`w-full ${plan === "max" ? "bg-gradient-to-r from-amber-500 to-orange-500" : "bg-gradient-to-r from-primary to-primary/80"}`}
                            onClick={() => onUpgrade(plan)}
                            disabled={isManaging}
                        >
                            {isManaging ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <ArrowUp className="h-4 w-4 mr-1" />
                                    Upgrade
                                </>
                            )}
                        </Button>
                    ) : isDowngrade ? (
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => onDowngrade(plan)}
                            disabled={isManaging}
                        >
                            {isManaging ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <ArrowDown className="h-4 w-4 mr-1" />
                                    Downgrade
                                </>
                            )}
                        </Button>
                    ) : (
                        <div className="h-9" /> /* Spacer */
                    )}
                </div>
            </div>
        </div>
    );
}
