import type { LucideIcon } from "lucide-react";
import { Sparkles, Crown, Zap, Star } from "lucide-react";

import type { PlanType } from "./types";

// Plan icons with dark/light mode variants
export const planIcons: Record<PlanType, { light: string; dark: string }> = {
    free: {
        light: "/Trakzi/subs/freeicon.png",
        dark: "/Trakzi/subs/freeiconB.png",
    },
    basic: {
        light: "/Trakzi/subs/TrakziBasicicon.png",
        dark: "/Trakzi/subs/TrakziBasicicon.png",
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
        icon: Zap,
        iconColor: "text-muted-foreground",
        badgeClass: "bg-muted text-muted-foreground",
        features: [
            "400 transactions",
            "Unlimited receipt scans",
            "5 AI chat/day",
            "Analytics charts",
            "10 custom categories",
        ],
    },
    basic: {
        name: "Basic",
        price: "€1.99/mo",
        icon: Star,
        iconColor: "text-blue-500",
        badgeClass: "bg-gradient-to-r from-blue-500 to-blue-400 text-white border-0",
        features: [
            "Everything in Free",
            "More AI chat/day",
            "AI categorization",
            "Priority support",
        ],
    },
    pro: {
        name: "PRO",
        price: "€4.99/mo",
        icon: Sparkles,
        iconColor: "text-primary",
        badgeClass: "bg-gradient-to-r from-primary to-primary/80 text-white border-0",
        features: [
            "3,000 transactions",
            "Unlimited receipt scans",
            "Unlimited AI chat",
            "AI insights & summaries",
            "Unlimited categories",
            "Export to CSV",
        ],
    },
    max: {
        name: "MAX",
        price: "€19.99/mo",
        icon: Crown,
        iconColor: "text-amber-500",
        badgeClass: "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0",
        features: [
            "Unlimited transactions",
            "Everything in PRO",
            "Priority support",
            "Early access",
            "Sub-accounts (soon)",
            "Custom API (soon)",
        ],
    },
};
