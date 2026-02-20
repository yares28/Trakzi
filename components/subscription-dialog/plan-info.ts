import type { LucideIcon } from "lucide-react";
import { Sparkles, Crown, Zap } from "lucide-react";

import type { PlanType } from "./types";

// Plan icons with dark/light mode variants
export const planIcons: Record<PlanType, { light: string; dark: string }> = {
    free: {
        light: "/Trakzi/subs/freeicon.png",
        dark: "/Trakzi/subs/freeiconB.png",
    },
    pro: {
        light: "/Trakzi/subs/TrakziProLogo.png",
        dark: "/Trakzi/subs/TrakziProLogoB.png",
    },
    max: {
        light: "/Trakzi/subs/trakziMaxIcon.png",
        dark: "/Trakzi/subs/trakziMaxIconB.png",
    },
};

type PlanInfo = {
    name: string;
    price: string;
    annualPrice: string;
    icon: LucideIcon;
    iconColor: string;
    badgeClass: string;
    features: string[];
};

// Plan features for display
export const PLAN_INFO: Record<PlanType, PlanInfo> = {
    free: {
        name: "Free",
        price: "€0",
        annualPrice: "€0",
        icon: Zap,
        iconColor: "text-muted-foreground",
        badgeClass: "bg-muted text-muted-foreground",
        features: [
            "500 base transactions",
            "+50 monthly bonus",
            "10 receipt scans/month",
            "10 AI chat/week",
            "3 AI insights preview",
            "1 custom category",
        ],
    },
    pro: {
        name: "PRO",
        price: "€4.99/mo",
        annualPrice: "€49.99/yr",
        icon: Sparkles,
        iconColor: "text-primary",
        badgeClass: "bg-gradient-to-r from-primary to-primary/80 text-white border-0",
        features: [
            "1,500 base transactions",
            "+250 monthly bonus",
            "50 receipt scans/month",
            "50 AI chat/week",
            "Full AI insights",
            "Advanced charts",
            "10 custom categories",
        ],
    },
    max: {
        name: "MAX",
        price: "€19.99/mo",
        annualPrice: "€199.99/yr",
        icon: Crown,
        iconColor: "text-amber-500",
        badgeClass: "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0",
        features: [
            "5,000 base transactions",
            "+750 monthly bonus",
            "150 receipt scans/month",
            "100 AI chat/week",
            "Full AI insights",
            "Advanced charts",
            "25 custom categories",
            "Priority support",
        ],
    },
};
