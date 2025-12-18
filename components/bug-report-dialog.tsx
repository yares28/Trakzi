"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import * as z from "zod"
import { IconBug } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { cn } from "@/lib/utils"

const formSchema = z.object({
    type: z.enum(["bug", "feature"], {
        required_error: "Please select a report type.",
    }),
    title: z
        .string()
        .min(5, "Title must be at least 5 characters.")
        .max(50, "Title must be at most 50 characters."),
    description: z
        .string()
        .min(20, "Description must be at least 20 characters.")
        .max(500, "Description must be at most 500 characters."),
})

// Textarea component (inline definition since it might be missing in ui/)
const Textarea = React.forwardRef<
    HTMLTextAreaElement,
    React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
    return (
        <textarea
            className={cn(
                "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            ref={ref}
            {...props}
        />
    )
})
Textarea.displayName = "Textarea"

export function BugReportDialog() {
    const [open, setOpen] = React.useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            type: "bug",
            title: "",
            description: "",
        },
    })

    // Watch description for character count
    const descriptionValue = form.watch("description")

    function onSubmit(data: z.infer<typeof formSchema>) {
        // Show toast
        toast.success("Thank you for your feedback!", {
            description: "We've prepared an email for you to send.",
        })

        // Construct mailto link
        const subject = `[${data.type === "bug" ? "Bug Report" : "Feature Request"}] ${data.title}`
        const body = `${data.description}\n\n--\nSubmitted via Folio App`
        const mailtoLink = `mailto:help@trakzi.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

        // Open mailto
        window.location.href = mailtoLink

        // Close dialog
        setOpen(false)
        form.reset()
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-muted-foreground hover:text-foreground">
                    <IconBug className="h-4 w-4" />
                    <span>Bug / Feature</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Bug Report & Feature Request</DialogTitle>
                    <DialogDescription>
                        Help us improve. Select the type of report and provide details.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Report Type</Label>
                        <div className="flex p-1 bg-muted rounded-lg">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => form.setValue("type", "bug")}
                                className={cn(
                                    "flex-1 rounded-md transition-all hover:bg-background/50",
                                    form.watch("type") === "bug"
                                        ? "bg-background text-foreground shadow-sm hover:bg-background"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Bug Report
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => form.setValue("type", "feature")}
                                className={cn(
                                    "flex-1 rounded-md transition-all hover:bg-background/50",
                                    form.watch("type") === "feature"
                                        ? "bg-background text-foreground shadow-sm hover:bg-background"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Feature Request
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="title">Title</Label>
                            {form.formState.errors.title && (
                                <span className="text-xs text-destructive">{form.formState.errors.title.message}</span>
                            )}
                        </div>
                        <Input
                            id="title"
                            placeholder={form.watch("type") === "bug" ? "Login button not working..." : "Add dark mode..."}
                            {...form.register("title")}
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="description">Description</Label>
                            {form.formState.errors.description && (
                                <span className="text-xs text-destructive">{form.formState.errors.description.message}</span>
                            )}
                        </div>
                        <div className="relative">
                            <Textarea
                                id="description"
                                placeholder="Describe the issue or feature in detail..."
                                className="resize-none pr-2 pb-6"
                                rows={5}
                                {...form.register("description")} // Register passed as props to Textarea
                            />
                            <div className="absolute bottom-2 right-2 text-[0.7rem] text-muted-foreground tabular-nums">
                                {descriptionValue?.length || 0}/500
                            </div>
                        </div>
                        <p className="text-[0.8rem] text-muted-foreground">
                            Include steps to reproduce, expected behavior, and what actually happened.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit">Submit</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
