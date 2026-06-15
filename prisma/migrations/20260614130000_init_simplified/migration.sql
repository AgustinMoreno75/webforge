-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CEO', 'SUPER_ADMIN', 'LEAD', 'CLIENT');

-- CreateEnum
CREATE TYPE "PlanCode" AS ENUM ('NONE', 'STARTER', 'PREMIUM', 'BUSINESS');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL DEFAULT 'LEAD',
    "plan" "PlanCode" NOT NULL DEFAULT 'NONE',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "planStartDate" TIMESTAMP(3),
    "planEndDate" TIMESTAMP(3),
    "lastPaymentDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_security" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "user_id" TEXT,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "lockout_until" TIMESTAMPTZ(6),
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "auth_security_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_event_log" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "email" TEXT,
    "user_id" TEXT,
    "success" BOOLEAN NOT NULL,
    "reason" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_event_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_accountType_idx" ON "User"("accountType");

-- CreateIndex
CREATE INDEX "User_plan_idx" ON "User"("plan");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "Ticket_userId_status_idx" ON "Ticket"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "auth_security_email_key" ON "auth_security"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_security_user_id_key" ON "auth_security"("user_id");

-- CreateIndex
CREATE INDEX "idx_auth_security_email" ON "auth_security"("email");

-- CreateIndex
CREATE INDEX "idx_auth_event_log_created_at" ON "auth_event_log"("created_at");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

