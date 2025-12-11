import { use } from "react"
import { SignUpForm } from "@/landing/sign-up-form"

type SignUpParams = {
  "sign-up"?: string[]
}

export default function SignUpPage({
  params,
}: {
  params: Promise<SignUpParams>
}) {
  // Unwrap promised params to satisfy Next.js 15 sync dynamic API requirements
  use(params)
  return <SignUpForm />
}

