import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"

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
    storesVisited?: number;
    averageReceipt?: number;
    tripsFrequency?: number;
    totalSpentChange?: number;
    shoppingTripsChange?: number;
    storesVisitedChange?: number;
    averageReceiptChange?: number;
    tripsFrequencyChange?: number;
}

export function SectionCardsFridge({
    totalSpent = 0,
    shoppingTrips = 0,
    storesVisited = 0,
    averageReceipt = 0,
    tripsFrequency = 0,
    totalSpentChange = 0,
    shoppingTripsChange = 0,
    storesVisitedChange = 0,
    averageReceiptChange = 0,
    tripsFrequencyChange = 0,
}: SectionCardsFridgeProps) {
    return (
        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @3xl/main:grid-cols-3 @5xl/main:grid-cols-5">
            <Card className="@container/card">
                <CardHeader>
                    <CardDescription>Total Spent</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        ${totalSpent.toFixed(2)}
                    </CardTitle>
                    <CardAction>
                        <Badge variant="outline">
                            {totalSpentChange >= 0 ? <IconTrendingUp /> : <IconTrendingDown />}
                            {totalSpentChange >= 0 ? "+" : ""}
                            {totalSpentChange.toFixed(1)}%
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        {totalSpentChange >= 0 ? "Spending up" : "Spending down"}{" "}
                        {totalSpentChange >= 0 ? <IconTrendingUp className="size-4" /> : <IconTrendingDown className="size-4" />}
                    </div>
                    <div className="text-muted-foreground">
                        Compared to previous period
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
                            {shoppingTripsChange >= 0 ? <IconTrendingUp /> : <IconTrendingDown />}
                            {shoppingTripsChange >= 0 ? "+" : ""}
                            {shoppingTripsChange.toFixed(1)}%
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        {shoppingTripsChange >= 0 ? "More trips" : "Fewer trips"}{" "}
                        {shoppingTripsChange >= 0 ? <IconTrendingUp className="size-4" /> : <IconTrendingDown className="size-4" />}
                    </div>
                    <div className="text-muted-foreground">
                        Compared to previous period
                    </div>
                </CardFooter>
            </Card>
            <Card className="@container/card">
                <CardHeader>
                    <CardDescription>Stores Visited</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {storesVisited}
                    </CardTitle>
                    <CardAction>
                        <Badge variant="outline">
                            {storesVisitedChange >= 0 ? <IconTrendingUp /> : <IconTrendingDown />}
                            {storesVisitedChange >= 0 ? "+" : ""}
                            {storesVisitedChange.toFixed(1)}%
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        {storesVisitedChange >= 0 ? "Shopping across more stores" : "Shopping across fewer stores"}{" "}
                        {storesVisitedChange >= 0 ? <IconTrendingUp className="size-4" /> : <IconTrendingDown className="size-4" />}
                    </div>
                    <div className="text-muted-foreground">Compared to previous period</div>
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
                            {averageReceiptChange >= 0 ? <IconTrendingUp /> : <IconTrendingDown />}
                            {averageReceiptChange >= 0 ? "+" : ""}
                            {averageReceiptChange.toFixed(1)}%
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        {averageReceiptChange >= 0 ? "Cost per trip rising" : "Cost per trip falling"}{" "}
                        {averageReceiptChange >= 0 ? <IconTrendingUp className="size-4" /> : <IconTrendingDown className="size-4" />}
                    </div>
                    <div className="text-muted-foreground">Compared to previous period</div>
                </CardFooter>
            </Card>
            <Card className="@container/card">
                <CardHeader>
                    <CardDescription>Trips Frequency</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {tripsFrequency.toFixed(1)} days
                    </CardTitle>
                    <CardAction>
                        <Badge variant="outline">
                            {tripsFrequencyChange >= 0 ? <IconTrendingUp /> : <IconTrendingDown />}
                            {tripsFrequencyChange >= 0 ? "+" : ""}
                            {tripsFrequencyChange.toFixed(1)}%
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        {tripsFrequencyChange >= 0 ? "Shopping less often" : "Shopping more often"}{" "}
                        {tripsFrequencyChange >= 0 ? <IconTrendingDown className="size-4" /> : <IconTrendingUp className="size-4" />}
                    </div>
                    <div className="text-muted-foreground">Average days between trips</div>
                </CardFooter>
            </Card>
        </div>
    )
}
