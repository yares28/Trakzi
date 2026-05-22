import { redirect } from "next/navigation"

/** Legacy URL and home favorites link — trends UI lives under Analytics. */
export default function TrendsRedirectPage() {
  redirect("/analytics?view=trends")
}
