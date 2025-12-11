import { use } from "react"
import { SignInForm } from "@/landing/sign-in-form"

type SignInParams = {
  "sign-in"?: string[]
}

export default function SignInPage({
  params,
}: {
  params: Promise<SignInParams>
}) {
  // Next.js 15 passes params as a promise; unwrap to avoid sync dynamic API warnings
  use(params)
  return <SignInForm />
}

