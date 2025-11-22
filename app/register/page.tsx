import { RegisterForm } from "@/components/register-form"
import Link from "next/link"

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Get Started</h1>
          <p className="mt-2 text-muted-foreground">
            <Link href="/" className="underline underline-offset-4 hover:text-foreground">
              Skip to dashboard
            </Link>
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  )
}








