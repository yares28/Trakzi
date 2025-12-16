"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Target, Percent, Calendar, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GoalSettingModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentSavingsRate: number;
    onSaveGoal: (goal: { targetRate: number; deadline: string }) => void;
}

export function GoalSettingModal({
    isOpen,
    onClose,
    currentSavingsRate,
    onSaveGoal,
}: GoalSettingModalProps) {
    const [targetRate, setTargetRate] = useState(20);
    const [deadline, setDeadline] = useState(() => {
        // Default to 6 months from now
        const date = new Date();
        date.setMonth(date.getMonth() + 6);
        return date.toISOString().split('T')[0];
    });

    const handleSave = () => {
        onSaveGoal({ targetRate, deadline });
        onClose();
    };

    const goalGap = targetRate - currentSavingsRate;
    const isAchievable = goalGap <= 10; // More than 10% increase is challenging

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background border rounded-xl shadow-2xl z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 pb-4 border-b">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <Target className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-foreground">Set Savings Goal</h2>
                                    <p className="text-sm text-muted-foreground">Define your target savings rate</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-muted transition-colors"
                            >
                                <X className="h-5 w-5 text-muted-foreground" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            {/* Current Rate Display */}
                            <div className="p-4 rounded-lg bg-muted/50">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Current Savings Rate</span>
                                    <span className="text-lg font-bold text-foreground">{currentSavingsRate}%</span>
                                </div>
                            </div>

                            {/* Target Rate Slider */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                                        <Percent className="h-4 w-4 text-primary" />
                                        Target Savings Rate
                                    </label>
                                    <span className="text-lg font-bold text-primary">{targetRate}%</span>
                                </div>
                                <input
                                    type="range"
                                    min={5}
                                    max={50}
                                    step={1}
                                    value={targetRate}
                                    onChange={(e) => setTargetRate(Number(e.target.value))}
                                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>5%</span>
                                    <span className="text-primary/70">Ideal: 20%</span>
                                    <span>50%</span>
                                </div>
                            </div>

                            {/* Deadline Picker */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                                    <Calendar className="h-4 w-4 text-primary" />
                                    Target Deadline
                                </label>
                                <input
                                    type="date"
                                    value={deadline}
                                    onChange={(e) => setDeadline(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-2 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                                />
                            </div>

                            {/* Goal Analysis */}
                            <div className={`p-4 rounded-lg border ${isAchievable ? 'bg-green-500/10 border-green-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
                                <div className="flex items-start gap-3">
                                    <Sparkles className={`h-5 w-5 mt-0.5 ${isAchievable ? 'text-green-500' : 'text-yellow-500'}`} />
                                    <div>
                                        <p className={`text-sm font-medium ${isAchievable ? 'text-green-700' : 'text-yellow-700'}`}>
                                            {isAchievable ? 'Achievable Goal!' : 'Ambitious Goal'}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {goalGap > 0
                                                ? `You need to increase your savings by ${goalGap}% to reach this goal.`
                                                : `You're already exceeding this target! Consider setting a higher goal.`
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t bg-muted/20">
                            <Button variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button onClick={handleSave} className="gap-2">
                                <Save className="h-4 w-4" />
                                Save Goal
                            </Button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
