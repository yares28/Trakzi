import { IconTrendingDown, IconTrendingUp, IconShoppingCart, IconReceipt, IconPackage, IconChartBar } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
    Card,
    CardAction,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

interface SectionCardsFridgeProps {
    totalSpent?: number;
    shoppingTrips?: number;
    itemsPurchased?: number;
    averageReceipt?: number;
}

export function SectionCardsFridge({
    totalSpent = 0,
    shoppingTrips = 0,
    itemsPurchased = 0,
    averageReceipt = 0
}: SectionCardsFridgeProps) {
    return (
        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-2 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 lg:grid-cols-4">
            <Card className="@container/card">
                <CardHeader>
                    <CardDescription>Total Spent</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        ${totalSpent.toFixed(2)}
                    </CardTitle>
                    <CardAction>
                        <Badge variant="outline">
                            <IconTrendingUp />
                            +12%
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        Spending up this month <IconTrendingUp className="size-4" />
                    </div>
                    <div className="text-muted-foreground">
                        Compared to last month
                    </div>
                </CardFooter>
            </Card>
            <Card className="@container/card">
                <CardHeader>
                    <CardDescription>Shopping Trips</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {shoppingTrips}
                    </CardTitle>
                    <CardAction>
                        <Badge variant="outline">
                            <IconTrendingDown />
                            -2
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        Fewer trips taken <IconTrendingDown className="size-4" />
                    </div>
                    <div className="text-muted-foreground">
                        Efficient shopping habits
                    </div>
                </CardFooter>
            </Card>
            <Card className="@container/card">
                <CardHeader>
                    <CardDescription>Items Purchased</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {itemsPurchased}
                    </CardTitle>
                    <CardAction>
                        <Badge variant="outline">
                            <IconTrendingUp />
                            +15%
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        Stocking up pantry <IconTrendingUp className="size-4" />
                    </div>
                    <div className="text-muted-foreground">More items per trip</div>
                </CardFooter>
            </Card>
            <Card className="@container/card">
                <CardHeader>
                    <CardDescription>Average Receipt</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        ${averageReceipt.toFixed(2)}
                    </CardTitle>
                    <CardAction>
                        <Badge variant="outline">
                            <IconTrendingUp />
                            +5%
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        Cost per trip rising <IconTrendingUp className="size-4" />
                    </div>
                    <div className="text-muted-foreground">Inflation impact</div>
                </CardFooter>
            </Card>
        </div>
    )
}
