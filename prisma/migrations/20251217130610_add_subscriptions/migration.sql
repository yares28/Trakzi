-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fridge_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportId" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fridge_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "status" TEXT NOT NULL DEFAULT 'active',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_userId_key" ON "subscriptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeCustomerId_key" ON "subscriptions"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeSubscriptionId_key" ON "subscriptions"("stripeSubscriptionId");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fridge_items" ADD CONSTRAINT "fridge_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fridge_items" ADD CONSTRAINT "fridge_items_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
