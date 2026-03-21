import type { BlogAuthor } from "@/lib/docs/types"

interface AuthorBioProps {
  author: BlogAuthor
}

export function AuthorBio({ author }: AuthorBioProps) {
  return (
    <div className="flex items-start gap-4 p-5 rounded-xl border border-zinc-800/50 bg-zinc-950/50">
      <div className="flex-shrink-0 w-11 h-11 rounded-full bg-[#fe985b]/10 border border-[#fe985b]/20 flex items-center justify-center text-[#fe985b] font-bold text-sm">
        {author.name.charAt(0)}
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{author.name}</p>
        <p className="text-xs text-[#fe985b] mb-1">{author.role}</p>
        <p className="text-xs text-zinc-400">{author.bio}</p>
      </div>
    </div>
  )
}
